import { LinkButton } from '@/components/admin/ui';

export default function PanelNotFound() {
  return (
    <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-6 text-center shadow-sm">
      <h1 className="text-lg font-semibold text-zinc-950">Not found</h1>
      <p className="mt-2 text-sm text-zinc-600">That record doesn&apos;t exist, or it was removed.</p>
      <LinkButton href="/admin" className="mt-4">
        Back to dashboard
      </LinkButton>
    </div>
  );
}
