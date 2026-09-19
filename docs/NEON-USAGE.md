# Neon usage — what consumes it and how to keep the free tier free

## Where the transfer/compute goes

| Consumer | Cost | Notes |
|---|---|---|
| **Vercel builds** | biggest | every build prerenders ~49 pages, each hitting the DB |
| Live site traffic | small | pages are ISR-cached (30 min), visitors mostly hit the cache |
| Migrations / dumps | one-off | ~11 MB per full dump |
| Local dev | **zero** | local dev uses the local `.localpg` cluster, never Neon |

The multiplier: every `git push` triggers a build — and until previews are
disabled, Vercel builds **twice** per push (production + preview).

## Rules to keep usage minimal

1. **Turn off Preview Deployments** (one-time):
   Vercel → Project → Settings → Git → **Preview Deployments: Disabled**.
   Halves every future build.
2. **Batch pushes.** When using AI to improve the site, let it finish a whole
   work session and commit **once**, not per change. 10 pushes = 10 builds.
3. **Do all AI database experiments locally.** The local cluster (`.localpg`,
   started with `node scripts/pg-boot-local.cjs`) is free and unlimited.
   Never point local `.env` `DATABASE_URL` at Neon.
4. **Publish DB changes once**, when final:
   ```bash
   bash deploy/sync-local-to-neon.sh
   ```
5. Schema changes: finalize `prisma/schema.prisma` locally, then a single
   `DATABASE_URL=<DIRECT_URL> bunx prisma db push` against Neon.
6. Watch consumption: Neon console → your project → **Usage** tab.

## When you outgrow the free tier

- Neon Launch plan ($19/mo) — more storage + compute.
- Better: the planned **Oracle Always Free** move — 200 GB disk, 10 TB traffic,
  $0. Full checklist: [DEPLOY.md §6.7](../deploy/DEPLOY.md).
