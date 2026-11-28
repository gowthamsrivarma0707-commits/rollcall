/* RollCall Service Worker for Offline-First Teacher Attendance */
const CACHE_NAME = "rollcall-v11";
const ASSETS_TO_CACHE = [
  "/",
  "/teacher",
  "/teacher/login",
  "/static/css/base.css",
  "/static/css/app.css",
  "/static/css/auth.css",
  "/static/css/teacher.css",
  "/static/js/common.js",
  "/static/js/login.js",
  "/static/js/default_roster.js",
  "/static/js/teacher.js",
  "/static/favicon.svg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Service worker cache.addAll non-critical warning:", err);
      });
    }).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  const isNav = request.mode === "navigate";
  const isStatic = url.pathname.startsWith("/static/");
  const isAppPage =
    url.pathname === "/" ||
    url.pathname === "/teacher" ||
    url.pathname === "/teacher/login";

  // Intercept all navigation requests or app assets
  if (isNav || isStatic || isAppPage) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(request);
          if (cached) return cached;

          // Seamless offline navigation fallback - never show dinosaur screen
          if (isNav) {
            if (url.pathname.includes("login") || url.pathname === "/") {
              const loginPage = await cache.match("/teacher/login");
              if (loginPage) return loginPage;
            }
            const teacherPage = await cache.match("/teacher");
            if (teacherPage) return teacherPage;
          }
        })
    );
  }
});
