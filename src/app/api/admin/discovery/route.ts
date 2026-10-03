/**
 * Discovery Inbox API (Phase 10) — admin-only.
 * GET  /api/admin/discovery           → pending matchReview items + counts
 * PATCH /api/admin/discovery { action, ... }:
 *   keep-separate { observationId }
 *   merge         { opportunityId, candidateId }
 *   publish       { opportunityId }
 *   reject        { opportunityId }
 *   trust-source  { importSourceId }
 *   pause-source  { importSourceId }
 */
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import {
  listDiscoveryInbox, keepSeparate, mergeInto, publishFromInbox,
  rejectFromInbox, trustSource, pauseSource,
} from '@/lib/import/discovery-actions';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const items = await listDiscoveryInbox(db, 100);
  const pendingBySource = new Map<string, number>();
  for (const item of items) {
    const key = item.opportunity.sourceName ?? 'unknown';
    pendingBySource.set(key, (pendingBySource.get(key) ?? 0) + 1);
  }
  return NextResponse.json({
    items,
    counts: { total: items.length, highConfidence: items.filter((i) => i.match.confidence >= 80).length },
    pendingBySource: Object.fromEntries(pendingBySource),
  });
}

export async function PATCH(request: Request) {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const action = String(body.action ?? '');
  const email = admin.email;

  try {
    switch (action) {
      case 'keep-separate': {
        const observationId = String(body.observationId ?? '');
        if (!observationId) return NextResponse.json({ error: 'observationId required' }, { status: 400 });
        await keepSeparate(db, observationId, email);
        return NextResponse.json({ success: true, action });
      }
      case 'merge': {
        const opportunityId = String(body.opportunityId ?? '');
        const candidateId = String(body.candidateId ?? '');
        if (!opportunityId || !candidateId) {
          return NextResponse.json({ error: 'opportunityId and candidateId required' }, { status: 400 });
        }
        const result = await mergeInto(db, opportunityId, candidateId, email);
        return NextResponse.json({ success: true, action, ...result });
      }
      case 'publish': {
        const opportunityId = String(body.opportunityId ?? '');
        if (!opportunityId) return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
        await publishFromInbox(db, opportunityId, email);
        return NextResponse.json({ success: true, action });
      }
      case 'reject': {
        const opportunityId = String(body.opportunityId ?? '');
        if (!opportunityId) return NextResponse.json({ error: 'opportunityId required' }, { status: 400 });
        await rejectFromInbox(db, opportunityId, email);
        return NextResponse.json({ success: true, action });
      }
      case 'trust-source': {
        const importSourceId = String(body.importSourceId ?? '');
        if (!importSourceId) return NextResponse.json({ error: 'importSourceId required' }, { status: 400 });
        const trustScore = await trustSource(db, importSourceId, email);
        if (trustScore == null) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        return NextResponse.json({ success: true, action, trustScore });
      }
      case 'pause-source': {
        const importSourceId = String(body.importSourceId ?? '');
        if (!importSourceId) return NextResponse.json({ error: 'importSourceId required' }, { status: 400 });
        const paused = await pauseSource(db, importSourceId, email);
        if (!paused) return NextResponse.json({ error: 'Source not found' }, { status: 404 });
        return NextResponse.json({ success: true, action });
      }
      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Action failed';
    const status = /not found/i.test(message) ? 404 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
