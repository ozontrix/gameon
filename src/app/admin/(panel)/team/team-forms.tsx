'use client';

import { useRef, useState } from 'react';

import { ActionForm, FieldError, FormMessage, SubmitButton } from '@/components/admin/action-form';
import { buttonClass, inputClass } from '@/components/admin/ui';
import { addTeamMember, changeTeamRole, resetTeamPassword, type TeamCredentials } from '@/lib/admin/actions/team';

function Credentials({ credentials, onDone }: { credentials: TeamCredentials; onDone: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950">
      <p className="font-semibold">Share these sign-in details privately</p>
      <dl className="space-y-1">
        <div className="flex gap-2">
          <dt className="w-20 text-amber-800">Email</dt>
          <dd className="font-mono">{credentials.email}</dd>
        </div>
        <div className="flex gap-2">
          <dt className="w-20 text-amber-800">Password</dt>
          <dd className="font-mono select-all">{credentials.temporaryPassword}</dd>
        </div>
      </dl>
      <p className="text-xs text-amber-800">
        This password is shown only once. Ask them to change it under My account after signing in at /admin/login.
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          className={buttonClass('secondary', 'sm')}
          onClick={() => {
            void navigator.clipboard?.writeText(`Email: ${credentials.email}\nPassword: ${credentials.temporaryPassword}`);
            setCopied(true);
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
        <button type="button" className={buttonClass('ghost', 'sm')} onClick={onDone}>
          Done
        </button>
      </div>
    </div>
  );
}

export function AddMemberForm() {
  const [credentials, setCredentials] = useState<TeamCredentials | null>(null);

  if (credentials) return <Credentials credentials={credentials} onDone={() => setCredentials(null)} />;

  return (
    <ActionForm<TeamCredentials>
      action={addTeamMember}
      resetOnSuccess
      onSuccess={(state) => {
        if (state.data) setCredentials(state.data);
      }}
      className="space-y-3"
    >
      <FormMessage />
      <div className="space-y-1.5">
        <label htmlFor="member-email" className="block text-sm font-medium text-zinc-800">
          Email
        </label>
        <input id="member-email" name="email" type="email" autoComplete="off" className={inputClass} />
        <FieldError name="email" />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="member-name" className="block text-sm font-medium text-zinc-800">
          Full name
        </label>
        <input id="member-name" name="fullName" autoComplete="off" className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="member-role" className="block text-sm font-medium text-zinc-800">
          Role
        </label>
        <select id="member-role" name="role" defaultValue="STAFF" className={inputClass}>
          <option value="STAFF">Staff — front desk: schedule, bookings, check-in, customers</option>
          <option value="ADMIN">Admin — everything, including venues, pricing, refunds and team</option>
        </select>
        <FieldError name="role" />
      </div>
      <p className="text-xs text-zinc-500">
        If the email already has a GameOn account, it keeps its password. Otherwise an account is created with a one-time password.
      </p>
      <SubmitButton className="w-full">Add to team</SubmitButton>
    </ActionForm>
  );
}

export function RoleForm({ userId, role, disabled }: { userId: string; role: string; disabled?: boolean }) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <ActionForm action={changeTeamRole} className="flex items-center gap-2">
      <input type="hidden" name="userId" value={userId} />
      <select
        name="role"
        defaultValue={role}
        disabled={disabled}
        className={`${inputClass} h-8 w-32`}
        aria-label="Role"
        onChange={(event) => {
          if (event.target.value === 'NONE' && !window.confirm('Remove this person’s access to the admin panel?')) {
            event.target.value = role;
            return;
          }
          formRef.current = event.target.form;
          event.target.form?.requestSubmit();
        }}
      >
        <option value="STAFF">Staff</option>
        <option value="ADMIN">Admin</option>
        <option value="NONE">Remove access</option>
      </select>
    </ActionForm>
  );
}

export function ResetPasswordForm({ userId, email }: { userId: string; email: string }) {
  const [credentials, setCredentials] = useState<TeamCredentials | null>(null);

  if (credentials) {
    return (
      <div className="mt-3">
        <Credentials credentials={credentials} onDone={() => setCredentials(null)} />
      </div>
    );
  }

  return (
    <ActionForm<TeamCredentials>
      action={resetTeamPassword}
      onSuccess={(state) => {
        if (state.data) setCredentials(state.data);
      }}
    >
      <input type="hidden" name="userId" value={userId} />
      <button
        type="submit"
        className={buttonClass('ghost', 'sm')}
        onClick={(event) => {
          if (!window.confirm(`Reset the password for ${email}? Their current password stops working.`)) event.preventDefault();
        }}
      >
        Reset password
      </button>
    </ActionForm>
  );
}
