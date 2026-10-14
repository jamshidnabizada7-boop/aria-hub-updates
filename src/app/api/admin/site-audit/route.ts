import {NextRequest,NextResponse} from 'next/server';
import {db} from '@/lib/db';
import {getCurrentAdmin,logAction} from '@/lib/admin-auth';
import {HOMEPAGE_AREAS,HOMEPAGE_KEYS} from '@/lib/admin-catalog';
import {revalidateSiteContent} from '@/lib/revalidate-site';

export async function GET(){
 if(!await getCurrentAdmin())return NextResponse.json({error:'Unauthorized'},{status:401});
 try{
 const sections=await db.section.findMany({select:{id:true,key:true,title:true,enabled:true}});
 const today=new Date();today.setUTCHours(0,0,0,0);
 const areas=await Promise.all(HOMEPAGE_AREAS.map(async area=>{
  const section=sections.find(s=>s.key===area.key);
  let total:number|null=null,publicCount:number|null=null;
  if(area.model){
   const delegate=(db as any)[area.model];
   const where=area.model==='opportunity'?{status:'published',OR:[{deadline:null},{deadline:{gte:today}}]}:
    area.model==='partner'?{status:'active'}:area.model==='paymentMethod'?{status:'active'}:
    area.model==='whyChooseUsFeature'?{enabled:true}:area.model==='galleryItem'?{}:{status:'published'};
   [total,publicCount]=await Promise.all([delegate.count(),delegate.count({where})]);
  }
  return {...area,id:section?.id,title:section?.title||area.key,enabled:!!section?.enabled,total,publicCount,
   reason:!section?.enabled?'homepage_off':publicCount===0?'no_public_content':'visible'};
 }));
 const pages=await db.page.findMany({select:{id:true,slug:true,title:true,status:true},orderBy:{title:'asc'}});
 return NextResponse.json({areas,pages,unknownSections:sections.filter(s=>!HOMEPAGE_KEYS.has(s.key)&&s.key!=='cvBuilder'),observedAt:new Date().toISOString()},{headers:{'Cache-Control':'no-store'}});
 }catch{return NextResponse.json({error:'Could not inspect website content'},{status:500});}
}
export async function PUT(req:NextRequest){
 const admin=await getCurrentAdmin();if(!admin)return NextResponse.json({error:'Unauthorized'},{status:401});
 if(req.headers.get('origin')&&req.headers.get('origin')!==req.nextUrl.origin)return NextResponse.json({error:'Invalid origin'},{status:403});
 const body=await req.json().catch(()=>null);
 if(!body||!HOMEPAGE_KEYS.has(body.key)||typeof body.enabled!=='boolean')return NextResponse.json({error:'Choose a supported homepage section'},{status:400});
 const section=await db.section.upsert({where:{key:body.key},update:{enabled:body.enabled},create:{key:body.key,title:body.key,enabled:body.enabled,order:HOMEPAGE_AREAS.findIndex(a=>a.key===body.key)}});
 await logAction({userId:admin.id,action:'update_visibility',entity:'section',entityId:section.id,details:JSON.stringify({key:body.key,enabled:body.enabled}),req});
 revalidateSiteContent();return NextResponse.json({success:true});
}
