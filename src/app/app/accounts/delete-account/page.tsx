'use client';

/**
 * Delete Account — the web twin of the handset app's `accounts/delete-account.tsx`.
 *
 * Deletion is a request, not an immediate wipe: it goes to
 * `POST /user/account-deletion` and is processed by the team inside 30 days. Google
 * Play and the App Store both require this to exist in-app for any app that creates
 * accounts, which is why the row sits on the Account tab rather than only on the
 * marketing site.
 */

import { useState } from 'react';

import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { useSession } from '@/components/mobile/session-provider';
import { Button, InfoNote, SignInGate, TextField } from '@/components/mobile/ui';
import { api } from '@/lib/mobile/api-client';

export default function DeleteAccountPage() {
  const { user, isGuest } = useSession();
  const [confirmation, setConfirmation] = useState('');
  const [replyEmail, setReplyEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [reference, setReference] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (busy || reference || confirmation !== 'DELETE') return;
    setBusy(true);
    setError(null);
    try {
      const result = (await api.post('/user/account-deletion', {
        confirmation,
        replyEmail: replyEmail.trim(),
      })) as { data?: { id?: string } };
      if (!result.data?.id) {
        throw new Error('The server did not return a request reference. Please try again.');
      }
      setReference(result.data.id);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Your request could not be saved.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenTitle
        title="Delete Account"
        subtitle="Delete your GameOn account and associated personal data, not just sign out."
      />

      {isGuest || !user ? (
        <SignInGate
          title="Sign in to delete your account"
          body="Sign in to the account you want deleted so we can verify it belongs to you."
        />
      ) : (
        <>
          <InfoNote
            title="Before you confirm"
            body="Deletion is processed by our team within 30 days. Your account is not deleted immediately. Your profile, photo, sessions and associated personal data will be removed, except records we must retain for legal, payment or fraud-prevention obligations. Deleting your account is not a booking cancellation or a refund request. Check outstanding bookings and contact us about unresolved payments before proceeding. No phone call or email is required to submit this request."
          />

          {reference ? (
            <InfoNote
              tone="success"
              title="Deletion request saved"
              body={`Reference: ${reference}. Keep this reference. Our team will confirm completion using your verified sign-in contact or the reply email you supplied. You can still use your account until deletion is processed.`}
            />
          ) : (
            <>
              <TextField
                label="Reply email (optional)"
                value={replyEmail}
                onChange={setReplyEmail}
                type="email"
                inputMode="email"
                placeholder="For completion confirmation"
              />
              <TextField
                label="Type DELETE to confirm"
                value={confirmation}
                onChange={setConfirmation}
                autoComplete="off"
                placeholder="DELETE"
              />
              {error ? <InfoNote tone="danger" title="Request not saved" body={error} /> : null}
              <Button
                label="Request Account Deletion"
                variant="danger"
                loading={busy}
                disabled={confirmation !== 'DELETE'}
                onPress={() => void submit()}
                fullWidth
              />
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}
