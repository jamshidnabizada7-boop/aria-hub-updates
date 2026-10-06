import { NextResponse } from 'next/server';
import chromium from '@sparticuz/chromium';
import { chromium as playwrightChromium } from 'playwright-core';
import { readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { normalizeDraft, displayDraftName } from '@/app/[lang]/cv-builder/lib/cv-utils';
import { validateDraft } from '@/app/[lang]/cv-builder/lib/cv-validation';
import { renderCvStandaloneHtml } from '@/app/[lang]/cv-builder/lib/cv-renderer';
import { getCVBuilderConfig } from '@/lib/cv-builder-config.server';

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

// Oracle/standalone: one simultaneous Chromium render; short bounded queue;
// excess requests are rejected gracefully. PDF_MAX_CONCURRENCY can raise it.
const MAX_CONCURRENT_PDF = Math.max(1, Number(process.env.PDF_MAX_CONCURRENCY ?? 1) || 1);
const MAX_PDF_QUEUE = 3;
let activeRenders = 0;
const renderWaiters: Array<() => void> = [];

async function acquireRenderSlot(): Promise<boolean> {
  if (activeRenders < MAX_CONCURRENT_PDF) { activeRenders += 1; return true; }
  if (renderWaiters.length >= MAX_PDF_QUEUE) return false;
  return await new Promise<boolean>((resolve) => {
    let settled = false;
    const entry = () => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      activeRenders += 1;
      resolve(true);
    };
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      const i = renderWaiters.indexOf(entry);
      if (i >= 0) renderWaiters.splice(i, 1);
      resolve(false);
    }, 15_000);
    renderWaiters.push(entry);
  });
}

function releaseRenderSlot(): void {
  activeRenders = Math.max(0, activeRenders - 1);
  const next = renderWaiters.shift();
  if (next) next();
}

// Environment-aware browser: self-hosted Oracle uses the system/Playwright
// Chromium (PDF_CHROMIUM_PATH or CHROME_PATH); Vercel keeps @sparticuz/chromium.
async function resolveBrowser(): Promise<{ executablePath: string; args: string[] }> {
  const systemPath = process.env.PDF_CHROMIUM_PATH || process.env.CHROME_PATH || process.env.BROWSER_PATH || '';
  if (systemPath && existsSync(systemPath)) {
    return {
      executablePath: systemPath,
      args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-blink-features=AutomationControlled'],
    };
  }
  return { executablePath: await chromium.executablePath(), args: chromium.args };
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
  const config=await getCVBuilderConfig();
  if(!config.enabled||!config.features.pdfDownload) return NextResponse.json({error:'PDF download is currently unavailable.'},{status:403,headers:{'Cache-Control':'no-store'}});
  const readiness=validateDraft(draft,config);
  if(!readiness.canExport) return NextResponse.json({error:'Fix blocking CV errors before export.',issues:readiness.issues.filter(x=>x.severity==='error')},{status:422,headers:{'Cache-Control':'no-store'}});

  let browser;
  try{
    if(!(await acquireRenderSlot())) return NextResponse.json({error:'PDF renderer is busy. Please retry in a few seconds.'},{status:503,headers:{'Cache-Control':'no-store','Retry-After':'15'}});
    const browserConfig=await resolveBrowser();
    browser=await playwrightChromium.launch({
      args:browserConfig.args,
      executablePath:browserConfig.executablePath,
      headless:true,
    });
    const page=await browser.newPage({viewport:{width:1200,height:1600}});
    await page.setContent(renderCvStandaloneHtml(draft,await fontCss(),config),{waitUntil:'load'});
    const pdf=await page.pdf({
      format:draft.paperSize==='letter'?'Letter':'A4',
      printBackground:true,
      preferCSSPageSize:true,
      margin:{top:'0',right:'0',bottom:'0',left:'0'},
    });
    const base=safeFilename(displayDraftName(draft,'CV'));
    const asciiBase=(base.replace(/[^\x20-\x7E]/g,'_').replace(/"/g,'').trim()||'CV').slice(0,90);
    return new Response(new Uint8Array(pdf),{
      status:200,
      headers:{
        'Content-Type':'application/pdf',
        'Content-Disposition':`attachment; filename="${asciiBase}.pdf"; filename*=UTF-8''${encodeURIComponent(base)}.pdf`,
        'Cache-Control':'no-store, max-age=0',
        'X-Content-Type-Options':'nosniff',
      },
    });
  }catch(error){
    console.error('CV PDF generation failed',error);
    return NextResponse.json({error:'PDF generation failed.'},{status:500,headers:{'Cache-Control':'no-store'}});
  }finally{
    await browser?.close().catch(()=>undefined);
    releaseRenderSlot();
  }
}
