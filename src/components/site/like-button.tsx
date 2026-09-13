'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { translate } from '@/lib/i18n';
import type { Lang } from '@/lib/i18n-config';

/**
 * Anonymous like button for success stories — POST /api/success-stories/[id]/like,
 * optimistic increment, rate-limited server-side.
 */
export default function LikeButton({
  storyId,
  initialLikes,
  lang,
}: {
  storyId: string;
  initialLikes: number;
  lang: Lang;
}) {
  const [likes, setLikes] = useState(initialLikes);
  const [liked, setLiked] = useState(false);
  const [pending, setPending] = useState(false);

  const t = (key: string) => translate(lang, key);

  async function like() {
    if (liked || pending) return;
    setPending(true);
    setLikes((n) => n + 1); // optimistic
    try {
      const res = await fetch(`/api/success-stories/${storyId}/like`, { method: 'POST' });
      if (!res.ok) throw new Error('failed');
      const data = (await res.json()) as { likes?: number };
      if (typeof data.likes === 'number') setLikes(data.likes);
      setLiked(true);
    } catch {
      setLikes((n) => n - 1); // rollback
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      onClick={like}
      disabled={liked || pending}
      aria-label={liked ? t('stories.liked') : t('stories.like')}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
        liked
          ? 'border-rose-500/40 bg-rose-500/10 text-rose-600 dark:text-rose-400'
          : 'border-border text-foreground hover:border-rose-500/40 hover:bg-rose-500/5 hover:text-rose-600 dark:hover:text-rose-400'
      } disabled:cursor-default`}
    >
      <Heart className={`h-4 w-4 ${liked ? 'fill-current' : ''}`} aria-hidden="true" />
      <span>{likes}</span>
      <span className="hidden md:inline">{liked ? t('stories.liked') : t('stories.like')}</span>
    </button>
  );
}
