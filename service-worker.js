const CACHE_NAME = "relatorio-campo-cache-v9";
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/firebase-sync.js",
  "./manifest.webmanifest"
];

// Install: cache essentials
self.addEventListener("install", event => {
  console.log('[SW] Installing service worker...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[SW] Caching app shell');
      return cache.addAll(ASSETS);
    }).then(() => {
      console.log('[SW] Skip waiting');
      return self.skipWaiting();
    })
  );
});

// Activate: cleanup old caches
self.addEventListener("activate", event => {
  console.log('[SW] Activating service worker...');
  event.waitUntil(
    caches.keys().then(keys => {
      return Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      );
    }).then(() => {
      console.log('[SW] Claiming clients');
      return self.clients.claim();
    })
  );
});

// Fetch: Network First with Cache Fallback
self.addEventListener("fetch", event => {
  // Skip cross-origin requests
  if (!event.request.url.startsWith(self.location.origin)) {
    return;
  }

  event.respondWith(
    // Try network first
    fetch(event.request)
      .then(response => {
        // Clone the response
        const responseClone = response.clone();
        
        // Update cache with fresh content
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseClone);
        });
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then(cachedResponse => {
          if (cachedResponse) {
            console.log('[SW] Serving from cache:', event.request.url);
            return cachedResponse;
          }
          
          // If not in cache and network failed, return offline page
          if (event.request.mode === 'navigate') {
            return caches.match('./index.html');
          }
          
          return new Response('Offline - resource not available', {
            status: 503,
            statusText: 'Service Unavailable'
          });
        });
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
  console.log('[SW] Notification clicked:', event.action);
  event.notification.close();

  if (event.action === 'pause') {
    // Enviar mensagem para pausar o timer
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({ action: 'pauseTimer' });
          });
        })
    );
  } else if (event.action === 'stop') {
    // Enviar mensagem para parar o timer
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          clients.forEach(client => {
            client.postMessage({ action: 'stopTimer' });
          });
        })
    );
  } else {
    // Abrir ou focar na janela do app
    event.waitUntil(
      self.clients.matchAll({ type: 'window', includeUncontrolled: true })
        .then(clients => {
          // Verificar se já existe uma janela aberta
          for (const client of clients) {
            if (client.url.includes(self.location.origin) && 'focus' in client) {
              return client.focus();
            }
          }
          // Se não, abrir nova janela
          if (self.clients.openWindow) {
            return self.clients.openWindow('/');
          }
        })
    );
  }
});

// Message handler para atualizar notificações
self.addEventListener('message', event => {
  if (event.data && event.data.type === 'SHOW_TIMER_NOTIFICATION') {
    const { title, body, icon, actions, tag } = event.data;
    
    self.registration.showNotification(title, {
      body,
      icon,
      badge: icon,
      tag: tag || 'timer-notification',
      requireInteraction: true,
      actions: actions || [],
      data: { url: '/' }
    });
  }
});
