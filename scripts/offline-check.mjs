#!/usr/bin/env node

/** Verify cached/uncached sample behavior offline against a production build. */
import { createServer as createStaticServer } from 'node:http';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const arg = (name, fallback) => {
  const index = process.argv.indexOf(name);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
};
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-offline-'))));
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

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon', '.webmanifest': 'application/manifest+json',
  '.wav': 'audio/wav', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.mp3': 'audio/mpeg',
  '.woff': 'font/woff', '.woff2': 'font/woff2',
};

/** Serve a directory statically; the service worker needs same-origin JS, nothing more. */
function serveDirectory(directory) {
  const dist = resolve(directory);
  const state = { failSamples: false, sampleHits: [] };
  const server = createStaticServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
      const file = resolve(join(dist, pathname === '/' ? 'index.html' : pathname.slice(1)));
      if (!file.startsWith(dist)) {
        response.writeHead(403);
        response.end();
        return;
      }
      if (pathname.includes('/samples/')) state.sampleHits.push(pathname);
      // Deterministic uncached-sample failure: the service worker issues its
      // own network requests from a separate target that page-level network
      // emulation does not reach, so the outage is injected here instead.
      if (state.failSamples && pathname.includes('/samples/')) {
        response.writeHead(500);
        response.end();
        return;
      }
      const body = await readFile(file);
      response.writeHead(200, { 'Content-Type': MIME[extname(file)] ?? 'application/octet-stream' });
      response.end(body);
    } catch {
      response.writeHead(404);
      response.end();
    }
  });
  return new Promise((resolveServer) => {
    server.listen(0, '127.0.0.1', () => {
      const address = server.address();
      resolveServer({
        url: `http://127.0.0.1:${typeof address === 'object' && address ? address.port : 0}/`,
        setFailSamples: (value) => { state.failSamples = value; },
        clearSampleHits: () => { state.sampleHits = []; },
        sampleHits: () => [...state.sampleHits],
        close: () => new Promise((done) => server.close(() => done())),
      });
    });
  });
}

async function main() {
  if (!existsSync(join(root, 'dist', 'index.html'))) {
    report.status = 'skipped';
    report.skipReason = 'Production build is missing. Run npm run build first.';
    throw Object.assign(new Error(report.skipReason), { skipped: true });
  }
  if (!chromeBin) {
    report.status = 'skipped';
    report.skipReason = 'Chrome/Chromium executable not found. Set CHROME_BIN or BROWSER_BIN.';
    throw Object.assign(new Error(report.skipReason), { skipped: true });
  }
  server = await serveDirectory(join(root, 'dist'));
  const url = server.url;
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
  const until = async (expression, what, attempts = 120) => {
    for (let i = 0; i < attempts; i += 1) {
      if (await evaluate(expression)) return;
      await wait(250);
    }
    throw new Error(`Timed out waiting for: ${what}`);
  };
  const openDetails = async () => evaluate('(() => { for (const details of document.querySelectorAll("details")) details.open = true; return true; })()');

  await send('Runtime.enable');
  await send('Network.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI');
  report.browser = await send('Browser.getVersion');
  // Let the service worker install, then reload so it controls the page and
  // runtime-caches the samples fetched below.
  await wait(2000);
  await send('Page.reload', { ignoreCache: false });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI after reload');
  const controlled = await evaluate(`!!navigator.serviceWorker?.controller`);
  check('service worker controls the page', { controlled }, controlled);
  await openDetails();

  const sectionText = async (heading) => evaluate(`(() => {
    const title = [...document.querySelectorAll('h3')].find((node) => node.textContent.trim() === ${JSON.stringify(heading)});
    const section = title?.closest('div.rounded-xl');
    return section ? { text: section.innerText, alert: section.querySelector('[role="alert"]')?.textContent ?? null } : null;
  })()`);
  const tanpuraPlaying = async () => (await sectionText('Tanpura 1'))?.text.includes('Playing') ?? false;
  const tanpuraError = async () => (await sectionText('Tanpura 1'))?.alert;
  const clickText = async (text) => evaluate(`(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && node.getBoundingClientRect().width > 0);
    if (!button) throw new Error('Missing visible button: ' + ${JSON.stringify(text)});
    button.click();
    return true;
  })()`);
  const clickTuning = async (tuning) => evaluate(`(() => {
    const panel = document.querySelector('[aria-label="Turn off Tanpura 1"], [aria-label="Turn on Tanpura 1"]')?.closest('div');
    const scope = panel?.parentElement ?? document;
    const button = [...scope.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(tuning)} && !node.disabled && node.getBoundingClientRect().width > 0);
    if (!button) throw new Error('Missing tuning button: ' + ${JSON.stringify(tuning)});
    button.click();
    return true;
  })()`);

  await clickText('START');
  await until('(() => { const s = [...document.querySelectorAll("h3")].find((n) => n.textContent.trim() === "Tanpura 1")?.closest("div.rounded-xl"); return !!s && s.innerText.includes("Playing"); })()', 'online tanpura playback', 160);
  const cacheCount = await evaluate(`caches.keys().then((keys) => keys.join(','))`);
  check('sample cache exists after online playback', { cacheCount }, String(cacheCount).includes('audio-samples'));

  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  await send('Page.reload', { ignoreCache: false });
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'offline app shell');
  // Re-assert offline emulation: reloads can drop network conditions.
  await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 });
  check('app shell loads offline from precache', await evaluate('!!document.querySelector("main")'), true);
  // Count sample requests only inside the offline window.
  server.clearSampleHits();
  await openDetails();
  await clickText('START');
  await until('(() => { const s = [...document.querySelectorAll("h3")].find((n) => n.textContent.trim() === "Tanpura 1")?.closest("div.rounded-xl"); return !!s && s.innerText.includes("Playing"); })()', 'cached tanpura playback offline', 160);
  check('cached selection plays offline', await tanpuraPlaying(), true);
  // No sample request may reach the server after the offline reload: the
  // sound must come from the service-worker cache.
  check('offline sound is served from the sample cache without network hits', { hits: server.sampleHits() }, server.sampleHits().length === 0);

  server.setFailSamples(true);
  // Only the played Pa sample (plus whatever the engine preloads) is cached;
  // Ni stays uncached so the offline failure path is genuine.
  await clickTuning('Ni');
  await until('(() => { const s = [...document.querySelectorAll("h3")].find((n) => n.textContent.trim() === "Tanpura 1")?.closest("div.rounded-xl"); return !!s?.querySelector("[role=alert]"); })()', 'uncached offline failure', 160);
  const failureState = { error: await tanpuraError(), playing: await tanpuraPlaying(), retry: await evaluate(`!!document.querySelector('[aria-label="Retry Tanpura 1"]')`) };
  check('uncached selection fails truthfully while retaining the old sound', failureState, !!failureState.error && failureState.playing && failureState.retry);

  server.setFailSamples(false);
  await evaluate(`document.querySelector('[aria-label="Retry Tanpura 1"]')?.click()`);
  await until('(() => { const s = [...document.querySelectorAll("h3")].find((n) => n.textContent.trim() === "Tanpura 1")?.closest("div.rounded-xl"); return !!s && s.innerText.includes("Playing") && !s.querySelector("[role=alert]"); })()', 'recovery after reconnect', 160);
  check('recovery succeeds after reconnect', await tanpuraPlaying(), true);

  await clickText('STOP');
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
