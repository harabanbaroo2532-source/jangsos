/**
 * Service Worker - Minimal Classroom & Inventory System (v22)
 */

const CACHE_NAME = 'school-minimal-v23';

self.addEventListener('fetch', (event) => {
    event.respondWith(
        fetch(event.request).catch(() => caches.match(event.request))
    );
});
