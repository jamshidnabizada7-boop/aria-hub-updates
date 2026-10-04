/**
 * Admin Organizations API (Phase 11).
 * GET   /api/admin/organizations → all orgs with job/source stats
 * PATCH /api/admin/organizations { action, ... }:
 *   edit            { id, patch:{ name, website, careersUrl, organizationType,
 *                     description, logoUrl, country, active, officialDomains } }
 *   verify          { id, method? }
 *   unverify        { id }
 *   merge           { targetId, sourceId }
 *   add-source      { organizationId, name, scraperKey, baseUrl, type?,
 *                     sourceRole?, priority?, scheduleMinutes?, config? }
 *   pause-source    { importSourceId }
 *   resume-source   { importSourceId }
 * (Run-source reuses the existing POST /api/admin/import/run from the panel.)
 */
import { NextResponse } from 'next/server';
import { getCurrentAdmin } from '@/lib/admin-auth';
import { db } from '@/lib/db';
import {
  listOrganizations, listPendingMembers, updateOrganization, setVerified, mergeOrganizations,
  addOfficialSource, setSourcePaused,
} from '@/lib/import/organization-actions';
import { listSuggestions, confirmSuggestion, dismissSuggestion } from '@/lib/import/source-suggestions';
import { evaluateAutoPublishEligibility, setSourceCertification, parseSourceCertification } from '@/lib/import/source-certification';
import { reviewMembership } from '@/lib/employers/membership';

export async function GET() {
  const admin = await getCurrentAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const [organizations, pendingMembers, suggestions] = await Promise.all([
    listOrganizations(db),
    listPendingMembers(db),
    listSuggestions(db),
  ]);
  return NextResponse.json({ organizations, pendingMembers, suggestions });
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
      case 'edit': {
        const id = String(body.id ?? '');
        const patch = (body.patch ?? {}) as Record<string, unknown>;
        if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
        await updateOrganization(db, id, patch, email);
        return NextResponse.json({ success: true, action });
      }
      case 'verify': {
        await setVerified(db, String(body.id ?? ''), true, (body.method as string) ?? 'manual_review', email);
        return NextResponse.json({ success: true, action });
      }
      case 'unverify': {
        await setVerified(db, String(body.id ?? ''), false, null, email);
        return NextResponse.json({ success: true, action });
      }
      case 'merge': {
        const targetId = String(body.targetId ?? '');
        const sourceId = String(body.sourceId ?? '');
        if (!targetId || !sourceId) return NextResponse.json({ error: 'targetId and sourceId required' }, { status: 400 });
        const result = await mergeOrganizations(db, targetId, sourceId, email);
        return NextResponse.json({ success: true, action, ...result });
      }
      case 'add-source': {
        const organizationId = String(body.organizationId ?? '');
        const name = String(body.name ?? '').trim();
        const scraperKey = String(body.scraperKey ?? '').trim();
        const baseUrl = String(body.baseUrl ?? '').trim();
        if (!organizationId || !name || !scraperKey || !baseUrl) {
          return NextResponse.json({ error: 'organizationId, name, scraperKey, baseUrl required' }, { status: 400 });
        }
        const id = await addOfficialSource(db, organizationId, {
          name, scraperKey, baseUrl,
          type: (body.type as string) || undefined,
          sourceRole: (body.sourceRole as string) || undefined,
          priority: body.priority != null ? Number(body.priority) : undefined,
          scheduleMinutes: body.scheduleMinutes != null ? Number(body.scheduleMinutes) : undefined,
          config: (body.config as Record<string, unknown>) || undefined,
        }, email);
        return NextResponse.json({ success: true, action, id });
      }
      case 'pause-source': {
        await setSourcePaused(db, String(body.importSourceId ?? ''), true, email);
        return NextResponse.json({ success: true, action });
      }
      case 'resume-source': {
        await setSourcePaused(db, String(body.importSourceId ?? ''), false, email);
        return NextResponse.json({ success: true, action });
      }
      case 'confirm-suggestion': {
        const suggestionId = String(body.suggestionId ?? '');
        if (!suggestionId) return NextResponse.json({ error: 'suggestionId required' }, { status: 400 });
        const result = await confirmSuggestion(db, suggestionId, email, body.organizationName ? String(body.organizationName) : undefined);
        return NextResponse.json({ success: true, action, ...result });
      }
      case 'dismiss-suggestion': {
        const suggestionId = String(body.suggestionId ?? '');
        if (!suggestionId) return NextResponse.json({ error: 'suggestionId required' }, { status: 400 });
        await dismissSuggestion(db, suggestionId, email);
        return NextResponse.json({ success: true, action });
      }
      case 'set-certification': {
        // PHASE 11: admin certification (testing/reviewed/trusted/paused) —
        // explicitly separate from autoPublish.
        const importSourceId = String(body.importSourceId ?? '');
        const certification = String(body.certification ?? '');
        if (!importSourceId || !certification) return NextResponse.json({ error: 'importSourceId and certification required' }, { status: 400 });
        const cert = parseSourceCertification(certification);
        if (!cert) return NextResponse.json({ error: 'certification must be testing/reviewed/trusted/paused' }, { status: 400 });
        await setSourceCertification(db, importSourceId, cert, email);
        return NextResponse.json({ success: true, action });
      }
      case 'auto-publish-eligibility': {
        // PHASE 23: compute the eligibility snapshot; admin still must
        // explicitly flip autoPublish — nothing is enabled by computing.
        const importSourceId = String(body.importSourceId ?? '');
        const snapshot = await evaluateAutoPublishEligibility(db, importSourceId);
        return NextResponse.json({ success: true, action, snapshot });
      }
      case 'approve-member':
      case 'reject-member': {
        const memberId = String(body.memberId ?? '');
        if (!memberId) return NextResponse.json({ error: 'memberId required' }, { status: 400 });
        await reviewMembership(db, memberId, action === 'approve-member', email);
        return NextResponse.json({ success: true, action });
      }
      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Action failed';
    const status = /not found|itself/i.test(message) ? 404 : 400;
    return NextResponse.json({ error: message }, { status: /no editable fields|Invalid/.test(message) ? 400 : status });
  }
}
