const CACHE_NAME = 'paysutra-admin-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon.png',
  '/favicon.png',
  '/paysutra_logo.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache);
    })
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((response) => {
      // Return cached response if found
      if (response) {
        return response;
      }
      
      // Fallback to network
      return fetch(event.request).catch(() => {
        // You could return an offline page here if needed
        return new Response('Offline mode');
      });
    })
  );
});
