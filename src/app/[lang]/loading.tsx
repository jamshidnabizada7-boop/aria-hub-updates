/**
 * Route-level loading skeleton for every locale page. Without this, DB-heavy
 * pages (opportunities, blog, templates) show a blank screen while the server
 * renders — and a full-page white flash on slow networks.
 */
export default function LocaleLoading() {
  return (
    <div className="min-h-screen bg-background" aria-busy="true" aria-live="polite">
      <div className="mx-auto max-w-6xl px-4 pt-24 pb-16 sm:px-6 lg:px-8">
        {/* header block */}
        <div className="mb-10 max-w-2xl space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-muted" />
          <div className="h-4 w-full max-w-md animate-pulse rounded bg-muted" />
        </div>
        {/* card grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="flex flex-col gap-3 rounded-2xl border border-border/60 bg-card p-5"
              style={{ animation: 'pulse 1.8s ease-in-out ' + (i * 120) + 'ms infinite' }}
            >
              <div className="h-2 w-full rounded bg-primary/20" />
              <div className="h-3 w-24 animate-pulse rounded bg-muted" />
              <div className="h-5 w-full animate-pulse rounded bg-muted" />
              <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
              <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
            </div>
          ))}
        </div>
        <span className="sr-only">Loading…</span>
      </div>
    </div>
  );
}
