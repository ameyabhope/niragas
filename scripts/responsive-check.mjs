#!/usr/bin/env node

/** Verify layout, labels, touch sizing, and keyboard operation across widths. */
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
const output = resolve(arg('--output', await mkdtemp(join(tmpdir(), 'niragas-responsive-'))));
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
  const setWidth = async (width) => {
    await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 2, mobile: width < 768 });
    await wait(500);
  };
  const clickTab = async (label) => evaluate(`(() => {
    const tab = document.querySelector('nav[aria-label="Mobile sections"]');
    const button = tab ? [...tab.querySelectorAll('button')].find((node) => node.textContent.trim() === ${JSON.stringify(label)}) : null;
    if (!button) throw new Error('Missing mobile tab: ' + ${JSON.stringify(label)});
    button.click();
    return true;
  })()`);
  const auditLayout = async () => evaluate(`(() => {
    const overflow = document.documentElement.scrollWidth - document.documentElement.clientWidth;
    const visible = [...document.querySelectorAll('button, input, select, a[href]')].filter((node) => {
      const rect = node.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && !node.disabled;
    });
    const unnamed = visible.filter((node) => {
      const labelledBy = node.getAttribute('aria-labelledby');
      const labelledText = labelledBy ? labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? '').join(' ') : '';
      const labels = 'labels' in node && node.labels ? [...node.labels].map((label) => label.textContent).join(' ') : '';
      const wrap = node.closest('label')?.textContent ?? '';
      const name = (node.getAttribute('aria-label') || labelledText || labels || wrap || node.textContent || node.getAttribute('placeholder') || node.getAttribute('title') || '').trim();
      return !name && node.type !== 'hidden';
    }).map((node) => node.tagName + '.' + node.className.toString().slice(0, 60) + '#' + (node.id || ''));
    const tiny = visible.filter((node) => {
      const rect = node.getBoundingClientRect();
      return node.tagName === 'BUTTON' && (rect.width < 24 || rect.height < 24);
    }).map((node) => (node.getAttribute('aria-label') ?? node.textContent).trim().slice(0, 50));
    const smallish = visible.filter((node) => {
      const rect = node.getBoundingClientRect();
      return node.tagName === 'BUTTON' && (rect.width < 44 || rect.height < 44);
    }).length;
    return { overflow, controls: visible.length, unnamed, tiny, smallish };
  })()`);

  await send('Runtime.enable');
  await send('Page.navigate', { url });
  await setWidth(1280);
  await until('document.readyState === "complete" && !!document.querySelector("main")', 'practice UI');
  await wait(600);
  report.browser = await send('Browser.getVersion');
  await evaluate('(() => { for (const details of document.querySelectorAll("details")) details.open = true; return true; })()');

  const liveRegions = await evaluate(`[...document.querySelectorAll('[aria-live]')].length`);
  check('status announcements have live regions', { liveRegions }, liveRegions > 0);

  for (const width of [1280, 390, 320]) {
    await setWidth(width);
    const tabs = width < 768 ? ['Mixer', 'Practice', 'Presets', 'Swar Mdl', 'More'] : [null];
    for (const tab of tabs) {
      if (tab) await clickTab(tab);
      await wait(300);
      const audit = await auditLayout();
      const where = `${width}px${tab ? `/${tab}` : ''}`;
      check(`no horizontal overflow at ${where}`, { overflow: audit.overflow }, audit.overflow <= 0);
      check(`controls are labelled at ${where}`, { unnamed: audit.unnamed }, audit.unnamed.length === 0);
      check(`touch targets meet the 24px minimum at ${where}`, { tiny: audit.tiny, under44: audit.smallish }, audit.tiny.length === 0);
    }
  }

  await setWidth(1280);
  await evaluate(`document.activeElement?.blur()`);
  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: ' ', code: 'Space', windowsVirtualKeyCode: 32 });
  await wait(800);
  const spaceEnabledTabla = await evaluate(`!!document.querySelector('[aria-label="Disable Tabla"]')`);
  check('Space operates tabla from the keyboard', { tablaEnabled: spaceEnabledTabla }, spaceEnabledTabla);

  await send('Input.dispatchKeyEvent', { type: 'rawKeyDown', key: 'Tab' });
  await wait(200);
  const focusLanded = await evaluate(`(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    return active.tagName;
  })()`);
  check('Tab moves keyboard focus into controls', { focusLanded }, !!focusLanded);
  const focusOutline = await evaluate(`(() => {
    const active = document.activeElement;
    if (!active || active === document.body) return null;
    const style = getComputedStyle(active);
    return { width: style.outlineWidth, style: style.outlineStyle };
  })()`);
  check('keyboard focus is visibly indicated', focusOutline, !!focusOutline && focusOutline.width !== '0px' && focusOutline.style !== 'none');

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
