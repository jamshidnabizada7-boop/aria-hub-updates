'use client';

import { useEffect, useMemo, useState } from 'react';
import { Eye, FileText, Loader2, RefreshCw, Save, Settings2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  CV_PURPOSES,
  CV_SECTION_KEYS,
  DEFAULT_CV_BUILDER_ADMIN_CONFIG,
  normalizeCVBuilderAdminConfig,
  type CVBuilderAdminConfig,
} from '@/app/[lang]/cv-builder/lib/cv-admin-config';
import { CV_TEMPLATES } from '@/app/[lang]/cv-builder/lib/cv-templates';
import type { CVOutputLang, CVPurpose, CVSectionKey, TemplateType } from '@/app/[lang]/cv-builder/types';

const PURPOSE_LABELS: Record<CVPurpose, string> = {
  professional: 'Job / Professional',
  student: 'Student / Internship',
  scholarship: 'Scholarship / Academic',
};

const SECTION_LABELS: Record<CVSectionKey, string> = {
  personal: 'Personal information',
  summary: 'Professional summary',
  experience: 'Experience',
  education: 'Education',
  projects: 'Projects',
  skills: 'Skills',
  languages: 'Languages',
  certifications: 'Certifications',
  awards: 'Awards & honors',
  volunteering: 'Volunteering & leadership',
  research: 'Research',
  publications: 'Publications',
  references: 'References',
};

const LANG_LABELS: Record<CVOutputLang, string> = {
  en: 'English',
  fa: 'فارسی',
  ps: 'پښتو',
};

export function CVBuilderAdminPanel() {
  const { toast } = useToast();
  const [config, setConfig] = useState<CVBuilderAdminConfig>(() => normalizeCVBuilderAdminConfig(DEFAULT_CV_BUILDER_ADMIN_CONFIG));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/cv-builder', { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to load CV Builder settings.');
      setConfig(normalizeCVBuilderAdminConfig(data.config));
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Failed to load CV Builder settings.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, []);

  const save = async () => {
    setSaving(true);
    try {
      const response = await fetch('/api/admin/cv-builder', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to save CV Builder settings.');
      setConfig(normalizeCVBuilderAdminConfig(data.config));
      toast({ title: 'CV Builder settings saved.' });
    } catch (error) {
      toast({ title: error instanceof Error ? error.message : 'Failed to save CV Builder settings.', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const enabledTemplates = useMemo(
    () => CV_TEMPLATES.filter((template) => config.templates[template.id].enabled),
    [config.templates],
  );

  const setPurposeEnabled = (purpose: CVPurpose, enabled: boolean) => {
    setConfig((current) => normalizeCVBuilderAdminConfig({
      ...current,
      purposes: { ...current.purposes, [purpose]: { enabled } },
    }));
  };

  const setTemplateEnabled = (template: TemplateType, enabled: boolean) => {
    setConfig((current) => normalizeCVBuilderAdminConfig({
      ...current,
      templates: {
        ...current.templates,
        [template]: { ...current.templates[template], enabled },
      },
    }));
  };

  const setSectionEnabled = (section: CVSectionKey, enabled: boolean) => {
    setConfig((current) => normalizeCVBuilderAdminConfig({
      ...current,
      sections: {
        ...current.sections,
        [section]: { enabled },
      },
    }));
  };

  if (loading) {
    return <div className="grid min-h-[360px] place-items-center"><Loader2 className="size-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5 shadow-sm md:flex-row md:items-start md:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileText className="size-5 text-primary" />
            <h2 className="text-lg font-bold">CV Builder Management</h2>
          </div>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
            These settings directly control the rebuilt public CV Builder. They are stored in the existing Sections CMS record with key <code>cvBuilder</code>, so the generic Sections area remains compatible too.
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            Menu Items still controls the Tools → CV Builder navigation link. Site Settings still controls navbar/footer branding. Applicant PDFs intentionally do not inherit ARIA HUB contact details.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" onClick={load}><RefreshCw className="size-4" /> Reload</Button>
          <Button asChild type="button" variant="outline"><a href="/en/cv-builder" target="_blank" rel="noreferrer"><Eye className="size-4" /> View Builder</a></Button>
          <Button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save</Button>
        </div>
      </div>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div className="flex items-center gap-2"><Settings2 className="size-4 text-primary" /><h3 className="font-bold">Feature controls</h3></div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          <Toggle label="CV Builder enabled" description="If disabled, the public CV Builder route is unavailable." checked={config.enabled} onChange={(enabled) => setConfig((c) => ({ ...c, enabled }))} />
          <Toggle label="Direct PDF download" description="Allow users to generate downloadable PDF files." checked={config.features.pdfDownload} onChange={(pdfDownload) => setConfig((c) => ({ ...c, features: { ...c.features, pdfDownload } }))} />
          <Toggle label="Profile photos" description="Allow photo controls and photo rendering in supported templates." checked={config.features.allowPhoto} onChange={(allowPhoto) => setConfig((c) => ({ ...c, features: { ...c.features, allowPhoto } }))} />
          <Toggle label="Accent customization" description="Allow accent color choices in visual templates." checked={config.features.allowAccentCustomization} onChange={(allowAccentCustomization) => setConfig((c) => ({ ...c, features: { ...c.features, allowAccentCustomization } }))} />
          <Toggle label="Density customization" description="Allow Comfortable / Compact template density." checked={config.features.allowDensityCustomization} onChange={(allowDensityCustomization) => setConfig((c) => ({ ...c, features: { ...c.features, allowDensityCustomization } }))} />
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h3 className="font-bold">Public heading and description</h3>
          <p className="text-xs text-muted-foreground">Displayed at the top of the CV Builder in the selected site language.</p>
        </div>
        <div className="grid gap-4 xl:grid-cols-3">
          {(['en', 'fa', 'ps'] as CVOutputLang[]).map((lang) => (
            <div key={lang} className="space-y-3 rounded-xl border bg-muted/20 p-4">
              <div className="font-semibold">{LANG_LABELS[lang]}</div>
              <div className="space-y-1.5">
                <Label htmlFor={`cv-intro-title-${lang}`}>Title</Label>
                <Input
                  id={`cv-intro-title-${lang}`}
                  dir={lang === 'en' ? 'ltr' : 'rtl'}
                  value={config.intro[lang].title}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    intro: { ...current.intro, [lang]: { ...current.intro[lang], title: event.target.value } },
                  }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`cv-intro-description-${lang}`}>Description</Label>
                <Textarea
                  id={`cv-intro-description-${lang}`}
                  dir={lang === 'en' ? 'ltr' : 'rtl'}
                  rows={4}
                  value={config.intro[lang].description}
                  onChange={(event) => setConfig((current) => ({
                    ...current,
                    intro: { ...current.intro, [lang]: { ...current.intro[lang], description: event.target.value } },
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h3 className="font-bold">CV purposes and defaults</h3>
          <p className="text-xs text-muted-foreground">Disable purposes you do not want users to select. Existing local drafts are preserved even if a purpose is later disabled.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {CV_PURPOSES.map((purpose) => (
            <Toggle key={purpose} label={PURPOSE_LABELS[purpose]} checked={config.purposes[purpose].enabled} onChange={(enabled) => setPurposeEnabled(purpose, enabled)} />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-1.5">
            <Label>Default purpose</Label>
            <Select value={config.defaultPurpose} onValueChange={(value) => setConfig((current) => normalizeCVBuilderAdminConfig({ ...current, defaultPurpose: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CV_PURPOSES.filter((purpose) => config.purposes[purpose].enabled).map((purpose) => <SelectItem key={purpose} value={purpose}>{PURPOSE_LABELS[purpose]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Default paper size</Label>
            <Select value={config.defaultPaperSize} onValueChange={(value) => setConfig((current) => ({ ...current, defaultPaperSize: value === 'letter' ? 'letter' : 'a4' }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="a4">A4</SelectItem><SelectItem value="letter">US Letter</SelectItem></SelectContent>
            </Select>
          </div>
          {CV_PURPOSES.map((purpose) => (
            <div key={purpose} className="space-y-1.5">
              <Label>{PURPOSE_LABELS[purpose]} default template</Label>
              <Select value={config.defaultTemplates[purpose]} onValueChange={(value) => setConfig((current) => normalizeCVBuilderAdminConfig({ ...current, defaultTemplates: { ...current.defaultTemplates, [purpose]: value } }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{enabledTemplates.map((template) => <SelectItem key={template.id} value={template.id}>{template.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h3 className="font-bold">Available templates</h3>
          <p className="text-xs text-muted-foreground">Control which layouts appear in the public template gallery and their display order. Existing drafts using a disabled template remain renderable.</p>
        </div>
        <div className="grid gap-3 lg:grid-cols-2">
          {CV_TEMPLATES.map((template) => (
            <div key={template.id} className="flex items-center gap-4 rounded-xl border p-4">
              <Switch checked={config.templates[template.id].enabled} onCheckedChange={(enabled) => setTemplateEnabled(template.id, enabled)} />
              <div className="min-w-0 flex-1">
                <div className="font-semibold">{template.name}</div>
                <div className="text-xs text-muted-foreground">{template.bestFor}</div>
              </div>
              <div className="w-20 space-y-1">
                <Label className="text-xs">Order</Label>
                <Input
                  type="number"
                  min={0}
                  max={99}
                  value={config.templates[template.id].order}
                  onChange={(event) => setConfig((current) => normalizeCVBuilderAdminConfig({
                    ...current,
                    templates: {
                      ...current.templates,
                      [template.id]: { ...current.templates[template.id], order: Number(event.target.value) },
                    },
                  }))}
                />
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h3 className="font-bold">Builder sections</h3>
          <p className="text-xs text-muted-foreground">Disabled sections disappear from the editor and generated CV. Personal information stays mandatory.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {CV_SECTION_KEYS.map((section) => (
            <Toggle
              key={section}
              label={SECTION_LABELS[section]}
              checked={config.sections[section].enabled}
              disabled={section === 'personal'}
              description={section === 'personal' ? 'Required for every CV.' : undefined}
              onChange={(enabled) => setSectionEnabled(section, enabled)}
            />
          ))}
        </div>
      </section>

      <section className="space-y-4 rounded-2xl border border-border/60 bg-card p-5">
        <div>
          <h3 className="font-bold">Quality guidance</h3>
          <p className="text-xs text-muted-foreground">These values drive live CV health guidance; they do not silently change user content.</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <NumberField label="Summary minimum words" value={config.guidance.summaryMinWords} min={10} max={150} onChange={(summaryMinWords) => setConfig((current) => normalizeCVBuilderAdminConfig({ ...current, guidance: { ...current.guidance, summaryMinWords } }))} />
          <NumberField label="Summary maximum words" value={config.guidance.summaryMaxWords} min={10} max={300} onChange={(summaryMaxWords) => setConfig((current) => normalizeCVBuilderAdminConfig({ ...current, guidance: { ...current.guidance, summaryMaxWords } }))} />
          <NumberField label="Maximum suggested skills" value={config.guidance.maxSkills} min={5} max={50} onChange={(maxSkills) => setConfig((current) => normalizeCVBuilderAdminConfig({ ...current, guidance: { ...current.guidance, maxSkills } }))} />
        </div>
      </section>

      <div className="flex justify-end"><Button type="button" onClick={save} disabled={saving}>{saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />} Save CV Builder settings</Button></div>
    </div>
  );
}

function Toggle({ label, description, checked, onChange, disabled = false }: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex min-h-20 items-center justify-between gap-4 rounded-xl border bg-muted/20 p-4">
      <div>
        <div className="text-sm font-semibold">{label}</div>
        {description ? <p className="mt-1 text-xs text-muted-foreground">{description}</p> : null}
      </div>
      <Switch checked={checked} disabled={disabled} onCheckedChange={onChange} />
    </div>
  );
}

function NumberField({ label, value, min, max, onChange }: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input type="number" min={min} max={max} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </div>
  );
}
