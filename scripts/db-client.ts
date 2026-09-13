/**
 * DB client for standalone scripts.
 *
 * The platform exports DATABASE_URL=file:… (sqlite scaffold default) into the
 * shell, which overrides the real Neon PostgreSQL URL in .env. Scripts that
 * need the production database must re-read .env themselves. This helper
 * resolves the URL (handling quoted values) and returns a PrismaClient
 * generated from the full ARIA HUB schema (scripts/prisma/full.prisma →
 * scripts/prisma/generated-client) — independent of the app's schema.prisma.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

/** Portable directory of this file (works in both bun and node). */
const here = fileURLToPath(new URL('.', import.meta.url));

function isPostgresUrl(v: string): boolean {
  return v.startsWith('postgres://') || v.startsWith('postgresql://');
}

function resolveDatabaseUrl(): string {
  // 1. A real postgres URL already in the environment wins.
  const envUrl = process.env.DATABASE_URL || '';
  if (isPostgresUrl(envUrl)) return envUrl;

  // 2. Otherwise re-read .env (the platform's file: override hides it).
  try {
    const raw = readFileSync(join(here, '..', '.env'), 'utf8');
    for (const line of raw.split('\n')) {
      const m = line.match(/^\s*DATABASE_URL\s*=\s*(.*)\s*$/);
      if (!m) continue;
      let v = m[1].trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      if (isPostgresUrl(v)) return v;
    }
  } catch {
    // no .env — fall through
  }
  return envUrl;
}

export function createDb(): PrismaClient {
  const url = resolveDatabaseUrl();
  if (!isPostgresUrl(url)) {
    throw new Error('No PostgreSQL DATABASE_URL found (checked process.env and .env)');
  }
  return new PrismaClient({ datasources: { db: { url } } });
}
