import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { normalizeDraft, displayDraftName } from '@/app/[lang]/cv-builder/lib/cv-utils';
import { validateDraft } from '@/app/[lang]/cv-builder/lib/cv-validation';
import { renderCvStandaloneHtml } from '@/app/[lang]/cv-builder/lib/cv-renderer';

export const runtime='nodejs';
export const maxDuration=30;
export const dynamic='force-dynamic';

const pdfBuckets=new Map<string,{count:number;reset:number}>();
function allowPdfRequest(request:Request){
  const now=Date.now();
  const ip=(request.headers.get('x-forwarded-for')||'unknown').split(',')[0].trim();
  const current=pdfBuckets.get(ip);
  if(!current||current.reset<=now){ pdfBuckets.set(ip,{count:1,reset:now+60_000}); return true; }
  if(current.count>=6) return false;
  current.count+=1;
  return true;
}
function isSameOrigin(request:Request){
  const origin=request.headers.get('origin');
  const host=request.headers.get('host');
  if(!origin||!host) return true;
  try{return new URL(origin).host===host;}catch{return false;}
}

function safeFilename(value:string){
  return value.trim().replace(/[\\/:*?"<>|\x00-\x1F]/g,'-').replace(/\s+/g,' ').slice(0,90)||'CV';
}

async function fontCss(){
  try{
    const [regular,bold]=await Promise.all([
      readFile(path.join(process.cwd(),'public/fonts/Vazirmatn-Medium.ttf')),
      readFile(path.join(process.cwd(),'public/fonts/Vazirmatn-Bold.ttf')),
    ]);
    return `@font-face{font-family:"Vazirmatn";src:url(data:font/ttf;base64,${regular.toString('base64')}) format("truetype");font-weight:400 600;font-style:normal}@font-face{font-family:"Vazirmatn";src:url(data:font/ttf;base64,${bold.toString('base64')}) format("truetype");font-weight:700 900;font-style:normal}`;
  }catch{return '';}
}

export async function POST(request:Request){
  if(!isSameOrigin(request)) return NextResponse.json({error:'Cross-site PDF requests are not allowed.'},{status:403,headers:{'Cache-Control':'no-store'}});
  if(!allowPdfRequest(request)) return NextResponse.json({error:'Too many PDF requests. Please wait a minute and try again.'},{status:429,headers:{'Cache-Control':'no-store','Retry-After':'60'}});
  const text=await request.text();
  if(text.length>4_500_000) return NextResponse.json({error:'Draft is too large to render.'},{status:413,headers:{'Cache-Control':'no-store'}});
  let parsed:any;
  try{parsed=JSON.parse(text);}catch{return NextResponse.json({error:'Invalid request.'},{status:400,headers:{'Cache-Control':'no-store'}});}
  const draft=normalizeDraft(parsed?.draft);
  if(!draft) return NextResponse.json({error:'Invalid CV draft.'},{status:400,headers:{'Cache-Control':'no-store'}});
  const readiness=validateDraft(draft);
  if(!readiness.canExport) return NextResponse.json({error:'Fix blocking CV errors before export.',issues:readiness.issues.filter(x=>x.severity==='error')},{status:422,headers:{'Cache-Control':'no-store'}});

  let browser;
  try{
    browser=await playwrightChromium.launch({
      args:chromium.args,
      executablePath:await chromium.executablePath(),
      headless:true,
    });
    const page=await browser.newPage({viewport:{width:1200,height:1600}});
    await page.setContent(renderCvStandaloneHtml(draft,await fontCss()),{waitUntil:'load'});
    const pdf=await page.pdf({
      format:draft.paperSize==='letter'?'Letter':'A4',
      printBackground:true,
      preferCSSPageSize:true,
      margin:{top:'0',right:'0',bottom:'0',left:'0'},
    });
    const base=safeFilename(displayDraftName(draft,'CV'));
    return new Response(new Uint8Array(pdf),{
      status:200,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`attachment; filename="${base.replace(/"/g,'')}.pdf"; filename*=UTF-8''${encodeURIComponent(base)}.pdf`,
        'Cache-Control':'no-store, max-age=0',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }catch(error){
    console.error('CV PDF generation failed',error);
    return NextResponse.json({error:'PDF generation failed.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }finally{
    await browser?.close().catch(()=>undefined);
  }
}
