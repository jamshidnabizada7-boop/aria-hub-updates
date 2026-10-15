'use client';

import { useState } from 'react';
import { Send, MapPin, Phone, Mail, Clock, Building2, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { SectionHeading } from '../section-heading';
import { useT } from '@/hooks/use-t';
import { useToast } from '@/hooks/use-toast';
import {useEffectiveLang} from '@/components/site/lang-context';
import { getLocalizedContent } from '@/lib/i18n-content';
import type { Department, Branch, SiteSettings } from '@/lib/types';

export function ContactSection({
  settings,
  departments,
  branches,
  lang: langProp,
}: {
  settings: SiteSettings | null;
  departments: Department[];
  branches: Branch[];
  /** Server-provided language (fallback when the client store isn't hydrated). */
  lang?: string;
}) {
  const t = useT();
  const storeLang = useEffectiveLang();
  const lang = langProp || storeLang;
  const deptName = (d: Department): string =>
    getLocalizedContent(d.name, d.nameI18n as Record<string, string> | null, lang);
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const mainBranch = branches.find((b) => b.isMain) || branches[0];

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.get('name'),
          email: form.get('email'),
          phone: form.get('phone'),
          subject: form.get('subject'),
          department: form.get('department'),
          message: form.get('message'),
        }),
      });
      if (!res.ok) throw new Error('Failed');
      toast({ title: t('contact.success') });
      (e.target as HTMLFormElement).reset();
    } catch {
      toast({ title: t('contact.error'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }

  return (
    <section id="contact" className="relative py-24 sm:py-32">
      <div className="absolute inset-0 -z-10 bg-dots opacity-30 mask-fade-b" />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <SectionHeading
          eyebrow={t('contact.eyebrow')}
          title={t('contact.title')}
          subtitle={t('contact.subtitle')}
        />

        <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Form — rendered statically: entrance animations risk leaving content
              invisible (opacity:0) when in-view observers never fire */}
          <div className="lg:col-span-3">
            <Card className="border-border/60 p-6 shadow-premium sm:p-8">
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t('contact.name')} name="name" required />
                  <Field label={t('contact.email')} name="email" type="email" required />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label={t('contact.phone')} name="phone" type="tel" />
                  <Field label={t('contact.subject')} name="subject" />
                </div>
                <div>
                  <Label htmlFor="contact-department" className="mb-1.5 block text-sm font-medium">{t('contact.department')}</Label>
                  <select
                    id="contact-department"
                    name="department"
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">—</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.name}>{deptName(d)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="contact-message" className="mb-1.5 block text-sm font-medium">{t('contact.message')}</Label>
                  <Textarea id="contact-message" name="message" required rows={5} className="resize-none" />
                </div>
                <Button
                  type="submit"
                  disabled={loading}
                  className="h-12 w-full rounded-xl bg-primary text-base font-semibold shadow-float hover:bg-primary/90"
                >
                  {loading ? <Loader2 className="me-2 h-4 w-4 animate-spin" /> : <Send className="me-2 h-4 w-4 rtl-flip" />}
                  {loading ? t('contact.sending') : t('contact.send')}
                </Button>
              </form>
            </Card>
          </div>

          {/* Info */}
          <div className="space-y-4 lg:col-span-2">
            <Card className="border-border/60 p-6 shadow-premium">
              <h3 className="mb-4 flex items-center gap-2 font-bold"><MapPin className="h-4 w-4 text-primary" /> {t('contact.findUs')}</h3>
              <div className="space-y-3 text-sm">
                {settings?.address && (
                  <InfoRow icon={MapPin} text={settings.address} />
                )}
                {settings?.phone && (
                  <InfoRow icon={Phone} text={settings.phone} href={`tel:${settings.phone}`} />
                )}
                {settings?.email && (
                  <InfoRow icon={Mail} text={settings.email} href={`mailto:${settings.email}`} />
                )}
                {mainBranch?.hours && (
                  <InfoRow icon={Clock} text={mainBranch.hours} />
                )}
              </div>
            </Card>

            <Card className="border-border/60 p-6 shadow-premium">
              <h3 className="mb-4 flex items-center gap-2 font-bold"><Building2 className="h-4 w-4 text-primary" /> {t('contact.branches')}</h3>
              <div className="space-y-3">
                {branches.map((b) => (
                  <div key={b.id} className="rounded-xl border border-border/60 p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold" dir="auto">{b.name}</p>
                      {b.isMain && <span className="rounded-md bg-primary/10 px-2 py-0.5 text-[10px] font-bold uppercase text-primary">{t('contact.hq')}</span>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground" dir="auto">{b.address}</p>
                    {b.phone && <p className="mt-1 text-xs text-muted-foreground" dir="auto">{b.phone}</p>}
                    {b.mapEmbed && (
                      <div
                        className="mt-3 w-full h-40 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0 rounded-lg overflow-hidden border border-border/60"
                        dangerouslySetInnerHTML={{ __html: b.mapEmbed }}
                      />
                    )}
                  </div>
                ))}
              </div>
            </Card>

            {settings?.mapEmbed && (
              <Card className="overflow-hidden border-border/60 shadow-premium">
                <div
                  className="w-full h-64 sm:h-80 [&>iframe]:w-full [&>iframe]:h-full [&>iframe]:border-0"
                  dangerouslySetInnerHTML={{ __html: settings.mapEmbed }}
                />
              </Card>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({ label, name, type = 'text', required }: { label: string; name: string; type?: string; required?: boolean }) {
  const id = `contact-${name}`;
  return (
    <div>
      <Label htmlFor={id} className="mb-1.5 block text-sm font-medium">{label}{required && <span className="text-destructive"> *</span>}</Label>
      <Input id={id} name={name} type={type} required={required} />
    </div>
  );
}

function InfoRow({ icon: Icon, text, href }: { icon: any; text: string; href?: string }) {
  const content = (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <span className="text-sm" dir="auto">{text}</span>
    </div>
  );
  return href ? <a href={href} className="block transition-colors hover:text-primary">{content}</a> : content;
}
