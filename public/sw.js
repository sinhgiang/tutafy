const CACHE = 'tutafy-v2' // v2 (T-0969): drops cached pages and pictures that still show the old logo
const STATIC = ['/offline', '/manifest.webmanifest']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(STATIC)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  const url = new URL(e.request.url)
  // Skip API, Supabase, external requests
  if (url.pathname.startsWith('/api/') || !url.hostname.includes('tutafy')) return

  e.respondWith(
    fetch(e.request)
      .then(res => {
        // Cache page navigations
        if (res.ok && e.request.mode === 'navigate') {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      .catch(() => caches.match(e.request).then(cached => cached || caches.match('/offline')))
  )
})

self.addEventListener('push', function(event) {
  if (!event.data) return
  var data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/brand/tutafy-badge-96.png', // the shape only, white on transparent: a phone paints it in one colour
      data: { url: data.url || '/' }
    })
  )
})

self.addEventListener('notificationclick', function(event) {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      var url = event.notification.data && event.notification.data.url ? event.notification.data.url : '/'
      for (var i = 0; i < clientList.length; i++) {
        if (clientList[i].url === url && 'focus' in clientList[i]) return clientList[i].focus()
      }
      if (clients.openWindow) return clients.openWindow(url)
    })
  )
})
