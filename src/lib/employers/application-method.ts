import {applicationPhoneUrl} from './application-phone';
export type EmployerApplyMethod='website'|'email'|'phone'|'whatsapp'|'in_person';
export function resolveEmployerApplication(input:{
 applyMethod?:string|null;applyUrl?:string|null;applyEmail?:string|null;applyPhone?:string|null;guidelines?:string|null;
}):{url:string|null;type:string;method:EmployerApplyMethod}{
 if(!input.applyMethod&&!input.applyUrl?.trim()&&!input.applyEmail?.trim()&&!input.applyPhone?.trim())
  throw Error('Provide an application URL, email, or phone number.');
 const method=input.applyMethod||(
  input.applyEmail?.trim()?'email':input.applyUrl?.trim()?'website':input.applyPhone?.trim()?'phone':'website'
 );
 if(!['website','email','phone','whatsapp','in_person'].includes(method))throw Error('Invalid application method.');
 if(method==='in_person'){
  if(!input.guidelines||input.guidelines.trim().length<12||input.guidelines.length>3000)
   throw Error('Provide a clear address and instructions for in-person applications.');
  return {url:null,type:'in_person',method};
 }
 if(method==='whatsapp'||method==='phone'){
  const phone=applicationPhoneUrl(input.applyPhone);
  if(!phone)throw Error('A valid international application phone is required.');
  return {url:method==='whatsapp'?'https://wa.me/'+phone.slice(5):phone,
   type:method==='whatsapp'?'whatsapp':'application_phone',method};
 }
 if(method==='email'){
  const email=(input.applyEmail||'').trim();
  if(email.length>200||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))throw Error('Invalid application email.');
  return {url:'mailto:'+email,type:'application_email',method};
 }
 const raw=(input.applyUrl||'').trim();
 let u:URL;
 try{u=new URL(raw);}catch{throw Error('Provide a valid HTTPS application URL.');}
 if(u.protocol!=='https:'||u.username||u.password||u.hostname==='localhost'||u.hostname.endsWith('.local')
   ||u.hostname.length>253||raw.length>2048)throw Error('Only public HTTPS application URLs are allowed.');
 return {url:u.toString(),type:'direct_application',method:'website'};
}
