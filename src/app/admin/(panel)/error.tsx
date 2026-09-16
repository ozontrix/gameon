'use client';

import { useEffect } from 'react';

import { buttonClass } from '@/components/admin/ui';

export default function PanelError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[admin] page error', error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg rounded-xl border border-red-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-950">Something went wrong</h1>
      <p className="mt-2 text-sm text-zinc-600">
        This page could not be loaded. Try again; if it keeps happening, share the reference below with the developer.
      </p>
      {error.digest ? <p className="mt-2 font-mono text-xs text-zinc-500">Ref: {error.digest}</p> : null}
      <button type="button" onClick={reset} className={buttonClass('primary', 'md', 'mt-4')}>
        Try again
      </button>
    </div>
  );
}
