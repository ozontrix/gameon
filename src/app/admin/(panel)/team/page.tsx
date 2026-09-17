import type { Metadata } from 'next';

import { RoleBadge } from '@/components/admin/status';
import { Card, CardBody, CardHeader, EmptyState, PageHeader, Table, Td, Th } from '@/components/admin/ui';
import { formatDateTime } from '@/lib/admin/format';
import { requireAdmin } from '@/lib/admin/session';
import { supabaseAdmin } from '@/lib/db/supabase';
import { AddMemberForm, ResetPasswordForm, RoleForm } from './team-forms';

export const metadata: Metadata = { title: 'Team & roles' };

export default async function TeamPage() {
  const session = await requireAdmin();
  const { data: members, error } = await supabaseAdmin.rpc('admin_team_members');
  if (error) throw error;

  return (
    <>
      <PageHeader
        title="Team & roles"
        description="People who can sign in to this panel. Staff run the front desk; admins also manage venues, pricing, refunds and the team."
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="h-fit">
          <CardHeader title="Add team member" />
          <CardBody>
            <AddMemberForm />
          </CardBody>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader title="Team" description={`${members.length} ${members.length === 1 ? 'person' : 'people'}`} />
          {members.length === 0 ? (
            <EmptyState title="No team members" />
          ) : (
            <Table>
              <thead>
                <tr>
                  <Th>Member</Th>
                  <Th>Last sign-in</Th>
                  <Th>Role</Th>
                  <Th className="text-right">Password</Th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const isSelf = member.id === session.id;
                  return (
                    <tr key={member.id} className="align-top hover:bg-zinc-50">
                      <Td>
                        <div className="font-medium text-zinc-900">
                          {member.full_name || member.email || member.phone}
                          {isSelf ? <span className="ml-2 text-xs font-normal text-zinc-500">(you)</span> : null}
                        </div>
                        <div className="text-xs text-zinc-500">{member.email}</div>
                      </Td>
                      <Td className="text-xs">{member.last_sign_in_at ? formatDateTime(member.last_sign_in_at) : 'Never'}</Td>
                      <Td>{isSelf ? <RoleBadge role={member.role} /> : <RoleForm userId={member.id} role={member.role} />}</Td>
                      <Td className="text-right">
                        {isSelf || !member.email ? (
                          <span className="text-xs text-zinc-400">—</span>
                        ) : (
                          <ResetPasswordForm userId={member.id} email={member.email} />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
          )}
        </Card>
      </div>
    </>
  );
}
