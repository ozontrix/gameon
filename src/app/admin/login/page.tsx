import type { Metadata } from 'next';

import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-go-black px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-2xl font-bold tracking-wider text-white">
            GAME<span className="text-go-brand">ON</span>
          </p>
          <p className="mt-2 text-sm text-zinc-400">Sign in to the admin panel</p>
        </div>
        <div className="rounded-2xl bg-white p-6 shadow-xl">
          <LoginForm next={next} />
        </div>
        <p className="mt-6 text-center text-xs text-zinc-500">
          Access is limited to GameOn staff. Ask an admin to add you to the team.
        </p>
      </div>
    </div>
  );
}
