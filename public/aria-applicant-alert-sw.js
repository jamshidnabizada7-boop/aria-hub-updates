/* Future PWA push display worker. No subscription or sender is activated. */
self.addEventListener('push', function(event) {
  // Notifications are intentionally generic: no sensitive profile, eligibility,
  // nationality or vacancy details visible on shared device lock screens.
  event.waitUntil(self.registration.showNotification('ARIA HUB', {
    body:'A new opportunity may match your saved preferences.',
    icon:'/favicon.ico',
    badge:'/favicon.ico',
    tag:'aria-saved-search-match',
    data:{path:'/fa/portal/notifications'}
  }));
});
self.addEventListener('notificationclick',function(event){
 event.notification.close();
 event.waitUntil(self.clients.openWindow('/fa/portal/notifications'));
});
