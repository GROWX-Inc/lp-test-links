/* 一度開いた端末では、電波がなくても 05 を開けるようにする（展示会・交流会対策）
   ・初回表示のあとに、必要なファイルを端末に保存する
   ・2回目以降は保存した分をすぐ表示し、裏で最新版に入れ替える（電波がなければ保存分のまま） */
const CACHE = 'taiken05-v4';
const FILES = ['./', './index.html', './assets/three.module.min.js', './assets/mincho.woff2', './assets/jp-wrap.js', './assets/budoux-ja.json', './assets/env-studio.jpg', './assets/glass-rough.jpg', './assets/paper-normal.jpg', './assets/stone-normal.jpg', './assets/stone-rough.jpg'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const hit = await c.match(e.request, { ignoreSearch: true });
    const net = fetch(e.request).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
    return hit || net;
  }));
});
