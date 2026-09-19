# ARIA HUB — myariahub.com

Business-opportunity platform for Afghanistan: **jobs, scholarships, internships,
visa guidance, interview prep, and success stories** — in **Farsi, Pashto, and
English**, with automated content importing, AI-assisted enrichment/translation,
and a built-in social-media Brand Studio.

- 🌐 Live: <https://www.myariahub.com>
- 🗄️ Database: PostgreSQL (Neon) — migratable to any Postgres (see `deploy/`)
- ☁️ Hosting: Vercel

## Stack

| Layer | Tech |
|---|---|
| App | Next.js 16 (App Router, Turbopack), React 19, TypeScript |
| UI | Tailwind CSS 4, shadcn/ui, Framer Motion, lucide-react |
| Data | Prisma ORM + PostgreSQL, trilingual content fields (i18n fallback chains) |
| AI | Multi-provider failover (Groq / Cerebras / Gemini / OpenRouter) for translation, summaries, matching |
| Automation | Import orchestrator (scrapers), scheduler, social-post pipeline with code-driven poster templates |
| Infra | Vercel (app) · Neon (DB) · optional Oracle Always Free self-host via `deploy/` |

## Project layout

```
src/app        — routes (trilingual [lang] segment) + API routes
src/components — site UI, admin panels, ui/ (shadcn)
src/lib        — queries, i18n, AI providers, import/scraper orchestrator,
                 social automation (plan → render → publish)
prisma         — schema (PostgreSQL)
deploy         — self-hosting kit (Docker + Caddy + Oracle Always Free guide)
scripts        — maintenance/seed/dev helpers
tests          — unit + API guard tests (bun test)
videos         — finished brand videos (production sources are local-only)
```

## Local development

```bash
bun install                       # also runs `prisma generate`
cp .env.example .env              # then fill in values (see below)
node scripts/pg-boot-local.cjs    # start the local Postgres cluster (.localpg) on :5433
bun run dev                       # http://localhost:3000
```

Environment variables (all in `.env`): `DATABASE_URL`, `ADMIN_SESSION_SECRET`,
AI provider keys (`GROQ_API_KEY`, `GEMINI_API_KEY`, …), optional
`NEXT_PUBLIC_ADSENSE_*` for ads.

## Deployment

Production runs on **Vercel + Neon**. Environment variables are set in the
Vercel dashboard. For the full self-hosting path (Oracle Cloud Always Free:
2 ARM CPUs, 12 GB RAM, 200 GB disk, 10 TB traffic — free), see
**[deploy/DEPLOY.md](deploy/DEPLOY.md)**.

## Useful commands

```bash
bun run build      # production build (also what Vercel runs)
bun run db:push    # sync prisma/schema.prisma to the database
bun test           # unit + API guard tests
```
