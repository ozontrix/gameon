'use client';

import { CircleCheck, CircleX, LoaderCircle, ScanLine, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { buttonClass, inputClass } from '@/components/admin/ui';
import { ScannerCamera } from '@/components/admin/scanner-camera';
import { formatDate, formatDateTime, formatTimeRange, shortBookingId } from '@/lib/admin/format';
import { SCANNER_CONFIG } from '@/lib/scanner/config';
import type { ScanResult } from '@/lib/scanner/result';
import { useBarcodeScanner } from '@/lib/scanner/use-barcode-scanner';
import { useScanSound } from '@/lib/scanner/use-scan-sound';
import { ScanRequestGate, verifyScan } from '@/lib/scanner/verification-client';

type Venue = { id: string; name: string };

export function CheckInStation({ venues = [] }: { venues?: Venue[] }) {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [recent, setRecent] = useState<ScanResult | null>(null);
  const [pending, setPending] = useState(false);
  const [manual, setManual] = useState('');
  const [venueId, setVenueId] = useState(venues.length === 1 ? venues[0].id : '');
  const [attention, setAttention] = useState(false);
  const gate = useRef(new ScanRequestGate());
  const resetTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const playSound = useScanSound();

  useEffect(() => {
    mounted.current = true;
    const checkFocus = () => setAttention(document.hidden || !document.hasFocus());
    window.addEventListener('focus', checkFocus);
    window.addEventListener('blur', checkFocus);
    document.addEventListener('visibilitychange', checkFocus);
    return () => {
      mounted.current = false; clearTimeout(resetTimer.current); request.current?.abort();
      window.removeEventListener('focus', checkFocus); window.removeEventListener('blur', checkFocus);
      document.removeEventListener('visibilitychange', checkFocus);
    };
  }, []);

  const submit = (code: string, source: 'hid' | 'manual' | 'camera') => {
    if (!code.trim()) return;
    void gate.current.run(code.trim(), async () => {
      clearTimeout(resetTimer.current);
      setPending(true); setResult(null);
      const controller = new AbortController(); request.current = controller;
      const verified = await verifyScan(code.trim(), source, venueId || undefined, controller.signal);
      if (!mounted.current) return;
      setPending(false); setResult(verified); setRecent(verified);
      playSound(verified.success);
      if (source === 'manual') setManual('');
      // Auth failures remain visible until the staff member signs in again.
      if (verified.status !== 'unauthorized') resetTimer.current = setTimeout(() => setResult(null), SCANNER_CONFIG.resultDisplayMs);
    });
  };
  useBarcodeScanner(code => submit(code, 'hid'));

  const duplicate = result?.status === 'already_checked_in';
  const Icon = pending ? LoaderCircle : result?.success ? CircleCheck : duplicate ? TriangleAlert : result ? CircleX : ScanLine;
  const tone = pending || !result ? 'border-zinc-700 bg-zinc-950 text-white' : result.success
    ? 'border-emerald-400 bg-emerald-950 text-emerald-50' : duplicate
      ? 'border-amber-400 bg-amber-950 text-amber-50' : 'border-red-400 bg-red-950 text-red-50';
  const booking = result?.booking;

  return <div className="space-y-5" data-scanner-station>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm font-semibold uppercase tracking-widest text-zinc-600">GameOn MultiSports · Reception</p>
      <span className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-semibold text-emerald-900">{pending ? 'Verifying…' : 'Scanner ready'}</span>
    </div>
    {attention ? <p role="alert" className="rounded-lg bg-amber-100 p-3 text-amber-950">Keep this browser window active to receive scanner keystrokes.</p> : null}
    <section aria-live="polite" aria-atomic="true" aria-busy={pending}
      className={`flex min-h-[390px] flex-col items-center justify-center rounded-2xl border-2 p-6 text-center sm:p-10 ${tone}`}>
      <Icon aria-hidden className={`mb-6 size-20 ${pending ? 'motion-safe:animate-spin' : ''}`} />
      <p className="mb-3 text-sm font-semibold uppercase tracking-[0.25em]">QR check-in</p>
      <h2 className="text-3xl font-bold uppercase leading-tight sm:text-5xl">{pending ? 'Verifying…' : result?.message ?? 'Ready to scan'}</h2>
      {!result && !pending ? <>
        <p className="mt-5 text-lg text-zinc-300">Scan customer&apos;s booking QR code</p>
        <p className="mt-3 max-w-xl text-sm text-zinc-400">No input field or button needed. Keep this page active. USB / wireless keyboard scanner mode.</p>
      </> : null}
      {booking ? <dl className="mt-7 grid w-full max-w-2xl grid-cols-1 gap-4 text-left sm:grid-cols-2">
        <div className="sm:col-span-2"><dt className="text-sm opacity-75">Customer — confirm their name</dt><dd className="text-3xl font-bold">{booking.userName}</dd></div>
        <div><dt className="text-sm opacity-75">Sport / court</dt><dd className="text-lg font-semibold">{booking.sport ?? 'Activity'} · {booking.facilityName}</dd></div>
        <div><dt className="text-sm opacity-75">Venue</dt><dd className="text-lg">{booking.venueName}</dd></div>
        <div><dt className="text-sm opacity-75">Date</dt><dd>{formatDate(booking.date)}{booking.endDate !== booking.date ? ` – ${formatDate(booking.endDate)}` : ''}</dd></div>
        <div><dt className="text-sm opacity-75">Time ({booking.timezone})</dt><dd>{formatTimeRange(booking.startTime, booking.endTime)}</dd></div>
        <div><dt className="text-sm opacity-75">Booking ID</dt><dd className="font-mono text-xl">{shortBookingId(booking.bookingId)}</dd></div>
        {booking.scannedAt ? <div><dt className="text-sm opacity-75">Checked in at</dt><dd className="font-semibold">{formatDateTime(booking.scannedAt, booking.timezone)}</dd></div> : null}
      </dl> : null}
      {result?.status === 'unauthorized' ? <Link className="mt-6 rounded-lg border border-white px-5 py-3 font-semibold underline" href="/admin/login">Sign in again</Link> : null}
    </section>
    <div className="rounded-xl border border-zinc-200 bg-white p-4" aria-label="Most recent scan">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Most recent scan</h3>
      <p className="mt-2 font-semibold text-zinc-900">{recent ? `${recent.message}${recent.booking ? ` · ${recent.booking.userName} · ${shortBookingId(recent.booking.bookingId)}` : ''}` : 'Waiting for the first scan.'}</p>
      <p className="mt-2 text-xs text-zinc-500">Sound is optional and may be muted by the browser. A hardware connection cannot be detected in keyboard mode.</p>
    </div>
    {venues.length > 1 ? <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <label htmlFor="scanner-venue" className="block text-sm font-medium">Reception venue</label>
      <select id="scanner-venue" className={`${inputClass} mt-2`} disabled={pending} value={venueId} onChange={event => setVenueId(event.target.value)}>
        <option value="">All GameOn venues</option>{venues.map(venue => <option value={venue.id} key={venue.id}>{venue.name}</option>)}
      </select>
    </div> : null}
    <details className="rounded-xl border border-zinc-200 bg-white p-4">
      <summary className="cursor-pointer font-medium">Developer / Manual Test</summary>
      <form className="mt-4" onSubmit={event => { event.preventDefault(); submit(manual, 'manual');
        (event.currentTarget.elements.namedItem('qrData') as HTMLInputElement)?.blur(); }}>
        <label htmlFor="scanner-manual" className="block text-sm font-medium">Full QR payload</label>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row">
          <input id="scanner-manual" name="qrData" value={manual} onChange={event => setManual(event.target.value)} maxLength={128} autoComplete="off" spellCheck={false}
            placeholder="Full booking UUID or gameon:event:UUID" className={inputClass} />
          <button disabled={pending || !manual.trim()} className={buttonClass('primary')} type="submit">Verify &amp; check in</button>
        </div>
        <p className="mt-2 text-xs text-zinc-600">Uses the real backend and records check-in. Not a dry run. Keyboard scanning is paused while typing in this field; click outside it to resume.</p>
      </form>
    </details>
    <ScannerCamera onScan={code => submit(code, 'camera')} />
  </div>;
}