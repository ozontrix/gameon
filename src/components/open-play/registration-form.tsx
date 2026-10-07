'use client';

import { useRef, useState, type FormEvent } from 'react';
import { ArrowRight, CalendarPlus, Check, CheckCircle2, LoaderCircle, MapPin, ShieldCheck, Share2 } from 'lucide-react';
import Link from 'next/link';
import { OPEN_PLAY_DATE_LABEL, OPEN_PLAY_MAP_URL, OPEN_PLAY_SPORTS, type OpenPlaySport } from '@/lib/open-play/constants';
import { OpenPlayRegistrationSchema, openPlayAttribution } from '@/lib/open-play/registration';
import { trackOpenPlayLead } from '@/lib/analytics/open-play';
import { SportArt } from './sport-art';

export function OpenPlayRegistrationForm({ closed, sport, onSportChange: setSport }: { closed: boolean; sport: OpenPlaySport | ''; onSportChange: (sport: OpenPlaySport | '') => void }) {
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [failure, setFailure] = useState('');
  const [saved, setSaved] = useState<{ created: boolean; sport: OpenPlaySport; emailSent: boolean } | null>(null);
  const [shareStatus, setShareStatus] = useState('');
  const pending = useRef(false);
  const successRef = useRef<HTMLDivElement>(null);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending.current || closed) return;
    const form = event.currentTarget;
    const values = new FormData(form);
    const parsed = OpenPlayRegistrationSchema.safeParse({
      sport, fullName: values.get('fullName'), phone: values.get('phone'), email: values.get('email') || '', city: values.get('city') || '',
      contactConsent: values.get('contactConsent') === 'on', marketingConsent: values.get('marketingConsent') === 'on',
      website: values.get('website') || '', attribution: openPlayAttribution(window.location.search),
    });
    if (!parsed.success) {
      const fields = Object.fromEntries(parsed.error.issues.map(issue => [issue.path[0], issue.message]));
      setErrors(fields);
      setFailure('Please check the highlighted fields.');
      const first = parsed.error.issues[0]?.path[0];
      if (first === 'sport') form.querySelector<HTMLButtonElement>('[data-sport]')?.focus();
      else form.querySelector<HTMLInputElement>(`[name="${String(first)}"]`)?.focus();
      return;
    }
    pending.current = true;
    setBusy(true); setErrors({}); setFailure('');
    try {
      const response = await fetch('/api/v1/public/open-play/registrations', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), signal: AbortSignal.timeout(45000) });
      const result = await response.json();
      if (!response.ok || !result.success) {
        setErrors(result.fields ?? {});
        throw new Error(result.error || 'We couldn’t save your registration. Please try again.');
      }
      setSaved({ created: result.created, sport: parsed.data.sport, emailSent: result.emailSent === true });
      if (result.created && result.registrationId) trackOpenPlayLead(result.registrationId, parsed.data.sport);
      requestAnimationFrame(() => successRef.current?.focus());
    } catch (error) {
      setFailure(error instanceof Error && error.name !== 'TimeoutError' ? error.message : 'That took a little too long. Please try again; a retry won’t create a duplicate.');
    } finally { pending.current = false; setBusy(false); }
  }
  async function share() {
    const url = `${window.location.origin}/open-play-registrations`;
    try {
      if (navigator.share) await navigator.share({ title: 'Your Sunday. On us. | GameOn', text: 'Free open play on 18 October at GameOn, Sector 70, Gurugram. Join me!', url });
      else { await navigator.clipboard.writeText(url); setShareStatus('Invite link copied!'); }
    } catch { setShareStatus('Share game-on.in/open-play-registrations with your friends.'); }
  }
  if (closed) return <div className="op-form-card p-7"><p className="op-eyebrow">See you on the courts</p><h2 className="mt-3 font-display text-4xl uppercase">That was one for the books.</h2><p className="mt-4 text-go-off/80">Registrations for October 18 are now closed. Visit GameOn for what’s next.</p><Link href="/" className="op-cta mt-6">Explore GameOn <ArrowRight className="size-4" /></Link></div>;
  if (saved) return <div ref={successRef} tabIndex={-1} role="status" className="op-form-card p-6 sm:p-8">
    <div className="flex size-16 items-center justify-center rounded-full bg-go-brand/15 text-go-brand"><CheckCircle2 className="size-8" /></div>
    <p className="op-eyebrow mt-6">{saved.created ? 'Registration saved' : 'Already registered'}</p>
    <h2 className="mt-2 font-display text-4xl uppercase">You’re on the list.</h2>
    <p className="mt-4 text-base leading-relaxed text-go-off/80">{saved.created ? 'Your' : 'This mobile number already has a'} <strong className="text-go-white">{OPEN_PLAY_SPORTS.find(item => item.id === saved.sport)?.name}</strong> registration for free open play.</p>
    <div className="mt-6 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm"><p className="flex items-center gap-3"><CalendarPlus className="size-5 text-go-brand" />{OPEN_PLAY_DATE_LABEL}</p><p className="flex items-center gap-3"><MapPin className="size-5 text-go-brand" />Sector 70, Gurugram</p></div>
    {saved.created ? <p className="mt-4 rounded-xl border border-white/10 bg-white/5 p-3 text-sm leading-relaxed text-go-off/85">{saved.emailSent ? 'Your GameOn Multi Sports confirmation email has been sent. Check your inbox or spam folder.' : 'Your registration is saved. We couldn’t send your confirmation email right now; the team can retry it. You don’t need to register again.'}</p> : null}
    <p className="mt-4 text-sm leading-relaxed text-go-off/75">The team will share exact timings using your registered contact details. This registers your interest; it does not reserve a court or a timed slot. No payment is needed.</p>
    <a href={OPEN_PLAY_MAP_URL} target="_blank" rel="noopener noreferrer" className="op-cta mt-6 w-full">Get directions <ArrowRight className="size-4" /></a>
    <div className="mt-3 grid grid-cols-2 gap-3"><a href="/open-play/october-18.ics" download className="op-secondary"><CalendarPlus className="size-4" />Save the date</a><button type="button" onClick={share} className="op-secondary"><Share2 className="size-4" />Invite a friend</button></div>
    <p aria-live="polite" className="mt-3 text-sm text-go-brand">{shareStatus}</p>
    <button type="button" className="mt-3 min-h-11 cursor-pointer text-sm text-go-off/80 underline underline-offset-4 hover:text-go-white" onClick={() => { setSaved(null); setSport(''); }}>Register for another sport</button>
  </div>;

  const fieldError = (key: string) => errors[key] ? <p id={`op-${key}-error`} className="mt-1.5 text-sm text-red-300">{errors[key]}</p> : null;
  return <form onSubmit={submit} noValidate className="op-form-card p-5 sm:p-7" aria-labelledby="op-form-title">
    <div className="flex items-start justify-between gap-3"><div><p className="op-eyebrow">Your Sunday starts here</p><h2 id="op-form-title" className="mt-2 font-display text-3xl uppercase sm:text-4xl">Count me in.</h2></div><span className="rounded-full border border-go-brand/30 bg-go-brand/10 px-3 py-1.5 font-mono text-sm text-go-brand">₹0 to play</span></div>
    <p className="mt-2 text-sm text-go-off/75">Pick a sport. Add your details. You’re ready.</p>
    <fieldset disabled={busy} className="mt-6">
      <legend className="mb-3 text-sm font-semibold">01 / Choose your preferred sport <span className="text-go-brand">*</span></legend>
      <div className="grid grid-cols-2 gap-2.5">{OPEN_PLAY_SPORTS.map(item => <button key={item.id} type="button" data-sport={item.id} onClick={() => { setSport(item.id); setErrors(current => ({ ...current, sport: '' })); }} aria-pressed={sport === item.id} aria-describedby={errors.sport ? 'op-sport-error' : undefined} className={`op-sport-choice ${sport === item.id ? 'op-sport-choice-selected' : ''}`}>
        <SportArt sport={item.id} className="h-16 w-20 shrink-0" /><span className="font-semibold">{item.name}</span><span className={`absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full border ${sport === item.id ? 'border-go-brand bg-go-brand text-go-black' : 'border-white/25'}`}>{sport === item.id ? <Check className="size-3.5" /> : null}</span>
      </button>)}</div>{fieldError('sport')}
    </fieldset>
    <fieldset disabled={busy} className="mt-6 space-y-4">
      <legend className="mb-3 text-sm font-semibold">02 / A little about you</legend>
      <div><label htmlFor="op-name" className="op-label">Your name <span className="text-go-brand">*</span></label><input id="op-name" name="fullName" autoComplete="name" maxLength={80} placeholder="Your full name" className="op-input" required aria-invalid={Boolean(errors.fullName)} aria-describedby={errors.fullName ? 'op-fullName-error' : undefined} />{fieldError('fullName')}</div>
      <div><label htmlFor="op-phone" className="op-label">Mobile number <span className="text-go-brand">*</span></label><div className="op-phone"><span className="border-r border-white/15 px-3 text-go-off/70">+91</span><input id="op-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel-national" maxLength={24} placeholder="10-digit mobile number" required aria-invalid={Boolean(errors.phone)} aria-describedby={`op-phone-hint${errors.phone ? ' op-phone-error' : ''}`} /></div><p id="op-phone-hint" className="mt-1.5 text-xs text-go-off/70">For your open play timings and event updates.</p>{fieldError('phone')}</div>
      <div><label htmlFor="op-email" className="op-label">Email <span className="text-go-brand">*</span></label><input id="op-email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" className="op-input" required aria-invalid={Boolean(errors.email)} aria-describedby={`op-email-hint${errors.email ? ' op-email-error' : ''}`} /><p id="op-email-hint" className="mt-1.5 text-xs text-go-off/70">We’ll email your joining confirmation from GameOn Multi Sports.</p>{fieldError('email')}</div>
      <div><label htmlFor="op-city" className="op-label">City / neighbourhood <span className="text-go-brand">*</span></label><input id="op-city" name="city" autoComplete="address-level2" minLength={2} maxLength={80} placeholder="e.g. Sector 70, Gurugram" className="op-input" required aria-invalid={Boolean(errors.city)} aria-describedby={errors.city ? 'op-city-error' : undefined} />{fieldError('city')}</div>
      <div className="op-honeypot" aria-hidden="true"><label htmlFor="op-website">Leave this field empty</label><input id="op-website" name="website" tabIndex={-1} autoComplete="off" /></div>
      <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-go-off/80"><input name="contactConsent" type="checkbox" required className="mt-0.5 size-4 shrink-0 accent-go-brand" aria-invalid={Boolean(errors.contactConsent)} aria-describedby={errors.contactConsent ? 'op-contactConsent-error' : undefined} /><span>I agree to be contacted about this event and have read the <Link href="/privacy" target="_blank" className="text-go-brand underline">Privacy Policy</Link>. <span className="text-go-brand">*</span></span></label>{fieldError('contactConsent')}
      <label className="flex cursor-pointer items-start gap-3 text-xs leading-relaxed text-go-off/75"><input name="marketingConsent" type="checkbox" className="mt-0.5 size-4 shrink-0 accent-go-brand" /><span>Send me GameOn offers and future event updates too. <span className="text-go-off/60">(Optional)</span></span></label>
    </fieldset>
    {failure ? <p role="alert" className="mt-4 rounded-xl border border-red-400/30 bg-red-400/10 p-3 text-sm text-red-200">{failure}</p> : null}
    <button type="submit" disabled={busy} className="op-cta mt-5 w-full">{busy ? <><LoaderCircle className="size-5 animate-spin" />Saving your registration…</> : <>Join free open play <ArrowRight className="size-5" /></>}</button>
    <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-go-off/70"><ShieldCheck className="size-3.5" />No payment. No account. Just play.</p>
    <p className="mt-3 text-center text-[11px] leading-relaxed text-go-off/60">Registration is for your preferred sport, not a reserved court or timed slot. Playing turns will be coordinated at the venue.</p>
  </form>;
}