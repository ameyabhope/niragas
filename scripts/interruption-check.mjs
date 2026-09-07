#!/usr/bin/env node

/** Exercise interruption status and explicit Resume through real browser controls. */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-interruption-'))));
const chromeCandidates = [process.env.CHROME_BIN, process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chromeBin = chromeCandidates.find((candidate) => existsSync(candidate));
const report = { status: 'failed', output, checks: [], errors: [], artifacts: [] };
let server; let browser; let ws;
const check = (name, value, passed) => {
  report.checks.push({ name, value, passed: Boolean(passed) });
  if (!passed) throw new Error(`Failed browser check: ${name}`);
};

function rms(samples) {
  let sum = 0;
  for (const value of samples) sum += value * value;
  return Math.sqrt(sum / samples.length);
}

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
  const click = async (text) => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => {
      const rect = node.getBoundingClientRect();
      return node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && rect.width > 0 && rect.height > 0;
    });
    if (!button) throw new Error('Missing visible button: ' + ${JSON.stringify(text)});
    button.click();
    return true;
  })()`);
  const until = async (expression, what) => {
    for (let i = 0; i < 100; i += 1) {
      if (await evaluate(expression)) return;
      await wait(150);
    }
    throw new Error(`Timed out waiting for: ${what}`);
  };

  await send('Runtime.enable');
  await send('Page.navigate', { url });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI');
  await wait(600);
  report.browser = await send('Browser.getVersion');

  // Attach a PCM tap to the live mixer output for audibility evidence.
  const captureSetup = await evaluate(`(async () => {
    const source = await (await fetch('/src/audio/mixer.ts')).text();
    const toneUrl = source.match(/from\\s+['"]([^'"]*tone[^'"]*)['"]/i)?.[1];
    window.__ticket08Tone = await import(toneUrl);
    const mixer = await import('/src/audio/mixer.ts');
    const context = window.__ticket08Tone.getContext();
    const raw = context.rawContext;
    window.__ticket08Context = raw;
    const workletCode = "class Ticket08Capture extends AudioWorkletProcessor { process(inputs) { const input = inputs[0]?.[0]; if (input) this.port.postMessage(input.slice()); return true; } } registerProcessor('ticket08-capture', Ticket08Capture);";
    const moduleUrl = URL.createObjectURL(new Blob([workletCode], { type: 'application/javascript' }));
    // Tone caches its own worklet bundle as one promise; capture must not occupy that cache.
    await raw.audioWorklet.addModule(moduleUrl);
    URL.revokeObjectURL(moduleUrl);
    const captureNode = context.createAudioWorkletNode('ticket08-capture', { numberOfInputs: 1, numberOfOutputs: 1, channelCount: 1 });
    const sink = context.createGain();
    sink.gain.value = 0;
    window.__ticket08Chunks = [];
    captureNode.port.onmessage = (event) => window.__ticket08Chunks.push(...event.data);
    mixer.getMasterNode().connect(captureNode);
    captureNode.connect(sink);
    sink.connect(raw.destination);
    return { state: raw.state, sampleRate: raw.sampleRate };
  })()`);
  check('capture is available', captureSetup, captureSetup?.sampleRate > 0);
  const collectRms = async (milliseconds) => {
    await evaluate('window.__ticket08Chunks = []');
    await wait(milliseconds);
    const values = await evaluate('window.__ticket08Chunks.splice(0)');
    return rms(Float32Array.from(values));
  };

  await click('START');
  await until('document.body.innerText.includes("Tanpura")', 'playback UI');
  await wait(2500);
  const playingRms = await collectRms(1500);
  check('accompaniment is audible before interruption', { rms: playingRms }, playingRms > 0.0001);

  const media = await evaluate(`(() => ({
    hasSession: !!navigator.mediaSession,
    metadata: navigator.mediaSession?.metadata ? { title: navigator.mediaSession.metadata.title, artist: navigator.mediaSession.metadata.artist } : null,
    playbackState: navigator.mediaSession?.playbackState ?? null,
  }))()`);
  check('Media Session is present', media, media.hasSession);
  check('Media Session metadata reflects current Sa', media.metadata, !!media.metadata?.title?.includes('Sa'));

  await evaluate('window.__ticket08Context.suspend()');
  await until('document.body.innerText.includes("Audio interrupted")', 'interrupted status');
  const resumeVisible = await evaluate(`[...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'Resume audio' && node.getBoundingClientRect().width > 0)`);
  check('interrupted status with explicit Resume is shown', { resumeVisible }, resumeVisible);
  const retained = await evaluate(`({ tanpura: !!document.querySelector('[aria-label="Disable Tanpura 1"]') })`);
  check('settings are preserved through interruption', retained, retained.tanpura);

  await click('STOP');
  await wait(400);
  const statusAfterStop = await evaluate('document.body.innerText.includes("Audio interrupted")');
  check('Stop while interrupted clears the interruption status', { interrupted: statusAfterStop }, !statusAfterStop);

  await click('START');
  await wait(2000);
  await evaluate('window.__ticket08Context.suspend()');
  await until('document.body.innerText.includes("Audio interrupted")', 'second interruption');
  await click('Resume audio');
  await until('!document.body.innerText.includes("Audio interrupted")', 'recovery');
  await wait(2000);
  const resumedRms = await collectRms(1500);
  check('explicit Resume restores audible playback', { rms: resumedRms }, resumedRms > 0.0001);

  await click('STOP');
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
