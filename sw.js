/* ===== Service Worker v23 - 适配 /love-universe/ 子路径部署 ===== */
const CACHE_NAME = 'love-universe-v23';

// 计算当前 SW 作用域（兼容子路径部署）
const SCOPE = self.registration.scope.replace(/\/$/, '');

// 预缓存资源：使用相对路径，兼容子目录
const PRECACHE = [
  'css/variables.css',
  'css/global.css',
  'css/components.css',
  'css/dashboard.css',
  'css/games.css',
  'js/lib/supabase.min.js',
  'js/modules/config.js',
  'js/modules/github-sync.js',
  'js/modules/game-sync.js',
  'js/tips.js',
  'js/utils.js',
  'js/sfx.js',
  'js/auth.js',
  'js/store.js',
  'js/components.js',
  'js/app.js',
  'js/pages/dashboard.js',
  'js/pages/timeline.js',
  'js/pages/travel.js',
  'js/pages/food.js',
  'js/pages/shopping.js',
  'js/pages/ledger.js',
  'js/pages/inspiration.js',
  'js/pages/game.js',
  'assets/icon-192.png',
  'assets/icon-512.png',
  'assets/apple-touch-icon.png',
  'assets/apple-touch-icon-180.png',
  'manifest.json'
].map(p => `${SCOPE}/${p}`);

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
  const url = new URL(e.request.url);

  // API 请求不拦截
  if (url.hostname.includes('github.com') || url.hostname.includes('supabase.co')) return;
  // Google Fonts 不拦截
  if (url.hostname.includes('fonts.googleapis.com') || url.hostname.includes('fonts.gstatic.com')) return;

  // index.html / 根路径 / 作用域：网络优先，尽量拿到最新
  if (e.request.mode === 'navigate' || url.pathname === `${SCOPE}/` || url.pathname === `${SCOPE}/index.html`) {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    );
    return;
  }

  // 其他资源：网络优先，避免旧缓存导致进不去
  e.respondWith(
    fetch(e.request).then(networkResp => {
      if (networkResp.ok) {
        const clone = networkResp.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
      }
      return networkResp;
    }).catch(() => caches.match(e.request))
  );
});
