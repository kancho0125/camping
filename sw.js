// 캠핑 올인원 서비스워커 — 홈화면에 추가하면 앱처럼 실행되고, 오프라인에서도 동작한다.
// 캐시 정책:
//   HTML  → 네트워크 우선 (재배포한 새 버전이 바로 반영되도록. 오프라인이면 캐시)
//   그 외 → 캐시 우선 (아이콘·폰트 등은 잘 바뀌지 않음)
//   날씨/지오코딩 API(open-meteo, bigdatacloud) → 캐시하지 않음 (항상 네트워크)
// 새로 배포했는데 옛 화면이 보이면 아래 CACHE 버전을 올릴 것.
const CACHE = 'camping-v5';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './assets/icon-192.png',
  './assets/icon-512.png',
  './assets/icon-maskable-512.png',
  './assets/apple-touch-icon-180.png',
];

self.addEventListener('install', (e) => {
  self.skipWaiting();
  // 일부 파일이 없어도 설치가 실패하지 않게 개별 처리
  e.waitUntil(
    caches.open(CACHE).then((c) => Promise.all(ASSETS.map((u) => c.add(u).catch(() => {}))))
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
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  // 날씨·지오코딩 API는 캐시하지 않는다 (항상 최신)
  if (url.origin !== location.origin) {
    if (url.hostname.endsWith('open-meteo.com') || url.hostname.endsWith('bigdatacloud.net')) return;
  }
  const isHTML = e.request.mode === 'navigate' || (e.request.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    // 네트워크 우선
    e.respondWith(
      fetch(e.request)
        .then((r) => {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
          return r;
        })
        .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
  } else {
    // 캐시 우선
    e.respondWith(
      caches.match(e.request).then((r) => r || fetch(e.request).then((res) => {
        if (res.ok && url.origin === location.origin) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(e.request, copy));
        }
        return res;
      }))
    );
  }
});
