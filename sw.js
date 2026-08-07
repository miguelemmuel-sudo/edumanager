const CACHE_NAME = 'edumanager-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/css/landing.css',
  '/img/app-icon.png' // We will tell the user to save the image here
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(ASSETS).catch(err => console.log('Cache addAll error (ignored for demo)', err));
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      })
  );
});
