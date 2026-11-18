/* RollCall Service Worker for Offline-First Teacher Attendance */
const CACHE_NAME = "rollcall-teacher-v3";
const ASSETS_TO_CACHE = [
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

  // If it's a static file or the teacher page / login, try network first, fallback to cache
  if (
    url.pathname === "/teacher" ||
    url.pathname === "/teacher/login" ||
    url.pathname.startsWith("/static/")
  ) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response && response.status === 200) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => {
          return caches.match(request).then((cached) => {
            if (cached) return cached;
            if (request.mode === "navigate") {
              if (url.pathname === "/teacher/login") {
                return caches.match("/teacher/login");
              }
              return caches.match("/teacher");
            }
          });
        })
    );
  }
});
