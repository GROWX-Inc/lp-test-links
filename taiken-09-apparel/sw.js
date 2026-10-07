/* 一度開いた端末では、電波がなくても 09 を開けるようにする（展示会・交流会対策） */
const CACHE = 'taiken09-v1';
const FILES = ['./', './index.html', './assets/three.module.min.js', './assets/gltf-loader.min.js', './assets/model-standard.glb', './assets/model-slim.glb', './assets/model-broad.glb', './assets/photo-front.jpg', './assets/photo-front-s.jpg', './assets/photo-neck.jpg', './assets/photo-fabric.jpg'];
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
