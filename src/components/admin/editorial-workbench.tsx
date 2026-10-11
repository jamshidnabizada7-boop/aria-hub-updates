'use client';

import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { Download, ShieldCheck, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PremiumSocialCanvas } from '@/lib/social/studio/premium-canvas';
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
  const renderRef = useRef<HTMLDivElement>(null);
  const chosen = getEditorialPillar(pillar);
  const recipes = useMemo(() => recipesForPillar(pillar), [pillar]);
  const recipe = recipes[recipeIndex % recipes.length];
  const draft = { pillar, title: headline, note: description, caption, sourceUrl, consentConfirmed: consent };
  const review = reviewEditorialDraft(draft, history);
  const direction = lang === 'en' ? 'ltr' : 'rtl';

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
        <div className="rounded-lg border p-3 text-xs" role="status">
          <div className="mb-1 flex items-center gap-2 font-semibold"><ShieldCheck className="h-4 w-4"/> Editorial review</div>
          {review.warnings.length
            ? <ul className="list-disc space-y-1 ps-4">{review.warnings.map(x => <li key={x}>{x}</li>)}</ul>
            : <p>No basic editorial warnings. Review accuracy, rights, typography and visuals manually before publication.</p>}
        </div>
        <Button type="button" className="w-full gap-2" onClick={exportPng} disabled={!review.publishReady || exporting}>
          <Download className="h-4 w-4"/>{exporting ? 'Exporting…' : 'Export approved PNG'}
        </Button>
        {error && <p role="alert" className="text-xs text-destructive">{error}</p>}
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
                  cta="myariahub.com" badge={chosen.label[lang]} />
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
