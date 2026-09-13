'use client';

/**
 * FollowChannelsBand — "get updates daily" strip that turns the site's
 * WhatsApp / Telegram / Facebook channels (managed in the admin SocialLink
 * table) into a recurring-visit driver. Renders only channels that exist in
 * the DB, so the owner controls it fully from the admin panel.
 */

import { MessageCircle, Send, Facebook, BellRing, type LucideIcon } from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/lang-route';

interface SocialLinkLite {
  platform: string;
  label: string;
  url: string;
}

const CHANNEL_STYLE: Record<string, { icon: LucideIcon; classes: string }> = {
  whatsapp: {
    icon: MessageCircle,
    classes: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/20 dark:text-emerald-300',
  },
  telegram: {
    icon: Send,
    classes: 'border-sky-500/30 bg-sky-500/10 text-sky-700 hover:bg-sky-500/20 dark:text-sky-300',
  },
  facebook: {
    icon: Facebook,
    classes: 'border-blue-500/30 bg-blue-500/10 text-blue-700 hover:bg-blue-500/20 dark:text-blue-300',
  },
};

export function FollowChannelsBand({
  lang,
  socialLinks,
  className = '',
}: {
  lang: Lang;
  socialLinks: SocialLinkLite[];
  className?: string;
}) {
  const channels = socialLinks
    .filter((s) => CHANNEL_STYLE[s.platform?.toLowerCase()])
    .slice(0, 3);
  if (channels.length === 0) return null;

  const t = (key: string) => translate(lang, key);

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] via-card to-chart-2/[0.05] p-5 ${className}`}
    >
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-primary to-chart-2 text-primary-foreground">
            <BellRing className="h-5 w-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p dir="auto" className="text-sm font-bold leading-snug">{t('channels.title')}</p>
            <p dir="auto" className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {t('channels.subtitle')}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {channels.map((ch) => {
            const style = CHANNEL_STYLE[ch.platform.toLowerCase()];
            const Icon = style.icon;
            return (
              <a
                key={ch.url}
                href={ch.url}
                target="_blank"
                rel="noopener noreferrer"
                dir="auto"
                className={`inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-xs font-bold transition-colors ${style.classes}`}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                {ch.label || ch.platform}
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}
