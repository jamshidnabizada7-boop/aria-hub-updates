import Link from 'next/link';

/**
 * Locale not-found — for unknown slugs under /[lang]/* (blog posts,
 * opportunities, templates that were unpublished or never existed).
 * not-found.tsx receives no params, so keep the copy language-neutral.
 */
export default function LocaleNotFound() {
  return (
    <div className="grid min-h-[70vh] place-items-center bg-background px-4">
      <div className="max-w-md text-center">
        <p className="text-6xl font-black tracking-tight text-primary/30">404</p>
        <h1 className="mt-3 text-xl font-bold text-foreground">Page not found</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground" dir="auto">
          این صفحه پیدا نشد — ممکن است حذف شده باشد.
          <br />
          This page doesn&apos;t exist or is no longer published.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/"
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Home
          </Link>
          <Link
            href="/en/opportunities"
            className="rounded-xl border border-border px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Opportunities
          </Link>
        </div>
      </div>
    </div>
  );
}
