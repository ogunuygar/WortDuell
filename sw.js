/* Generated release metadata is refreshed automatically by GitHub Actions. */
importScripts('./pwa-assets.js');
const {version, assets} = self.WORTDUELL_RELEASE;
const scope = new URL(self.registration.scope);
const prefix = 'wortduell-pwa:' + scope.href + ':';
const cacheName = prefix + version;
const assetURLs = new Set(assets.map(({path}) => new URL(path, scope).href));
const indexURL = new URL('index.html', scope).href;
async function sha256(response) {
  const bytes = await response.clone().arrayBuffer();
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))]
    .map(byte => byte.toString(16).padStart(2, '0')).join('');
}
self.addEventListener('install', event => {
  event.waitUntil((async () => {
    // Only a complete, hash-verified release may become active.
    const cache = await caches.open(cacheName);
    try {
      // Limit concurrent requests on phones and slow connections.
      for (let offset = 0; offset < assets.length; offset += 12) {
        await Promise.all(assets.slice(offset, offset + 12).map(async ({path, sha}) => {
          const url = new URL(path, scope).href;
          const response = await fetch(url, {cache: 'reload', credentials: 'same-origin'});
          if (!response.ok || await sha256(response) !== sha) throw new Error('Incomplete release: ' + path);
          await cache.put(url, response);
        }));
      }
    } catch (error) {
      await caches.delete(cacheName);
      throw error;
    }
  })());
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) {
      if (key.startsWith(prefix) && key !== cacheName) await caches.delete(key);
    }
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'WORTDUELL_ACTIVATE') event.waitUntil(self.skipWaiting());
  if (event.data?.type === 'WORTDUELL_STATUS' && event.ports[0]) {
    event.waitUntil((async () => {
      const cache = await caches.open(cacheName);
      const keys = new Set((await cache.keys()).map(key => key.url));
      event.ports[0].postMessage({version, complete: [...assetURLs].every(url => keys.has(url))});
    })());
  }
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== scope.origin) return;
  // Do not handle other projects, OAuth, backups, arbitrary requests, or worker updates.
  const key = request.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === new URL(indexURL).pathname)
    ? indexURL : url.href;
  if (!assetURLs.has(key)) return;
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(key);
    if (cached) return cached;
    // If the OS evicts a cached file, only restore bytes for this exact release.
    const entry = assets.find(item => new URL(item.path, scope).href === key);
    try {
      const response = await fetch(key, {cache: 'reload', credentials: 'same-origin'});
      if (response.ok && await sha256(response) === entry.sha) {
        await cache.put(key, response.clone());
        return response;
      }
    } catch (_) { /* Offline or temporarily unavailable. */ }
    return new Response('WortDuell offline file unavailable. Reconnect and update the app.', {status: 503, headers: {'Content-Type':'text/plain; charset=utf-8'}});
  })());
});
