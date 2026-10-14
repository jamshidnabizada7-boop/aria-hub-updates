import {test,expect} from 'bun:test';
import {cleanSiteNavigation} from '../src/lib/site-navigation';
import type {MenuItem} from '../src/lib/types';
function item(label:string,url:string|null,children:MenuItem[]=[]):MenuItem{
 return {id:label,label,url,children:children.map(c=>({...c,parentId:label})),parentId:null,labelI18n:{fa:label,ps:label},icon:null,order:1,visible:true,openInNewTab:false};
}
test('one navigation destination per page; opportunity categories remain distinct and tools stay grouped',()=>{
 const result=cleanSiteNavigation([item('Home','/'),item('CV Builder','/cv-builder'),item('Opportunity Matcher','/opportunity-matcher'),
  item('Tools',null,[item('CV Builder','/cv-builder'),item('CV templates','/cv-builder?templates=1'),item('Letter Builder','/letters'),item('Cover letter','/letters?type=cover'),item('Opportunity Matcher','/opportunity-matcher')]),
  item('Opportunities','/opportunities',[item('Jobs','/opportunities'),item('Scholarships','/opportunities')]),
  item('Services','/services',[item('Business Setup','/services'),item('Travel & Visa','/services')]),item('Contact','/contact')]);
 expect(result.map(i=>i.label)).toEqual(['Opportunities','Tools','Services','More']);
 const urls:string[]=[];function walk(menu:MenuItem[]){for(const i of menu){if(i.children.length)walk(i.children);else if(i.url)urls.push(i.url);}}walk(result);
 expect(urls.length).toBe(new Set(urls).size);
 expect(urls).toContain('/opportunities');expect(urls).toContain('/opportunities?category=job');expect(urls).toContain('/opportunities?category=scholarship');
 expect(urls).toContain('/visas');expect(urls).toContain('/contact');expect(urls).not.toContain('/');
});
test('resource groups flatten into More without another redundant submenu',()=>{
 const result=cleanSiteNavigation([item('Explore',null,[item('Organizations','/organizations'),item('Gallery','/gallery')])]);
 expect(result[0].label).toBe('More');expect(result[0].children.map(i=>i.url)).toEqual(['/organizations','/gallery']);
 expect(result[0].children.every(i=>i.children.length===0)).toBe(true);
});
