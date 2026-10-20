/* Service worker Travel Log — versione a325d9300f (si aggiorna da sola a ogni nuova pubblicazione) */
const VERSION = 'a325d9300f';
const CORE = 'travel-log-core-' + VERSION;
const RUNTIME = 'travel-log-runtime';
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './lib-chart.umd.min.js', './lib-d3.min.js', './lib-topojson-client.min.js', './lib-countries-50m.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => Promise.all(CORE_FILES.map(f => c.add(f).catch(() => {})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith('travel-log-core-') && k !== CORE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // Pagina e file dell'app: prima la rete (così gli aggiornamenti arrivano subito), cache se offline
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CORE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(r => r || caches.match('./index.html'))));
    return;
  }
  // Librerie, mappa del mondo, font: dalla cache e aggiornate in background
  e.respondWith(caches.open(RUNTIME).then(cache => cache.match(req).then(hit => {
    const net = fetch(req).then(res => { if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone()); return res; }).catch(() => hit);
    return hit || net;
  })));
});
