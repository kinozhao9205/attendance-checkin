/* Service Worker —— 海外员工打卡 PWA
 * 写操作（登录/打卡）一律走网络；静态资源缓存优先，页面导航网络优先、离线回退到已缓存的打卡页。 */
const CACHE = 'attendance-v4';
// 相对路径写法，兼容任意子路径部署（如 GitHub Pages 的 /仓库名/ 前缀）
const PRECACHE = [
  'checkin.html',
  'assets/i18n.js',
  'assets/att-config.js',
  'assets/checkin.js',
  'assets/vendor/face-api.min.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(PRECACHE).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                      // 登录 / 打卡等写操作走网络
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;       // 仅同源
  if (url.pathname.startsWith('/assets/')) {             // 静态资源：缓存优先
    e.respondWith(caches.match(req).then((r) => r || fetch(req)));
    return;
  }
  if (url.pathname === '/sw.js' || url.pathname === '/manifest.webmanifest' || url.pathname.endsWith('/manifest.webmanifest')) return;
  // 页面导航：网络优先，离线回退到已缓存的打卡页
  e.respondWith(fetch(req).catch(() => caches.match(req).then((r) => r || caches.match('checkin.html'))));
});
