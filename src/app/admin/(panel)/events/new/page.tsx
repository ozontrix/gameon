import type { Metadata } from 'next';

import { EventForm } from '@/components/admin/event-forms';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Add event' };

export default async function NewEventPage() {
  await requireAdmin();
  const options = await listCatalogOptions();

  return (
    <>
      <PageHeader
        back={{ href: '/admin/events', label: 'Events' }}
        title="Add event"
        description="Create it as a draft, add its photos and sections, then publish when it's ready to sell tickets."
      />
      <Card className="max-w-3xl">
        <CardBody>
          <EventForm venues={options.venues} sports={options.sports} />
        </CardBody>
      </Card>
    </>
  );
}
