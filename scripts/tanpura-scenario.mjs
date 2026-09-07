/** Real controls and PCM, with fetch held/failed at the browser boundary. */
export async function checkTanpura({ evaluate, click, collect, check, wait }) {
  const status = `window.tanpura.getTanpuraStatus('tanpura1')`;
  const until = async expression => {
    for (let i = 0; i < 150; i++) {
      if (await evaluate(expression)) return;
      await wait(200);
    }
    throw new Error(`Timed out: ${expression}`);
  };
  await evaluate(`(async () => {
    window.tanpura = await import('/src/audio/tanpura.ts');
    window.originalFetch = window.fetch;
    window.sampleRequests = [];
    window.heldFetches = [];
    window.holdMa = false;
    window.failPa = false;
    window.fetch = (resource, options) => {
      const url = String(resource);
      if (url.includes('/samples/tanpura/')) sampleRequests.push(url);
      if (failPa && url.includes('/samples/tanpura/Pa_')) return Promise.reject(new Error('Simulated sample outage'));
      if (holdMa && url.includes('/samples/tanpura/Ma_')) {
        return new Promise((resolve, reject) => {
          const release = () => originalFetch(resource, options).then(resolve, reject);
          heldFetches.push(release);
          options?.signal?.addEventListener('abort', () => reject(new DOMException('Cancelled', 'AbortError')), { once: true });
        });
      }
      return originalFetch(resource, options);
    };
  })()`);
  await click('[aria-label="Start instruments"]');
  await until(`${status}.playing && !${status}.loading`);
  const initial = await collect('tanpura-initial', 1200);
  check('Initial tanpura plays', { rms: initial.rms, frames: initial.frames }, initial.rms > 0.0001 && initial.frames > 30000);

  await evaluate('holdMa = true');
  await click('#panel-controls button', 'Ma');
  await until('heldFetches.length > 0');
  const preparing = await collect('tanpura-during-held-replacement', 1400);
  check('Old source continues during held replacement', { rms: preparing.rms, loading: await evaluate(`${status}.loading`) }, preparing.rms > 0.0001 && await evaluate(`${status}.loading`));

  await click('#panel-controls button', 'Ni');
  await until(`sampleRequests.some(url => url.includes('/Ni_')) && !${status}.loading`);
  check('Latest tuning completes without waiting for stale fetch', await evaluate(status), await evaluate(`${status}.playing && !${status}.error`));
  const replacement = await collect('tanpura-latest-replacement', 1200);
  check('Replacement remains audible', { rms: replacement.rms, peak: replacement.peak }, replacement.rms > 0.0001 && replacement.peak < 1);

  await evaluate('failPa = true');
  await click('#panel-controls button', 'Pa');
  await until(`!!${status}.error && !${status}.loading`);
  const failed = await collect('tanpura-failed-replacement', 1200);
  check('Preparation failure retains the old source and exposes Retry', { rms: failed.rms, error: await evaluate(`${status}.error`) }, failed.rms > 0.0001 && await evaluate(`!!document.querySelector('[aria-label="Retry Tanpura 1"]')`));
  await evaluate('failPa = false');
  await click('[aria-label="Retry Tanpura 1"]');
  await until(`!${status}.loading && !${status}.error`);
  check('Retry succeeds without changing the selected tuning', await evaluate(status), await evaluate(`${status}.playing`));

  await click('#panel-controls button', 'Ma');
  await until(`${status}.loading`);
  await click('[aria-label="Stop all instruments"]');
  await evaluate('holdMa = false; heldFetches.splice(0).forEach(release => release())');
  await until(`!${status}.loading`);
  await wait(1200);
  const stopped = await collect('tanpura-stop-after-late-completion', 1800);
  check('Stop remains silent after delayed preparation completes', { peak: stopped.peak, status: await evaluate(status) }, stopped.peak < 0.0001 && !await evaluate(`${status}.playing`));

  await click('[aria-label="Start instruments"]');
  await until(`${status}.playing && !${status}.loading`);
  const restarted = await collect('tanpura-restarted', 1200);
  check('Restart uses the retained latest setup', { rms: restarted.rms }, restarted.rms > 0.0001);
  await click('[aria-label="Stop all instruments"]');
  await evaluate('window.fetch = originalFetch');
}
