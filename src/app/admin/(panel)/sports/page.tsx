import type { Metadata } from 'next';

import { ActionForm, FieldError, SubmitButton } from '@/components/admin/action-form';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, checkboxClass, inputClass } from '@/components/admin/ui';
import { saveSport } from '@/lib/admin/actions/catalog';
import { listSports } from '@/lib/admin/queries/catalog';
import { requireAdmin } from '@/lib/admin/session';
import { SportImageForm } from './sport-image-form';

export const metadata: Metadata = { title: 'Sports' };

export default async function SportsPage() {
  await requireAdmin();
  const sports = await listSports();

  return (
    <>
      <PageHeader
        title="Sports"
        description="Sports group courts in the app. An inactive sport stays attached to its courts but is hidden from the public sports list."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Add sport" />
          <CardBody>
            <ActionForm action={saveSport} resetOnSuccess className="space-y-3">
              <div className="space-y-1.5">
                <label htmlFor="new-sport" className="block text-sm font-medium text-zinc-800">
                  Name
                </label>
                <input id="new-sport" name="name" placeholder="e.g. Table Tennis" className={inputClass} />
                <FieldError name="name" />
              </div>
              <input type="hidden" name="is_active" value="on" />
              <SubmitButton className="w-full">Add sport</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="All sports" />
          {sports.length === 0 ? (
            <EmptyState title="No sports yet" />
          ) : (
            <ul className="divide-y divide-zinc-100">
              {sports.map((sport) => (
                <li key={sport.id} className="px-5 py-3">
                  <ActionForm action={saveSport} className="flex flex-wrap items-center gap-3">
                    <input type="hidden" name="id" value={sport.id} />
                    <div className="min-w-48 flex-1">
                      <input name="name" defaultValue={sport.name} className={inputClass} aria-label={`Name of ${sport.name}`} />
                      <FieldError name="name" />
                    </div>
                    <span className="w-20 text-sm text-zinc-500 tabular-nums">
                      {sport.courtCount} {sport.courtCount === 1 ? 'court' : 'courts'}
                    </span>
                    <label className="flex items-center gap-2 text-sm text-zinc-700">
                      <input type="checkbox" name="is_active" defaultChecked={sport.is_active !== false} className={checkboxClass} />
                      Active
                    </label>
                    <SubmitButton variant="secondary" size="sm">
                      Save
                    </SubmitButton>
                  </ActionForm>
                  <div className="mt-2">
                    <SportImageForm sportId={sport.id} sportName={sport.name} imageUrl={sport.image_url} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}
