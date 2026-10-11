'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ArrowUpRight, BriefcaseBusiness, GraduationCap, Globe2, CalendarClock } from 'lucide-react';
import { CANVAS_SIZES } from '../themes';
import { formatDateLong } from '@/lib/date-format';
import { deadlineSnapshot } from './rotation';
import type { PremiumCanvasProps } from './types';

const COPY = {
  en: { career: 'CAREER OPPORTUNITIES', scholarship: 'EDUCATION & OPPORTUNITY', deadline: 'DEADLINE WATCH', role: 'The opportunity', org: 'Organization', place: 'Location', date: 'Application deadline', details: 'Explore details & apply', days: 'days remaining', hours: 'hours remaining', closed: 'Deadline passed', unknown: 'Check the official deadline', asof: 'Snapshot', open: 'Applications open', urgent: 'Closing soon', salary: 'Salary / funding' },
  fa: { career: 'فرصت‌های کاری', scholarship: 'تحصیلات و فرصت‌ها', deadline: 'یادآوری مهلت', role: 'فرصت', org: 'سازمان', place: 'موقعیت', date: 'مهلت درخواست', details: 'جزئیات و درخواست', days: 'روز باقی‌مانده', hours: 'ساعت باقی‌مانده', closed: 'مهلت پایان یافته', unknown: 'مهلت رسمی را بررسی کنید', asof: 'زمان ثبت', open: 'مهلت باقی است', urgent: 'نزدیک به پایان', salary: 'معاش / تمویل' },
  ps: { career: 'کاري فرصتونه', scholarship: 'زده کړې او فرصتونه', deadline: 'د وروستۍ نېټې یادونه', role: 'فرصت', org: 'اداره', place: 'ځای', date: 'د غوښتنلیک وروستۍ نېټه', details: 'جزئیات او غوښتنلیک', days: 'ورځې پاتې دي', hours: 'ساعتونه پاتې دي', closed: 'مهلت پای ته رسېدلی', unknown: 'رسمي وروستۍ نېټه وګورئ', asof: 'د ثبت وخت', open: 'مهلت پاتې دی', urgent: 'ژر پای ته رسېږي', salary: 'معاش / تمویل' },
};

/** Export-safe editorial compositions. All factual text comes from the saved listing. */
export function EditorialCanvas({ props: p }: { props: PremiumCanvasProps }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => { const tick = () => setNow(Date.now()); tick(); const id = setInterval(tick, 30000); return () => clearInterval(id); }, []);
  const c = COPY[p.lang];
  const id = p.designFamily;
  const deadline = id.startsWith('deadline-');
  const career = id.startsWith('career-');
  const paper = ['career-ledger', 'scholarship-journal', 'deadline-calendar'].includes(id);
  const ticket = id === 'career-ticket';
  const atlas = id === 'scholarship-atlas';
  const fellow = id === 'scholarship-fellow';
  const bulletin = id === 'deadline-bulletin';
  const calendar = id === 'deadline-calendar';
  const ink = paper ? '#152744' : '#F5F7FC';
  const accent = deadline ? (paper ? '#B63D28' : '#FFC19E') : career ? (paper ? '#0E6C67' : '#83E5CE') : (paper ? '#7A511B' : '#F5D58C');
  const bg = paper ? '#F3F0E8' : career ? '#092F36' : '#11223E';
  const rule = paper ? '#CBD0CB' : '#ffffff30';
  const h = CANVAS_SIZES[p.size].h;
  const snapshot = now === null ? null : deadlineSnapshot(p.deadlineDate, now);
  const validDate = p.deadlineDate && Number.isFinite(Date.parse(p.deadlineDate));
  const titleSize = p.title.length > 145 ? 46 : p.title.length > 90 ? 55 : 72;
  const Icon = deadline ? CalendarClock : career ? BriefcaseBusiness : GraduationCap;
  const label = deadline ? c.deadline : career ? c.career : c.scholarship;
  const small: CSSProperties = { fontSize: 20, fontWeight: 650, lineHeight: 1.5 };
  const facts = [[c.org, p.organization], [c.place, p.country || p.location], [c.salary, p.salary || p.funding]].filter(([, v]) => v);
  return <div data-editorial-family={id} style={{ width:1080, height:h, position:'relative', overflow:'hidden', background:bg, color:ink, direction:p.lang === 'en' ? 'ltr' : 'rtl', fontFamily:'"Vazirmatn","Inter",sans-serif', padding:64, display:'flex', flexDirection:'column', boxSizing:'border-box' }}>
    {atlas && <div aria-hidden style={{position:'absolute',insetInlineEnd:-90,top:145,opacity:.14}}><Globe2 size={720} strokeWidth={.65}/></div>}
    {id === 'career-signal' && <div aria-hidden style={{position:'absolute',insetInlineEnd:-80,top:140,fontSize:520,fontWeight:900,color:'#83E5CE12',lineHeight:1}}>↗</div>}
    {fellow && <div aria-hidden style={{position:'absolute',insetInlineEnd:0,top:0,width:240,height:h,background:'#F5D58C12',borderInlineStart:'1px solid #F5D58C55'}}/>}
    <header style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:24,zIndex:1,borderBottom:`1px solid ${rule}`,paddingBottom:28}}>
      <div style={{display:'flex',alignItems:'center',gap:16,direction:'ltr'}}><img src="/images/logo-mark.png" alt="ARIA HUB" style={{width:60,height:60,objectFit:'contain'}}/><strong style={{fontSize:29,letterSpacing:1}}>ARIA HUB</strong></div>
      <Icon size={42} color={accent} strokeWidth={1.5}/>
    </header>
    <main style={{flex:1,minHeight:0,position:'relative',display:'flex',flexDirection:'column',justifyContent:ticket || fellow ? 'center' : 'space-evenly',gap:24,paddingBlock:30}}>
      <div style={{...small,color:accent,letterSpacing:p.lang === 'en' ? 3 : 0,fontWeight:800,display:'flex',alignItems:'center',gap:12}}><span style={{width:10,height:10,background:accent,borderRadius:'50%'}}/>{label}</div>
      {fellow && <GraduationCap aria-hidden size={p.size === 'square' ? 90 : 180} strokeWidth={1} color={accent} style={{alignSelf:'center'}}/>}
      {deadline && <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:28,padding:calendar || bulletin ? 30 : 0,border:calendar ? `2px solid ${accent}` : undefined,borderRadius:calendar ? 20 : 0,background:bulletin ? accent : undefined,color:bulletin ? '#11223E' : ink}}>
        <div style={{display:'flex',alignItems:'baseline',gap:20,flexWrap:'wrap'}}><strong style={{fontSize:p.size === 'square' ? 116 : 170,lineHeight:1,fontVariantNumeric:'tabular-nums',color:bulletin ? '#11223E' : accent}}>{snapshot ? new Intl.NumberFormat(p.lang === 'en' ? 'en' : 'fa').format(snapshot.value) : '—'}</strong><span style={{fontSize:27,fontWeight:750}}>{snapshot?.status === 'closed' ? c.closed : snapshot ? c[snapshot.unit] : c.unknown}</span></div>
        {!calendar && <CalendarClock size={80} color={accent} strokeWidth={1}/>}
      </div>}
      <div style={{borderInlineStart:paper && !calendar ? `6px solid ${accent}` : undefined,paddingInlineStart:paper && !calendar ? 28 : 0,background:ticket ? '#F3F0E8' : undefined,color:ticket ? '#152744' : ink,padding:ticket ? 36 : undefined,borderRadius:ticket ? 24 : undefined}}>
        <h1 style={{fontSize:deadline ? Math.min(titleSize,60) : titleSize,lineHeight:1.32,fontWeight:850,margin:0,overflowWrap:'anywhere',position:'relative',textAlign:fellow ? 'center' : undefined,fontFamily:id === 'scholarship-journal' && p.lang === 'en' ? 'Georgia,serif' : undefined}}>{p.title}</h1>
        {p.note && !deadline && p.title.length < 100 && <p style={{fontSize:24,lineHeight:1.65,margin:'20px 0 0',opacity:.82}}>{p.note.slice(0,180)}{p.note.length > 180 ? '…' : ''}</p>}
      </div>
      <div style={{display:'grid',gridTemplateColumns:paper || ticket ? '1fr 1fr' : '1fr',gap:18,borderTop:`1px ${ticket ? 'dashed' : 'solid'} ${rule}`,paddingTop:24}}>{facts.map(([key,value]) => <div key={key} style={{minWidth:0}}><div style={{...small,color:accent,fontSize:17}}>{key}</div><div style={{fontSize:25,fontWeight:700,lineHeight:1.5,overflowWrap:'anywhere'}}>{value}</div></div>)}</div>
      {validDate && <div style={{...small,display:'flex',justifyContent:'space-between',gap:20,borderTop:`1px solid ${rule}`,paddingTop:20}}><span>{c.date}</span><strong>{formatDateLong(new Date(p.deadlineDate!),p.lang)}</strong></div>}
      {deadline && now !== null && <div style={{fontSize:16,opacity:.75}}>{c.asof}: {new Intl.DateTimeFormat(p.lang === 'en' ? 'en-GB' : p.lang === 'fa' ? 'fa-AF' : 'ps-AF',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Kabul'}).format(now)} · UTC+04:30</div>}
    </main>
    <footer style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:28,paddingTop:26,borderTop:`2px solid ${accent}`,position:'relative'}}>
      <div><div style={{fontSize:26,fontWeight:800,display:'flex',gap:12,alignItems:'center'}}>{p.cta || c.details}<ArrowUpRight size={28}/></div><div style={{fontSize:21,marginTop:9,direction:'ltr',textAlign:'start',opacity:.75}}>myariahub.com</div></div>
      {p.qrDataUrl && <div style={{padding:12,background:'#fff',borderRadius:12,flexShrink:0}}><img src={p.qrDataUrl} alt="QR" style={{width:112,height:112,display:'block'}}/></div>}
    </footer>
  </div>;
}
