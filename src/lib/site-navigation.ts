import type {MenuItem} from './types';
import {resolveAnchorUrl} from './anchor-routes';

/** Keep one entry per destination, with related pages in one shallow group. */
export function cleanSiteNavigation(menu:MenuItem[]):MenuItem[]{
 const seen=new Set<string>(['/','/get-started','/login','/register','/portal']);
 const categories:Record<string,string>={Jobs:'job',Scholarships:'scholarship',Internships:'internship',Competitions:'competitions',Conferences:'conference',Volunteer:'volunteer','Exchange Programs':'exchange-program',Training:'training'};
 function clean(items:MenuItem[]):MenuItem[]{
  return items.flatMap(item=>{
   if(!item.visible)return [];
   let url=item.url?resolveAnchorUrl(item.url,item.label):null;
   if(url==='/opportunities'&&item.parentId&&categories[item.label])url+='?category='+categories[item.label];
   if(item.label==='Travel & Visa'&&url==='/services')url='/visas';
   // Specific template choices belong inside their builders.
   if(url?.startsWith('/cv-builder?'))url='/cv-builder';
   if(url?.startsWith('/letters?'))url='/letters';
   const hasChildren=Boolean(item.children?.length);
   const includeLanding=hasChildren&&url&&!seen.has(url);
   if(includeLanding)seen.add(url!);
   const children=clean(item.children||[]);
   if(includeLanding)children.unshift({...item,id:item.id+'-overview',label:'View all '+item.label,
    labelI18n:{en:'View all '+item.label,fa:'همه '+(item.labelI18n?.fa||item.label),ps:'ټول '+(item.labelI18n?.ps||item.label)},
    url,parentId:item.id,children:[]});
   if(children.length)return [{...item,url,children}];
   if(!url||seen.has(url))return [];
   seen.add(url);return [{...item,url,children:[]}];
  });
 }
 // Process canonical groups first so standalone duplicates disappear.
 const rank=(item:MenuItem)=>item.label==='Opportunities'?0:item.label==='Tools'?1:item.label==='Services'?2:3;
 const cleaned=clean([...menu].sort((a,b)=>rank(a)-rank(b)||a.order-b.order));
 const primary=cleaned.filter(item=>rank(item)<3);
 const secondary=cleaned.filter(item=>rank(item)===3);
 if(secondary.length)primary.push({id:'site-more',label:'More',labelI18n:{en:'More',fa:'بیشتر',ps:'نور'},url:null,parentId:null,icon:null,order:99,visible:true,openInNewTab:false,children:secondary});
 return primary;
}
