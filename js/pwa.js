/* Standalone PWA status and updates. Learning storage is never modified here. */
(() => {
  'use strict';
  const status = document.getElementById('pwaStatus');
  const check = document.getElementById('pwaCheck');
  const apply = document.getElementById('pwaApply');
  const banner = document.getElementById('pwaUpdateBanner');
  const bannerApply = document.getElementById('pwaBannerApply');
  const dismiss = document.getElementById('pwaDismiss');
  const install = document.getElementById('pwaInstall');
  const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  if (standalone) install.textContent = 'WortDuell is running as an installed app.';
  if (!('serviceWorker' in navigator) || !window.isSecureContext) {
    status.textContent = 'Offline mode needs HTTPS or localhost and a supported browser.';
    check.disabled = true;
    return;
  }
  let registration;
  let alreadyControlled = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  let lastCheck = 0;
  let checking = false;
  let updateDismissed = false;
  function showUpdate() {
    status.textContent = 'Update ready. Finish your current exercise, then reload to apply it.';
    apply.hidden = false;
    if (!updateDismissed) banner.hidden = false;
  }
  function refreshStatus() {
    if (registration?.waiting) { showUpdate(); return; }
    if (registration?.installing) { status.textContent = 'Preparing offline files…'; return; }
    const worker = navigator.serviceWorker.controller || registration?.active;
    if (!worker) {status.textContent = 'Preparing offline mode…'; return;}
    const channel = new MessageChannel();
    const timeout = setTimeout(() => {status.textContent = 'Offline status unavailable. Try again online.'; channel.port1.close();}, 4000);
    channel.port1.onmessage = ({data}) => {
      clearTimeout(timeout); channel.port1.close();
      if (registration?.waiting) {showUpdate(); return;}
      status.textContent = (data.complete ? (navigator.onLine ? 'Ready for offline use' : 'Offline · saved content ready') : 'Some offline files are missing. Reconnect and check for updates.') + ' · ' + data.version;
    };
    worker.postMessage({type:'WORTDUELL_STATUS'}, [channel.port2]);
  }
  function watch(worker) {
    if (!worker) return;
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && navigator.serviceWorker.controller) showUpdate();
      else if (worker.state === 'activated') refreshStatus();
      else if (worker.state === 'redundant') {
        status.textContent = 'Offline preparation or update failed. The previous release, if installed, is kept. Retry online.';
      }
    });
  }
  async function checkUpdate(force = false) {
    if (!registration || checking || !navigator.onLine) {if (registration && !navigator.onLine) refreshStatus(); return;}
    if (!force && Date.now() - lastCheck < 60000) return;
    lastCheck = Date.now(); checking = true; check.disabled = true;
    status.textContent = 'Checking for updates…';
    try { await registration.update(); refreshStatus(); }
    catch (_) { status.textContent = 'Update check failed. Your existing offline copy is kept.'; }
    finally { checking = false; check.disabled = false; }
  }
  function activateUpdate() {
    if (registration?.waiting) {
      apply.disabled = bannerApply.disabled = true;
      status.textContent = 'Applying update…';
      registration.waiting.postMessage({type:'WORTDUELL_ACTIVATE'});
    } else refreshStatus();
  }
  check.addEventListener('click', () => checkUpdate(true));
  apply.addEventListener('click', activateUpdate);
  bannerApply.addEventListener('click', activateUpdate);
  dismiss.addEventListener('click', () => {updateDismissed = true; banner.hidden = true;});
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (alreadyControlled && !reloading) {
      // User-triggered activation may also refresh another open WortDuell tab.
      // Existing learning records have already been saved by the learning engine.
      reloading = true; location.reload();
    } else {alreadyControlled = true; refreshStatus();}
  });
  navigator.serviceWorker.register('./sw.js', {scope:'./', updateViaCache:'none'}).then(reg => {
    registration = reg;
    reg.addEventListener('updatefound', () => {status.textContent = 'Preparing new release…'; watch(reg.installing);});
    watch(reg.installing);
    refreshStatus();
    if (reg.active) checkUpdate();
    navigator.serviceWorker.ready.then(refreshStatus);
    window.addEventListener('online', () => checkUpdate(true));
    window.addEventListener('offline', refreshStatus);
    document.addEventListener('visibilitychange', () => {if (!document.hidden) checkUpdate();});
    // Also check during a long online study session; never force activation.
    setInterval(() => {if (!document.hidden) checkUpdate();}, 15 * 60 * 1000);
  }).catch(error => {
    console.warn('WortDuell PWA:', error);
    status.textContent = 'Offline setup unavailable. Online learning is still available.';
    check.disabled = true;
  });
})();
