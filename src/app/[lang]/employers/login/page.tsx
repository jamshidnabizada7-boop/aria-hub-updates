'use client';

/**
 * Employer login / registration (Phase 12 UI, Phase 13 landing).
 * After success → employer dashboard. Sign-in is required for the dashboard;
 * the anonymous quick-post flow (/employers/post) stays available without an
 * account and is untouched.
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';

export default function EmployerLoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await fetch(`/api/employers/auth/${mode}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'register' ? { email, password, name } : { email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error || `HTTP ${res.status}`);
      toast.success(mode === 'register' ? 'Account created — welcome!' : 'Signed in');
      router.push('/en/employers/dashboard');
      router.refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="mb-1 text-2xl font-bold">
        {mode === 'login' ? 'Employer sign in' : 'Create an employer account'}
      </h1>
      <p className="mb-6 text-sm text-muted-foreground">
        Manage your organization&apos;s jobs on ARIA HUB. No account? The{' '}
        <a className="underline" href="/en/employers/post">quick submission form</a> still works without one.
      </p>

      <div className="space-y-3 rounded-lg border bg-card p-4">
        {mode === 'register' && (
          <Input placeholder="Your name (optional)" value={name} onChange={(e) => setName(e.target.value)} />
        )}
        <Input type="email" placeholder="Work email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" />
        <Input
          type="password" placeholder={mode === 'register' ? 'Password (min 8 characters)' : 'Password'}
          value={password} onChange={(e) => setPassword(e.target.value)}
          autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
          onKeyDown={(e) => { if (e.key === 'Enter' && email && password) void submit(); }}
        />
        <Button className="w-full" disabled={busy || !email || !password} onClick={() => void submit()}>
          {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
        </Button>
        <Button variant="ghost" className="w-full" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account? Register' : 'Already have an account? Sign in'}
        </Button>
      </div>
    </div>
  );
}
