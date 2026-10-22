// ============================================================
// Service Worker - نظام الرصد الإلكتروني
// الإصدار: 3.9.0
// ============================================================

// ⚠️ مهم جداً: غيّر هذا الرقم عند كل تحديث جديد
const CACHE_NAME = 'rasd-app-v5.8.0';
const CACHE_VERSION = '5.8.0';

// الملفات التي سيتم تخزينها مؤقتاً للعمل بدون إنترنت
const STATIC_ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js'
];

// ==================== INSTALL ====================
self.addEventListener('install', (event) => {
  console.log('📦 تثبيت Service Worker - الإصدار:', CACHE_VERSION);
  // تخطي مرحلة الانتظار - تنشيط فوري
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.all(
        STATIC_ASSETS.map(url =>
          cache.add(url).catch(err => console.warn('⚠️ فشل تخزين:', url, err))
        )
      );
    })
  );
});

// ==================== ACTIVATE ====================
self.addEventListener('activate', (event) => {
  console.log('✅ تنشيط Service Worker - الإصدار:', CACHE_VERSION);
  event.waitUntil(
    // حذف جميع الكاشات القديمة بلا استثناء
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            console.log('🗑️ حذف كاش قديم:', key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => {
      // السيطرة على جميع الصفحات المفتوحة فوراً
      return self.clients.claim();
    }).then(() => {
      // إبلاغ جميع العملاء بالتحديث
      return self.clients.matchAll().then(clients => {
        clients.forEach(client => {
          client.postMessage({
            type: 'SW_UPDATED',
            version: CACHE_VERSION
          });
        });
      });
    })
  );
});

// ==================== FETCH ====================
self.addEventListener('fetch', (event) => {
  const { request } = event;
  
  // تجاهل الطلبات غير GET
  if (request.method !== 'GET') return;
  
  // تجاهل طلبات chrome-extension
  if (request.url.startsWith('chrome-extension://')) return;
  
  // ═══ مهم: طلبات HTML دائماً من الشبكة أولاً (Network-First) ═══
  if (request.destination === 'document' || request.url.endsWith('.html') || request.url.endsWith('/')) {
    event.respondWith(
      fetch(request)
      .then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200) {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return networkResponse;
      })
      .catch(() => {
        return caches.match(request).then(cached => cached || caches.match('./index.html'));
      })
    );
    return;
  }
  
  // ═══ باقي الملفات: Cache-First مع تحديث بالخلفية ═══
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        fetch(request).then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
            caches.open(CACHE_NAME).then(cache => cache.put(request, networkResponse.clone()));
          }
        }).catch(() => {});
        return cachedResponse;
      }
      
      return fetch(request).then((networkResponse) => {
        if (networkResponse && networkResponse.status === 200 && networkResponse.type !== 'opaque') {
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, responseClone));
        }
        return networkResponse;
      }).catch(() => {
        return new Response('⚠️ لا يوجد اتصال بالإنترنت', {
          status: 503,
          statusText: 'Offline',
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});

// ==================== MESSAGE ====================
self.addEventListener('message', (event) => {
  if (event.data === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }
  if (event.data === 'CLEAR_CACHE') {
    caches.keys().then(keys => {
      Promise.all(keys.map(k => caches.delete(k))).then(() => {
        event.ports[0].postMessage({ success: true });
      });
    });
  }
});