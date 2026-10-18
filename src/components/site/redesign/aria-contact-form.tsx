'use client';
import {useState,type FormEvent} from 'react';
import {Send} from 'lucide-react';
import type {Lang} from '@/lib/lang-route';
const words={
 en:{name:'Full name',email:'Email address',subject:'Subject (optional)',message:'Your message',submit:'Send message',busy:'Sending…',ok:'Message received. ARIA HUB can follow up using the email address provided.',error:'We could not send the message. Please try again.',subjectPlaceholder:'What can we help with?'},
 fa:{name:'نام کامل',email:'نشانی ایمیل',subject:'موضوع (اختیاری)',message:'پیام شما',submit:'ارسال پیام',busy:'در حال ارسال…',ok:'پیام شما ثبت شد. تیم آریا هاب می‌تواند از طریق ایمیل با شما تماس بگیرد.',error:'ارسال پیام موفق نشد. دوباره تلاش کنید.',subjectPlaceholder:'در چه زمینه‌ای کمک می‌خواهید؟'},
 ps:{name:'بشپړ نوم',email:'بریښنالیک',subject:'موضوع (اختیاري)',message:'ستاسو پیغام',submit:'پیغام ولېږئ',busy:'لېږل کېږي…',ok:'ستاسو پیغام ثبت شو. آریا هاب کولی شي ستاسو د ایمیل له لارې ځواب ووایي.',error:'پیغام ونه لېږل شو. بیا هڅه وکړئ.',subjectPlaceholder:'څه مرسته پکار ده؟'}
} as const;
export function AriaContactForm({lang}:{lang:Lang}){
 const w=words[lang], [busy,setBusy]=useState(false),[result,setResult]=useState(''),[success,setSuccess]=useState(false);
 async function submit(e:FormEvent<HTMLFormElement>){
  e.preventDefault();if(busy)return;const form=e.currentTarget;
  const body={name:(form.elements.namedItem('name') as HTMLInputElement).value.trim(),email:(form.elements.namedItem('email') as HTMLInputElement).value.trim(),subject:(form.elements.namedItem('subject') as HTMLInputElement).value.trim(),message:(form.elements.namedItem('message') as HTMLTextAreaElement).value.trim()};
  setBusy(true);setResult('');setSuccess(false);
  try{
   const response=await fetch('/api/contact',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
   if(!response.ok)throw Error('contact submission failed');
   form.reset();setResult(w.ok);setSuccess(true);
  }catch{setResult(w.error);}finally{setBusy(false);}
 }
 return <form className="aria-public-contact-form" onSubmit={submit}>
  <label>{w.name}<input name="name" autoComplete="name" required maxLength={100} disabled={busy}/></label>
  <label>{w.email}<input name="email" autoComplete="email" type="email" required maxLength={200} disabled={busy} dir="ltr"/></label>
  <label>{w.subject}<input name="subject" maxLength={200} disabled={busy} placeholder={w.subjectPlaceholder}/></label>
  <label>{w.message}<textarea name="message" required maxLength={5000} minLength={5} rows={6} disabled={busy}/></label>
  <button type="submit" className="aria-button aria-button--orange" disabled={busy}><Send size={15}/>{busy?w.busy:w.submit}</button>
  {result?<p role="status" className={success?'aria-contact-success':'aria-contact-error'}>{result}</p>:null}
 </form>;
}