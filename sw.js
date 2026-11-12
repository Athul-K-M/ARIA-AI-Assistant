/* ==========================================
   A.R.I.A. SERVICE WORKER v3.0
   Offline caching system
========================================== */

const CACHE_NAME = "aria-offline-v3.0";

const FILES_TO_CACHE = [
    "./",
    "./index.html",
    "./offline.js",
    "./manifest.json"
];

// INSTALL
self.addEventListener("install", event => {

    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                return cache.addAll(FILES_TO_CACHE);
            })
            .then(() => self.skipWaiting())
    );

});

// ACTIVATE
self.addEventListener("activate", event => {

    event.waitUntil(
        caches.keys().then(cacheNames => {

            return Promise.all(
                cacheNames
                    .filter(name => name !== CACHE_NAME)
                    .map(name => caches.delete(name))
            );

        }).then(() => self.clients.claim())
    );

});

// FETCH
self.addEventListener("fetch", event => {

    const request = event.request;

    if (
        request.method !== "GET" ||
        new URL(request.url).origin !== self.location.origin
    ) {
        return;
    }

    event.respondWith(

        caches.match(request).then(cachedResponse => {

            if (cachedResponse) {
                return cachedResponse;
            }

            return fetch(request).then(response => {

                if (response && response.ok) {

                    const responseCopy = response.clone();

                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(request, responseCopy);
                    });

                }

                return response;

            }).catch(() => {

                if (request.mode === "navigate") {
                    return caches.match("./index.html");
                }

            });

        })

    );

});
