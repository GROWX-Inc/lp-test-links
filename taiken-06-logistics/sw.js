/* 一度開いた端末では、電波がなくても 06 を開けるようにする（展示会・交流会対策） */
const CACHE = 'taiken06-v4';
const FILES = ['./', './index.html', './assets/three.module.min.js', './assets/mincho.woff2', './assets/jp-wrap.js', './assets/budoux-ja.json', './assets/cardboard-normal.jpg', './assets/asphalt-normal.jpg', './assets/asphalt-rough.jpg', './assets/plaster-normal.jpg', './assets/gltf-loader.min.js', './assets/town.glb', './assets/town-ao.jpg', './assets/paving-normal.jpg', './assets/truck.glb', './assets/truck-ao.jpg'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
