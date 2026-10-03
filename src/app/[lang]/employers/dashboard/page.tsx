import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getCurrentEmployer } from '@/lib/employer-auth';
import { myOrganizations } from '@/lib/employers/membership';
import { db } from '@/lib/db';
import { EmployerDashboard } from '@/components/employers/dashboard';

/**
 * Employer dashboard (Phase 13) — overview, jobs (active / pending / closed),
 * post job, organization profile and team. Requires an employer session;
 * the anonymous quick-post flow stays untouched at /employers/post.
 */
export const dynamic = 'force-dynamic';

export default async function EmployerDashboardPage() {
  const store = await cookies();
  const employer = await getCurrentEmployer(store.get('aria-employer-session')?.value);
  if (!employer) redirect('/en/employers/login');

  const organizations = await myOrganizations(db, employer.id);
  return <EmployerDashboard userName={employer.name ?? employer.email} organizations={organizations} />;
}
