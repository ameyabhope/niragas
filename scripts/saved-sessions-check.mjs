#!/usr/bin/env node

/** Exercise named-session persistence through real browser controls and IndexedDB. */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const chromeCandidates = [process.env.CHROME_BIN, process.env.BROWSER_BIN,
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  '/Applications/Google Chrome Canary.app/Contents/MacOS/Google Chrome Canary',
  '/usr/bin/google-chrome', '/usr/bin/chromium'].filter(Boolean);
const chromeBin = chromeCandidates.find((candidate) => existsSync(candidate));
const report = { status: 'failed', checks: [], errors: [] };
let server; let browser; let ws;
const check = (name, passed, detail) => {
  report.checks.push({ name, passed: Boolean(passed), detail });
  if (!passed) throw new Error(`Failed browser check: ${name}`);
};

async function main() {
  if (!chromeBin) {
    report.status = 'skipped';
    report.skipReason = 'Chrome/Chromium executable not found. Set CHROME_BIN or BROWSER_BIN.';
    throw Object.assign(new Error(report.skipReason), { skipped: true });
  }
  const output = await mkdtemp(join(tmpdir(), 'niragas-saved-sessions-'));
  server = await createServer({ root, cacheDir: join(output, 'vite-cache'), server: { host: '127.0.0.1', port: 0, hmr: false } });
  await server.listen();
  const url = server.resolvedUrls.local?.[0];
  browser = spawn(chromeBin, ['--headless=new', '--remote-debugging-port=0', `--user-data-dir=${join(output, 'profile')}`, '--no-first-run', '--no-default-browser-check', '--autoplay-policy=no-user-gesture-required', 'about:blank'], { stdio: 'ignore' });
  let debugPort;
  for (let attempt = 0; attempt < 100; attempt += 1) {
    try { debugPort = Number((await readFile(join(output, 'profile', 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await wait(100); }
  }
  if (!debugPort) throw new Error('Chrome debugging endpoint unavailable');
  const target = (await (await fetch(`http://127.0.0.1:${debugPort}/json/list`)).json()).find((item) => item.type === 'page');
  ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolveOpen, rejectOpen) => { ws.addEventListener('open', resolveOpen); ws.addEventListener('error', rejectOpen); });
  let nextId = 0; const pending = new Map();
  ws.addEventListener('message', (event) => { const message = JSON.parse(event.data); if (message.id && pending.has(message.id)) { const item = pending.get(message.id); pending.delete(message.id); message.error ? item.reject(message.error) : item.resolve(message.result); } });
  const send = (method, params = {}) => new Promise((resolveSend, rejectSend) => { const id = ++nextId; pending.set(id, { resolve: resolveSend, reject: rejectSend }); ws.send(JSON.stringify({ id, method, params })); });
  const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true })).result?.value;
  const click = (text) => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => { const rect = node.getBoundingClientRect(); return node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && rect.width > 0 && rect.height > 0; }); if (!button) throw new Error('Missing visible button ${text}'); button.click(); return true; })()`);
  const input = (id, value) => evaluate(`(() => { const node = document.getElementById(${JSON.stringify(id)}); if (!node) throw new Error('Missing input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, ${JSON.stringify(value)}); node.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url }); await wait(1200);
  check('practice UI loaded', await evaluate('document.readyState === "complete" && !!document.querySelector("button")'));
  await click('+ Save Current'); await input('preset-name', 'Browser persistence check'); await click('Save'); await wait(500);
  const saveState = await evaluate('({ found: document.body.innerText.includes("Browser persistence check"), tail: document.body.innerText.slice(-1200), value: document.getElementById("preset-name")?.value, saveDisabled: [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === "Save")?.disabled })');
  check('save reports completion', saveState.found, saveState);
  check('saved session is in IndexedDB', await evaluate('new Promise((resolve) => { const request = indexedDB.open("niragas"); request.onsuccess = () => { const db = request.result; const tx = db.transaction("presets", "readonly"); const count = tx.objectStore("presets").count(); count.onsuccess = () => resolve(count.result > 0); count.onerror = () => resolve(false); }; request.onerror = () => resolve(false); })'));
  await send('Page.reload', { ignoreCache: true }); await wait(1200);
  check('refresh retains saved collection', await evaluate('document.body.innerText.includes("Browser persistence check")'));
  check('refresh remains stopped', await evaluate('document.body.innerText.includes("Start")'));
  const loaded = await evaluate('(() => { const button = [...document.querySelectorAll("button")].find((node) => node.textContent.includes("Browser persistence check")); button?.click(); return !!button; })()');
  check('explicit reload finds saved session', loaded);
  check('explicit reload does not autoplay', await evaluate('!document.body.innerText.includes("Playing")'));
  report.status = 'passed'; report.browser = await send('Browser.getVersion'); report.url = url;
}

try { await main(); } catch (error) { report.error = error.message; if (!error.skipped) process.exitCode = 1; } finally {
  if (ws) ws.close(); if (browser) browser.kill('SIGTERM'); if (server) await server.close();
  console.log(JSON.stringify(report, null, 2));
}
