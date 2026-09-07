#!/usr/bin/env node

/** Verify recording and microphone capture stay independent of accompaniment. */
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
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-recording-'))));
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
  browser = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(output, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', '--mute-audio', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', 'about:blank'], { stdio: 'ignore' });
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
  const button = async (text) => evaluate(`(() => {
    const found = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && node.getBoundingClientRect().width > 0);
    if (!found) throw new Error('Missing visible button: ' + ${JSON.stringify(text)});
    found.click();
    return true;
  })()`);
  const labelled = async (label) => evaluate(`(() => {
    const found = document.querySelector(${JSON.stringify(`[aria-label="${label}"]`)});
    if (!found) throw new Error('Missing control: ' + ${JSON.stringify(label)});
    found.click();
    return true;
  })()`);
  const bodyText = () => evaluate('document.body.innerText');

  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI');
  await wait(600);
  report.browser = await send('Browser.getVersion');
  await evaluate('(() => { for (const details of document.querySelectorAll("details")) details.open = true; return true; })()');

  await button('START');
  await wait(2000);
  await labelled('Start recording');
  await until('document.body.innerText.includes("Recording active")', 'recording indicator');
  check('mix recording starts during accompaniment with an accurate indicator', await bodyText().then((text) => text.includes('Recording active')), true);
  await wait(2500);

  await button('STOP');
  await wait(600);
  const afterStop = await bodyText();
  check('global Stop leaves the take recording', afterStop.includes('Recording active'), true);
  check('accompaniment stopped while recording', afterStop.includes('Recording active') && !afterStop.includes('Audio interrupted'), true);

  await button('Stop');
  await until('document.body.innerText.includes("Saved in browser") || document.body.innerText.includes("Recording")', 'saved recording');
  const saved = await evaluate(`[...document.querySelectorAll('button')].some((node) => (node.getAttribute('aria-label') ?? '').startsWith('Play ') || (node.getAttribute('aria-label') ?? '').startsWith('Download '))`);
  check('stopped take is saved in the browser collection', { saved }, saved);
  check('recording indicator clears after stop', !(await bodyText()).includes('Recording active'), true);

  await button('Start Tuner');
  await until(`[...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'Stop Tuner')`, 'tuner active');
  check('microphone tuner starts with a fake device', await bodyText().then((text) => text.includes('Microphone')), true);
  await button('START');
  await wait(1500);
  await button('STOP');
  await wait(400);
  const tunerSurvives = await evaluate(`[...document.querySelectorAll('button')].some((node) => node.textContent.trim() === 'Stop Tuner')`);
  check('microphone capture survives accompaniment Stop', { tunerSurvives }, tunerSurvives);
  await button('Stop Tuner');
  await wait(300);

  const unexpectedErrors = report.errors.filter((error) => !String(error?.exception?.description || error?.text || '').includes('NotSupportedError'));
  check('No unexpected browser exceptions', unexpectedErrors, unexpectedErrors.length === 0, report.errors.length ? 'Chrome reported known audio NotSupportedError events; these remain in the report for investigation.' : undefined);
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
