import {test,expect,mock,afterAll} from 'bun:test';
const url=new URL(process.env.DATABASE_URL||'http://invalid');
const isolated=['127.0.0.1','localhost'].includes(url.hostname)&&url.pathname.endsWith('_test');
const databaseTest=isolated?test:test.skip;
mock.module('server-only',()=>({}));
let authenticated=true;const expired:string[]=[];
mock.module('../src/lib/admin-auth',()=>({getCurrentAdmin:async()=>authenticated?{id:'admin-audit-test',role:'super_admin'}:null,logAction:async()=>{}}));
mock.module('next/cache',()=>({revalidateTag:(tag:string)=>expired.push(tag),revalidatePath:()=>{}}));
const {db}=await import('../src/lib/db');
const crud=await import('../src/app/api/admin/crud/route');
const audit=await import('../src/app/api/admin/site-audit/route');
const {NextRequest}=await import('next/server');
const run='admin-audit-'+Date.now(),templateIds:string[]=[],sessionIds:string[]=[];
const req=(url:string,method='GET',body?:object)=>new NextRequest('http://localhost'+url,{method,...(body?{headers:{'Content-Type':'application/json',origin:'http://localhost'},body:JSON.stringify(body)}:{})});
afterAll(async()=>{if(!isolated)return;await db.documentTemplate.deleteMany({where:{id:{in:templateIds}}});await db.interviewSession.deleteMany({where:{id:{in:sessionIds}}});await db.$disconnect();});
databaseTest('canonical template CRUD retains drafts, translations, arrays and premium flags',async()=>{
 const created=await crud.POST(req('/api/admin/crud','POST',{model:'documentTemplate',data:{title:run,slug:run,status:'draft',content:'Draft content',titleI18n:{en:run,fa:'نمونه آزمایشی'},requiredFields:['Name','Experience'],writingTips:['Use facts'],isPremium:false}}));
 expect(created.status).toBe(200);const result=await created.json();templateIds.push(result.item.id);
 const id=result.item.id;
 expect(result.item.status).toBe('draft');expect(result.item.requiredFields).toEqual(['Name','Experience']);
 const listing=await crud.GET(req('/api/admin/crud?model=documentTemplate&search='+run));expect((await listing.json()).items.some((i:any)=>i.id===id)).toBe(true);
 const saved=await crud.PUT(req('/api/admin/crud','PUT',{model:'documentTemplate',id,data:{status:'published',isPremium:true}}));expect(saved.status).toBe(200);
 const stored=await db.documentTemplate.findUnique({where:{id}});expect(stored?.isPremium).toBe(true);expect(stored?.status).toBe('published');expect(expired).toContain('site-data');
});
databaseTest('activity is read-only in the API and private session response bodies are excluded',async()=>{
 const session=await db.interviewSession.create({data:{mode:'practice',responses:{private:'must not leave this query'}}});sessionIds.push(session.id);
 const res=await crud.GET(req('/api/admin/crud?model=interviewSession'));expect(res.status).toBe(200);const data=await res.json();
 const row=data.items.find((i:any)=>i.id===session.id);expect(row).toBeDefined();expect(row.responses).toBeUndefined();
 expect((await crud.POST(req('/api/admin/crud','POST',{model:'interviewSession',data:{}}))).status).toBe(405);
 expect((await crud.PUT(req('/api/admin/crud','PUT',{model:'interviewSession',id:session.id,data:{score:99}}))).status).toBe(405);
 expect((await crud.DELETE(req('/api/admin/crud?model=interviewSession&id='+session.id,'DELETE'))).status).toBe(405);
 expect(await db.interviewSession.findUnique({where:{id:session.id}})).not.toBeNull();
});
databaseTest('visibility audit explains disabled and empty sections and only known keys may be changed',async()=>{
 const res=await audit.GET();expect(res.status).toBe(200);const data=await res.json();expect(data.areas.length).toBe(19);
 expect(data.areas.every((a:any)=>['visible','homepage_off','no_public_content'].includes(a.reason))).toBe(true);
 expect((await audit.PUT(req('/api/admin/site-audit','PUT',{key:'cvBuilder',enabled:false}))).status).toBe(400);
 expect((await audit.PUT(req('/api/admin/site-audit','PUT',{key:'anything',enabled:true}))).status).toBe(400);
 const original=await db.section.findUnique({where:{key:'hero'}});
 try{
  expect((await audit.PUT(req('/api/admin/site-audit','PUT',{key:'hero',enabled:false}))).status).toBe(200);
  const next=await (await audit.GET()).json();expect(next.areas.find((a:any)=>a.key==='hero').reason).toBe('homepage_off');
 }finally{if(original)await db.section.update({where:{key:'hero'},data:{enabled:original.enabled}});else await db.section.delete({where:{key:'hero'}});}
});
databaseTest('admin authentication is required for all audit and CRUD actions',async()=>{
 authenticated=false;try{expect((await audit.GET()).status).toBe(401);expect((await audit.PUT(req('/api/admin/site-audit','PUT',{key:'hero',enabled:true}))).status).toBe(401);expect((await crud.GET(req('/api/admin/crud?model=documentTemplate'))).status).toBe(401);}finally{authenticated=true;}
});
