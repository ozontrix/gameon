'use client';

/**
 * Feedback — the web twin of the handset app's `accounts/feedback.tsx`: a rating, a
 * topic, the message and the address to reply to, posted to `POST /public/feedback`.
 *
 * The reply address is seeded from the signed-in profile and only becomes the
 * player's own once they type in it, so a re-render can never overwrite what they
 * are typing. A guest may send feedback too — the endpoint is public — so this screen
 * is not gated.
 */

import { useState } from 'react';

import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { useSession } from '@/components/mobile/session-provider';
import {
  Button,
  Card,
  Chip,
  InfoNote,
  Ion,
  TextField,
} from '@/components/mobile/ui';
import { api } from '@/lib/mobile/api-client';
import { Brand, Spacing, Typography } from '@/lib/mobile/theme';

const TOPICS = [
  { key: 'booking', label: 'Booking Issue' },
  { key: 'facility', label: 'Facility & Courts' },
  { key: 'payment', label: 'Payment or Refund' },
  { key: 'app', label: 'App Experience' },
  { key: 'other', label: 'Something Else' },
] as const;

const MESSAGE_MAX_LENGTH = 500;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function FeedbackPage() {
  const { profile, user } = useSession();
  const [topic, setTopic] = useState<string>(TOPICS[0].key);
  const [rating, setRating] = useState(0);
  const [message, setMessage] = useState('');
  /** Null until the player edits it, so the account's own address shows as soon as
   * the profile loads — without an effect re-seeding the field underneath them. */
  const [typedEmail, setTypedEmail] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ ok: boolean; body: string } | null>(null);

  const email = typedEmail ?? profile?.email ?? user?.email ?? '';

  const messageError =
    submitted && message.trim().length < 10
      ? 'Tell us a little more — at least 10 characters'
      : undefined;
  const emailError =
    submitted && !EMAIL_PATTERN.test(email.trim()) ? 'Enter a valid reply email' : undefined;

  /**
   * Sends the note. The message and the reply address are validated first, so the
   * server's rejection is never the first thing the player hears about a typo.
   */
  const submit = async () => {
    if (busy) return;
    setSubmitted(true);
    setNotice(null);
    if (message.trim().length < 10 || !EMAIL_PATTERN.test(email.trim())) return;
    setBusy(true);
    try {
      const result = (await api.post('/public/feedback', {
        topic,
        message: message.trim(),
        replyEmail: email.trim(),
        ...(rating ? { rating } : {}),
      })) as { data?: { id?: string } };
      if (!result.data?.id) throw new Error('Your feedback was not saved. Please try again.');
      setNotice({
        ok: true,
        body: `Your feedback was saved for the GameOn team. Reference: ${result.data.id}`,
      });
      setMessage('');
      setRating(0);
      setSubmitted(false);
    } catch (error) {
      setNotice({
        ok: false,
        body:
          error instanceof Error
            ? error.message
            : 'Could not send feedback. Your message has been kept.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell>
      <ScreenTitle
        title="Feedback"
        subtitle="Tell us what's working and what isn't. Every note reaches the GameOn team."
      />

      <Card style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <span style={{ ...Typography.blockTitle, color: Brand.text, display: 'block' }}>
          How was your experience?
        </span>
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: Spacing.sm,
          }}>
          {[1, 2, 3, 4, 5].map((value) => (
            <Chip
              key={value}
              label={'★'.repeat(value)}
              size="sm"
              selected={rating === value}
              onPress={() => setRating(value)}
            />
          ))}
        </div>
      </Card>

      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.xs }}>
        <span style={{ ...Typography.blockTitle, color: Brand.text, display: 'block' }}>
          What is this about?
        </span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
          {TOPICS.map((item) => (
            <Chip
              key={item.key}
              label={item.label}
              selected={topic === item.key}
              onPress={() => setTopic(item.key)}
            />
          ))}
        </div>
      </div>

      <TextField
        label="Your feedback"
        icon={<Ion name="chatbubbleEllipsesOutline" size={16} color={Brand.accent} />}
        value={message}
        onChange={(text) => setMessage(text.slice(0, MESSAGE_MAX_LENGTH))}
        error={messageError}
        counter={`${message.length}/${MESSAGE_MAX_LENGTH}`}
        placeholder="Share the details…"
        multilineRows={5}
      />

      <TextField
        label="Reply to"
        icon={<Ion name="mailOutline" size={16} color={Brand.accent} />}
        value={email}
        error={emailError}
        onChange={setTypedEmail}
        type="email"
        inputMode="email"
      />

      {notice ? (
        <InfoNote
          title={notice.ok ? 'Feedback sent' : 'Feedback not sent'}
          body={notice.body}
          tone={notice.ok ? 'success' : 'danger'}
        />
      ) : null}

      <Button label="Submit Feedback" onPress={() => void submit()} loading={busy} fullWidth />

      <InfoNote body="Feedback is sent privately to the GameOn team. For urgent booking or payment help, contact info@gameonmultisports.com." />
    </ScreenShell>
  );
}

