import type { Metadata } from 'next';

import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';
import { BannerForm } from '../banner-form';

export const metadata: Metadata = { title: 'Add banner' };

export default async function NewBannerPage() {
  await requireAdmin();

  return (
    <>
      <PageHeader back={{ href: '/admin/banners', label: 'Home banners' }} title="Add banner" />
      <Card>
        <CardBody>
          <BannerForm />
        </CardBody>
      </Card>
    </>
  );
}
