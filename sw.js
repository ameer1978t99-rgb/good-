const CACHE_NAME = 'school-app-v1';
const urlsToCache = [
        './',
        './index.html', // ✅ تم التعديل هنا
        './manifest.json',
        './exceljs.min.js',
        './xlsx.full.min.js',
        './icon-192.png',
        './icon-512.png',
        'https://fonts.googleapis.com/css2?family=Cairo:wght@400;700&family=Tajawal:wght@400;700&display=swap'
];

// تثبيت التخزين المؤقت
self.addEventListener('install', event => {
        self.skipWaiting();
        event.waitUntil(
                caches.open(CACHE_NAME)
                .then(cache => {
                        return cache.addAll(urlsToCache);
                })
        );
});

// تفعيل وحذف الكاش القديم
self.addEventListener('activate', event => {
        event.waitUntil(
                caches.keys().then(cacheNames => {
                        return Promise.all(
                                cacheNames.map(cacheName => {
                                        if (cacheName !== CACHE_NAME) {
                                                return caches.delete(cacheName);
                                        }
                                })
                        );
                }).then(() => self.clients.claim())
        );
});

// جلب الملفات من الكاش إذا كان الإنترنت مقطوعاً
self.addEventListener('fetch', event => {
        event.respondWith(
                caches.match(event.request)
                .then(response => {
                        if (response) {
                                return response;
                        }
                        return fetch(event.request).then(
                                function(response) {
                                        if (!response || response.status !== 200 || response.type !== 'basic') {
                                                return response;
                                        }
                                        var responseToCache = response.clone();
                                        caches.open(CACHE_NAME)
                                                .then(function(cache) {
                                                        cache.put(event.request, responseToCache);
                                                });
                                        return response;
                                }
                        );
                })
        );
});
