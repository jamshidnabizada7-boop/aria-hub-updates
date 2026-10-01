import Link from 'next/link';
import { pickTril, type LocalDoc } from '@/lib/static-page-content';
import type { Lang } from '@/lib/lang-route';

/**
 * Shared renderer for built-in trilingual static docs (press / partners /
 * webinar / ambassador). Same visual contract as the about page: one card,
 * prose sections, RTL-safe via dir="auto" and text-start.
 */
export function StaticDocView({ doc, lang }: { doc: LocalDoc; lang: Lang }) {
  return (
    <div className="mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6 lg:px-8" dir="auto">
      <div className="rounded-2xl border border-border/60 bg-card/40 p-8 shadow-sm backdrop-blur-sm md:p-12">
        <h1 className="mb-8 text-3xl font-bold tracking-tight text-foreground md:text-4xl text-start">
          {pickTril(doc.title, lang)}
        </h1>

        <div className="prose prose-sm dark:prose-invert sm:prose-base max-w-none space-y-6 text-muted-foreground text-start">
          {doc.sections.map((s, i) => (
            <section key={i}>
              <h2 className="text-2xl font-semibold text-foreground">{pickTril(s.heading, lang)}</h2>
              {s.paragraphs?.map((p, j) => (
                <p key={j}>{pickTril(p, lang)}</p>
              ))}
              {s.bullets ? (
                <ul className="list-disc ps-5 mt-2 space-y-2">
                  {s.bullets.map((b, j) => (
                    <li key={j}>{pickTril(b, lang)}</li>
                  ))}
                </ul>
              ) : null}
              {s.bulletLinks ? (
                <ul className="list-disc ps-5 mt-2 space-y-2">
                  {s.bulletLinks.map((b, j) => (
                    <li key={j}>
                      <Link href={b.href} className="text-primary underline-offset-4 hover:underline">
                        {pickTril(b.label, lang)}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
