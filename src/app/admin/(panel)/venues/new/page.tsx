import type { Metadata } from 'next';

import { VenueForm } from '@/components/admin/catalog-forms';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Add venue' };

export default async function NewVenuePage() {
  await requireAdmin();

  return (
    <>
      <PageHeader
        back={{ href: '/admin/venues', label: 'Venues' }}
        title="Add venue"
        description="After creating the venue, set its opening hours and add courts."
      />
      <Card className="max-w-2xl">
        <CardBody>
          <VenueForm />
        </CardBody>
      </Card>
    </>
  );
}
