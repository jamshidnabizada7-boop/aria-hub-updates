/** Reconcile public menu destinations without deleting content. Dry by default. */
import {db} from '../src/lib/db';
import {mkdir,writeFile} from 'node:fs/promises';
const apply=process.argv.includes('--apply');
const dbUrl=new URL(process.env.DATABASE_URL||'');
if(!['127.0.0.1','localhost'].includes(dbUrl.hostname))throw Error('Oracle local database required');
const path='/opt/aria-hub/private/admin-navigation';
try{
 const [menu,footer]=await Promise.all([db.menuItem.findMany(),db.footerLink.findMany()]);
 const categories:Record<string,string>={Jobs:'job',Scholarships:'scholarship',Internships:'internship',Competitions:'competitions',Conferences:'conference',Volunteer:'volunteer','Exchange Programs':'exchange-program',Training:'training'};
 const patches=menu.flatMap(m=>categories[m.label]&&m.url==='/opportunities'?[{id:m.id,url:'/opportunities?category='+categories[m.label]}]:m.label==='Travel & Visa'&&m.url==='/services'?[{id:m.id,url:'/visas'}]:[]);
 const footerPatches=footer.filter(f=>f.url==='/#gallery'||f.url==='#gallery').map(f=>({id:f.id,url:'/gallery'}));
 const tools=menu.find(m=>m.label.toLowerCase()==='tools'&&!m.parentId);
 const resources=menu.find(m=>m.id==='admin-nav-resources');
 const items=[
  {label:'CV Builder',url:'/cv-builder',fa:'سی‌وی ساز',ps:'سي وي جوړونکی',parent:'tools'},
  {label:'Letter Builder',url:'/letters',fa:'نامه‌ساز',ps:'د لیک جوړوونکی',parent:'tools'},
  {label:'Opportunity Matcher',url:'/opportunity-matcher',fa:'فرصت‌یاب',ps:'د فرصت موندونکی',parent:'tools'},
  {label:'Document Templates',url:'/templates',fa:'نمونه‌های اسناد',ps:'د سندونو نمونې',parent:'tools'},
  {label:'Interview Preparation',url:'/interview-prep',fa:'آمادگی مصاحبه',ps:'مرکې ته چمتووالی',parent:'tools'},
  {label:'Visa Preparation',url:'/visa-prep',fa:'آمادگی ویزه',ps:'ویزې ته چمتووالی',parent:'tools'},
  {label:'Organizations',url:'/organizations',fa:'سازمان‌ها',ps:'ادارې',parent:'resources'},
  {label:'Gallery',url:'/gallery',fa:'گالری',ps:'ګالري',parent:'resources'},
  {label:'News',url:'/blog',fa:'خبرها',ps:'خبرونه',parent:'resources'},
  {label:'Success Stories',url:'/success-stories',fa:'داستان‌های موفقیت',ps:'د بریا کیسې',parent:'resources'},
  {label:'About',url:'/about',fa:'درباره ما',ps:'زموږ په اړه',parent:'resources'},
  {label:'Partners',url:'/partners',fa:'همکاران',ps:'شریکان',parent:'resources'},
 ];
 console.log(JSON.stringify({mode:apply?'apply':'dry_run',categoryCorrections:patches.length,footerCorrections:footerPatches.length,makeToolsManageable:true,newMenuDestinations:items.filter(i=>!menu.some(m=>m.url===i.url)).map(i=>i.url)}));
 if(apply){
  await mkdir(path,{recursive:true,mode:0o700});
  const backup=path+'/before-'+Date.now()+'.json';await writeFile(backup,JSON.stringify({menu,footer}),{mode:0o600,flag:'wx'});
  await db.$transaction(async tx=>{
   for(const p of patches)await tx.menuItem.update({where:{id:p.id},data:{url:p.url}});
   for(const p of footerPatches)await tx.footerLink.update({where:{id:p.id},data:{url:p.url}});
   const toolsId=tools?.id||'admin-nav-tools',resourcesId=resources?.id||'admin-nav-resources';
   await tx.menuItem.upsert({where:{id:toolsId},update:{visible:true,url:null},create:{id:toolsId,label:'Tools',labelI18n:{en:'Tools',fa:'ابزارها',ps:'وسیلې'},url:null,visible:true,order:2}});
   await tx.menuItem.upsert({where:{id:resourcesId},update:{},create:{id:resourcesId,label:'Explore',labelI18n:{en:'Explore',fa:'بیشتر بدانید',ps:'نور ومومئ'},url:null,visible:true,order:3}});
   for(const [index,item] of items.entries()){
    const previous=menu.find(m=>m.url===item.url),parentId=item.parent==='tools'?toolsId:resourcesId;
    if(previous)await tx.menuItem.update({where:{id:previous.id},data:{parentId,visible:true}});
    else await tx.menuItem.create({data:{id:'admin-nav-'+item.url.slice(1),label:item.label,labelI18n:{en:item.label,fa:item.fa,ps:item.ps},url:item.url,parentId,visible:true,order:index}});
   }
   await tx.auditLog.create({data:{action:'admin.navigation-reconcile',entity:'menuItem',details:JSON.stringify({backup,categoryCorrections:patches.length,footerCorrections:footerPatches.length,deleted:0})}});
  });console.log(JSON.stringify({status:'applied',backup,deleted:0}));
 }
}finally{await db.$disconnect();}
