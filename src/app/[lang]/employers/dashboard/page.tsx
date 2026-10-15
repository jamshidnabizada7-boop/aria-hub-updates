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

export default async function EmployerDashboardPage({params,searchParams}:{params:Promise<{lang:string}>;searchParams:Promise<{claim?:string}>}) {
  const raw=await params;const lang=raw.lang==='fa'||raw.lang==='ps'?raw.lang:'en';
  const query=await searchParams;
  const initialClaim=String(query.claim||'').slice(0,200);
  const store = await cookies();
  const employer = await getCurrentEmployer(store.get('aria-employer-session')?.value);
  if (!employer) redirect('/'+lang+'/employers/login'+(initialClaim?'?claim='+encodeURIComponent(initialClaim):''));

  const organizations = await myOrganizations(db, employer.id);
  return <EmployerDashboard initialClaim={initialClaim} lang={lang} userName={employer.name ?? employer.email} organizations={organizations} />;
}
