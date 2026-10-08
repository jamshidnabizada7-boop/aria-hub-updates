import type {MetadataRoute} from 'next';
/** PWA foundation only; push subscriptions and delivery are NOT yet enabled. */
export default function manifest():MetadataRoute.Manifest {
 return {
  name:'ARIA HUB — Careers & Opportunities',
  short_name:'ARIA HUB',
  description:'Find relevant jobs, scholarships, and career opportunities.',
  start_url:'/fa/portal',
  scope:'/',
  display:'standalone',
  background_color:'#ffffff',
  theme_color:'#163a68',
  icons:[{src:'/favicon.ico',sizes:'any',type:'image/x-icon',purpose:'any'}]
 };
}
