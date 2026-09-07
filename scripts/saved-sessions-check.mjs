#!/usr/bin/env node

/** Exercise named-session persistence through real browser controls and IndexedDB. */
import { createServer } from 'vite';
import { spawn } from 'node:child_process';
import { mkdtemp, readFile, writeFile, readdir } from 'node:fs/promises';
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
  const click = (text) => evaluate(`(() => { const button = [...document.querySelectorAll('button')].find((node) => { const rect = node.getBoundingClientRect(); return node.textContent.trim() === ${JSON.stringify(text)} && !node.disabled && rect.width > 0 && rect.height > 0; }); if (!button) throw new Error('Missing visible button: ' + ${JSON.stringify(text)}); button.click(); return true; })()`);
  const input = (id, value) => evaluate(`(() => { const node = document.getElementById(${JSON.stringify(id)}); if (!node) throw new Error('Missing input'); const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(node, ${JSON.stringify(value)}); node.dispatchEvent(new Event('input', { bubbles: true })); return true; })()`);
  // Dialog responses queued in interaction order: { kind: 'prompt', text } or { kind: 'confirm', accept }.
  const dialogs = [];
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Page.javascriptDialogOpening') {
      const next = dialogs.shift();
      const dialogType = message.params?.type;
      if (dialogType === 'prompt' && next?.kind === 'prompt') {
        send('Page.handleJavaScriptDialog', { accept: true, promptText: next.text });
      } else if ((dialogType === 'confirm' || dialogType === 'alert') && next?.kind === 'confirm') {
        send('Page.handleJavaScriptDialog', { accept: next.accept });
      } else {
        send('Page.handleJavaScriptDialog', { accept: false });
      }
    }
  });
  const entryAction = (name, label, text) => evaluate(`(() => {
    const entry = [...document.querySelectorAll('button')].find((node) => node.textContent.includes(${JSON.stringify(name)}) && node.textContent.includes('bpm'))?.closest('div[class*="flex"]')?.parentElement;
    const scope = entry ?? document;
    const target = scope.querySelector(${JSON.stringify(`[aria-label="${label}"]`)})
      ?? [...scope.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(text ?? '')} && node.getBoundingClientRect().width > 0);
    if (!target) throw new Error('Missing entry action: ' + ${JSON.stringify(label)});
    target.click();
    return true;
  })()`);
  const bodyText = () => evaluate('document.body.innerText');
  await send('Page.enable');
  await send('Runtime.enable'); await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url }); await wait(1200);
  check('practice UI loaded', await evaluate('document.readyState === "complete" && !!document.querySelector("button")'));
  await click('+ Save Current'); await input('preset-name', 'Browser persistence check'); await click('Save'); await wait(500);
  const saveState = await evaluate('({ found: document.body.innerText.includes("Browser persistence check"), tail: document.body.innerText.slice(-1200), value: document.getElementById("preset-name")?.value, saveDisabled: [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === "Save")?.disabled })');
  check('save reports completion', saveState.found, saveState);
  check('saved session is in IndexedDB', await evaluate('new Promise((resolve) => { const request = indexedDB.open("niragas"); request.onsuccess = () => { const db = request.result; const tx = db.transaction("presets", "readonly"); const count = tx.objectStore("presets").count(); count.onsuccess = () => resolve(count.result > 0); count.onerror = () => resolve(false); }; request.onerror = () => resolve(false); })'));
  await send('Page.reload', { ignoreCache: true }); await wait(1200);
  check('refresh retains saved collection', await evaluate('document.body.innerText.includes("Browser persistence check")'));
  check('refresh remains stopped', await evaluate('document.body.innerText.includes("Start")'));
  const untilText = async (text, what) => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if ((await bodyText()).includes(text)) return;
      await wait(200);
    }
    throw new Error(`Timed out waiting for: ${what}`);
  };
  const searchFor = (term) => evaluate(`(() => {
    const field = document.querySelector('[aria-label="Search presets by name or taal"]');
    if (!field) throw new Error('Preset search is missing');
    field.focus();
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
    setter.call(field, ${JSON.stringify(term)});
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.dispatchEvent(new Event('change', { bubbles: true }));
    return true;
  })()`);
  const setImportFile = async (path) => {
    const documentNode = await send('DOM.getDocument');
    const query = await send('DOM.querySelector', { nodeId: documentNode.root.nodeId, selector: 'input[type="file"]' });
    if (!query.nodeId) throw new Error('Import file input is missing');
    await send('DOM.setFileInputFiles', { files: [path], nodeId: query.nodeId });
  };

  const loaded = await evaluate('(() => { const button = [...document.querySelectorAll("button")].find((node) => node.textContent.includes("Browser persistence check")); button?.click(); return !!button; })()');
  check('explicit reload finds saved session', loaded);
  check('explicit reload does not autoplay', await evaluate('!document.body.innerText.includes("Playing")'));

  dialogs.push({ kind: 'prompt', text: 'Renamed session' });
  await entryAction('Browser persistence check', 'Rename saved session Browser persistence check', 'Rename');
  await untilText('Renamed session', 'renamed session in the list');
  check('rename updates the saved session', await bodyText().then((text) => text.includes('Renamed session')));

  dialogs.push({ kind: 'prompt', text: 'Copied session' });
  await entryAction('Renamed session', 'Save a copy of Renamed session', 'Copy');
  await untilText('Copied session', 'saved copy in the list');
  const bothPresent = await bodyText();
  check('save-as-copy leaves the original unchanged', bothPresent.includes('Renamed session') && bothPresent.includes('Copied session'));

  await entryAction('Renamed session', 'Update saved session Renamed session from current settings', 'Update');
  await untilText('Updated saved session', 'explicit update announcement');
  check('explicit update overwrites only on demand', await bodyText().then((text) => text.includes('Updated saved session Renamed session')));

  await entryAction('Copied session', 'Add Copied session to favorites', '☆');
  await click('Favorites');
  let favoritesEntries = [];
  for (let attempt = 0; attempt < 60; attempt += 1) {
    favoritesEntries = await evaluate(`[...document.querySelectorAll('button')].filter((node) => node.textContent.includes('bpm')).map((node) => node.textContent)`);
    if (favoritesEntries.some((text) => text.includes('Copied session'))) break;
    await wait(200);
  }
  check('favorites view shows only favorited sessions', favoritesEntries.some((text) => text.includes('Copied session')) && !favoritesEntries.some((text) => text.includes('Renamed session')), { entries: favoritesEntries.length });
  await click('All');
  await searchFor('Copied');
  await wait(400);
  const searchEntries = await evaluate(`[...document.querySelectorAll('button')].filter((node) => node.textContent.includes('bpm')).map((node) => node.textContent)`);
  check('search filters the collection', searchEntries.length >= 1 && searchEntries.every((text) => text.toLowerCase().includes('copied')), { entries: searchEntries.length });
  await searchFor('');
  await wait(300);

  const downloads = join(output, 'downloads');
  await send('Browser.setDownloadBehavior', { behavior: 'allow', downloadPath: downloads });
  await click('Export');
  let exportedPath = null;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const files = (await readdir(downloads).catch(() => [])).filter((file) => file.endsWith('.json'));
    if (files.length) { exportedPath = join(downloads, files[0]); break; }
    await wait(200);
  }
  check('export downloads a file', exportedPath, { exportedPath });
  const exported = JSON.parse(await readFile(exportedPath, 'utf8'));
  check('export round-trips the versioned envelope', { format: exported.format, schemaVersion: exported.schemaVersion, count: exported.presets?.length }, exported.format === 'niragas-presets' && exported.schemaVersion === 3 && exported.presets.some((preset) => preset.name === 'Renamed session'));

  dialogs.push({ kind: 'confirm', accept: true });
  await entryAction('Renamed session', 'Delete preset Renamed session', 'x');
  await untilText('Deleted saved session', 'delete announcement');
  const entryGone = await evaluate(`![...document.querySelectorAll('button')].some((node) => node.textContent.includes('Renamed session') && node.textContent.includes('bpm'))`);
  check('delete removes the session with an announcement', entryGone, { entryGone });

  await setImportFile(exportedPath);
  await untilText('already exists', 'duplicate-ID rejection');
  check('duplicate IDs are rejected without overwriting', await bodyText().then((text) => text.includes('already exists') && text.includes('Copied session')));

  const freshId = `custom-import-${Date.now()}`;
  const fresh = { ...exported.presets.find((preset) => preset.name === 'Copied session'), id: freshId, name: 'Imported session' };
  const freshPath = join(output, 'fresh-session.json');
  await writeFile(freshPath, JSON.stringify({ format: 'niragas-presets', schemaVersion: 3, presets: [fresh] }));
  await setImportFile(freshPath);
  await untilText('Imported 1 saved session', 'import announcement');
  check('valid import adds the session', await bodyText().then((text) => text.includes('Imported session')));

  const malformedPath = join(output, 'malformed.json');
  await writeFile(malformedPath, 'not json{{{');
  await setImportFile(malformedPath);
  await untilText('Could not import saved sessions', 'malformed import error');
  check('malformed imports fail truthfully without mutation', await bodyText().then((text) => text.includes('Could not import saved sessions') && text.includes('Imported session')));

  report.status = 'passed'; report.browser = await send('Browser.getVersion'); report.url = url;
}

try { await main(); } catch (error) { report.error = error.message; if (!error.skipped) process.exitCode = 1; } finally {
  if (ws) ws.close(); if (browser) browser.kill('SIGTERM'); if (server) await server.close();
  console.log(JSON.stringify(report, null, 2));
}
