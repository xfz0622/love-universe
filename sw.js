/* ===== Service Worker v21 - index.html 永不缓存，其他文件 stale-while-revalidate ===== */
const CACHE_NAME = 'love-universe-v21';

// 预缓存：不包括 index.html，因为 index.html 必须永远从网络获取
const PRECACHE = [
  '/css/variables.css',
  '/css/global.css',
  '/css/components.css',
  '/css/dashboard.css',
  '/css/games.css',
  '/js/lib/supabase.min.js',
  '/js/modules/config.js',
  '/js/modules/github-sync.js',
  '/js/modules/game-sync.js',
  '/js/tips.js',
  '/js/utils.js',
  '/js/sfx.js',
  '/js/auth.js',
  '/js/store.js',
  '/js/components.js',
  '/js/app.js',
  '/js/pages/dashboard.js',
  '/js/pages/timeline.js',
  '/js/pages/travel.js',
  '/js/pages/food.js',
  '/js/pages/shopping.js',
  '/js/pages/ledger.js',
  '/js/pages/inspiration.js',
  '/js/pages/game.js',
  '/assets/icon-192.png',
  '/assets/icon-512.png',
  '/assets/apple-touch-icon.png',
  '/assets/apple-touch-icon-180.png',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(PRECACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  const url = e.request.url;

  // API 请求不拦截
  if (url.includes('github.com') || url.includes('supabase.co')) return;
  // Google Fonts 不拦截
  if (url.includes('fonts.googleapis.com') || url.includes('fonts.gstatic.com')) return;

  // 🔑 index.html / 根路径：永远从网络获取，不缓存
  if (e.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('/index.html')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // 其他资源：缓存优先，后台更新（stale-while-revalidate）
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(networkResp => {
        if (networkResp.ok) {
          const clone = networkResp.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return networkResp;
      });
      // 有缓存就先用缓存，同时在后台更新
      return cached || fetchPromise;
    })
  );
});
