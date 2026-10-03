/**
 * Employer job actions API (Phase 13) — ownership-enforced per job.
 * PATCH /api/employers/jobs/[id] { action: edit|close|reopen|extend|duplicate, … }
 */
import { NextResponse } from 'next/server';
import { employerFromRequest } from '@/lib/employer-auth';
import { updateJob, setJobClosed, extendJobDeadline, duplicateJob } from '@/lib/employers/jobs';
import { db } from '@/lib/db';

export async function PATCH(request: Request, ctx: { params: Promise<{ id: string }> }) {
  const employer = await employerFromRequest(request);
  if (!employer) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await ctx.params;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const action = String(body.action ?? '');

  try {
    switch (action) {
      case 'edit': {
        await updateJob(db, employer.id, id, {
          title: body.title != null ? String(body.title) : undefined,
          description: body.description != null ? String(body.description) : undefined,
          deadline: body.deadline !== undefined ? (body.deadline ? String(body.deadline) : null) : undefined,
          location: body.location !== undefined ? (body.location ? String(body.location) : null) : undefined,
          salary: body.salary !== undefined ? (body.salary ? String(body.salary) : null) : undefined,
          jobType: body.jobType !== undefined ? (body.jobType ? String(body.jobType) : null) : undefined,
          applyUrl: body.applyUrl !== undefined ? (body.applyUrl ? String(body.applyUrl) : null) : undefined,
          applyEmail: body.applyEmail != null ? String(body.applyEmail) : undefined,
        });
        return NextResponse.json({ success: true, action });
      }
      case 'close': {
        await setJobClosed(db, employer.id, id, true);
        return NextResponse.json({ success: true, action });
      }
      case 'reopen': {
        await setJobClosed(db, employer.id, id, false);
        return NextResponse.json({ success: true, action });
      }
      case 'extend': {
        await extendJobDeadline(db, employer.id, id, String(body.deadline ?? ''));
        return NextResponse.json({ success: true, action });
      }
      case 'duplicate': {
        const copy = await duplicateJob(db, employer.id, id);
        return NextResponse.json({ success: true, action, ...copy });
      }
      default:
        return NextResponse.json({ error: `Unknown action "${action}"` }, { status: 400 });
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Action failed';
    return NextResponse.json({ error: message }, { status: /not found|access/i.test(message) ? 404 : 400 });
  }
}
