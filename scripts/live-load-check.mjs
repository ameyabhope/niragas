#!/usr/bin/env node

/** Apply factory presets while accompaniment runs, through real browser controls. */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { attacks } from './pcm-metrics.mjs';

const root = resolve(new URL('..', import.meta.url).pathname);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-live-load-'))));
const chromeCandidates = [process.env.CHROME_BIN, process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chromeBin = chromeCandidates.find((candidate) => existsSync(candidate));
const report = { status: 'failed', output, checks: [], errors: [], artifacts: [] };
function wavFloat32(samples, sampleRate) {
  const pcm = Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength);
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(3, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * 4, 28);
  header.writeUInt16LE(4, 32);
  header.writeUInt16LE(32, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
let server; let browser; let ws;
const check = (name, value, passed) => {
  report.checks.push({ name, value, passed: Boolean(passed) });
  if (!passed) throw new Error(`Failed browser check: ${name}`);
};

async function main() {
  if (!chromeBin) {
    report.status = 'skipped';
    report.skipReason = 'Chrome/Chromium executable not found. Set CHROME_BIN or BROWSER_BIN.';
    throw Object.assign(new Error(report.skipReason), { skipped: true });
  }
  server = await createServer({ root, cacheDir: join(output, 'vite-cache'), server: { host: '127.0.0.1', port: 0, hmr: false } });
  await server.listen();
  const url = server.resolvedUrls.local?.[0];
  if (!url) throw new Error('Vite did not expose a local URL');
  report.url = url;
  browser = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(output, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
  let debugPort;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { debugPort = Number((await readFile(join(output, 'profile', 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await wait(100); }
  }
  if (!debugPort) throw new Error('Chrome debugging endpoint unavailable');
  const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((item) => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => { ws.addEventListener('open', resolveOpen); ws.addEventListener('error', rejectOpen); });
  let nextId = 0; const pending = new Map();
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const item = pending.get(message.id); pending.delete(message.id);
      message.error ? item.reject(message.error) : item.resolve(message.result);
    }
    if (message.method === 'Runtime.exceptionThrown') report.errors.push(message.params.exceptionDetails);
  });
  const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => { const id = ++nextId; pending.set(id, { resolve: resolveSend, reject: rejectSend }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result?.value;
  };
  const until = async (expression, what) => {
    for (let i = 0; i < 100; i += 1) {
      if (await evaluate(expression)) return;
      await wait(150);
    }
    throw new Error(`Timed out waiting for: ${what}`);
  };

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI');
  await wait(600);
  report.browser = await send('Browser.getVersion');

  const sampleRate = await evaluate(`(async () => {
    const source = await (await fetch('/src/audio/mixer.ts')).text();
    const toneUrl = source.match(/from\\s+['"]([^'"]*tone[^'"]*)['"]/i)?.[1];
    window.__liveTone = await import(toneUrl);
    const mixer = await import('/src/audio/mixer.ts');
    const context = window.__liveTone.getContext();
    const raw = context.rawContext;
    const workletCode = "class LiveLoadCapture extends AudioWorkletProcessor { process(inputs) { const input = inputs[0]?.[0]; if (input) this.port.postMessage(input.slice()); return true; } } registerProcessor('live-load-capture', LiveLoadCapture);";
    const moduleUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
    // Tone caches its own worklet bundle as one promise; capture must not occupy that cache.
    await raw.audioWorklet.addModule(moduleUrl);
    URL.revokeObjectURL(moduleUrl);
    const captureNode = context.createAudioWorkletNode('live-load-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    const sink = context.createGain();
    sink.gain.value = 0;
    window.__liveChunks = [];
    captureNode.port.onmessage = (event) => window.__liveChunks.push(...event.data);
    mixer.getMasterNode().connect(captureNode);
    captureNode.connect(sink);
    sink.connect(raw.destination);
    return raw.sampleRate;
  })()`);
  check('capture is available', { sampleRate }, sampleRate > 0);
  const collectAcross = async (name, milliseconds, during) => {
    await evaluate('window.__liveChunks = []');
    const collection = (async () => { await wait(milliseconds); return Float32Array.from(await evaluate('window.__liveChunks.splice(0)')); })();
    if (during) await during();
    const samples = await collection;
    const filename = `${name}.wav`;
    await writeFile(join(output, filename), wavFloat32(samples, sampleRate));
    report.artifacts.push(filename);
    return { name, sampleRate, ...attacks(samples, sampleRate) };
  };

  const clickButton = async (text, container = 'document') => evaluate(`(() => {
    const scope = ${container};
    const button = [...scope.querySelectorAll('button')].find((node) => {
      const rect = node.getBoundingClientRect();
      return node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && rect.width > 0 && rect.height > 0;
    });
    if (!button) throw new Error('Missing visible button: ' + ${JSON.stringify(text)});
    button.click();
    return true;
  })()`);
  const openDetails = async () => evaluate('(() => { for (const details of document.querySelectorAll("details")) details.open = true; return true; })()');
  await openDetails();

  const setSections = async (wanted) => evaluate(`(() => {
    const root = document.getElementById('preset-load-options');
    if (!root) throw new Error('Load options are not visible');
    for (const label of root.querySelectorAll('label')) {
      const input = label.querySelector('input[type="checkbox"]');
      const name = label.textContent.trim().toLowerCase();
      const key = name.includes('sur-peti') ? 'surpeti' : name.includes('swar') ? 'swarmandal' : name;
      const shouldCheck = ${JSON.stringify(wanted)}.includes(key);
      if (input.checked !== shouldCheck) input.click();
    }
    return true;
  })()`);
  const searchPresets = async (term) => evaluate(`(() => {
    const input = document.querySelector('[aria-label="Search presets by name or taal"]');
    if (!input) throw new Error('Preset search is missing');
    input.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, ${JSON.stringify(term)});
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const applyPresetCalled = async (name) => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.includes(${JSON.stringify(name)}) && node.textContent.includes('bpm'));
    if (!button) throw new Error('Preset entry is missing: ' + ${JSON.stringify(name)});
    button.click();
    return true;
  })()`);
  const setSelect = async (selector, value) => evaluate(`(() => {
    const select = document.querySelector(${JSON.stringify(selector)});
    if (!select) throw new Error('Missing select: ' + ${JSON.stringify(selector)});
    select.value = ${JSON.stringify(value)};
    select.dispatchEvent(new Event('change', { bubbles: true }));
    return select.value;
  })()`);
  const tablaStatus = async () => evaluate(`document.querySelector('#panel-controls [role="status"]')?.textContent?.trim() ?? null`);
  const beatDisplayLabel = async () => evaluate(`document.querySelector('[aria-label$="beat cycle, grouped by vibhag"]')?.getAttribute('aria-label') ?? null`);

  await clickButton('START');
  await setSelect('#tabla-taal', 'teentaal');
  await until('document.querySelector("#tabla-style")?.value === "theka"', 'Teentaal style selector');
  await clickButton('Play');
  await wait(1200);
  check('same-taal baseline is sounding theka', await tablaStatus(), (await tablaStatus())?.includes('Teentaal / Theka'));
  await clickButton('STOP');
  await setSelect('#tabla-style', 'variation1');
  await clickButton('+ Save Current');
  await evaluate(`(() => {
    const input = document.querySelector('#preset-name');
    if (!input) throw new Error('Save preset dialog is missing');
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'Live same taal variation');
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  await clickButton('Save', 'document.querySelector("#save-preset-dialog")');
  await wait(500);
  await setSelect('#tabla-style', 'theka');
  await clickButton('Play');
  await wait(1000);
  await evaluate(`(() => {
    for (const label of ['Disable Tanpura 1', 'Disable Tanpura 2']) {
      const button = document.querySelector('[aria-label="' + label + '"]');
      if (button) button.click();
    }
    return true;
  })()`);
  await clickButton('Options');
  await setSections(['tabla']);
  await searchPresets('Live same taal variation');
  await wait(300);
  const sameTaalLoad = await collectAcross('same-taal-style-load', 2400, async () => {
    await applyPresetCalled('Live same taal variation');
    const selected = await evaluate('document.querySelector("#tabla-style")?.value ?? null');
    check('same-taal load selects saved style', { selected }, selected === 'variation1');
    await until('(() => { const text = document.querySelector("#panel-controls [role=\\"status\\"]")?.textContent ?? ""; return text.includes("Playing Teentaal / Variation 1.") && !text.includes("Selected"); })()', 'next-beat style display');
    const nextBeat = await tablaStatus();
    check('same-taal load displays saved style after next beat', nextBeat, nextBeat?.includes('Teentaal / Variation 1'));
  });
  check('same-taal style load keeps tabla sounding', { attacks: sameTaalLoad.attackCount, rms: sameTaalLoad.rms }, sameTaalLoad.attackCount >= 4 && sameTaalLoad.rms > 0.0001);

  await clickButton('STOP');
  await evaluate(`(() => {
    const taal = document.querySelector('#tabla-taal');
    if (taal) { taal.value = 'metronome-1'; taal.dispatchEvent(new Event('change', { bubbles: true })); }
    return true;
  })()`);
  await clickButton('START');
  await wait(1500);
  if (await evaluate('!![...document.querySelectorAll("#panel-controls button")].find((node) => node.textContent.trim() === "Play" && !node.disabled)')) await clickButton('Play');
  const baseline = await collectAcross('tabla-baseline', 3000, null);
  check('tabla sounds before live loading', { attacks: baseline.attackCount, rms: baseline.rms }, baseline.attackCount >= 4 && baseline.rms > 0.0001);
  check('display follows the sounding pattern', await beatDisplayLabel(), (await beatDisplayLabel())?.toLowerCase().includes('metronome'));

  await setSections(['tanpura']);
  await searchPresets('Malkauns');
  await wait(400);
  const partial = await collectAcross('partial-load', 6000, async () => {
    await wait(1200);
    await applyPresetCalled('Malkauns');
  });
  const cadence = partial.attackIntervals.filter((interval) => interval > 0.25 && interval < 0.8);
  check('partial live load keeps tabla sounding without duplicates', { attacks: partial.attackCount, duplicates: partial.duplicateAttackIntervals, cadence }, partial.attackCount >= 8 && partial.duplicateAttackIntervals.length === 0 && cadence.length >= 5);
  check('display still follows the sounding pattern', await beatDisplayLabel(), (await beatDisplayLabel())?.toLowerCase().includes('metronome'));

  await setSections(['pitch', 'tanpura', 'tabla', 'surpeti', 'swarmandal', 'mixer', 'eq']);
  await searchPresets('Desh');
  await wait(400);
  await applyPresetCalled('Desh');
  await wait(2500);
  const afterFull = await collectAcross('full-load', 3000, null);
  const tablaStopped = await evaluate(`[...document.querySelectorAll('#panel-controls button')].some((node) => node.textContent.trim() === 'Play' && !node.disabled)`);
  check('full live load applies the requested selection without a global stop', { tablaPlayAvailable: tablaStopped, rms: afterFull.rms }, tablaStopped && afterFull.rms > 0.0001);
  check('tanpura keeps playing after the full load', { rms: afterFull.rms }, afterFull.rms > 0.005);

  await clickButton('STOP');
  check('No uncaught browser exceptions', report.errors, report.errors.length === 0);
  report.status = 'passed';
}

try { await main(); } catch (error) {
  report.failure = String(error?.stack || error);
  if (error?.skipped) report.status = 'skipped';
  process.exitCode = 1;
} finally {
  try { ws?.close(); } catch { /* no socket */ }
  if (browser) browser.kill('SIGTERM');
  if (server) await server.close().catch(() => {});
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
}
