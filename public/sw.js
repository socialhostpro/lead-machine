// Lead Machine Service Worker
// Handles offline functionality, caching, and background sync

const CACHE_NAME = 'lead-machine-v1.0.0';
const STATIC_CACHE_NAME = 'lead-machine-static-v1.0.0';
const DYNAMIC_CACHE_NAME = 'lead-machine-dynamic-v1.0.0';

// Files to cache immediately (critical app shell)
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/env.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
  // Tailwind CSS and other external resources will be cached dynamically
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  /^https:\/\/.*\.supabase\.co\/functions\/v1\//,
];

// Background sync tags
const SYNC_TAGS = {
  LEAD_SYNC: 'lead-sync',
  NOTIFICATION_SYNC: 'notification-sync',
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');
  
  event.waitUntil(
    Promise.all([
      // Cache static assets
      caches.open(STATIC_CACHE_NAME).then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS.map(url => new Request(url, { cache: 'reload' })));
      }),
      // Skip waiting to activate immediately
      self.skipWaiting()
    ])
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');
  
  event.waitUntil(
    Promise.all([
      // Clean up old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => 
              cacheName.startsWith('lead-machine-') && 
              ![STATIC_CACHE_NAME, DYNAMIC_CACHE_NAME].includes(cacheName)
            )
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      }),
      // Take control of all clients
      self.clients.claim()
    ])
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Supabase Edge Functions - let them handle their own CORS
  if (request.url.includes('/functions/v1/')) {
    return;
  }

  event.respondWith(handleFetchRequest(request, url));
});

async function handleFetchRequest(request, url) {
  try {
    // Strategy 1: Static assets - Cache First
    if (STATIC_ASSETS.some(asset => url.pathname === asset || url.pathname.endsWith(asset))) {
      return await cacheFirstStrategy(request, STATIC_CACHE_NAME);
    }

    // Strategy 2: API requests - Network First with background sync
    if (API_CACHE_PATTERNS.some(pattern => pattern.test(request.url))) {
      return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);
    }

    // Strategy 3: External resources (CDN) - Stale While Revalidate
    if (url.origin !== location.origin) {
      return await staleWhileRevalidateStrategy(request, DYNAMIC_CACHE_NAME);
    }

    // Strategy 4: Same-origin requests - Network First
    return await networkFirstStrategy(request, DYNAMIC_CACHE_NAME);

  } catch (error) {
    console.error('[SW] Fetch error:', error);
    return await handleOfflineFallback(request);
  }
}

// Cache First Strategy (for static assets)
async function cacheFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache first failed:', error);
    throw error;
  }
}

// Network First Strategy (for API and dynamic content)
async function networkFirstStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  
  try {
    const networkResponse = await fetch(request);
    
    // Cache successful responses
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    throw error;
  }
}

// Stale While Revalidate Strategy (for external resources)
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cachedResponse = await cache.match(request);
  
  // Always try to fetch in the background
  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse.status === 200) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  }).catch(() => {
    // Silently fail background fetch
  });

  // Return cached version immediately if available
  if (cachedResponse) {
    fetchPromise; // Don't await, let it run in background
    return cachedResponse;
  }

  // If no cache, wait for network
  return await fetchPromise;
}

// Offline fallback handler
async function handleOfflineFallback(request) {
  const url = new URL(request.url);
  
  // For navigation requests, return cached index.html or offline page
  if (request.mode === 'navigate') {
    const cache = await caches.open(STATIC_CACHE_NAME);
    const cachedIndex = await cache.match('/');
    
    if (cachedIndex) {
      return cachedIndex;
    }
    
    // Return basic offline response
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Lead Machine - Offline</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <style>
            body { font-family: system-ui, sans-serif; text-align: center; padding: 50px; }
            .offline { color: #666; max-width: 400px; margin: 0 auto; }
            .retry { background: #0d9488; color: white; border: none; padding: 10px 20px; border-radius: 5px; margin-top: 20px; cursor: pointer; }
          </style>
        </head>
        <body>
          <div class="offline">
            <h1>🔌 You're Offline</h1>
            <p>Lead Machine is currently unavailable. Check your internet connection and try again.</p>
            <button class="retry" onclick="location.reload()">Retry</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }

  // For other requests, return appropriate error
  return new Response('Offline', { status: 503 });
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === SYNC_TAGS.LEAD_SYNC) {
    event.waitUntil(syncPendingLeads());
  }
  
  if (event.tag === SYNC_TAGS.NOTIFICATION_SYNC) {
    event.waitUntil(syncPendingNotifications());
  }
});

// Sync pending leads when online
async function syncPendingLeads() {
  try {
    console.log('[SW] Syncing pending leads...');
    
    // Get pending leads from IndexedDB or localStorage
    const pendingLeads = await getPendingLeads();
    
    for (const lead of pendingLeads) {
      try {
        // Attempt to sync each lead
        await syncLead(lead);
        console.log('[SW] Lead synced successfully:', lead.id);
      } catch (error) {
        console.error('[SW] Failed to sync lead:', lead.id, error);
      }
    }
    
    // Clear synced leads
    await clearSyncedLeads();
    
  } catch (error) {
    console.error('[SW] Background sync failed:', error);
    throw error;
  }
}

// Sync pending notifications
async function syncPendingNotifications() {
  console.log('[SW] Syncing pending notifications...');
  // Implementation for notification sync
}

// Helper functions for offline storage
async function getPendingLeads() {
  // This would typically use IndexedDB
  // For now, return empty array
  return [];
}

async function syncLead(lead) {
  // Implementation for syncing individual lead
  console.log('[SW] Syncing lead:', lead);
}

async function clearSyncedLeads() {
  // Clear successfully synced leads from offline storage
  console.log('[SW] Clearing synced leads');
}

// Push notification handler
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  const data = event.data ? event.data.json() : {};
  const title = data.title || 'Lead Machine';
  const options = {
    body: data.body || 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-96x96.png',
    tag: data.tag || 'general',
    requireInteraction: data.requireInteraction || false,
    actions: data.actions || [],
    data: data.data || {},
    vibrate: [200, 100, 200],
    sound: '/sounds/notification.mp3'
  };
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.notification);
  
  event.notification.close();
  
  // Handle notification actions
  if (event.action) {
    console.log('[SW] Notification action clicked:', event.action);
  }
  
  // Open or focus the app
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin)) {
          return client.focus();
        }
      }
      
      // Otherwise, open new window
      return clients.openWindow('/');
    })
  );
});

// Message handler for communication with main app
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);
  
  const { type, payload } = event.data;
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;
      
    case 'CACHE_LEAD':
      // Cache a lead for offline access
      cacheLead(payload);
      break;
      
    case 'CLEAR_CACHE':
      // Clear all caches
      clearAllCaches();
      break;
      
    default:
      console.log('[SW] Unknown message type:', type);
  }
});

async function cacheLead(lead) {
  // Implementation for caching specific lead data
  console.log('[SW] Caching lead:', lead);
}

async function clearAllCaches() {
  const cacheNames = await caches.keys();
  await Promise.all(
    cacheNames
      .filter(name => name.startsWith('lead-machine-'))
      .map(name => caches.delete(name))
  );
  console.log('[SW] All caches cleared');
}

console.log('[SW] Service worker loaded successfully');