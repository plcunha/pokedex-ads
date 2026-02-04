/**
 * Pokédex Pro Service Worker
 * Provides offline support and caching
 */

const CACHE_VERSION = 'v1.1.0';
const STATIC_CACHE = `pokedex-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `pokedex-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `pokedex-images-${CACHE_VERSION}`;

// Static assets to cache immediately
const STATIC_ASSETS = [
  './',
  './index.html',
  './pokemon.html',
  './ranking.html',
  './arena.html',
  './404.html',
  './css/styles.css',
  './js/api.js',
  './js/app.js',
  './js/ranking.js',
  './js/arena.js',
  './manifest.json',
  './icons/placeholder.svg'
];

// Cache size limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_IMAGE_CACHE_ITEMS = 150;

/**
 * Install event - cache static assets
 */
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
      .catch((error) => console.error('[SW] Install failed:', error))
  );
});

/**
 * Activate event - clean old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return name.startsWith('pokedex-') && 
                     name !== STATIC_CACHE && 
                     name !== DYNAMIC_CACHE && 
                     name !== IMAGE_CACHE;
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

/**
 * Fetch event - handle requests
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;
  
  // Skip Chrome extensions
  if (url.protocol === 'chrome-extension:') return;

  // Handle different request types
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
  } else if (isImageRequest(url)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE, MAX_IMAGE_CACHE_ITEMS));
  } else if (isAPIRequest(url)) {
    event.respondWith(networkFirst(request, DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS));
  } else {
    event.respondWith(networkFirstWithFallback(request));
  }
});

/**
 * Check if request is for static assets
 */
function isStaticAsset(url) {
  const staticExtensions = ['.css', '.js', '.woff', '.woff2', '.ttf', '.eot'];
  const staticPaths = ['/manifest.json'];
  
  return staticExtensions.some(ext => url.pathname.endsWith(ext)) ||
         staticPaths.some(path => url.pathname.endsWith(path)) ||
         url.hostname === 'fonts.googleapis.com' ||
         url.hostname === 'fonts.gstatic.com' ||
         url.hostname === 'unpkg.com' ||
         url.hostname === 'cdnjs.cloudflare.com';
}

/**
 * Check if request is for images
 */
function isImageRequest(url) {
  const imageExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg', '.ico'];
  return imageExtensions.some(ext => url.pathname.endsWith(ext)) ||
         url.hostname === 'raw.githubusercontent.com';
}

/**
 * Check if request is for API
 */
function isAPIRequest(url) {
  return url.hostname === 'pokeapi.co';
}

/**
 * Cache First Strategy
 */
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  if (cached) return cached;
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache First failed:', error);
    return new Response('Resource not available', { status: 503 });
  }
}

/**
 * Network First Strategy
 */
async function networkFirst(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(cacheName, maxItems);
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache');
    const cached = await cache.match(request);
    if (cached) return cached;
    
    return new Response(JSON.stringify({ error: 'Offline' }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

/**
 * Stale While Revalidate Strategy
 */
async function staleWhileRevalidate(request, cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
        trimCache(cacheName, maxItems);
      }
      return response;
    })
    .catch(() => null);
  
  return cached || fetchPromise;
}

/**
 * Network First with Offline Fallback
 */
async function networkFirstWithFallback(request) {
  const cache = await caches.open(DYNAMIC_CACHE);
  
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
      trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) return cached;
    
    // Return offline page
    const offlinePage = await caches.match('./404.html');
    if (offlinePage) return offlinePage;
    
    return new Response(`
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Offline - Pokédex Pro</title>
        <style>
          body {
            font-family: 'Inter', sans-serif;
            background: #0F172A;
            color: #F8FAFC;
            display: flex;
            align-items: center;
            justify-content: center;
            min-height: 100vh;
            margin: 0;
            text-align: center;
            padding: 1rem;
          }
          h1 { font-size: 3rem; margin-bottom: 1rem; }
          p { color: #94A3B8; margin-bottom: 1.5rem; }
          button {
            background: #EF4444;
            color: white;
            border: none;
            padding: 0.75rem 1.5rem;
            font-size: 1rem;
            border-radius: 0.5rem;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <div>
          <h1>📡</h1>
          <h2>Você está offline</h2>
          <p>Verifique sua conexão e tente novamente.</p>
          <button onclick="location.reload()">Tentar novamente</button>
        </div>
      </body>
      </html>
    `, {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

/**
 * Limit cache size
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const keysToDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(keysToDelete.map(key => cache.delete(key)));
  }
}

console.log('[SW] Service Worker loaded');
