import type { Metadata } from 'next';

import { TournamentForm } from '@/components/admin/event-forms';
import { Card, CardBody, PageHeader } from '@/components/admin/ui';
import { listCatalogOptions } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'Add tournament' };

export default async function NewTournamentPage() {
  await requireAdmin();
  const options = await listCatalogOptions();

  return (
    <>
      <PageHeader
        back={{ href: '/admin/tournaments', label: 'Tournaments' }}
        title="Add tournament"
        description="Create it as a draft, add its photos and sections, then publish when it's ready to take entries."
      />
      <Card className="max-w-3xl">
        <CardBody>
          <TournamentForm courtTypes={options.courtTypes} />
        </CardBody>
      </Card>
    </>
  );
}
