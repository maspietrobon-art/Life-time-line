/* Life Time Line – service worker.
   - pagina e data.json: prima la rete (così i dati aggiornati su GitHub arrivano subito), cache come ripiego offline
   - icone, Leaflet, font: cache con aggiornamento in background
   - tessere mappa OpenStreetMap: cache a parte (max ~400), per rivedere le zone già visitate offline
   Cambia VERSION per forzare un aggiornamento dell'app. */
const VERSION = 'v4';
const CORE = 'ltl-core-' + VERSION;
const TILES = 'ltl-tiles-' + VERSION;
const CORE_FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CORE).then(c => c.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![CORE, TILES].includes(k)).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function networkFirst(req, cacheName){
  const cache = await caches.open(cacheName);
  try{
    const res = await fetch(req, {cache:'no-store'});
    if(res && res.ok) cache.put(req, res.clone());
    return res;
  }catch(err){
    const hit = await cache.match(req, {ignoreSearch:true});
    if(hit) return hit;
    throw err;
  }
}
async function staleWhileRevalidate(req, cacheName, limit){
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const net = fetch(req).then(res => {
    if(res && (res.ok || res.type === 'opaque')){
      cache.put(req, res.clone());
      if(limit) cache.keys().then(ks => { if(ks.length > limit) cache.delete(ks[0]); });
    }
    return res;
  }).catch(() => hit);
  return hit || net;
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.hostname === 'nominatim.openstreetmap.org') return;          // ricerche luoghi: sempre in rete
  if(url.hostname.endsWith('tile.openstreetmap.org')){ e.respondWith(staleWhileRevalidate(req, TILES, 400)); return; }
  if(url.origin === location.origin){
    const isData = url.pathname.endsWith('/data.json');
    const isPage = req.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/') || url.pathname.endsWith('sw.js');
    if(isData || isPage){
      e.respondWith(networkFirst(isData ? new Request(url.origin + url.pathname) : req, CORE)
        .catch(() => caches.match('./index.html')));
      return;
    }
    e.respondWith(staleWhileRevalidate(req, CORE));
    return;
  }
  if(/cdnjs\.cloudflare\.com|fonts\.googleapis\.com|fonts\.gstatic\.com/.test(url.hostname)){
    e.respondWith(staleWhileRevalidate(req, CORE));
  }
});
