import Link from 'next/link'

/**
 * Global 404 — lives outside /[lang] so the language is unknown.
 * Renders a clean, brand-consistent page with all three languages stacked
 * (neutral LTR container; each language block carries its own dir).
 */
export default function NotFound() {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-16 text-center">
      {/* Watermark */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
      >
        <span className="select-none text-[38vw] font-black leading-none tracking-tighter text-foreground/[0.035] sm:text-[24rem]">
          404
        </span>
      </div>

      <p
        aria-hidden="true"
        className="relative bg-gradient-to-r from-primary to-chart-2 bg-clip-text text-7xl font-black tracking-tight text-transparent sm:text-8xl"
      >
        404
      </p>

      {/* Trilingual explanations */}
      <div className="relative mt-6 space-y-2" dir="ltr">
        <p className="text-lg font-semibold text-foreground">This page could not be found.</p>
        <p className="text-base text-muted-foreground" dir="rtl" lang="fa">
          این صفحه پیدا نشد.
        </p>
        <p className="text-base text-muted-foreground" dir="rtl" lang="ps">
          دا پاڼه نه موندل شوه.
        </p>
      </div>

      {/* Language home links */}
      <nav aria-label="Homepage links" className="relative mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/en"
          className="inline-flex min-h-11 items-center gap-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
        >
          English
        </Link>
        <Link
          href="/fa"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          lang="fa"
          dir="rtl"
        >
          فارسی
        </Link>
        <Link
          href="/ps"
          className="inline-flex min-h-11 items-center gap-2 rounded-full border bg-card px-5 py-2.5 text-sm font-semibold text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60"
          lang="ps"
          dir="rtl"
        >
          پښتو
        </Link>
      </nav>
    </div>
  )
}
