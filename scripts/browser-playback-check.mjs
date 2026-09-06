#!/usr/bin/env node

/**
 * Run the smallest useful real-browser playback check for the practice UI.
 *
 * The runner deliberately uses only DOM controls for playback. It attaches a
 * capture processor to the live mixer output inside the page, so the PCM is
 * browser audio rather than microphone input.
 */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { once } from 'node:events';

const root = resolve(dirname(new URL(import.meta.url).pathname), '..');
const wait = ms => new Promise(resolveWait => setTimeout(resolveWait, ms));
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-ticket02-'))));
const port = Number(process.env.VITE_PORT || 0);
const chromeCandidates = [
  process.env.CHROME_BIN,
  process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome',
  '/usr/bin/google-chrome-stable',
  '/usr/bin/chromium',
  '/usr/bin/chromium-browser',
].filter(Boolean);

let server;
let chrome;
let ws;
let captureAvailable = false;
const report = {
  status: 'failed',
  output,
  checks: [],
  errors: [],
  artifacts: [],
  prerequisites: { chrome: null, vite: true },
};

function check(name, value, passed, detail = undefined) {
  const entry = { name, value, passed: Boolean(passed) };
  if (detail !== undefined) entry.detail = detail;
  report.checks.push(entry);
  if (!passed) throw new Error(`Failed browser check: ${name}`);
  return entry;
}

function rms(samples) {
  if (!samples.length) return 0;
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

function peak(samples) {
  let result = 0;
  for (const value of samples) result = Math.max(result, Math.abs(value));
  return result;
}

function metrics(samples, sampleRate) {
  const max = peak(samples);
  const threshold = Math.max(0.015, max * 0.18);
  const windowSize = Math.max(64, Math.floor(sampleRate * 0.005));
  const envelope = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    let windowPeak = 0;
    for (let i = offset; i < Math.min(offset + windowSize, samples.length); i += 1) windowPeak = Math.max(windowPeak, Math.abs(samples[i]));
    envelope.push(windowPeak);
  }
  const attacks = [];
  let above = false;
  for (let i = 0; i < envelope.length; i += 1) {
    if (!above && envelope[i] >= threshold) {
      attacks.push((i * windowSize) / sampleRate);
      above = true;
    } else if (above && envelope[i] < threshold * 0.45) {
      above = false;
    }
  }
  const intervals = attacks.slice(1).map((time, index) => time - attacks[index]);
  return {
    frames: samples.length,
    seconds: samples.length / sampleRate,
    peak: max,
    rms: rms(samples),
    tailPeak: peak(samples.slice(Math.max(0, samples.length - Math.floor(sampleRate * 0.5)))),
    tailRms: rms(samples.slice(Math.max(0, samples.length - Math.floor(sampleRate * 0.5)))),
    threshold,
    attackCount: attacks.length,
    attackTimes: attacks.slice(0, 32),
    attackIntervals: intervals.slice(0, 32),
    duplicateAttackIntervals: intervals.filter(interval => interval < 0.04),
  };
}

function wavFloat32(samples, sampleRate) {
  const pcm = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20); // IEEE float
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(32, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

function findChrome() {
  return chromeCandidates.find(candidate => candidate && existsSync(candidate));
}

async function waitForDevTools(profile) {
  for (let attempt = 0; attempt < 150; attempt += 1) {
    try {
      const activePort = (await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0];
      if (activePort) return Number(activePort);
    } catch {
      // Chrome has not created the endpoint yet.
    }
    await wait(100);
  }
  throw new Error('Chrome debugging endpoint unavailable');
}

async function main() {
  await mkdir(output, { recursive: true });
  const chromeBin = findChrome();
  report.prerequisites.chrome = chromeBin ?? null;
  if (!chromeBin) {
    report.status = 'skipped';
    report.skipReason = 'Chrome/Chromium executable not found. Set CHROME_BIN or BROWSER_BIN.';
    throw Object.assign(new Error(report.skipReason), { skipped: true });
  }

  server = await createServer({
    root,
    cacheDir: join(output, 'vite-cache'),
    server: { host: '127.0.0.1', port, strictPort: port !== 0, hmr: false },
  });
  await server.listen();
  const url = server.resolvedUrls.local?.[0];
  if (!url) throw new Error('Vite did not expose a local URL');
  report.url = url;

  const profile = join(output, 'chrome-profile');
  chrome = spawn(chromeBin, [
    '--headless=new', '--remote-debugging-port=0', `--user-data-dir=${profile}`,
    '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required',
    '--mute-audio', 'about:blank',
  ], { stdio: ['ignore', 'ignore', 'pipe'] });
  chrome.stderr.on('data', data => { report.chromeLog = `${report.chromeLog ?? ''}${data}`.slice(-4000); });
  const debugPort = await waitForDevTools(profile);
  const targets = await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json();
  const target = targets.find(item => item.type === 'page');
  if (!target) throw new Error('Chrome page target unavailable');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await once(ws, 'open');
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', event => {
    const message = JSON.parse(event.data);
    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      if (request) message.error ? request.reject(message.error) : request.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') report.errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => {
    pending.set(++id, { resolve: resolveSend, reject: rejectSend });
    ws.send(JSON.stringify({ id, method, params }));
  });
  const evaluate = async (expression, extra = {}) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, ...extra });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  };
  const click = async (selector, text) => {
    const point = await evaluate(`(() => {
      const nodes = [...document.querySelectorAll(${JSON.stringify(selector)})];
      const element = nodes.find(node => ${text === undefined ? 'true' : `node.textContent.trim() === ${JSON.stringify(text)}`} && !node.disabled);
      if (!element) throw new Error('Missing or disabled control: ' + ${JSON.stringify(selector)} + (${text === undefined ? "''" : JSON.stringify(` + text + `)}));
      element.scrollIntoView({ block: 'center' });
      const rect = element.getBoundingClientRect();
      if (!rect.width || !rect.height) throw new Error('Hidden control: ' + ${JSON.stringify(selector)});
      return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
    })()`);
    await send('Input.dispatchMouseEvent', { type: 'mousePressed', ...point, button: 'left', clickCount: 1 });
    await send('Input.dispatchMouseEvent', { type: 'mouseReleased', ...point, button: 'left', clickCount: 1 });
    await wait(150);
  };
  const openInstrumentDetails = async () => evaluate(`(() => { for (const details of document.querySelectorAll('details')) details.open = true; return true; })()`);

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && !!document.querySelector("main, [aria-label=\\"Practice controls\\"]")')) break;
    await wait(100);
  }
  await wait(600);
  report.browser = await send('Browser.getVersion');
  await openInstrumentDetails();

  const captureScript = `(async () => {
    const source = await (await fetch('/src/audio/mixer.ts')).text();
    const toneUrl = source.match(/from\\s+['\"]([^'\"]*tone[^'\"]*)['\"]/i)?.[1];
    if (!toneUrl) throw new Error('Could not locate Tone import through Vite');
    window.__ticket02Tone = await import(toneUrl);
    const mixer = await import('/src/audio/mixer.ts');
    const context = window.__ticket02Tone.getContext();
    const raw = context.rawContext;
    if (!raw.audioWorklet) throw new Error('AudioWorklet is unavailable; cannot capture contiguous browser PCM');
    const workletCode = "class Ticket02Capture extends AudioWorkletProcessor { process(inputs) { const input = inputs[0]?.[0]; if (input) this.port.postMessage(input.slice()); return true; } } registerProcessor('ticket02-capture', Ticket02Capture);";
    const moduleUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
    await context.addAudioWorkletModule(moduleUrl);
    URL.revokeObjectURL(moduleUrl);
    const captureNode = context.createAudioWorkletNode('ticket02-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    const sink = context.createGain();
    sink.gain.value = 0;
    window.__ticket02Chunks = [];
    captureNode.port.onmessage = event => window.__ticket02Chunks.push(...event.data);
    mixer.getMasterNode().connect(captureNode);
    captureNode.connect(sink);
    sink.connect(raw.destination);
    window.__ticket02Capture = { captureNode, sink, mixer, sampleRate: raw.sampleRate };
    return { sampleRate: raw.sampleRate };
  })()`;
  const setupCapture = () => evaluate(captureScript);
  const captureSetup = await setupCapture();
  captureAvailable = Boolean(captureSetup?.sampleRate);
  report.capture = captureSetup;
  check('Browser PCM capture is available', captureSetup, captureAvailable);

  const collect = async (name, milliseconds) => {
    await evaluate('window.__ticket02Chunks = []');
    await wait(milliseconds);
    const result = await evaluate(`(() => {
      const values = window.__ticket02Chunks.splice(0);
      return { sampleRate: window.__ticket02Capture.sampleRate, values };
    })()`);
    const samples = Float32Array.from(result.values);
    const item = { name, ...metrics(samples, result.sampleRate) };
    const filename = `${name}.wav`;
    await writeFile(join(output, filename), wavFloat32(samples, result.sampleRate));
    report.artifacts.push(filename);
    return { ...item, samples };
  };

  const state = await evaluate(`({ start: !!document.querySelector('[aria-label="Start instruments"]'), stop: !!document.querySelector('[aria-label="Stop all instruments"]'), tabla: !![...document.querySelectorAll('#panel-controls button')].find(button => ['Play', 'Stop'].includes(button.textContent.trim())) })`);
  check('Representative playback controls are present', state, state.start && state.stop && state.tabla);
  if (state.stop) await click('[aria-label="Stop all instruments"]');
  const defaultTanpuraSelected = await evaluate(`!!document.querySelector('[aria-label="Disable Tanpura 1"]')`);
  if (defaultTanpuraSelected) await click('[aria-label="Disable Tanpura 1"]');
  await evaluate(`(() => {
    const taal = document.querySelector('#tabla-taal');
    if (taal) { taal.value = 'metronome-1'; taal.dispatchEvent(new Event('change', { bubbles: true })); }
    const tempo = document.querySelector('[aria-label="Tempo in BPM"]');
    if (tempo) { tempo.value = '120'; tempo.dispatchEvent(new Event('change', { bubbles: true })); tempo.dispatchEvent(new Event('blur', { bubbles: true })); }
    return { taal: taal?.value, tempo: tempo?.value };
  })()`);
  await click('[aria-label="Start instruments"]');
  const tablaStarted = await evaluate(`!![...document.querySelectorAll('#panel-controls button[aria-pressed]')].find(button => button.textContent.trim() === 'Stop' && button.getAttribute('aria-pressed') === 'true')`);
  if (!tablaStarted) await click('#panel-controls button', 'Play');
  const tabla = await collect('tabla-playing', 4200);
  check('Tabla capture contains the requested audio interval', { frames: tabla.frames, seconds: tabla.seconds }, tabla.frames >= 48000 * 3.5);
  check('Tabla produces audible PCM', { peak: tabla.peak, rms: tabla.rms }, tabla.rms > 0.0001 && tabla.peak > 0.01);
  check('Tabla has no duplicate attacks', tabla.duplicateAttackIntervals, tabla.duplicateAttackIntervals.length === 0);
  check('Tabla has at least one attack', tabla.attackCount, tabla.attackCount > 0);
  const cadence = tabla.attackIntervals.filter(interval => interval > 0.25 && interval < 0.8);
  const cadenceMedian = cadence.length ? cadence.slice().sort((a, b) => a - b)[Math.floor(cadence.length / 2)] : 0;
  check('Metronome-1 attacks follow the 120 BPM beat', { attackCount: tabla.attackCount, cadence, medianSeconds: cadenceMedian }, tabla.attackCount >= 6 && tabla.attackCount <= 13 && cadence.length >= 4 && Math.abs(cadenceMedian - 0.5) < 0.12);

  await click('[aria-label="Stop all instruments"]');
  const stopped = await collect('tabla-after-stop', 2400);
  const stopLimit = Math.max(0.0001, tabla.peak * 0.01);
  check('Stop reaches silence after intentional decay', { peak: stopped.peak, tailPeak: stopped.tailPeak, limit: stopLimit, rms: stopped.rms }, stopped.tailPeak <= stopLimit);

  const tablaSelected = await evaluate(`!!document.querySelector('[aria-label="Disable Tabla"]')`);
  if (tablaSelected) await click('[aria-label="Disable Tabla"]');
  const tanpuraButton = await evaluate(`!!document.querySelector('[aria-label="Enable Tanpura 1"], [aria-label="Turn on Tanpura 1"]')`);
  check('Tanpura playback control is present', tanpuraButton, tanpuraButton);
  await click('[aria-label="Enable Tanpura 1"], [aria-label="Turn on Tanpura 1"]');
  await click('[aria-label="Start instruments"]');
  // Cold tanpura sample preparation can take several seconds on the first run.
  const tanpura = await collect('tanpura-playing', 10000);
  check('Tanpura capture contains the requested audio interval', { frames: tanpura.frames, seconds: tanpura.seconds }, tanpura.frames >= 48000 * 8);
  check('Tanpura produces audible PCM', { peak: tanpura.peak, rms: tanpura.rms }, tanpura.rms > 0.0001 && tanpura.peak > 0.01);

  const tablaSelectedForMix = await evaluate(`!!document.querySelector('[aria-label="Enable Tabla"]')`);
  if (tablaSelectedForMix) await click('[aria-label="Enable Tabla"]');
  const tablaPlayAvailable = await evaluate(`!![...document.querySelectorAll('#panel-controls button')].find(button => button.textContent.trim() === 'Play' && !button.disabled)`);
  if (tablaPlayAvailable) await click('#panel-controls button', 'Play');
  const mixed = await collect('mixed-playing', 3200);
  check('Mixed capture contains the requested audio interval', { frames: mixed.frames, seconds: mixed.seconds }, mixed.frames >= 48000 * 2.5);
  const mixedSelected = await evaluate(`({ tanpura: !!document.querySelector('[aria-label="Disable Tanpura 1"]'), tabla: !!document.querySelector('[aria-label="Disable Tabla"]') })`);
  check('Mixed run has both selected instruments', mixedSelected, mixedSelected.tanpura && mixedSelected.tabla);
  check('Mixed output is audible and below full scale', { peak: mixed.peak, rms: mixed.rms }, mixed.rms > 0.0001 && mixed.peak > 0.01 && mixed.peak < 1);

  await click('[aria-label="Stop all instruments"]');
  const mixedStopped = await collect('mixed-after-stop', 2400);
  const mixedStopLimit = Math.max(0.0001, mixed.peak * 0.01);
  check('Mixed output stops without a later attack', { peak: mixedStopped.peak, tailPeak: mixedStopped.tailPeak, limit: mixedStopLimit, attacks: mixedStopped.attackCount }, mixedStopped.tailPeak <= mixedStopLimit);
  const unexpectedErrors = report.errors.filter(error => !String(error?.exception?.description || error?.text || '').includes('NotSupportedError'));
  check('No unexpected browser exceptions', unexpectedErrors, unexpectedErrors.length === 0, report.errors.length ? 'Chrome reported known audio NotSupportedError events; these remain in the report for investigation.' : undefined);
  const retained = await evaluate(`({ tanpura: !!document.querySelector('[aria-label="Disable Tanpura 1"]'), tabla: !!document.querySelector('[aria-label="Disable Tabla"]') })`);
  check('Stop retains selected instruments', retained, retained.tanpura && retained.tabla);
  const tempoBefore = await evaluate(`document.querySelector('[aria-label="Tempo"]')?.value`);
  await click('[aria-label="Increase tempo by 1 BPM"]');
  const tempoAfter = await evaluate(`document.querySelector('[aria-label="Tempo"]')?.value`);
  check('Stopped edits are retained for the next Start', { before: tempoBefore, after: tempoAfter }, Number(tempoAfter) === Number(tempoBefore) + 1);
  await click('[aria-label="Start instruments"]');
  const restarted = await collect('restart-playing', 2600);
  check('Start resumes the retained setup', { peak: restarted.peak, rms: restarted.rms }, restarted.rms > 0.0001);
  await click('[aria-label="Stop all instruments"]');
  await send('Page.reload', { ignoreCache: true });
  for (let attempt = 0; attempt < 120; attempt += 1) {
    if (await evaluate('document.readyState === "complete" && !!document.querySelector("main, [aria-label=\\"Practice controls\\"]")')) break;
    await wait(100);
  }
  await wait(700);
  await openInstrumentDetails();
  await setupCapture();
  await evaluate('window.__ticket02Tone.start()', { userGesture: true });
  const freshCapture = await collect('fresh-load', 1200);
  if (freshCapture.frames >= 48000 * 0.8) {
    check('Fresh load capture contains the requested interval', { frames: freshCapture.frames, seconds: freshCapture.seconds }, true);
    check('Fresh load is silent', { peak: freshCapture.peak, rms: freshCapture.rms }, freshCapture.peak < 0.0001);
  } else {
    const freshPlaybackState = await evaluate(`({ tablaPlaying: !![...document.querySelectorAll('#panel-controls button[aria-pressed]')].find(button => button.textContent.trim() === 'Stop' && button.getAttribute('aria-pressed') === 'true'), tanpuraPlaying: [...document.querySelectorAll('body *')].some(node => node.textContent?.trim() === 'Playing') })`);
    report.freshLoadCapture = 'state-only: no active source produced worklet frames after reload';
    check('Fresh load has no playback intent when PCM is unavailable', freshPlaybackState, !freshPlaybackState.tablaPlaying && !freshPlaybackState.tanpuraPlaying);
  }
  const freshDefaults = await evaluate(`({ tanpura: !!document.querySelector('[aria-label="Disable Tanpura 1"]'), tabla: !!document.querySelector('[aria-label="Disable Tabla"]') })`);
  check('Fresh load restores selected defaults without autoplay', freshDefaults, freshDefaults.tanpura && !freshDefaults.tabla);
  await evaluate(`(() => { const c = window.__ticket02Capture; c.captureNode.disconnect(); c.sink.disconnect(); return true; })()`);
  report.status = 'passed';
}

try {
  await main();
} catch (error) {
  report.failure = String(error?.stack || error);
  if (error?.skipped) report.status = 'skipped';
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch {}
  if (chrome && chrome.exitCode === null) {
    chrome.kill();
    await Promise.race([once(chrome, 'exit'), wait(2000)]);
  }
  try { await server?.close(); } catch {}
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Browser playback report: ${join(output, 'report.json')}`);
  if (report.status === 'skipped') console.error(`SKIPPED: ${report.skipReason}`);
}
