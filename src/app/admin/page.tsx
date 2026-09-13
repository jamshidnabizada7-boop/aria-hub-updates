import { getCurrentAdmin } from '@/lib/admin-auth';
import { AdminApp } from './admin-app';
import { LoginForm } from './login-form';

export const metadata = {
  title: 'Admin Dashboard — ARIA HUB',
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const admin = await getCurrentAdmin();
  if (!admin) {
    return <AdminLogin />;
  }

  // Get list of models for the sidebar
  return <AdminApp admin={{ id: admin.id, email: admin.email, name: admin.name, role: admin.role }} />;
}

function AdminLogin() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/10 via-background to-chart-2/10 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-primary to-chart-2 text-xl font-black text-primary-foreground shadow-float">
            A
          </div>
          <h1 className="text-2xl font-bold">ARIA HUB Admin</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to manage your website</p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
