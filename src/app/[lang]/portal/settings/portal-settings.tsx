'use client';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
const copy = {
 en:{title:'Account security',current:'Current password',next:'New password (12+ characters)',change:'Change password',logout:'Sign out',all:'Sign out on all devices',export:'Download my personal data',privacy:'Your profile is private. Download original files from My CVs. Deletion also removes employer memberships and all account access. Published organization vacancies remain.',confirm:'Type DELETE to confirm',remove:'Delete my account',success:'Saved',error:'Unable to complete the request. Please try again.',unavailable:'Deletion is currently unavailable. Contact support.'},
 fa:{title:'امنیت حساب',current:'رمز عبور فعلی',next:'رمز جدید (حداقل ۱۲ کاراکتر)',change:'تغییر رمز عبور',logout:'خروج',all:'خروج از تمام دستگاه‌ها',export:'دریافت اطلاعات شخصی من',privacy:'مشخصات شما خصوصی است. فایل‌های اصلی را از سی‌وی‌های من دریافت کنید. حذف حساب، عضویت کارفرما و تمام دسترسی‌ها را نیز حذف می‌کند. وظایف نشرشده سازمان باقی می‌مانند.',confirm:'برای تأیید DELETE بنویسید',remove:'حذف حساب من',success:'ذخیره شد',error:'درخواست تکمیل نشد. دوباره تلاش کنید.',unavailable:'حذف حساب فعلاً در دسترس نیست. با پشتیبانی تماس بگیرید.'},
 ps:{title:'د حساب خوندیتوب',current:'اوسنی پټنوم',next:'نوی پټنوم (لږ تر لږه ۱۲ توري)',change:'پټنوم بدلول',logout:'وتل',all:'له ټولو وسیلو وتل',export:'زما شخصي معلومات ترلاسه کړئ',privacy:'ستاسو معلومات شخصي دي. اصلي فایلونه له زما سي وي ګانو ترلاسه کړئ. ړنګول د کارورکوونکي غړیتوب او حساب ته لاسرسی هم ختموي. د ادارې خپرې شوې دندې پاتې کېږي.',confirm:'د تایید لپاره DELETE ولیکئ',remove:'زما حساب ړنګ کړئ',success:'خوندي شو',error:'غوښتنه بشپړه نه شوه. بیا هڅه وکړئ.',unavailable:'د حساب ړنګول اوس ممکن نه دي. له ملاتړ سره اړیکه ونیسئ.'}
};
export function PortalSettings({lang,initialName,deletionAvailable=false}:{lang:'en'|'fa'|'ps';initialName:string;deletionAvailable?:boolean}){
 const t=copy[lang],router=useRouter();
 const [currentPassword,setCurrentPassword]=useState(''),[newPassword,setNewPassword]=useState(''),[confirmation,setConfirmation]=useState(''),[msg,setMsg]=useState(''),[busy,setBusy]=useState(false);
 async function action(mode:'change-password'|'logout'|'logout-all'){
  setBusy(true);setMsg('');
  try{const res=await fetch('/api/applicant/auth/'+mode,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(mode==='change-password'?{currentPassword,newPassword}:{})});
   if(!res.ok)throw Error();setCurrentPassword('');setNewPassword('');
   if(mode==='change-password')setMsg(t.success);else{router.push('/'+lang+'/login');router.refresh();}
  }catch{setMsg(t.error);}finally{setBusy(false);}
 }
 async function exportData(){
  setBusy(true);setMsg('');
  try{const res=await fetch('/api/applicant/account',{cache:'no-store'});if(!res.ok)throw Error();
   const url=URL.createObjectURL(await res.blob()),link=document.createElement('a');link.href=url;link.download='aria-hub-personal-data.json';link.click();URL.revokeObjectURL(url);
  }catch{setMsg(t.error);}finally{setBusy(false);}
 }
 async function removeAccount(e:React.FormEvent){
  e.preventDefault();setBusy(true);setMsg('');
  try{const res=await fetch('/api/applicant/account',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:currentPassword,confirm:confirmation})});
   if(res.status!==202)throw Error();setCurrentPassword('');router.push('/'+lang+'/login?deleted=yes');router.refresh();
  }catch{setMsg(t.error);}finally{setBusy(false);}
 }
 const field='mt-1 w-full rounded-lg border bg-background p-3';
 return <section className="mt-8 max-w-xl rounded-xl border bg-card p-5"><h2 className="text-xl font-bold">{t.title}</h2>
  <form className="mt-4 space-y-3" onSubmit={e=>{e.preventDefault();void action('change-password');}}>
   <label className="block text-sm">{t.current}<input className={field} type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label>
   <label className="block text-sm">{t.next}<input className={field} type="password" autoComplete="new-password" minLength={12} maxLength={128} value={newPassword} onChange={e=>setNewPassword(e.target.value)} required/></label>
   <button className="rounded-lg bg-primary px-4 py-3 text-primary-foreground" disabled={busy}>{t.change}</button>
  </form><div className="mt-4 flex flex-wrap gap-3"><button className="rounded-lg border px-4 py-3" disabled={busy} onClick={()=>void action('logout')}>{t.logout}</button><button className="rounded-lg border px-4 py-3" disabled={busy} onClick={()=>void action('logout-all')}>{t.all}</button><button className="rounded-lg border px-4 py-3" disabled={busy} onClick={()=>void exportData()}>{t.export}</button></div>
  <p className="mt-5 text-sm text-muted-foreground">{t.privacy}</p>
  {deletionAvailable?<form className="mt-5 space-y-3 border-t pt-5" onSubmit={e=>void removeAccount(e)}>
   <label className="block text-sm">{t.current}<input className={field} type="password" autoComplete="current-password" maxLength={128} value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required/></label>
   <label className="block text-sm">{t.confirm}<input className={field} dir="ltr" value={confirmation} maxLength={6} onChange={e=>setConfirmation(e.target.value)} required/></label>
   <button className="rounded-lg border border-destructive px-4 py-3 text-destructive disabled:opacity-50" disabled={busy||confirmation!=='DELETE'}>{t.remove}</button>
  </form>:<p className="mt-4 text-sm">{t.unavailable}</p>}
  <p role="status" className="mt-3 text-sm">{msg}</p>
 </section>;
}
