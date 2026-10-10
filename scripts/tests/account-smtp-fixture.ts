import {createServer,type Socket} from 'node:net';
export async function startAccountSmtp() {
 const messages:string[]=[]; const sockets=new Set<Socket>(); let reject=false;
 const server=createServer(socket=>{
  sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.setEncoding('utf8');
  socket.write('220 account-test ESMTP ready\r\n');let buffer='',data=false,lines:string[]=[];
  socket.on('data',(chunk:string)=>{buffer+=chunk;while(true){const i=buffer.indexOf('\r\n');if(i<0)break;
   const line=buffer.slice(0,i);buffer=buffer.slice(i+2);
   if(data){if(line==='.') {messages.push(lines.join('\r\n'));lines=[];data=false;socket.write('250 queued\r\n');}else lines.push(line.startsWith('..')?line.slice(1):line);continue;}
   const cmd=line.toUpperCase();
   if(cmd.startsWith('EHLO ')||cmd.startsWith('HELO '))socket.write('250-account-test\r\n250 AUTH PLAIN LOGIN\r\n');
   else if(cmd.startsWith('AUTH '))socket.write('235 authenticated\r\n');
   else if(cmd.startsWith('MAIL FROM:'))socket.write(reject?'450 temporary delivery failure\r\n':'250 OK\r\n');
   else if(cmd.startsWith('RCPT TO:')||cmd==='RSET'||cmd==='NOOP')socket.write('250 OK\r\n');
   else if(cmd==='DATA'){data=true;socket.write('354 continue\r\n');}
   else if(cmd==='QUIT'){socket.write('221 goodbye\r\n');socket.end();}
   else socket.write('235 authenticated\r\n');
  }});
 });
 await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',()=>{server.off('error',reject);resolve();});});const address=server.address();
 if(!address||typeof address==='string')throw Error('smtp_not_listening');
 return {port:address.port,messages,setReject(value:boolean){reject=value;},async close(){for(const socket of sockets)socket.destroy();await new Promise<void>(resolve=>server.close(()=>resolve()));}};
}
export function accountMailLink(mime:string):URL {
 const split=mime.indexOf('\r\n\r\n');const head=mime.slice(0,split),raw=mime.slice(split+4);
 const boundary=head.match(/boundary="([^"]+)"/i)?.[1];
 if(boundary){for(const part of raw.split('--'+boundary)){if(/Content-Type: text\/html/i.test(part))return accountMailLink(part.trim());}throw Error('mail_html_missing');}
 const html=/Content-Transfer-Encoding: base64/i.test(head)?Buffer.from(raw.replace(/\s/g,''),'base64').toString('utf8'):raw.replace(/=\r?\n/g,'').replace(/=([0-9a-f]{2})/gi,(_,hex)=>String.fromCharCode(parseInt(hex,16)));
 const match=html.match(/href="([^"]+)"/);if(!match)throw Error('mail_link_missing');return new URL(match[1].replace(/&amp;/g,'&'));
}
