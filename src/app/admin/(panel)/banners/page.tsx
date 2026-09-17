import { Plus } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { ConfirmAction } from '@/components/admin/confirm-action';
import { Badge, type BadgeTone, Card, CardHeader, EmptyState, LinkButton, Notice, PageHeader } from '@/components/admin/ui';
import { deleteBanner } from '@/lib/admin/actions/content';
import { formatDateTime } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';

export const metadata: Metadata = { title: 'Home banners' };

type Banner = {
  id: string;
  placement: string;
  title: string;
  title_accent: string | null;
  subtitle: string | null;
  badge: string | null;
  image_url: string | null;
  link: string | null;
  sort_order: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
};

function status(banner: Banner, now: string): { label: string; tone: BadgeTone } {
  if (!banner.is_active) return { label: 'Off', tone: 'neutral' };
  if (banner.starts_at && banner.starts_at > now) return { label: 'Scheduled', tone: 'blue' };
  if (banner.ends_at && banner.ends_at <= now) return { label: 'Ended', tone: 'neutral' };
  return { label: 'Live', tone: 'green' };
}

function BannerList({ banners, now }: { banners: Banner[]; now: string }) {
  if (banners.length === 0) return <EmptyState title="None yet" description="This section is hidden in the app until a banner is live." />;

  return (
    <ul className="divide-y divide-zinc-100">
      {banners.map((banner) => {
        const state = status(banner, now);
        return (
          <li key={banner.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center">
            <div className="h-16 w-32 shrink-0 overflow-hidden rounded-lg bg-zinc-100">
              {banner.image_url ? (
                // eslint-disable-next-line @next/next/no-img-element -- uploaded or remote URL chosen by the admin
                <img src={banner.image_url} alt="" className="size-full object-cover" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Link href={`/admin/banners/${banner.id}`} className="font-medium text-zinc-950 hover:underline">
                  {banner.title} {banner.placement === 'HERO' ? banner.title_accent : null}
                </Link>
                <Badge tone={state.tone}>{state.label}</Badge>
                {banner.badge ? <Badge tone="amber">{banner.badge}</Badge> : null}
              </div>
              <p className="truncate text-sm text-zinc-500">{banner.subtitle}</p>
              <p className="text-xs text-zinc-500">
                Order {banner.sort_order} · opens {banner.link ?? 'nothing'}
                {banner.starts_at ? ` · from ${formatDateTime(banner.starts_at)}` : ''}
                {banner.ends_at ? ` · until ${formatDateTime(banner.ends_at)}` : ''}
              </p>
            </div>
            <div className="flex shrink-0 gap-2">
              <LinkButton href={`/admin/banners/${banner.id}`} variant="secondary" size="sm">
                Edit
              </LinkButton>
              <ConfirmAction
                action={deleteBanner}
                hidden={{ id: banner.id }}
                trigger="Delete"
                title="Delete this banner?"
                description="It disappears from the app, and its uploaded image is deleted."
                confirmLabel="Delete banner"
                confirmVariant="danger"
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

export default async function BannersPage({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  await requireAdmin();
  const { created } = await searchParams;

  const { data, error } = await supabaseAdmin
    .from('home_banners')
    .select('id, placement, title, title_accent, subtitle, badge, image_url, link, sort_order, is_active, starts_at, ends_at')
    .order('placement')
    .order('sort_order')
    .order('created_at');
  if (error) throw error;

  const now = new Date().toISOString();
  const hero = data.filter((banner) => banner.placement === 'HERO');
  const promo = data.filter((banner) => banner.placement === 'PROMO');

  return (
    <>
      <PageHeader
        title="Home banners"
        description="The hero carousel and promo card at the top of the app's Home screen."
        actions={
          <LinkButton href="/admin/banners/new">
            <Plus className="size-4" aria-hidden /> Add banner
          </LinkButton>
        }
      />
      <div className="mb-4 space-y-3">
        {created ? <Notice tone="success">Banner created.</Notice> : null}
        <Notice tone="info">Changes reach the app within about a minute. Only live banners are shown, in order.</Notice>
      </div>
      <div className="space-y-4">
        <Card>
          <CardHeader title="Hero slides" description={`${hero.length} total`} />
          <BannerList banners={hero} now={now} />
        </Card>
        <Card>
          <CardHeader title="Promo cards" description="The app shows the first live one." />
          <BannerList banners={promo} now={now} />
        </Card>
      </div>
    </>
  );
}
