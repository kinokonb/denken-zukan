// オフライン保存。初回に全ファイルを端末へ保存し、以後は保存分をすぐ返しつつ裏で最新に入れ替える
// （更新は次に開いた時に入る）。ファイルを足したら ASSETS にも足す（tests/offline.test.js が照合する）。
const CACHE = 'denken-zukan';
const ASSETS = [
  './',
  'index.html',
  'style.css',
  'manifest.webmanifest',
  'icons/icon.svg',
  'icons/icon-180.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'js/version.js',
  'js/notation.js',
  'js/svg.js',
  'js/calc/rlc.js',
  'js/calc/voltage-drop.js',
  'js/calc/induction-motor.js',
  'js/calc/power-factor.js',
  'js/topics/rlc.js',
  'js/topics/voltage-drop.js',
  'js/topics/induction-motor.js',
  'js/topics/power-factor.js',
  'js/app.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(ASSETS.map((path) => new Request(path, { cache: 'reload' })))));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  const fromNetwork = fetch(request);
  const saved = fromNetwork
    .then((response) => {
      if (!response.ok) return undefined;
      const copy = response.clone();
      return caches.open(CACHE).then((cache) => cache.put(request, copy));
    })
    .catch(() => undefined);
  event.waitUntil(saved);
  event.respondWith(caches.match(request, { ignoreSearch: true }).then((cached) => cached || fromNetwork));
});
