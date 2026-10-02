'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { CircleCheck, CircleAlert, Mail } from 'lucide-react';

type ConfirmationStatus = 'checking' | 'verified' | 'error' | 'missing';

export function EmailConfirmationResult() {
  const [status, setStatus] = useState<ConfirmationStatus>('checking');
  const callbackParams = useRef<URLSearchParams | null>(null);

  useEffect(() => {
    let active = true;
    // Keep the original callback across Strict Mode effect re-runs, but remove
    // credentials from the address bar. Never persist a player session here.
    if (!callbackParams.current) {
      const params = new URLSearchParams(window.location.search);
      new URLSearchParams(window.location.hash.slice(1)).forEach((value, key) => {
        params.set(key, value);
      });
      callbackParams.current = params;
      window.history.replaceState(window.history.state, '', window.location.pathname);
    }
    const params = callbackParams.current;

    async function readConfirmation(): Promise<ConfirmationStatus> {
      if (params.has('error') || params.has('error_code')) return 'error';

      const accessToken = params.get('access_token');
      if (!accessToken) return 'missing';

      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      if (!url || !key) return 'error';

      // Supabase verifies the email before redirecting. Validate its returned
      // token instead of showing success just because this page was visited.
      const { createClient } = await import('@supabase/supabase-js');
      const supabase = createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      });
      const { data, error } = await supabase.auth.getUser(accessToken);
      return !error && data.user?.email_confirmed_at ? 'verified' : 'error';
    }

    void readConfirmation()
      .then((result) => { if (active) setStatus(result); })
      .catch(() => { if (active) setStatus('error'); });

    return () => { active = false; };
  }, []);

  const content = {
    checking: {
      title: 'Checking your confirmation…',
      message: 'Please wait while we check your email verification.',
      icon: Mail,
    },
    verified: {
      title: 'Your account is successfully verified.',
      message: 'Please continue in-app. Open the GameOn app and sign in with your email and password.',
      icon: CircleCheck,
    },
    error: {
      title: 'Unable to confirm this link.',
      message: 'This link may have expired or already been used, or we could not check it. Try signing in to the GameOn app. If your email is still unverified, request a new confirmation email in the app.',
      icon: CircleAlert,
    },
    missing: {
      title: 'Email verification',
      message: 'Open the confirmation link sent to your email. If you have already verified your account, please continue in the GameOn app and sign in.',
      icon: Mail,
    },
  }[status];
  const Icon = content.icon;

  return (
    <main className="flex min-h-dvh items-center justify-center bg-go-black px-5 py-12">
      <section className="w-full max-w-lg rounded-3xl border border-white/10 bg-go-navy p-7 text-center sm:p-10">
        <Image src="/game_on.png" alt="GameOn Multisports" width={160} height={64} className="mx-auto h-16 w-auto object-contain" priority />
        <div role="status" aria-live="polite" aria-busy={status === 'checking'} className="mt-8">
          <Icon className="mx-auto h-14 w-14 text-go-brand" aria-hidden="true" />
          <h1 className="mt-6 text-3xl font-semibold leading-tight text-go-white">{content.title}</h1>
          <p className="mt-4 text-base leading-relaxed text-go-off/80">{content.message}</p>
        </div>
        <p className="mt-6 text-sm text-go-off/65">You can close this browser tab and return to the app.</p>
        <Link href="/" className="mt-8 inline-flex min-h-11 items-center justify-center rounded-full border border-white/20 px-6 text-sm font-semibold text-go-white transition-colors hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand">
          Visit GameOn website
        </Link>
      </section>
    </main>
  );
}