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
const output = await mkdtemp(join(tmpdir(), 'niragas-saved-sessions-'));
const report = { status: 'failed', output, checks: [], errors: [] };
report.runtime = { exceptionThrown: [], exceptionRevoked: [] };
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
  const evaluate = async (expression) => {
    const result = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true });
    if (result.exceptionDetails) {
      const description = result.exceptionDetails.exception?.description
        ?? result.exceptionDetails.text
        ?? 'Runtime.evaluate failed';
      throw new Error(description);
    }
    return result.result?.value;
  };
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
  await send('Runtime.enable');
  ws.addEventListener('message', (event) => {
    const message = JSON.parse(event.data);
    if (message.method === 'Runtime.exceptionThrown') {
      report.runtime.exceptionThrown.push(message.params?.exceptionDetails);
      report.errors.push({ type: 'exceptionThrown', details: message.params?.exceptionDetails });
    } else if (message.method === 'Runtime.exceptionRevoked') {
      report.runtime.exceptionRevoked.push(message.params);
      report.errors = report.errors.filter(error => error.details?.exceptionId !== message.params.exceptionId);
    }
  });
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 1000, deviceScaleFactor: 1, mobile: false }); await send('Page.navigate', { url }); await wait(1200);
  check('practice UI loaded', await evaluate('document.readyState === "complete" && !!document.querySelector("button")'));
  const publicState = () => evaluate(`(async () => {
    const [{ usePresetStore }, { useSessionStore }, { useTablaStore }, { capturePreset }, tanpura, tabla, surpeti, swarmandal] = await Promise.all([
      import('/src/store/preset-store.ts'), import('/src/store/session-store.ts'), import('/src/store/tabla-store.ts'),
      import('/src/lib/preset-state.ts'), import('/src/audio/tanpura.ts'), import('/src/audio/tabla.ts'),
      import('/src/audio/surpeti.ts'), import('/src/audio/swarmandal.ts')
    ]);
    return {
      presetStore: { presets: usePresetStore.getState().presets, activePresetId: usePresetStore.getState().activePresetId },
      session: useSessionStore.getState(), tabla: { tempo: useTablaStore.getState().tempo, playing: useTablaStore.getState().playing },
      captured: capturePreset('__browser-check__'),
      actual: { tanpura1: tanpura.getTanpuraStatus('tanpura1').playing, tanpura2: tanpura.getTanpuraStatus('tanpura2').playing,
        tabla: tabla.isTablaPlaying(), surpeti: surpeti.isSurPetiPlaying(), swarmandal: swarmandal.isSwarMandalPlaying() },
    };
  })()`);
  const savedCollection = () => evaluate(`import('/src/lib/storage.ts').then(({ getAllPresets }) => getAllPresets())`);
  const silent = (state) => !state.session.requested && !state.session.running && !state.tabla.playing && Object.values(state.actual).every(playing => !playing);
  const until = async (read, predicate, description) => {
    for (let attempt = 0; attempt < 100; attempt += 1) {
      const value = await read();
      if (predicate(value)) return value;
      await wait(100);
    }
    throw new Error(`Timed out waiting for: ${description}`);
  };
  const sanitizePreset = (preset) => {
    const { id, name, favorite, createdAt, updatedAt, ...configuration } = preset;
    return configuration;
  };
  const defaultState = await publicState();
  const decreaseTempoTo = async (value) => {
    const current = (await publicState()).tabla.tempo;
    const clicks = current - value;
    if (clicks < 0) throw new Error(`Tempo helper only supports decreasing from ${current} to ${value}`);
    for (let index = 0; index < clicks; index += 1) await evaluate('(() => { const button = document.querySelector(\'[aria-label="Decrease tempo by 1 BPM"]\'); if (!button) throw new Error(\'Tempo decrement control is missing\'); button.click(); return true; })()');
    await wait(150);
  };
  await decreaseTempoTo(119);
  const editedBeforeSave = await evaluate(`import('/src/lib/preset-state.ts').then(({ capturePreset }) => capturePreset('__expected__'))`);
  check('nondefault setting is applied before save', editedBeforeSave.tabla.tempo === 119, { tempo: editedBeforeSave.tabla.tempo });
  await evaluate(`(() => { const original = IDBObjectStore.prototype.put; window.__niragasPutOriginal = original; window.__niragasFailNextPut = true; IDBObjectStore.prototype.put = function (...args) { if (window.__niragasFailNextPut && args[0]?.name === 'Browser persistence check') { window.__niragasFailNextPut = false; throw new DOMException('Injected quota failure', 'QuotaExceededError'); } return original.apply(this, args); }; return true; })()`);
  await click('+ Save Current'); await input('preset-name', 'Browser persistence check'); await click('Save'); await until(bodyText, text => text.includes('Injected quota failure') || text.includes('QuotaExceeded'), 'save failure');
  check('injected save failure is reported truthfully', await bodyText().then((text) => text.includes('Injected quota failure') || text.includes('QuotaExceeded')), await bodyText());
  const failedState = await publicState();
  const failedStorage = await savedCollection();
  check('failed save leaves no persisted custom session', !failedState.presetStore.presets.some((preset) => preset.name === 'Browser persistence check') && !failedStorage.some((preset) => preset.name === 'Browser persistence check'), { storeNames: failedState.presetStore.presets.filter((preset) => !preset.id.startsWith('factory-')).map((preset) => preset.name), storageNames: failedStorage.filter((preset) => !preset.id.startsWith('factory-')).map((preset) => preset.name) });
  await evaluate('IDBObjectStore.prototype.put = window.__niragasPutOriginal; true');
  await input('preset-name', 'Browser persistence check'); await click('Save'); await until(savedCollection, items => items.some(item => item.name === 'Browser persistence check'), 'saved retry');
  const saveState = await evaluate('({ found: document.body.innerText.includes("Browser persistence check"), tail: document.body.innerText.slice(-1200), value: document.getElementById("preset-name")?.value, saveDisabled: [...document.querySelectorAll("button")].find((node) => node.textContent.trim() === "Save")?.disabled })');
  check('retry reports save completion', saveState.found, saveState);
  const persisted = (await savedCollection()).find(preset => preset.name === 'Browser persistence check');
  check('saved session is an exact nondefault snapshot in public storage', persisted && persisted.tabla.tempo === 119 && JSON.stringify(sanitizePreset(persisted)) === JSON.stringify(sanitizePreset(editedBeforeSave)), { persistedTempo: persisted?.tabla?.tempo, expectedTempo: editedBeforeSave.tabla.tempo });
  await decreaseTempoTo(111);
  const editedAfterSave = await publicState();
  const stillPersisted = (await savedCollection()).find(preset => preset.name === 'Browser persistence check');
  check('editing current setup does not mutate saved snapshot', editedAfterSave.tabla.tempo === 111 && stillPersisted?.tabla?.tempo === 119, { currentTempo: editedAfterSave.tabla.tempo, persistedTempo: stillPersisted?.tabla?.tempo });
  await send('Page.reload', { ignoreCache: true }); await wait(1200);
  check('refresh retains saved collection', await evaluate('document.body.innerText.includes("Browser persistence check")'));
  const afterRefresh = await publicState();
  check('refresh restores default stopped public state', silent(afterRefresh) && JSON.stringify(sanitizePreset(afterRefresh.captured)) === JSON.stringify(sanitizePreset(defaultState.captured)), { session: afterRefresh.session, tempo: afterRefresh.tabla.tempo, actual: afterRefresh.actual });
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
  const loadedState = await until(publicState, state => state.presetStore.activePresetId === persisted.id && state.tabla.tempo === 119, 'restored saved setup');
  check('explicit load restores saved settings while remaining silent', loadedState.tabla.tempo === 119 && JSON.stringify(sanitizePreset(loadedState.captured)) === JSON.stringify(sanitizePreset(persisted)) && silent(loadedState), { tempo: loadedState.tabla.tempo, session: loadedState.session, tablaPlaying: loadedState.tabla.playing, actual: loadedState.actual });

  dialogs.push({ kind: 'prompt', text: 'Renamed session' });
  await entryAction('Browser persistence check', 'Rename saved session Browser persistence check', 'Rename');
  await untilText('Renamed session', 'renamed session in the list');
  const renamed = (await savedCollection()).find(item => item.id === persisted.id);
  check('rename retains the saved configuration and ID', renamed?.name === 'Renamed session' && JSON.stringify(sanitizePreset(renamed)) === JSON.stringify(sanitizePreset(persisted)));

  dialogs.push({ kind: 'prompt', text: 'Copied session' });
  await entryAction('Renamed session', 'Save a copy of Renamed session', 'Copy');
  await untilText('Copied session', 'saved copy in the list');
  const copied = (await savedCollection()).find(item => item.name === 'Copied session');
  check('save-as-copy creates an independent ID with the same settings', copied && copied.id !== renamed.id && JSON.stringify(sanitizePreset(copied)) === JSON.stringify(sanitizePreset(renamed)));
  await decreaseTempoTo(110);
  const beforeUpdate = await savedCollection();
  check('experimenting leaves both saved snapshots unchanged', beforeUpdate.find(item => item.id === renamed.id)?.tabla.tempo === 119 && beforeUpdate.find(item => item.id === copied.id)?.tabla.tempo === 119);

  await entryAction('Renamed session', 'Update saved session Renamed session from current settings', 'Update');
  await untilText('Updated saved session', 'explicit update announcement');
  const updated = await until(savedCollection, items => items.find(item => item.id === renamed.id)?.tabla.tempo === 110, 'saved update');
  check('explicit update changes original without changing copy', updated.find(item => item.id === renamed.id)?.tabla.tempo === 110 && JSON.stringify(updated.find(item => item.id === copied.id)) === JSON.stringify(copied));

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
  check('export contains the complete stored collection', exported.format === 'niragas-presets' && exported.schemaVersion === 3 && JSON.stringify(exported.presets) === JSON.stringify(await savedCollection()), { format: exported.format, schemaVersion: exported.schemaVersion, count: exported.presets?.length });

  dialogs.push({ kind: 'confirm', accept: true });
  await entryAction('Renamed session', 'Delete preset Renamed session', 'x');
  await untilText('Deleted saved session', 'delete announcement');
  const entryGone = await evaluate(`![...document.querySelectorAll('button')].some((node) => node.textContent.includes('Renamed session') && node.textContent.includes('bpm'))`);
  check('delete removes the session from UI and storage', entryGone && !(await savedCollection()).some(item => item.id === renamed.id));
  const beforeInvalidImport = await savedCollection();

  await setImportFile(exportedPath);
  await untilText('already exists', 'duplicate-ID rejection');
  check('duplicate IDs are rejected without any storage mutation', JSON.stringify(await savedCollection()) === JSON.stringify(beforeInvalidImport));

  const freshId = `custom-import-${Date.now()}`;
  const fresh = { ...exported.presets.find((preset) => preset.name === 'Copied session'), id: freshId, name: 'Imported session' };
  const freshPath = join(output, 'fresh-session.json');
  await writeFile(freshPath, JSON.stringify({ format: 'niragas-presets', schemaVersion: 3, presets: [fresh] }));
  await setImportFile(freshPath);
  await untilText('Imported 1 saved session', 'import announcement');
  const importedCollection = await until(savedCollection, items => items.some(item => item.id === freshId), 'persisted import');
  check('valid import restores the full exported setup', JSON.stringify(importedCollection.find(item => item.id === freshId)) === JSON.stringify(fresh));

  const malformedPath = join(output, 'malformed.json');
  await writeFile(malformedPath, 'not json{{{');
  await setImportFile(malformedPath);
  await untilText('Could not import saved sessions', 'malformed import error');
  check('malformed imports fail truthfully without mutation', JSON.stringify(await savedCollection()) === JSON.stringify(importedCollection));

  check('browser runtime has no uncaught exceptions', report.errors.length === 0, { errors: report.errors });
  report.status = 'passed'; report.browser = await send('Browser.getVersion'); report.url = url;
}

try { await main(); } catch (error) { report.error = error.message; process.exitCode = 1; } finally {
  if (ws) ws.close(); if (browser) browser.kill('SIGTERM'); if (server) await server.close();
  await writeFile(join(output, 'report.json'), JSON.stringify(report, null, 2));
  console.log(`Saved-session report: ${join(output, 'report.json')} (${report.status}, ${report.checks.length} checks)`);
}
