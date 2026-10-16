'use client';

/**
 * Profile Management — the web twin of the handset app's
 * `accounts/profile-management.tsx`.
 *
 * `GET /user/profile` creates the row when the trigger never did, so the only
 * reasons to be here without one are a slow first load or a failed read. The form is
 * mounted with a `key` of the profile id: its state is seeded from the row exactly
 * once and never re-seeded underneath an edit.
 *
 * Platform substitutions: a browser has a real file input, so the photo is chosen
 * with `<input type="file">` rather than the image picker, and the date field is a
 * native date input inside the same sheet the handset opens.
 */

import { useRef, useState } from 'react';

import { FieldRow } from '@/components/mobile/accounts/field-row';
import { ScreenShell } from '@/components/mobile/accounts/screen-shell';
import { ScreenTitle } from '@/components/mobile/accounts/screen-title';
import { useSession } from '@/components/mobile/session-provider';
import {
  BottomSheet,
  Button,
  Card,
  Chip,
  InfoNote,
  Ion,
  RemoteImage,
  SignInGate,
  TextLink,
} from '@/components/mobile/ui';
import { SPORT_LABELS, type SportKind } from '@/lib/mobile/constants/sports';
import {
  saveMyProfile,
  uploadProfilePhoto,
  type Profile,
  type ProfilePatch,
} from '@/lib/mobile/profiles';
import { Brand, Radius, Spacing, Typography } from '@/lib/mobile/theme';

/** Which picker sheet is showing. */
type OpenSheet = 'dob' | 'gender' | 'city' | 'sports' | null;

const GENDERS = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const CITIES = ['Gurgaon', 'Delhi', 'Noida', 'Faridabad', 'Ghaziabad'];

const SPORTS = Object.keys(SPORT_LABELS) as SportKind[];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/**
 * The picker works in `"15 Aug 1995"`; the API stores `YYYY-MM-DD`. Converting at
 * the boundary keeps the stored form canonical without teaching the picker a second
 * format.
 */
function isoToDisplay(iso: string | null): string {
  if (!iso) return '';
  const [year, month, day] = iso.split('-').map(Number);
  if (!year || !month || !day) return '';
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

function displayToIso(display: string): string | null {
  const match = /^(\d{1,2})\s+([A-Za-z]{3})\s+(\d{4})$/.exec(display.trim());
  if (!match) return null;
  const month = MONTHS.indexOf(match[2]) + 1;
  if (month === 0) return null;
  return `${match[3]}-${String(month).padStart(2, '0')}-${String(Number(match[1])).padStart(2, '0')}`;
}

/** "Member since May 2025" — the row's own creation date, not a fixture. */
function memberSince(createdAt: string | null): string {
  if (!createdAt) return '—';
  const at = new Date(createdAt);
  if (Number.isNaN(at.getTime())) return '—';
  return `${MONTHS[at.getMonth()]} ${at.getFullYear()}`;
}

/** What a native `<input type="date">` wants, from the stored `YYYY-MM-DD`. */
function isoForInput(iso: string | null): string {
  return /^\d{4}-\d{2}-\d{2}$/.test(iso ?? '') ? (iso as string) : '';
}

export default function ProfileManagementPage() {
  const { isGuest, profile, profileLoading, profileError, refreshProfile, user } = useSession();

  if (isGuest) {
    return (
      <ScreenShell>
        <SignInGate
          title="Sign in to manage your profile"
          body="Create an account to save your details and preferred sports."
        />
      </ScreenShell>
    );
  }

  if (!profile) {
    return (
      <ScreenShell>
        <ScreenTitle
          title="Profile Management"
          subtitle="Manage and update your personal details"
        />
        <InfoNote
          title={profileLoading ? 'Loading your profile…' : "Couldn't load your profile"}
          body={
            profileLoading
              ? 'Fetching your saved details.'
              : (profileError ?? 'Please try again in a moment.')
          }
          tone={profileLoading ? undefined : 'danger'}
        />
        {!profileLoading ? (
          <Button label="Try again" variant="secondary" size="md" onPress={refreshProfile} fullWidth />
        ) : null}
      </ScreenShell>
    );
  }

  return (
    <ProfileForm
      key={profile.id}
      profile={profile}
      fallbackName={user?.fullName ?? ''}
      onSaved={refreshProfile}
    />
  );
}

/**
 * The form itself, mounted with a `key` of the profile id so its state is seeded
 * from the row exactly once and never re-seeded underneath an edit.
 */
function ProfileForm({
  profile,
  fallbackName,
  onSaved,
}: {
  profile: Profile;
  fallbackName: string;
  onSaved: () => void;
}) {
  const initial = {
    fullName: profile.full_name ?? '',
    email: profile.email ?? '',
    phone: profile.phone ?? '',
    dob: isoToDisplay(profile.date_of_birth),
    dobIso: isoForInput(profile.date_of_birth),
    gender: profile.gender ?? '',
    city: profile.city ?? '',
    sports: (profile.preferred_sports ?? []).filter(
      (sport): sport is SportKind => sport in SPORT_LABELS,
    ),
  };

  const [fullName, setFullName] = useState(initial.fullName);
  const [email, setEmail] = useState(initial.email);
  const [phone, setPhone] = useState(initial.phone);
  const [photo, setPhoto] = useState<{ path: string | null; url: string | null } | null>(null);
  const avatarUrl = photo && photo.path !== profile.avatar_path ? photo.url : profile.avatarUrl;
  const [uploading, setUploading] = useState(false);
  const emailLocked = profile.loginProvider === 'email';
  const phoneLocked = profile.loginProvider === 'phone';
  const [dob, setDob] = useState(initial.dob);
  const [gender, setGender] = useState(initial.gender);
  const [city, setCity] = useState(initial.city);
  const [sports, setSports] = useState<SportKind[]>(initial.sports);
  /** The last saved values, so only genuine changes are sent. */
  const [baseline, setBaseline] = useState(initial);

  const [sheet, setSheet] = useState<OpenSheet>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{
    tone: 'success' | 'danger';
    title: string;
    body: string;
  } | null>(null);

  const fileInput = useRef<HTMLInputElement | null>(null);
  const close = () => setSheet(null);

  const toggleSport = (sport: SportKind) =>
    setSports((current) =>
      current.includes(sport) ? current.filter((entry) => entry !== sport) : [...current, sport],
    );

  const dirty =
    fullName.trim() !== baseline.fullName ||
    email.trim() !== baseline.email ||
    phone.trim() !== baseline.phone ||
    dob !== baseline.dob ||
    gender !== baseline.gender ||
    city !== baseline.city ||
    sports.join(',') !== baseline.sports.join(',');

  /**
   * Sends only what actually changed, so an untouched field can never be cleared by
   * a stray save.
   */
  const save = async () => {
    if (saving || uploading || !dirty) return;

    const trimmed = fullName.trim();
    const patch: ProfilePatch = {};
    if (trimmed !== baseline.fullName) patch.fullName = trimmed;
    if (!emailLocked && email.trim() !== baseline.email) patch.email = email.trim() || null;
    if (!phoneLocked && phone.trim() !== baseline.phone) patch.phone = phone.trim() || null;
    if (dob !== baseline.dob) patch.dateOfBirth = displayToIso(dob);
    if (gender !== baseline.gender) patch.gender = gender || null;
    if (city !== baseline.city) patch.city = city || null;
    if (sports.join(',') !== baseline.sports.join(',')) patch.preferredSports = sports;

    setSaving(true);
    setNotice(null);
    try {
      const saved = await saveMyProfile(patch);
      const savedEmail = saved.email ?? '';
      const savedPhone = saved.phone ?? '';
      setEmail(savedEmail);
      setPhone(savedPhone);
      setBaseline({
        fullName: trimmed,
        email: savedEmail,
        phone: savedPhone,
        dob,
        dobIso: initial.dobIso,
        gender,
        city,
        sports,
      });
      // Keeps this screen's copy in step with the provider's, which the Account tab
      // and the booking flow both read.
      onSaved();
      setNotice({
        tone: 'success',
        title: 'Profile updated',
        body: 'Your changes are saved to your account.',
      });
    } catch (error) {
      setNotice({
        tone: 'danger',
        title: "Couldn't save your changes",
        body: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  };

  /** Takes the chosen file straight to the profile-photo endpoint. */
  const upload = async (file: File) => {
    setUploading(true);
    setNotice(null);
    try {
      const saved = await uploadProfilePhoto(file);
      setPhoto({ path: saved.avatar_path, url: saved.avatarUrl });
      onSaved();
      setNotice({
        tone: 'success',
        title: 'Profile photo updated',
        body: 'Your photo has been saved to your account.',
      });
    } catch (error) {
      setNotice({
        tone: 'danger',
        title: "Couldn't upload your photo",
        body: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setUploading(false);
    }
  };

  const choosePhoto = () => {
    if (uploading || saving) return;
    fileInput.current?.click();
  };

  const displayName = fullName.trim() || fallbackName || profile.full_name || 'Your profile';

  return (
    <ScreenShell>
      <ScreenTitle title="Profile Management" subtitle="Manage and update your personal details" />

      {notice ? <InfoNote title={notice.title} body={notice.body} tone={notice.tone} /> : null}

      <Card
        style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}>
        <span style={{ position: 'relative', flexShrink: 0 }}>
          <span
            style={{
              width: 62,
              height: 62,
              borderRadius: 31,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              backgroundColor: Brand.backgroundSelected,
            }}>
            {avatarUrl ? (
              <RemoteImage
                uri={avatarUrl}
                accessibilityLabel="Your profile photo"
                style={{ width: '100%', height: '100%' }}
              />
            ) : (
              <Ion name="person" size={30} color={Brand.textMuted} />
            )}
          </span>
          <span
            style={{
              position: 'absolute',
              right: -2,
              bottom: -2,
              width: 24,
              height: 24,
              borderRadius: 12,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: Brand.accent,
            }}>
            <Ion name="camera" size={13} color={Brand.onAccent} />
          </span>
        </span>
        <span
          style={{
            flex: 1,
            minWidth: 0,
            display: 'flex',
            flexDirection: 'column',
            gap: Spacing.xxs,
          }}>
          <span style={{ ...Typography.cardTitle, color: Brand.text }}>{displayName}</span>
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            Member since {memberSince(profile.created_at)}
          </span>
          <span style={{ ...Typography.caption, color: Brand.textMuted }}>
            JPG, PNG or WebP · up to 3 MB
          </span>
        </span>
      </Card>

      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        style={{ display: 'none' }}
        aria-label="Choose a profile photo"
        onChange={(event) => {
          const file = event.target.files?.[0];
          // Reset first, so choosing the same file twice still fires a change.
          event.target.value = '';
          if (file) void upload(file);
        }}
      />

      <Button
        label={avatarUrl ? 'Change Profile Photo' : 'Upload Profile Photo'}
        variant="secondary"
        size="md"
        onPress={choosePhoto}
        loading={uploading}
        disabled={saving}
        fullWidth
      />

      <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
        <FieldRow label="Full Name" value={fullName} onChange={setFullName} />
        <FieldRow
          label="Phone Number"
          value={phoneLocked ? profile.phone || 'Not set' : phone}
          verified={phoneLocked && profile.phoneVerified}
          onChange={phoneLocked ? undefined : setPhone}
          placeholder="Add phone number"
          type="tel"
          inputMode="tel"
        />
        <FieldRow
          label="Email Address"
          value={emailLocked ? profile.email || 'Not set' : email}
          verified={emailLocked && profile.emailVerified}
          onChange={emailLocked ? undefined : setEmail}
          placeholder="Add email address"
          type="email"
          inputMode="email"
        />
        <span style={{ ...Typography.caption, color: Brand.textMuted, lineHeight: '16px' }}>
          Only your sign-in contact is verified. Manually added contact details are saved without
          verification and cannot be used to sign in.
        </span>
        <FieldRow
          label="Date of Birth"
          value={dob || 'Not set'}
          rightIcon="calendar"
          onRightPress={() => setSheet('dob')}
        />
        <FieldRow
          label="Gender"
          value={gender || 'Not set'}
          rightIcon="chevron"
          onRightPress={() => setSheet('gender')}
        />
        <FieldRow
          label="City"
          value={city || 'Not set'}
          rightIcon="chevron"
          onRightPress={() => setSheet('city')}
        />
        <FieldRow
          label="Preferred Sports"
          value={
            sports.length > 0
              ? sports.map((sport) => SPORT_LABELS[sport]).join(', ')
              : 'None selected'
          }
          rightIcon="chevron"
          onRightPress={() => setSheet('sports')}
        />
      </div>

      <Button
        label="Save Changes"
        onPress={() => void save()}
        loading={saving}
        disabled={!dirty || uploading}
        fullWidth
      />
      {!dirty ? (
        <span style={{ ...Typography.caption, color: Brand.textMuted, textAlign: 'center' }}>
          Change a field to enable saving.
        </span>
      ) : null}

      <BottomSheet visible={sheet === 'dob'} onClose={close} title="Date of Birth">
        <div style={{ display: 'flex', flexDirection: 'column', gap: Spacing.md }}>
          <NativeDateField
            value={initial.dobIso}
            max={`${new Date().getFullYear() - 10}-12-31`}
            onChange={(next) => {
              setDob(next);
              close();
            }}
          />
          {dob ? (
            <TextLink
              label="Clear date of birth"
              onPress={() => {
                setDob('');
                close();
              }}
            />
          ) : null}
        </div>
      </BottomSheet>

      <BottomSheet visible={sheet === 'gender'} onClose={close} title="Gender">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
          {GENDERS.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={gender === option}
              onPress={() => {
                setGender(option);
                close();
              }}
            />
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'city'}
        onClose={close}
        title="City"
        subtitle="Where do you usually play?">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
          {CITIES.map((option) => (
            <Chip
              key={option}
              label={option}
              selected={city === option}
              onPress={() => {
                setCity(option);
                close();
              }}
            />
          ))}
        </div>
      </BottomSheet>

      <BottomSheet
        visible={sheet === 'sports'}
        onClose={close}
        title="Preferred Sports"
        subtitle="Pick as many as you like — we'll surface these first."
        footer={<Button label="Done" size="md" onPress={close} style={{ flex: 1 }} />}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: Spacing.sm }}>
          {SPORTS.map((sport) => (
            <Chip
              key={sport}
              label={SPORT_LABELS[sport]}
              selected={sports.includes(sport)}
              trailing={sports.includes(sport) ? 'check' : 'none'}
              variant="outline"
              onPress={() => toggleSport(sport)}
            />
          ))}
        </div>
      </BottomSheet>
    </ScreenShell>
  );
}

/**
 * The date field. A browser's own date input is the platform's picker, so the sheet
 * holds that rather than a hand-built three-column wheel; it is bounded to the same
 * latest year the handset allows.
 */
function NativeDateField({
  value,
  max,
  onChange,
}: {
  value: string;
  max: string;
  onChange: (display: string) => void;
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: Spacing.two,
        backgroundColor: Brand.card,
        border: `1px solid ${Brand.cardBorder}`,
        borderRadius: Radius.lg,
        paddingLeft: Spacing.md,
        paddingRight: Spacing.md,
        paddingTop: 13,
        paddingBottom: 13,
      }}>
      <input
        className="mobile-input"
        type="date"
        aria-label="Date of birth"
        max={max}
        defaultValue={/^\d{4}-\d{2}-\d{2}$/.test(value) ? value : ''}
        onChange={(event) => {
          const next = event.target.value;
          if (!next) return;
          onChange(isoToDisplay(next));
        }}
        style={{ flex: 1, color: Brand.text, fontSize: 15, fontWeight: 600, background: 'none' }}
      />
      <Ion name="calendarOutline" size={18} color={Brand.accent} />
    </div>
  );
}
