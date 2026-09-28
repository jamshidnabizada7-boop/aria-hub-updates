/**
 * Backfill structured locations for EXISTING Opportunity rows.
 *
 * The legacy importer collapsed `country: listing.country || listing.location`
 * and threw provinces away. This script recovers them deterministically:
 *   1. extractedData location keys (Wazifaha detail grid)      → confidence 1.0
 *   2. "Location:" line in the description (Jobs.af, ACBAR)    → confidence 0.9
 *   3. title "— Kabul" suffix, 34-province whitelist only      → confidence 0.6
 * plus deterministic country repairs (a province that sits in the `country`
 * column moves to a location row and country becomes "Afghanistan").
 *
 * A province is NEVER invented: every candidate must match the canonical
 * 34-province whitelist/alias map. Rows that already have OpportunityLocation
 * rows (scraper-sourced) are left untouched.
 *
 * Usage:
 *   bun run scripts/backfill-locations.ts                 # dry-run + report
 *   bun run scripts/backfill-locations.ts --apply         # commit
 *   bun run scripts/backfill-locations.ts --apply --limit=50
 *   bun run scripts/backfill-locations.ts --apply --source="Wazifaha Jobs"
 */

import { createDb } from './db-client';
import {
  parseLocationString,
  normalizeProvince,
  normalizeCountry,
  isKnownCountry,
} from '../src/lib/geo/provinces';
import type { LocationRowInput } from '../src/lib/geo/location-rows';

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const limitArg = args.find((a) => a.startsWith('--limit='));
const LIMIT = limitArg ? parseInt(limitArg.split('=')[1], 10) : Infinity;
const sourceArg = args.find((a) => a.startsWith('--source='));
const SOURCE_FILTER = sourceArg ? sourceArg.split('=').slice(1).join('=') : null;

const db = createDb();

/** Extract a location-ish value from extractedData (any case of "Location"). */
function extractedLocation(ed: unknown): string | null {
  if (!ed || typeof ed !== 'object') return null;
  for (const [k, v] of Object.entries(ed as Record<string, unknown>)) {
    if (/^location$/i.test(k.trim()) && typeof v === 'string' && v.trim()) return v.trim();
  }
  return null;
}

/** "Location: Kabul, Logar" line from the description, if present. */
function descriptionLocation(description: string | null): string | null {
  if (!description) return null;
  const m = description.match(/^\s*Location\s*:\s*(.+)$/im);
  return m ? m[1].trim().slice(0, 200) : null;
}

/** "— Kabul" / "– Kabul" title suffix, matched against the whitelist only. */
function titleLocation(title: string): string | null {
  const m = title.match(/[—–-]\s*([A-Za-z][A-Za-z\- ]{2,30})\s*$/);
  return m ? m[1].trim() : null;
}

interface Candidate extends LocationRowInput {
  origin: string;
}

async function main(): Promise<void> {
  const rows = await db.opportunity.findMany({
    select: {
      id: true, title: true, country: true, sourceName: true, sourceUrl: true,
      description: true, extractedData: true,
      _count: { select: { locations: true } },
    },
    ...(Number.isFinite(LIMIT) ? { take: LIMIT } : {}),
    orderBy: { createdAt: 'desc' },
  });

  const stats = {
    scanned: 0, alreadyHave: 0, planned: 0, plannedProvinces: 0,
    countryRepairs: 0, noop: 0,
    bySource: new Map<string, number>(),
    byProvince: new Map<string, number>(),
  };
  const plan: Array<{ id: string; title: string; create: Candidate[]; repairCountry: string | null }> = [];

  for (const row of rows) {
    if (SOURCE_FILTER && row.sourceName !== SOURCE_FILTER) continue;
    stats.scanned++;
    if (row._count.locations > 0) { stats.alreadyHave++; continue; }

    // Candidate locations, highest-confidence origin first.
    const candidates: Candidate[] = [];
    const add = (
      province: string | null, city: string | null, rawLabel: string,
      source: string, confidence: number, origin: string,
    ) => {
      if (!province && !city) return;
      const key = `${(province || '').toLowerCase()}|${(city || '').toLowerCase()}`;
      const existing = candidates.find(
        (c) => `${(c.province || '').toLowerCase()}|${(c.city || '').toLowerCase()}` === key,
      );
      // Keep the higher-confidence derivation of the same place.
      if (existing && existing.confidence >= confidence) return;
      if (existing) {
        existing.confidence = confidence; existing.source = source; existing.rawLabel = rawLabel;
        existing.origin = origin;
        return;
      }
      candidates.push({
        country: null, countryCode: null, province, city, district: null,
        rawLabel: rawLabel.slice(0, 300), source, confidence, origin,
      });
    };

    const edLoc = extractedLocation(row.extractedData);
    if (edLoc) {
      const parsed = parseLocationString(edLoc);
      for (const p of parsed.provinces) add(p, parsed.city, edLoc, 'backfill-extractedData', 1, 'extractedData');
      if (!parsed.provinces.length && parsed.city) add(null, parsed.city, edLoc, 'backfill-extractedData', 0.8, 'extractedData');
    }
    const descLoc = descriptionLocation(row.description);
    if (descLoc) {
      const parsed = parseLocationString(descLoc);
      for (const p of parsed.provinces) add(p, parsed.city, descLoc, 'backfill-description', 0.9, 'description');
    }
    const tLoc = titleLocation(row.title);
    if (tLoc) {
      const p = normalizeProvince(tLoc);
      if (p) add(p, null, tLoc, 'inferred', 0.6, 'title');
    }

    // Deterministic country repair: a province (or multi-province string)
    // sitting in the country column moves out; country becomes Afghanistan.
    let repairCountry: string | null = null;
    if (row.country && !isKnownCountry(row.country)) {
      const parsedCountry = parseLocationString(row.country);
      if (parsedCountry.provinces.length) {
        for (const p of parsedCountry.provinces) {
          add(p, null, row.country, 'backfill-country-repair', 1, 'country-repair');
        }
        repairCountry = 'Afghanistan';
      } else {
        const asCountry = normalizeCountry(row.country);
        if (asCountry && asCountry !== row.country) repairCountry = asCountry; // spelling repair only
      }
    }

    if (!candidates.length && !repairCountry) { stats.noop++; continue; }

    // Attach the (repaired) country to every candidate row.
    const finalCountry = repairCountry === 'Afghanistan'
      ? 'Afghanistan'
      : normalizeCountry(row.country) || repairCountry || 'Afghanistan';
    for (const c of candidates) {
      c.country = finalCountry;
      c.countryCode = finalCountry.toLowerCase() === 'afghanistan' ? 'AF' : null;
    }

    plan.push({ id: row.id, title: row.title, create: candidates, repairCountry });
    stats.planned++;
    stats.plannedProvinces += candidates.filter((c) => c.province).length;
    if (repairCountry) stats.countryRepairs++;
    for (const c of candidates) {
      stats.bySource.set(c.origin, (stats.bySource.get(c.origin) || 0) + 1);
      if (c.province) stats.byProvince.set(c.province, (stats.byProvince.get(c.province) || 0) + 1);
    }
  }

  // ── Report ────────────────────────────────────────────────────────────────
  console.log(`\n=== Location backfill ${APPLY ? '(APPLY)' : '(DRY RUN)'} ===`);
  console.log(`scanned: ${stats.scanned}`);
  console.log(`already have location rows (skipped): ${stats.alreadyHave}`);
  console.log(`opportunities to update: ${stats.planned}`);
  console.log(`location rows to create: ${stats.plannedProvinces}`);
  console.log(`country repairs: ${stats.countryRepairs}`);
  console.log(`no data found (honest — left alone): ${stats.noop}`);
  console.log('\nby origin:', Object.fromEntries(stats.bySource));
  console.log('by province:', Object.fromEntries([...stats.byProvince.entries()].sort((a, b) => b[1] - a[1])));

  if (plan.length) {
    console.log('\nsample plan (first 15):');
    for (const p of plan.slice(0, 15)) {
      console.log(`  ${p.id}  "${p.title.slice(0, 60)}"`);
      for (const c of p.create) {
        console.log(`    → province=${c.province ?? '-'} city=${c.city ?? '-'} src=${c.origin} conf=${c.confidence}`);
      }
      if (p.repairCountry) console.log(`    → country repair: "${p.repairCountry}"`);
    }
  }

  if (!APPLY) {
    console.log('\ndry run only — rerun with --apply to commit.');
    await db.$disconnect();
    return;
  }

  let updated = 0;
  for (const p of plan) {
    try {
      await db.$transaction([
        ...(p.repairCountry
          ? [db.opportunity.update({ where: { id: p.id }, data: { country: p.repairCountry } })]
          : []),
        db.opportunityLocation.createMany({
          data: p.create.map((c) => ({
            opportunityId: p.id, country: c.country, countryCode: c.countryCode,
            province: c.province, city: c.city, district: c.district,
            rawLabel: c.rawLabel, source: c.source, confidence: c.confidence,
          })),
          skipDuplicates: true,
        }),
      ]);
      updated++;
    } catch (e) {
      console.error(`failed ${p.id}:`, e instanceof Error ? e.message : e);
    }
  }
  console.log(`\ncommitted: ${updated}/${plan.length} opportunities updated.`);
  await db.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
