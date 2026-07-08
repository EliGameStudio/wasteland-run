// Wasteland Run — offline cache v2.
// FIX: Firebase requests are NEVER cached (the ranking is always live),
// and index.html is fetched network-first so game updates reach phones.
const CACHE = 'wasteland-v2';
const FILES = ['./', './index.html', './manifest.json',
               './icon-180.png', './icon-512.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // 1) Anything not on our site (Firebase!) — straight to the network,
  //    never cached. The leaderboard must always be live.
  if (url.origin !== location.origin) return;

  // 2) The game page itself — network first (so updates arrive),
  //    cache as fallback (so it still opens offline).
  if (e.request.mode === 'navigate' || url.pathname.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => { c.put('./index.html', copy); });
        return res;
      }).catch(() => caches.match('./index.html'))
    );
    return;
  }

  // 3) Icons / manifest — cache first (they never change).
  e.respondWith(
    caches.match(e.request).then(hit => hit ||
      fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      })
    )
  );
});
