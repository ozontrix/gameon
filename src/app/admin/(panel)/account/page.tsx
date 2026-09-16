import type { Metadata } from 'next';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { RoleBadge } from '@/components/admin/status';
import { Card, CardBody, CardHeader, DetailList, PageHeader, inputClass } from '@/components/admin/ui';
import { changeOwnPassword } from '@/lib/admin/actions/account';
import { requireStaff } from '@/lib/admin/session';

export const metadata: Metadata = { title: 'My account' };

export default async function AccountPage() {
  const session = await requireStaff();

  return (
    <>
      <PageHeader title="My account" />
      <div className="grid max-w-4xl gap-4 lg:grid-cols-2">
        <Card className="h-fit">
          <CardHeader title="Profile" />
          <CardBody>
            <DetailList
              items={[
                { label: 'Name', value: session.name },
                { label: 'Email', value: session.email },
                { label: 'Role', value: <RoleBadge role={session.role} /> },
              ]}
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Change password" description="At least 10 characters, with upper- and lowercase letters and a number." />
          <CardBody>
            <ActionForm action={changeOwnPassword} resetOnSuccess className="space-y-3">
              <FormMessage />
              <div className="space-y-1.5">
                <label htmlFor="currentPassword" className="block text-sm font-medium text-zinc-800">
                  Current password
                </label>
                <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" className={inputClass} />
                <FieldError name="currentPassword" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="newPassword" className="block text-sm font-medium text-zinc-800">
                  New password
                </label>
                <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" className={inputClass} />
                <FieldError name="newPassword" />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-zinc-800">
                  Repeat new password
                </label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" className={inputClass} />
                <FieldError name="confirmPassword" />
              </div>
              <SubmitButton>Change password</SubmitButton>
            </ActionForm>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
