const CACHE_NAME = 'edumanager-v3';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/landing.css',
  '/css/dashboard.css',
  '/js/vendor/dexie.min.js',
  '/js/vendor/supabase.js',
  '/js/config.js',
  '/js/supabase.js',
  '/js/sync.js',
  '/js/app.js',
  '/js/dashboard.js',
  '/js/security.js',
  '/js/sidebar.js',
  '/dashboard/index.html',
  '/dashboard/eleves.html',
  '/dashboard/enseignants.html',
  '/dashboard/classes.html',
  '/dashboard/notes.html',
  '/dashboard/bulletins.html',
  '/dashboard/emploi-du-temps.html',
  '/dashboard/paiements.html',
  '/dashboard/presences.html',
  '/dashboard/parametres.html',
  '/dashboard/mes-matieres.html'
];

self.addEventListener('install', event => {
  self.skipWaiting(); // Force SW update
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_ASSETS))
      .catch(err => console.log('Cache addAll error', err))
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys.filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      );
    })
  );
});

// Stale-while-revalidate strategy for all requests except Supabase API
self.addEventListener('fetch', event => {
  const requestUrl = new URL(event.request.url);

  // Ne pas cacher les requêtes vers l'API Supabase
  if (requestUrl.hostname.includes('supabase.co')) {
    return; // Laisse le navigateur gérer (via sync.js et fetch)
  }

  // Pour les autres requêtes (HTML, CSS, JS, Images), on utilise stale-while-revalidate
  if (event.request.method === 'GET') {
    event.respondWith(
      caches.match(event.request).then(cachedResponse => {
        const fetchPromise = fetch(event.request).then(networkResponse => {
          if (networkResponse && networkResponse.status === 200) {
            caches.open(CACHE_NAME).then(cache => {
              cache.put(event.request, networkResponse.clone());
            });
          }
          return networkResponse;
        }).catch(() => {
            // Ignorer les erreurs réseau silencieusement en mode offline
        });
        
        // Retourne le cache s'il existe, SINON attend le réseau
        return cachedResponse || fetchPromise;
      })
    );
  }
});
