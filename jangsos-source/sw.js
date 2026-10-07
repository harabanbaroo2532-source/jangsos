/**
 * GUARDIAN LIVE - Progressive Web App Service Worker
 * Handles offline caching, asset prefetching, and PWA cross-device support.
 */

const CACHE_NAME = 'guardian-live-v10';

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
