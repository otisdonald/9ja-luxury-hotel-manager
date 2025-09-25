const CACHE_NAME = 'v2.5.0-electron-fixes';
const urlsToCache = [
  '/',
  '/index.html',
  '/staff-login.html',
  '/admin.html',
  '/styles.css',
  '/admin-styles.css',
  '/script.js',
  '/admin-script.js',
  '/manifest.json',
  '/icons/icon-16x16.png',
  '/icons/icon-192x192.png'
  // Removed non-existent icon-512x512.png
];

// Install event - cache resources with individual error handling
self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching files');
        // Cache files individually to avoid complete failure if one file fails
        return Promise.allSettled(
          urlsToCache.map(url => {
            return cache.add(url).catch(error => {
              console.warn(`Service Worker: Failed to cache ${url}:`, error);
              return null; // Continue with other files
            });
          })
        );
      })
      .then((results) => {
        const successful = results.filter(result => result.status === 'fulfilled').length;
        const failed = results.filter(result => result.status === 'rejected').length;
        console.log(`Service Worker: Cached ${successful} files, ${failed} failed`);
        console.log('Service Worker: Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('Service Worker: Installation failed', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      console.log('Service Worker: Activation complete');
      return self.clients.claim();
    })
  );
});

// Fetch event - serve cached content when offline
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests
  if (event.request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension requests
  if (event.request.url.startsWith('chrome-extension://')) {
    return;
  }

  // Handle API requests differently
  if (event.request.url.includes('/api/')) {
    event.respondWith(
      fetch(event.request)
        .then((response) => {
          // If online, return the response and update cache
          if (response.status === 200) {
            const responseClone = response.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseClone);
            });
          }
          return response;
        })
        .catch(() => {
          // If offline, try to serve from cache
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            // Return offline fallback for API requests
            return new Response(
              JSON.stringify({ 
                error: 'Offline', 
                message: 'This feature requires internet connection',
                offline: true
              }), 
              {
                headers: { 'Content-Type': 'application/json' },
                status: 503
              }
            );
          });
        })
    );
    return;
  }

  // Handle all other requests (HTML, CSS, JS, images)
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version if available
        if (response) {
          console.log('Service Worker: Serving from cache:', event.request.url);
          return response;
        }

        // Skip caching external resources that might violate CSP
        const url = new URL(event.request.url);
        if (url.hostname !== 'localhost' && url.hostname !== '127.0.0.1' && !url.hostname.includes('localhost')) {
          // For external resources, just fetch without caching
          return fetch(event.request).catch(() => {
            // Return a basic response if external resource fails
            return new Response('', { 
              status: 200, 
              statusText: 'OK',
              headers: { 'Content-Type': 'text/plain' }
            });
          });
        }

        // If not in cache, fetch from network (local resources only)
        return fetch(event.request).then((response) => {
          // Don't cache if not a valid response
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }

          // Clone the response
          const responseToCache = response.clone();

          // Add to cache
          caches.open(CACHE_NAME)
            .then((cache) => {
              cache.put(event.request, responseToCache);
            });

          return response;
        }).catch(() => {
          // Offline fallback for HTML pages
          if (event.request.destination === 'document') {
            return caches.match('/index.html');
          }
          
          // Offline fallback for images
          if (event.request.destination === 'image') {
            return new Response(
              '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f0f0f0"/><text x="100" y="100" text-anchor="middle" fill="#666">Offline</text></svg>',
              { headers: { 'Content-Type': 'image/svg+xml' } }
            );
          }
        });
      })
  );
});

// Background sync for when connection is restored
self.addEventListener('sync', (event) => {
  console.log('Service Worker: Background sync triggered');
  if (event.tag === 'background-sync') {
    event.waitUntil(
      // Sync any pending data when connection is restored
      syncPendingData()
    );
  }
});

// Push notification handling
self.addEventListener('push', (event) => {
  console.log('Service Worker: Push message received');
  
  const options = {
    body: event.data ? event.data.text() : 'Hotel Manager notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1
    },
    actions: [
      {
        action: 'explore',
        title: 'Open App',
        icon: '/icons/icon-192x192.png'
      },
      {
        action: 'close',
        title: 'Close',
        icon: '/icons/icon-192x192.png'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification('Hotel Manager', options)
  );
});

// Notification click handling
self.addEventListener('notificationclick', (event) => {
  console.log('Service Worker: Notification clicked');
  event.notification.close();

  if (event.action === 'explore') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// Helper function to sync pending data
async function syncPendingData() {
  try {
    // Check for any pending data in IndexedDB or localStorage
    // and sync it when connection is restored
    console.log('Service Worker: Syncing pending data...');
    
    // This would sync any offline changes made to bookings, inventory, etc.
    // Implementation depends on your offline data storage strategy
    
    return Promise.resolve();
  } catch (error) {
    console.error('Service Worker: Sync failed', error);
    return Promise.reject(error);
  }
}

// Update app cache when new version is available
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});