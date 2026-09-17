import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { DEFAULT_TIMEZONE, wallClockIn } from '@/lib/utils/date-helpers';
import { BannerForm } from '../banner-form';

export const metadata: Metadata = { title: 'Edit banner' };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** ISO instant → `YYYY-MM-DDTHH:MM` on the venue's clock, for a datetime-local input. */
function toLocalInput(iso: string | null): string {
  if (!iso) return '';
  const { date, time } = wallClockIn(DEFAULT_TIMEZONE, new Date(iso));
  return `${date}T${time.slice(0, 5)}`;
}

export default async function EditBannerPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const { data: banner } = await supabaseAdmin
    .from('home_banners')
    .select('id, placement, title, title_accent, subtitle, badge, image_url, link, sort_order, is_active, starts_at, ends_at')
    .eq('id', id)
    .maybeSingle();
  if (!banner) notFound();

  return (
    <>
      <PageHeader back={{ href: '/admin/banners', label: 'Home banners' }} title="Edit banner" />
      <Card>
        <CardBody>
          <BannerForm
            banner={{
              ...banner,
              placement: banner.placement === 'PROMO' ? 'PROMO' : 'HERO',
              starts_at: toLocalInput(banner.starts_at),
              ends_at: toLocalInput(banner.ends_at),
            }}
          />
        </CardBody>
      </Card>
    </>
  );
}
