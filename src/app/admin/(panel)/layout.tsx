import { AdminSidebar } from '@/components/admin/sidebar';
import { supabaseAdmin } from '@/lib/db/supabase';
import { requireStaff } from '@/lib/admin/session';

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const session = await requireStaff();

  const { count: refundsPending } =
    session.role === 'ADMIN'
      ? await supabaseAdmin
          .from('bookings')
          .select('id', { count: 'exact', head: true })
          .eq('status', 'CANCELLED')
          .eq('payment_status', 'PAID')
      : { count: 0 };

  return (
    <>
      <AdminSidebar
        user={{ name: session.name, email: session.email, role: session.role }}
        refundsPending={refundsPending ?? 0}
      />
      <main className="lg:pl-64">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</div>
      </main>
    </>
  );
}
