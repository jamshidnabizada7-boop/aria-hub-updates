import {timingSafeEqual} from 'node:crypto';
import {whatsappInboundConfigured} from '@/lib/applicants/whatsapp-policy';
import {processWhatsAppInbound,validWhatsAppSignature} from '@/lib/applicants/whatsapp-inbound';
export const runtime='nodejs';export const dynamic='force-dynamic';
const answer=(text:string,status=200)=>new Response(text,{status,headers:{'Cache-Control':'no-store','Content-Type':'text/plain','X-Content-Type-Options':'nosniff'}});
export async function GET(req:Request){
 if(!whatsappInboundConfigured())return answer('unavailable',503);
 const url=new URL(req.url),token=url.searchParams.get('hub.verify_token')||'',expected=process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN!;
 const challenge=url.searchParams.get('hub.challenge')||'';
 if(url.searchParams.get('hub.mode')!=='subscribe'||Buffer.byteLength(token)!==Buffer.byteLength(expected)||!timingSafeEqual(Buffer.from(token),Buffer.from(expected))||!/^\d{1,100}$/.test(challenge))return answer('forbidden',403);
 return answer(challenge);
}
export async function POST(req:Request){
 if(!whatsappInboundConfigured())return answer('unavailable',503);
 if(Number(req.headers.get('content-length')||0)>262144)return answer('too large',413);
 const reader=req.body?.getReader();if(!reader)return answer('invalid',400);
 const chunks:Uint8Array[]=[];let length=0;
 try{
  for(;;){const {value,done}=await reader.read();if(done)break;length+=value.length;if(length>262144){await reader.cancel();return answer('too large',413);}chunks.push(value);}
  const raw=Buffer.concat(chunks);
  if(!validWhatsAppSignature(raw,req.headers.get('x-hub-signature-256'),process.env.WHATSAPP_WEBHOOK_APP_SECRET!))return answer('forbidden',403);
  let payload:unknown;try{payload=JSON.parse(raw.toString('utf8'));}catch{return answer('invalid',400);}
  await processWhatsAppInbound(payload);return answer('ok');
 }catch{return answer('temporarily unavailable',503);}
}
