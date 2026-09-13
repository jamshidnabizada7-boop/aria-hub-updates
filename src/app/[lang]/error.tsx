'use client';

/**
 * Locale route error boundary. Without this, any server exception on a
 * /[lang]/* page showed Next's default error screen with no way back.
 */
import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, RotateCw } from 'lucide-react';

export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surfaced in the server console via Next's error serialization; keep a
    // client breadcrumb so a screenshot from a user still carries the digest.
    console.error('[page error]', error.digest ?? error.message);
  }, [error]);

  return (
    <div className="grid min-h-[70vh] place-items-center bg-background px-4">
      <div className="max-w-md rounded-2xl border border-destructive/20 bg-card p-8 text-center shadow-sm">
        <AlertTriangle className="mx-auto h-10 w-10 text-destructive" aria-hidden="true" />
        <h1 className="mt-4 text-lg font-bold text-foreground">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground" dir="auto">
          مشکلی پیش آمد — لطفاً دوباره تلاش کنید.
        </p>
        {error.digest && (
          <p className="mt-2 text-[11px] text-muted-foreground/70">ref: {error.digest}</p>
        )}
        <div className="mt-6 flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RotateCw className="h-4 w-4" aria-hidden="true" />
            Try again
          </button>
          <Link
            href="/"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
