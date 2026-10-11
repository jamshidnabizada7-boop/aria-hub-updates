/**
 * Isolated visual evidence for the NEW Brand Studio 2.0 editorial workbench.
 * Uses exact CREATIVE_RECIPES -> PremiumSocialCanvas production renderer,
 * not a mock design or a manually composited Photoshop image.
 * No account credentials, network media, publication or paid provider calls.
 */
import { chromium } from 'playwright-core';
import sharp from 'sharp';
import { mkdir, writeFile } from 'node:fs/promises';
import { CREATIVE_RECIPES, getEditorialPillar, type EditorialPillarId } from '../../src/lib/social/editorial/strategy';

const base = process.env.STUDIO_REVIEW_URL ?? 'http://127.0.0.1:3000';
if (!['localhost','127.0.0.1'].includes(new URL(base).hostname)) throw Error('Local server required');
const output = (process.env.STUDIO_REVIEW_OUTPUT ?? '/tmp/studio-review') + '/new-editorial-v2';
await mkdir(output, {recursive:true});

const cases: {name:string; pillar:EditorialPillarId; recipe:string; lang:'en'|'fa'|'ps'; title:string; note:string}[] = [
 {name:'01-cv-tips-fa',pillar:'career-skills',recipe:'practical-guide',lang:'fa',title:'۵ اشتباه رایج در ساختن CV',note:'چگونه یک درخواست کاری بهتر آماده کنیم؟'},
 {name:'02-ai-creative-fa',pillar:'ai-tools',recipe:'concept-object',lang:'fa',title:'هوش مصنوعی برای محصلان',note:'سه روش کاربردی برای بهتر درس خواندن'},
 {name:'03-community-question-fa',pillar:'community-question',recipe:'visual-question',lang:'fa',title:'کار یا ادامهٔ تحصیل؟',note:'کدام مسیر برای آیندهٔ شما مناسب‌تر است؟'},
 {name:'04-scholarship-guidance-fa',pillar:'scholarship-help',recipe:'global-path',lang:'fa',title:'از کجا بورسیه پیدا کنیم؟',note:'با بررسی منابع رسمی شروع کنید'},
 {name:'05-student-life-en',pillar:'student-life',recipe:'human-story',lang:'en',title:'Your first week at university',note:'The exciting, messy beginning of a new chapter'},
 {name:'06-myth-fact-fa',pillar:'myth-fact',recipe:'editorial-hook',lang:'fa',title:'آیا برای هر بورسیه IELTS لازم است؟',note:'شرایط هر برنامه را از منبع رسمی بخوانید'},
 {name:'07-interview-en',pillar:'interview',recipe:'career-journey',lang:'en',title:'The interview starts before you speak',note:'Prepare your story, examples and questions'},
 {name:'08-learning-ps',pillar:'language-learning',recipe:'editorial-hook',lang:'ps',title:'هره ورځ لس دقیقې زده کړه',note:'کوچني ګامونه، دوامداره پرمختګ'},
 {name:'09-education-news-en',pillar:'verified-news',recipe:'news-cover',lang:'en',title:'How to verify education news',note:'Check official sources before sharing announcements'},
 {name:'10-tools-fa',pillar:'free-resources',recipe:'concept-object',lang:'fa',title:'ابزارهای مفید برای یادگیری',note:'به‌جای فهرست‌های طولانی، ابزار مناسب انتخاب کنید'},
];

const browser=await chromium.launch({headless:true});
const images:string[]=[];
const issues:string[]=[];
try{
  const ctx=await browser.newContext({viewport:{width:1200,height:1900},deviceScaleFactor:1});
  await ctx.route('**/*',r=>{
    const url=r.request().url();
    return (url.startsWith(base)||/^(data|blob):/.test(url))?r.continue():r.abort();
  });
  await ctx.addCookies([{name:'aria_render',value:process.env.SOCIAL_RENDER_TOKEN!,url:base,httpOnly:true}]);
  const page=await ctx.newPage();
  page.on('pageerror',e=>issues.push(e.message));
  for(const item of cases){
    const recipe=CREATIVE_RECIPES.find(x=>x.id===item.recipe);
    if(!recipe)throw Error('Unknown creative recipe '+item.recipe);
    const category=getEditorialPillar(item.pillar).label[item.lang];
    const props={
      template:recipe.template,designFamily:recipe.family,lang:item.lang,size:'portrait',
      title:item.title,note:item.note,eyebrow:category,badge:category,cta:'myariahub.com',
    };
    const response=await page.goto(base+'/'+item.lang+'/studio-render?p='+encodeURIComponent(JSON.stringify(props)),{waitUntil:'networkidle'});
    if(!response?.ok())throw Error(item.name+' page did not load');
    await page.locator('[data-render-ready="1"]').waitFor({timeout:20000});
    await page.evaluate(async()=>{
      await document.fonts.ready;
      await Promise.all(Array.from(document.images).map(img=>img.decode().catch(()=>{})));
    });
    const surface=page.locator('[data-studio-canvas="1"]');
    const png=await surface.screenshot();
    const m=await sharp(png).metadata();
    if(m.width!==1080||m.height!==1350)issues.push(item.name+' invalid screenshot size '+m.width+'x'+m.height);
    if(!await page.getByText(item.title,{exact:true}).count())issues.push(item.name+' missing headline');
    const file=output+'/'+item.name+'.png';
    await writeFile(file,png);images.push(file);
    console.log('Rendered Brand Studio 2.0:',item.name,recipe.family);
  }
  await writeFile(output+'/manifest.json',JSON.stringify({
    source:'New Brand Studio 2.0 editorial recipes, using production PremiumSocialCanvas',
    screenshotCount:images.length,labels:cases.map(x=>({name:x.name,pillar:x.pillar,recipe:x.recipe,language:x.lang})),
    limitations:['No provider-generated cinematic background art','No real ARI asset or real person photos','Local test graphics only, never published'],
    issues,
  },null,2));
  if(issues.length)throw Error(issues.join('\n'));
  console.log('PASS '+images.length+' new Brand Studio 2.0 preview exports');
}finally{await browser.close();}
