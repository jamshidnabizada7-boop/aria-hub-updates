import {test,expect} from 'bun:test';
import {PrismaClient} from '@prisma/client';
import {createServer,type Socket} from 'node:net';
import {once} from 'node:events';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const url=new URL(process.env.DATABASE_URL||'postgresql://localhost/disabled');
if(!['127.0.0.1','localhost'].includes(url.hostname)||!url.pathname.endsWith('_test'))throw Error('isolated_test_database_required');
test('digest preview preserves consent/delivery state; real send is due-limited and escaped',async()=>{
 const db=new PrismaClient(),tag='digest-test-'+crypto.randomUUID();
 const sockets=new Set<Socket>(),messages:string[]=[];
 const relay=createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.setEncoding('utf8');socket.write('220 loopback ESMTP\r\n');
  let buffer='',data=false,body='';
  socket.on('data',(chunk:string)=>{buffer+=chunk;for(;;){const i=buffer.indexOf('\r\n');if(i<0)break;const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
   if(data){if(line==='.') {data=false;messages.push(body);body='';socket.write('250 queued\r\n');}else body+=line+'\n';continue;}
   if(/^EHLO|^HELO/i.test(line))socket.write('250-loopback\r\n250 AUTH PLAIN LOGIN\r\n');
   else if(/^DATA$/i.test(line)){data=true;socket.write('354 send data\r\n');}
   else if(/^QUIT$/i.test(line)){socket.write('221 bye\r\n');socket.end();}
   else if(/^AUTH|^[A-Za-z0-9+/]+=*$/i.test(line))socket.write('235 authenticated\r\n');
   else socket.write('250 OK\r\n');
  }});
 });
 const previews=await mkdtemp(join(tmpdir(),'aria-digest-'));
 let categoryId='',subId='',pendingId='',oppId='';
 try{
  relay.listen(0,'127.0.0.1');await once(relay,'listening');const address=relay.address();if(!address||typeof address==='string')throw Error('no_port');
  const cat=await db.opportunityCategory.create({data:{name:tag,slug:tag}});categoryId=cat.id;
  const sub=await db.alertSubscriber.create({data:{email:tag+'@example.test',categorySlug:tag,status:'active',frequency:'daily',lang:'en'}});subId=sub.id;
  const pending=await db.alertSubscriber.create({data:{email:tag+'-pending@example.test',categorySlug:tag,status:'pending',frequency:'daily',lang:'en'}});pendingId=pending.id;
  const opp=await db.opportunity.create({data:{title:'Teacher <script>malicious</script>',slug:tag,status:'published',description:'Fixture',categoryId,deadline:new Date(Date.now()+86400000)}});oppId=opp.id;
  const env={...process.env,SMTP_HOST:'127.0.0.1',SMTP_PORT:String(address.port),SMTP_USER:'test',SMTP_PASS:'test',SMTP_FROM:'ARIA HUB <test@example.test>',OPPORTUNITY_EMAIL_ALERTS_ENABLED:'true',ALERT_PREVIEW_DIRECTORY:previews};
  const run=async(send:boolean)=>{const child=Bun.spawn([process.execPath,'--conditions=react-server','scripts/alerts-digest.ts',...(send?['--send']:[])],{env,stdout:'pipe',stderr:'pipe'});const [exit,stderr]=await Promise.all([child.exited,new Response(child.stderr).text(),new Response(child.stdout).text()]);expect(stderr).toBe('');expect(exit).toBe(0);};
  await run(false);expect(messages).toHaveLength(0);expect((await db.alertSubscriber.findUniqueOrThrow({where:{id:subId}})).lastDigestAt).toBeNull();
  expect(await db.automationState.count({where:{state:{path:['subscriberId'],equals:subId}}})).toBe(0);
  await run(true);expect(messages.filter(m=>m.includes(tag+'@example.test'))).toHaveLength(1);
  expect(messages.join('')).not.toContain('<script>');expect(messages.join('')).toContain('&lt;script&gt;');
  expect((await db.alertSubscriber.findUniqueOrThrow({where:{id:subId}})).lastDigestAt).not.toBeNull();
  const count=messages.length;await run(true);expect(messages).toHaveLength(count);
  expect((await db.alertSubscriber.findUniqueOrThrow({where:{id:pendingId}})).lastDigestAt).toBeNull();
 }finally{
  for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>relay.close(()=>resolve()));
  if(subId)await db.automationState.deleteMany({where:{state:{path:['subscriberId'],equals:subId}}});
  if(subId)await db.auditLog.deleteMany({where:{entityId:subId,action:'alert_digest_sent'}});
  await db.alertSubscriber.deleteMany({where:{id:{in:[subId,pendingId]}}});
  if(oppId)await db.opportunity.delete({where:{id:oppId}});if(categoryId)await db.opportunityCategory.delete({where:{id:categoryId}});
  await db.$disconnect();await rm(previews,{recursive:true,force:true});
 }
},30000);
