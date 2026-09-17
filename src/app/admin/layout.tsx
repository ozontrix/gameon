import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: {
    template: '%s · GameOn Admin',
    default: 'GameOn Admin',
  },
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // `isolate` keeps the marketing site's fixed background glow underneath the panel.
  return <div className="relative isolate min-h-screen bg-zinc-50 font-sans text-zinc-900">{children}</div>;
}
