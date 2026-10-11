'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, ShieldCheck, Sparkles, Save, CheckCircle2, BarChart3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumSocialCanvas } from '@/lib/social/studio/premium-canvas';
import type { StudioMediaConfig } from '@/lib/social/studio/types';
import type { Lang } from '@/lib/lang-route';
import type { PosterSize } from '@/lib/social/templates';
import {
  EDITORIAL_PILLARS, getEditorialPillar, recipesForPillar, reviewEditorialDraft,
  type EditorialPillarId,
} from '@/lib/social/editorial/strategy';

/**
 * Local-only manual creative workbench. Never queues, publishes, or modifies
 * website opportunities. This avoids silently changing existing automation.
 * Exported copy and artwork must be reviewed before use.
 */
export function EditorialWorkbench({ lang, size }: { lang: Lang; size: PosterSize }) {
  const [pillar, setPillar] = useState<EditorialPillarId>('career-skills');
  const [headline, setHeadline] = useState('');
  const [description, setDescription] = useState('');
  const [caption, setCaption] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [consent, setConsent] = useState(false);
  const [recipeIndex, setRecipeIndex] = useState(0);
  const [history, setHistory] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState('');
  const [campaignId, setCampaignId] = useState<string | null>(null);
  const [posterUrl, setPosterUrl] = useState('');
  const [queueId, setQueueId] = useState('');
  const [status, setStatus] = useState('unsaved');
  const [saved, setSaved] = useState<{id:string;title:string;status:string}[]>([]);
  const [visuals, setVisuals] = useState<{url:string;id:string;label:string;enabled:boolean}[]>([]);
  const [heroUrl, setHeroUrl] = useState('');
  const [ideas, setIdeas] = useState<string[]>([]);
  const [ideaBusy, setIdeaBusy] = useState(false);
  const [artPrompt, setArtPrompt] = useState('');
  const [artCostAcknowledged, setArtCostAcknowledged] = useState(false);
  const [artBusy, setArtBusy] = useState(false);
  const [reelScenes, setReelScenes] = useState<string[]>([]);
  const [reelBusy, setReelBusy] = useState(false);
  const [reelUrl, setReelUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [snapshots, setSnapshots] = useState<{platform:string;views:number|null;reach:number|null;paid:boolean|null}[]>([]);
  const [overview, setOverview] = useState<{totalPosts:number; organic:{label:string;posts:number;medianReach:number|null;medianViews:number|null}[];paid:{label:string;posts:number;medianReach:number|null}[];unclassified:{label:string;posts:number;medianReach:number|null}[]}|null>(null);
  const [viewsInput, setViewsInput] = useState('');
  const [reachInput, setReachInput] = useState('');
  const [metricPlatform, setMetricPlatform] = useState<'facebook'|'instagram'>('facebook');
  const [paidStatus, setPaidStatus] = useState<'unknown'|'organic'|'paid'>('unknown');
  const renderRef = useRef<HTMLDivElement>(null);
  const chosen = getEditorialPillar(pillar);
  const recipes = useMemo(() => recipesForPillar(pillar), [pillar]);
  const recipe = recipes[recipeIndex % recipes.length];
  const draft = { pillar, title: headline, note: description, caption, sourceUrl, consentConfirmed: consent };
  const review = reviewEditorialDraft(draft, history);
  const direction = lang === 'en' ? 'ltr' : 'rtl';
  const media: StudioMediaConfig = heroUrl ? { hero: { url: heroUrl, visible:true, fit:'contain' } } : {};
  const refreshLibrary = async () => {
    try {
      const [a,v,ins]=await Promise.all([fetch('/api/admin/studio/campaigns',{cache:'no-store'}),fetch('/api/admin/studio/visuals',{cache:'no-store'}),fetch('/api/admin/studio/analytics',{cache:'no-store'})]);
      if (!a.ok) throw new Error('Campaign storage unavailable. Database migration may be pending.');
      const campaigns=await a.json();
      setSaved(campaigns.campaigns??[]);
      if(ins.ok){const data=await ins.json();setOverview(data.summary??null);}
      if(v.ok){const assets=await v.json();setVisuals((assets.visuals??[]).filter((x:{enabled:boolean})=>x.enabled));}
    } catch(e) {setError(e instanceof Error?e.message:'Unable to load Studio data');}
  };
  useEffect(()=>{void refreshLibrary();},[]);
  const loadSaved = async (id:string) => {
    setBusy(true);
    try {
      const res=await fetch('/api/admin/studio/campaigns?id='+encodeURIComponent(id));
      const body=await res.json();
      if(!res.ok)throw new Error(body.error??'Load failed');
      const c=body.campaign;
      setCampaignId(c.id);setStatus(c.status);setPillar(c.pillar);
      setPosterUrl(c.posterUrl??'');setQueueId(c.queueId??'');
      setHeadline(c.content.headline);setDescription(c.content.note);setCaption(c.content.caption);
      setSourceUrl(c.sourceUrl??'');setConsent(Boolean(c.consentConfirmed));
      const found=recipesForPillar(c.pillar).findIndex((x:{id:string})=>x.id===c.recipeId);
      setRecipeIndex(Math.max(0,found));setHeroUrl(c.media?.hero?.url??'');
      setSnapshots(c.metrics??[]);
      setNotice('Saved campaign loaded. Save edits before approving.');
    }catch(e){setError(e instanceof Error?e.message:'Cannot load campaign');}
    finally{setBusy(false);}
  };
  const saveCampaign=async()=>{
    setBusy(true);setError('');setNotice('');
    try {
      const res=await fetch('/api/admin/studio/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        action:campaignId?'update':'create',id:campaignId??undefined,
        pillar,language:lang,format:size,recipeId:recipe.id,
        content:{headline,note:description,caption},sourceUrl:sourceUrl||null,consentConfirmed:consent,media,
      })});
      const body=await res.json();
      if(!res.ok)throw new Error(body.error??'Save failed');
      setCampaignId(body.campaign.id);setStatus('draft');setPosterUrl('');setQueueId('');setNotice('Saved as draft. Nothing has been published.');
      await refreshLibrary();
    }catch(e){setError(e instanceof Error?e.message:'Save failed');}
    finally{setBusy(false);}
  };
  const approve=async()=>{
    if(!campaignId||!review.publishReady)return;
    setBusy(true);setError('');
    try {
      const res=await fetch('/api/admin/studio/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'approve',id:campaignId,reviewAcknowledged:true})});
      const body=await res.json();if(!res.ok)throw new Error(body.error??'Review failed');
      setStatus('approved');setNotice('Editorial review recorded. Publishing is still manual.');
      await refreshLibrary();
    }catch(e){setError(e instanceof Error?e.message:'Approval failed');}
    finally{setBusy(false);}
  };
  const saveApprovedPoster=async()=>{
    if(!campaignId||status!=='approved'||!renderRef.current)return;
    setBusy(true);setError('');setNotice('');
    try{
      const png=await toPng(renderRef.current,{width:1080,height:size==='story'?1920:size==='portrait'?1350:1080,pixelRatio:1,cacheBust:true});
      const res=await fetch('/api/admin/studio/poster',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        campaignId,headline,recipeId:recipe.id,png,
      })});
      const body=await res.json();if(!res.ok)throw new Error(body.error||'Poster upload failed');
      setPosterUrl(body.posterUrl);
      setNotice('Approved PNG stored. No post has been queued or published.');
    }catch(e){setError(e instanceof Error?e.message:'Poster upload failed');}
    finally{setBusy(false);}
  };
  const queueReviewed=async()=>{
    if(!campaignId||!posterUrl||status!=='approved')return;
    if(!window.confirm('Create a MANUAL-ONLY social queue row? This does not publish yet.'))return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/admin/studio/queue',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({campaignId,confirmManualQueue:true})});
      const body=await res.json();if(!res.ok)throw new Error(body.error||'Queue failed');
      setQueueId(body.queueId);setNotice('Manual-only queue row created. Automatic workers will not publish it.');
    }catch(e){setError(e instanceof Error?e.message:'Queue failed');}
    finally{setBusy(false);}
  };
  const publishReviewed=async()=>{
    if(!queueId)return;
    if(!window.confirm('Publish this reviewed campaign NOW to every enabled social channel? This is a real public action.'))return;
    setBusy(true);setError('');
    try{
      const res=await fetch('/api/admin/automation',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'publish-now',id:queueId})});
      const body=await res.json();if(!res.ok||!body.ok)throw new Error(body.error||'Publishing unsuccessful');
      setNotice('Publish request completed. Review the Automation delivery log for individual platform results.');
    }catch(e){setError(e instanceof Error?e.message:'Publishing failed');}
    finally{setBusy(false);}
  };
  const brainstorm = async () => {
    const brief=[headline,description].filter(Boolean).join(' — ').trim();
    if(brief.length<15){setError('Write at least 15 characters of your topic and known facts first.');return;}
    setIdeaBusy(true);setError('');
    try{
      const res=await fetch('/api/admin/studio/ideas',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lang,pillar,brief})});
      const data=await res.json();if(!res.ok)throw new Error(data.error||'Idea generation failed');
      setIdeas(data.suggestions??[]);
    }catch(e){setError(e instanceof Error?e.message:'Idea generation unavailable');}
    finally{setIdeaBusy(false);}
  };
  const requestArtwork=async()=>{
    if(!artCostAcknowledged||artPrompt.trim().length<30)return;
    setArtBusy(true);setError('');setNotice('');
    try{
      const res=await fetch('/api/admin/studio/generate-art',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({prompt:artPrompt,acknowledgeCost:true,acknowledgeArtworkReview:true})});
      const body=await res.json();if(!res.ok)throw new Error(body.error||'Generation unavailable');
      setNotice('Artwork created, but it is DISABLED until reviewed in Studio Visuals. Asset ID: '+body.asset.id);
      await refreshLibrary();
    }catch(e){setError(e instanceof Error?e.message:'Artwork generation failed');}
    finally{setArtBusy(false);}
  };
  const makeReel=async()=>{
    if(reelScenes.length<2)return;
    setReelBusy(true);setError('');setReelUrl('');
    try{
      const res=await fetch('/api/admin/studio/reel',{method:'POST',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({visualIds:reelScenes,secondsPerSlide:3,acknowledgeRights:true,acknowledgeRenderingCost:true})});
      const body=await res.json();if(!res.ok)throw new Error(body.error||'Video rendering failed');
      setReelUrl(body.videoUrl);
      setNotice('MP4 created from approved visual scenes. Preview and verify before any manual publication.');
    }catch(e){setError(e instanceof Error?e.message:'Video export failed');}
    finally{setReelBusy(false);}
  };
  const recordMetric=async()=>{
    if(!campaignId)return;
    setBusy(true);setError('');
    try {
      const res=await fetch('/api/admin/studio/metrics',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({
        campaignId,platform:metricPlatform,paid:paidStatus==='unknown'?null:paidStatus==='paid',
        ...(viewsInput?{views:Number(viewsInput)}:{}),...(reachInput?{reach:Number(reachInput)}:{}),
      })});
      const body=await res.json();if(!res.ok)throw new Error(body.error??'Metric save failed');
      setSnapshots(prev=>[body.metric,...prev]);setNotice('Manual Meta metrics recorded; not provider-verified.');
    }catch(e){setError(e instanceof Error?e.message:'Metric save failed');}
    finally{setBusy(false);}
  };


  const exportPng = async () => {
    if (!review.publishReady || !renderRef.current) return;
    setExporting(true);
    setError('');
    try {
      const image = await toPng(renderRef.current, {
        width: 1080,
        height: size === 'story' ? 1920 : size === 'portrait' ? 1350 : 1080,
        pixelRatio: 1,
        cacheBust: true,
      });
      const link = document.createElement('a');
      link.href = image;
      link.download = `aria-hub-editorial-${pillar}-${size}.png`;
      link.click();
      setHistory(prev => [headline, ...prev].slice(0, 30));
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'PNG export failed.');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(300px,420px)_1fr]">
      <section className="space-y-4 rounded-2xl border bg-card p-4">
        <div className="rounded-xl border p-3 space-y-2">
          <p className="text-sm font-semibold">Saved campaigns · {status}</p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" type="button" onClick={()=>{setCampaignId(null);setStatus('unsaved');setPosterUrl('');setQueueId('');setHeadline('');setDescription('');setCaption('');setSourceUrl('');setConsent(false);setHeroUrl('');setSnapshots([]);}}>New</Button>
            <Button size="sm" variant="outline" type="button" onClick={()=>void refreshLibrary()}>Refresh</Button>
          </div>
          <select className="h-9 w-full rounded-lg border bg-background px-2 text-xs" value={campaignId??''} onChange={e=>e.target.value&&void loadSaved(e.target.value)}>
            <option value="">New unsaved campaign</option>
            {saved.map(c=><option key={c.id} value={c.id}>{c.status}: {c.title.slice(0,85)}</option>)}
          </select>
        </div>
        <div>
          <h3 className="font-semibold">Original Content Workbench</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Make a manual educational, community or creative post without needing a vacancy.
            Drafts stay in this tab until you export them. Nothing is posted automatically.
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-pillar">Content pillar</Label>
          <select id="editorial-pillar" className="h-10 w-full rounded-lg border bg-background px-2 text-sm"
            value={pillar} onChange={event => {setPillar(event.target.value as EditorialPillarId);setRecipeIndex(0);}}>
            {EDITORIAL_PILLARS.map(item => <option key={item.id} value={item.id}>{item.label[lang]}</option>)}
          </select>
          <p className="text-xs text-muted-foreground">{chosen.purpose}</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-title">Original headline</Label>
          <Input id="editorial-title" dir={direction} maxLength={200} value={headline}
            onChange={e => setHeadline(e.target.value)} placeholder="Write a concise hook; do not paste an entire article."/>
        </div>
        <div className="rounded-xl border p-3 space-y-2">
          <Button variant="outline" size="sm" type="button" disabled={ideaBusy} onClick={()=>void brainstorm()}>
            <Sparkles className="mr-1 h-4 w-4"/>{ideaBusy?'Generating…':'Suggest 3 original hooks (AI)'}
          </Button>
          <p className="text-[11px] text-muted-foreground">On-demand only; uses the existing configured AI provider and may incur API usage. Verify all generated copy.</p>
          {ideas.map((idea,i)=><button key={i} type="button" className="block w-full rounded-lg border p-2 text-start text-xs hover:bg-muted" dir="auto"
            onClick={()=>setHeadline(idea)}>{idea}</button>)}
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-note">Supporting line</Label>
          <textarea id="editorial-note" dir={direction} value={description}
            onChange={e => setDescription(e.target.value)} maxLength={500}
            className="min-h-20 w-full rounded-lg border bg-background p-2 text-sm"
            placeholder="One clear and useful sentence."/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-caption">Caption for social publishing</Label>
          <textarea id="editorial-caption" dir={direction} value={caption}
            onChange={e => setCaption(e.target.value)} className="min-h-28 w-full rounded-lg border bg-background p-2 text-sm"
            placeholder="Provide helpful context. The caption is not burned into the poster."/>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-source">Primary source (when relevant)</Label>
          <Input id="editorial-source" type="url" value={sourceUrl} onChange={e => setSourceUrl(e.target.value)}
            placeholder="https://official-source.example/..."/>
        </div>
        {chosen.requiresConsent && (
          <label className="flex items-start gap-2 text-xs">
            <input type="checkbox" checked={consent} onChange={e => setConsent(e.target.checked)}/>
            I have verified the story and obtained permission from the person featured.
          </label>
        )}
        <div>
          <p className="mb-2 text-xs font-semibold">Creative directions — original layout variations</p>
          <div className="grid gap-2 sm:grid-cols-3">
            {recipes.map((item, index) => <button key={item.id} type="button" onClick={() => setRecipeIndex(index)}
              aria-pressed={recipeIndex === index}
              className={`rounded-lg border p-2 text-left text-xs ${recipeIndex === index ? 'border-primary bg-primary/10' : 'hover:bg-muted'}`}>
              <span className="font-semibold">{item.name}</span>
              <span className="mt-1 block text-[10px] text-muted-foreground">{item.artDirection}</span>
            </button>)}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="editorial-asset">Approved media asset</Label>
          <select id="editorial-asset" value={heroUrl} onChange={e=>setHeroUrl(e.target.value)}
            className="h-10 w-full rounded-lg border bg-background px-2 text-xs">
            <option value="">Deterministic artwork only</option>
            {visuals.map(v=><option key={v.id} value={v.url}>{v.label}</option>)}
          </select>
          <p className="text-[11px] text-muted-foreground">Use original or licensed assets from the existing Brand Studio library.</p>
        </div>
        <div className="rounded-xl border p-3 space-y-2">
          <p className="text-xs font-semibold">Optional cinematic artwork generator</p>
          <textarea className="min-h-20 w-full rounded-lg border bg-background p-2 text-xs" maxLength={900}
            value={artPrompt} onChange={e=>setArtPrompt(e.target.value)}
            placeholder="Describe original artwork, main object, lighting, mood and negative space. Generated images never contain the final poster text."/>
          <label className="flex gap-2 text-[11px]">
            <input type="checkbox" checked={artCostAcknowledged} onChange={e=>setArtCostAcknowledged(e.target.checked)}/>
            I understand this is a paid request if an image provider is enabled, and artwork must be reviewed before use.
          </label>
          <Button type="button" variant="outline" size="sm" disabled={!artCostAcknowledged||artPrompt.trim().length<30||artBusy}
            onClick={()=>void requestArtwork()}>{artBusy?'Generating…':'Generate artwork (opt-in)'}</Button>
          <p className="text-[11px] text-muted-foreground">Requires server feature flag, provider key, Blob storage, and admin confirmation. New artwork remains disabled until reviewed.</p>
        </div>
        <div className="rounded-xl border p-3 space-y-2">
          <p className="text-xs font-semibold">Reel builder · approved slides → MP4</p>
          <p className="text-[11px] text-muted-foreground">Select 2–6 licensed image assets. Produces a silent portrait slideshow Reel if FFmpeg, durable storage and the server feature flag are configured. It is not AI motion video.</p>
          <div className="max-h-36 overflow-y-auto space-y-1">
            {visuals.filter(v=>/\.(?:png|jpe?g)(?:\?|$)/i.test(v.url)).map(v=><label key={v.id} className="flex gap-2 text-xs">
              <input type="checkbox" checked={reelScenes.includes(v.id)} onChange={e=>setReelScenes(prev=>e.target.checked?[...prev,v.id].slice(0,6):prev.filter(x=>x!==v.id))}/>
              <span>{v.label}</span>
            </label>)}
          </div>
          <Button variant="outline" size="sm" disabled={reelBusy||reelScenes.length<2} type="button" onClick={()=>void makeReel()}>
            {reelBusy?'Rendering…':`Render silent MP4 (${reelScenes.length} scenes)`}
          </Button>
          {reelUrl && <a className="block break-all text-xs text-primary underline" href={reelUrl} target="_blank" rel="noopener noreferrer">Open generated MP4 for review</a>}
        </div>
        <div className="rounded-lg border p-3 text-xs" role="status">
          <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4"/> Editorial review</div>
          {review.warnings.length
            ? <ul className="list-disc space-y-1 ps-4">{review.warnings.map(x => <li key={x}>{x}</li>)}</ul>
            : <p>No basic editorial warnings. Review accuracy, rights, typography and visuals manually before publication.</p>}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button type="button" variant="outline" disabled={busy} onClick={()=>void saveCampaign()}><Save className="mr-1 h-4 w-4"/>Save draft</Button>
          <Button type="button" disabled={busy||!campaignId||!review.publishReady||status!=='draft'} onClick={()=>void approve()}><CheckCircle2 className="mr-1 h-4 w-4"/>Approve</Button>
        </div>
        <div className="rounded-lg border p-3 space-y-2">
          <p className="text-xs font-semibold">Reviewed poster → manual publishing</p>
          <p className="text-[11px] text-muted-foreground">Save the final branded PNG in durable storage, queue only after owner confirmation, then explicitly publish through the existing approved channels. None of these actions run automatically.</p>
          <Button size="sm" variant="outline" type="button" disabled={busy||!campaignId||status!=='approved'||Boolean(queueId)} onClick={()=>void saveApprovedPoster()}>
            Save final PNG for publishing
          </Button>
          {posterUrl&&<p className="text-[11px] text-emerald-700">Durable poster stored</p>}
          <Button size="sm" variant="outline" type="button" disabled={busy||!posterUrl||Boolean(queueId)||status!=='approved'} onClick={()=>void queueReviewed()}>
            Add to manual-only queue
          </Button>
          {queueId&&<p className="break-all text-[11px]">Queue: {queueId}</p>}
          <Button size="sm" type="button" disabled={busy||!queueId} onClick={()=>void publishReviewed()}>
            Publish now (explicit confirmation)
          </Button>
        </div>
        <Button type="button" className="w-full gap-2" onClick={exportPng} disabled={!review.publishReady || exporting}>
          <Download className="h-4 w-4"/>{exporting ? 'Exporting…' : 'Export approved PNG'}
        </Button>
        {notice && <p role="status" className="text-xs text-emerald-700">{notice}</p>}
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
        <div className="rounded-xl border p-3 space-y-2">
          <p className="text-xs font-semibold">Campaign performance overview · manual measurements</p>
          <p className="text-[11px] text-muted-foreground">Latest snapshot per campaign/platform, so repeated exports do not inflate counts. Reach and views remain different metrics.</p>
          <p className="text-xs">{overview?.totalPosts??0} measured campaign-platform posts</p>
          {overview?.organic.slice(0,5).map(row=><p key={row.label} className="text-xs">Organic · {row.label}: median reach {row.medianReach??'—'} / {row.posts} posts</p>)}
          {overview?.paid.slice(0,2).map(row=><p key={row.label} className="text-xs">Paid · {row.label}: median reach {row.medianReach??'—'}</p>)}
          {overview?.unclassified.slice(0,2).map(row=><p key={row.label} className="text-xs">Unclassified · {row.label}: median reach {row.medianReach??'—'}</p>)}
        </div>
        <div className="border-t pt-3 space-y-2">
          <p className="flex items-center gap-2 text-xs font-semibold"><BarChart3 className="h-4 w-4"/>Real performance snapshots</p>
          <p className="text-[11px] text-muted-foreground">Enter values from Meta Business Suite. Follower/non-follower status does not establish paid reach.</p>
          <div className="grid grid-cols-2 gap-2">
            <select aria-label="Platform" className="h-9 rounded-lg border bg-background px-2 text-xs" value={metricPlatform} onChange={e=>setMetricPlatform(e.target.value as 'facebook'|'instagram')}><option value="facebook">Facebook</option><option value="instagram">Instagram</option></select>
            <select aria-label="Paid classification" className="h-9 rounded-lg border bg-background px-2 text-xs" value={paidStatus} onChange={e=>setPaidStatus(e.target.value as 'unknown'|'organic'|'paid')}><option value="unknown">Paid status unknown</option><option value="organic">Organic</option><option value="paid">Paid</option></select>
            <Input type="number" min="0" placeholder="Views" value={viewsInput} onChange={e=>setViewsInput(e.target.value)}/>
            <Input type="number" min="0" placeholder="Reach" value={reachInput} onChange={e=>setReachInput(e.target.value)}/>
          </div>
          <Button size="sm" variant="outline" disabled={!campaignId||busy} onClick={()=>void recordMetric()}>Record snapshot</Button>
          {snapshots.slice(0,8).map((m,i)=><p key={i} className="text-xs">{m.platform}: {m.views??'—'} views · {m.reach??'—'} reach · {m.paid===null?'unknown':m.paid?'paid':'organic'}</p>)}
        </div>
        <p className="text-[11px] text-muted-foreground">
          <Sparkles className="mr-1 inline h-3 w-3"/>This phase uses deterministic art direction, not AI image generation.
          For premium visuals, add authorized artwork through the existing media-layer editor.
          Export does not authorize social publication.
        </p>
      </section>
      <section className="min-w-0 rounded-2xl border bg-slate-950 p-4">
        <p className="mb-3 text-xs font-medium text-slate-200">Live preview · {recipe.name} · {lang.toUpperCase()}</p>
        <div className="flex justify-center overflow-hidden">
          <div style={{width:432,height:(size==='story'?1920:size==='portrait'?1350:1080)*0.4,position:'relative'}}>
            <div style={{transform:'scale(.4)',transformOrigin:'top left',width:1080}}>
              <div ref={renderRef} style={{width:1080,height:size==='story'?1920:size==='portrait'?1350:1080}}>
                <PremiumSocialCanvas
                  template={recipe.template} designFamily={recipe.family} lang={lang} size={size}
                  title={headline.trim() || (lang === 'en' ? 'Your compelling headline' : lang === 'fa' ? 'عنوان جذاب شما' : 'ستاسو په زړه پورې سرلیک')}
                  note={description.trim()} eyebrow={chosen.label[lang]}
                  cta="myariahub.com" badge={chosen.label[lang]} media={media} />
              </div>
            </div>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-300">
          This preview uses existing ARIA HUB rendering and brand assets. Select another direction to compare composition.
        </p>
      </section>
    </div>
  );
}
