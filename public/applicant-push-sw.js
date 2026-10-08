/* Applicant web push service worker; never automatically subscribes a visitor.
 * Payload is untrusted, so only safe in-site opportunity paths can be opened. */
self.addEventListener('push',event=>{
 let data={};try{data=event.data?event.data.json():{};}catch{return;}
 const url=typeof data.url==='string'?data.url:'';
 let href='/en/portal/notifications';
 try{
  const parsed=new URL(url,self.location.origin);
  if(parsed.origin===self.location.origin&&
    /^\/(en|fa|ps)\/(opportunities\/[a-z0-9_-]+|portal\/notifications)$/.test(parsed.pathname))
   href=parsed.pathname;
 }catch{}
 const title=typeof data.title==='string'&&data.title.length<=70?data.title:'ARIA HUB';
 const body=typeof data.body==='string'?data.body.slice(0,170):'A new saved-search match is available.';
 event.waitUntil(self.registration.showNotification(title,{body,tag:'aria-hub-saved-match',data:{href}}));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();
 const href=event.notification.data?.href||'/en/portal/notifications';
 event.waitUntil(self.clients.openWindow(href));
});
