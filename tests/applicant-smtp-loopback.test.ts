/** Real Nodemailer SMTP transport against a disposable loopback-only ESMTP
 * fixture. No production mail, account, internet or credentials.
 */
import {test,expect} from 'bun:test';
import {createServer,type Server, type Socket} from 'node:net';
import {once} from 'node:events';
import {sendHtmlEmail,smtpConfigured} from '../src/lib/mailer';

test('applicant mailer sends a complete MIME message via authenticated local ESMTP',async()=>{
 const old:Record<string,string|undefined>={};
 const keys=['SMTP_HOST','SMTP_PORT','SMTP_USER','SMTP_PASS','SMTP_FROM'] as const;
 for(const k of keys)old[k]=process.env[k];
 const captured:{commands:string[];message:string[]}={commands:[],message:[]};
 const server:Server=createServer(socket=>{
  socket.setEncoding('utf8');
  socket.write('220 aria-candidate.test ESMTP ready\r\n');
  let buffer='',data=false;
  socket.on('data',(chunk:string)=>{
   buffer+=chunk;
   while(true){
    const i=buffer.indexOf('\r\n');if(i<0)break;
    const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
    if(data){
     if(line==='.') {data=false;socket.write('250 2.0.0 queued-for-local-test\r\n');}
     else captured.message.push(line.startsWith('..')?line.slice(1):line);
     continue;
    }
    captured.commands.push(line);
    const upper=line.toUpperCase();
    if(upper.startsWith('EHLO ')||upper.startsWith('HELO '))socket.write('250-aria-candidate.test\r\n250 AUTH PLAIN LOGIN\r\n');
    else if(upper.startsWith('AUTH PLAIN'))socket.write('235 2.7.0 authenticated\r\n');
    else if(upper==='AUTH LOGIN')socket.write('334 VXNlcm5hbWU6\r\n');
    else if(upper.startsWith('MAIL FROM:')||upper.startsWith('RCPT TO:'))socket.write('250 2.1.5 OK\r\n');
    else if(upper==='DATA'){data=true;socket.write('354 End data with <CR><LF>.<CR><LF>\r\n');}
    else if(upper==='QUIT'){socket.write('221 goodbye\r\n');socket.end();}
    else if(upper==='RSET')socket.write('250 reset\r\n');
    else if(upper==='NOOP')socket.write('250 OK\r\n');
    else socket.write('235 2.7.0 authenticated\r\n');
   }
  });
 });
 try{
  server.listen(0,'127.0.0.1');await once(server,'listening');
  const address=server.address();
  if(!address||typeof address==='string')throw Error('no_loopback_port');
  Object.assign(process.env,{SMTP_HOST:'127.0.0.1',SMTP_PORT:String(address.port),
    SMTP_USER:'aria-candidate',SMTP_PASS:'test-only-not-a-secret',SMTP_FROM:'ARIA HUB <noreply@aria-candidate.test>'});
  expect(smtpConfigured()).toBe(true);
  const result=await sendHtmlEmail({to:'fictional-applicant@example.test',
   subject:'Candidate match notice',html:'<p>Matched opportunity test</p>'});
  expect(result.sent).toBe(true);
  expect(captured.commands.join('\n')).toMatch(/MAIL FROM:/);
  expect(captured.commands.join('\n')).toMatch(/RCPT TO:<fictional-applicant@example\.test>/);
  expect(captured.message.join('\n')).toContain('Candidate match notice');
  expect(captured.message.join('\n')).toContain('Matched opportunity test');
 }finally{
  await new Promise<void>(resolve=>server.close(()=>resolve()));
  for(const k of keys){if(old[k]===undefined)delete process.env[k];else process.env[k]=old[k];}
 }
},15000);
