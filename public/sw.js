self.addEventListener('push', e => {
  const d = e.data ? e.data.json() : { title: 'Pocket Cofounder', body: '' };
  e.waitUntil(self.registration.showNotification(d.title, { body: d.body, tag: d.tag, data: { url: d.url || '/' } }));
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  const url = e.notification.data.url || '/';
  e.waitUntil(self.clients.matchAll({ type: 'window' }).then(cs => (cs[0] ? cs[0].focus().then(c => (url !== '/' && c && c.navigate ? c.navigate(url) : c)) : self.clients.openWindow(url))));
});
