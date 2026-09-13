'use client';

import { useState } from 'react';
import { Check, Facebook, Link2, MessageCircle, Send, Share2 } from 'lucide-react';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Lang } from '@/lib/lang-route';

/** X (formerly Twitter) brand mark — not available as a Lucide icon. */
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

const iconButtonClasses =
  'inline-flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary';

/**
 * Share row: plain web-share URLs (no JS SDK) + copy-link with inline
 * feedback. Renders on both the desktop sidebar and the mobile layout.
 */
export function ShareBar({
  url,
  title,
  lang,
  className,
}: {
  url: string;
  title: string;
  lang: Lang;
  className?: string;
}) {
  const t = (key: string) => translate(lang, key);
  const [copied, setCopied] = useState(false);

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  const shares = [
    {
      name: 'WhatsApp',
      href: `https://wa.me/?text=${encodedTitle}%20${encodedUrl}`,
      icon: <MessageCircle className="h-4 w-4" aria-hidden="true" />,
    },
    {
      name: 'Facebook',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
      icon: <Facebook className="h-4 w-4" aria-hidden="true" />,
    },
    {
      name: 'Telegram',
      href: `https://t.me/share/url?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <Send className="h-4 w-4" aria-hidden="true" />,
    },
    {
      name: 'X',
      href: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
      icon: <XIcon className="h-3.5 w-3.5" aria-hidden="true" />,
    },
  ];

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the share
      // links above still work, so fail silently.
    }
  };

  return (
    <div
      role="group"
      aria-label={t('detail.share')}
      className={cn('flex flex-wrap items-center gap-2 print:hidden', className)}
    >
      <span className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        <Share2 className="h-3.5 w-3.5" aria-hidden="true" />
        {t('detail.share')}
      </span>
      <div className="flex items-center gap-1.5">
        {shares.map((share) => (
          <a
            key={share.name}
            href={share.href}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={share.name}
            className={iconButtonClasses}
          >
            {share.icon}
          </a>
        ))}
        <button
          type="button"
          onClick={copyLink}
          aria-label={copied ? t('detail.copied') : t('detail.copyLink')}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors',
            copied
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'border-border text-muted-foreground hover:border-primary/40 hover:text-primary'
          )}
        >
          {copied ? (
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
          ) : (
            <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
          )}
          <span>{copied ? t('detail.copied') : t('detail.copyLink')}</span>
        </button>
      </div>
    </div>
  );
}
