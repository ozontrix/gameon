'use client';

import { Camera, CameraOff, CircleCheck, CircleX } from 'lucide-react';
import Link from 'next/link';
import { useActionState, useEffect, useRef, useState, useSyncExternalStore, useTransition } from 'react';

import { buttonClass, inputClass } from '@/components/admin/ui';
import { checkInBooking, type CheckInResult } from '@/lib/admin/actions/bookings';
import type { ActionState } from '@/lib/admin/action-result';

/** The Barcode Detection API: Chrome on Android and desktop Chromium; absent in Safari/Firefox. */
type BarcodeDetectorLike = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type BarcodeDetectorCtor = new (options: { formats: string[] }) => BarcodeDetectorLike;

function getDetector(): BarcodeDetectorCtor | null {
  const ctor = (globalThis as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector;
  return typeof ctor === 'function' ? ctor : null;
}

const noSubscription = () => () => {};

export function CheckInStation() {
  const [state, formAction, pending] = useActionState<ActionState<CheckInResult>, FormData>(checkInBooking, null);
  const [, startTransition] = useTransition();
  const [scanning, setScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  // Known only in the browser; the server render assumes no scanner so hydration matches.
  const supported = useSyncExternalStore(noSubscription, () => getDetector() !== null, () => false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastCode = useRef<{ code: string; at: number } | null>(null);

  const submitCode = (code: string) => {
    const formData = new FormData();
    formData.set('code', code);
    startTransition(() => formAction(formData));
  };

  useEffect(() => {
    if (!scanning) return;
    const Detector = getDetector();
    if (!Detector) return;

    let stream: MediaStream | null = null;
    let frame = 0;
    let stopped = false;
    const detector = new Detector({ formats: ['qr_code'] });

    const tick = async () => {
      if (stopped) return;
      const video = videoRef.current;
      if (video && video.readyState >= 2) {
        try {
          const [code] = await detector.detect(video);
          const now = Date.now();
          // The same QR stays in view for a while: submit it once per few seconds.
          if (code && !(lastCode.current?.code === code.rawValue && now - lastCode.current.at < 4000)) {
            lastCode.current = { code: code.rawValue, at: now };
            submitCode(code.rawValue);
          }
        } catch {
          // A frame that could not be read; try the next one.
        }
      }
      frame = window.setTimeout(tick, 350);
    };

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'environment' }, audio: false })
      .then((media) => {
        if (stopped) {
          media.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = media;
        if (videoRef.current) {
          videoRef.current.srcObject = media;
          void videoRef.current.play();
        }
        void tick();
      })
      .catch(() => {
        setCameraError('Camera access was blocked. Allow camera access for this site, or type the booking ID below.');
        setScanning(false);
      });

    return () => {
      stopped = true;
      window.clearTimeout(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
    // submitCode only closes over stable refs and the action.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  useEffect(() => {
    if (state?.ok && inputRef.current) inputRef.current.value = '';
  }, [state]);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="relative aspect-[4/3] bg-zinc-950">
            {scanning ? (
              <>
                <video ref={videoRef} className="size-full object-cover" playsInline muted />
                <div className="pointer-events-none absolute inset-10 rounded-2xl border-2 border-go-brand/80" aria-hidden />
              </>
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 p-6 text-center text-zinc-400">
                <Camera className="size-8" aria-hidden />
                <p className="text-sm">
                  {supported
                    ? 'Start the camera and hold the customer’s QR code inside the frame.'
                    : 'This browser can’t scan QR codes. Use Chrome on Android, or type the booking ID.'}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 p-3">
            <p className="text-xs text-zinc-500">{scanning ? 'Scanning…' : 'Camera off'}</p>
            {supported ? (
              <button
                type="button"
                onClick={() => {
                  setCameraError(null);
                  setScanning((value) => !value);
                }}
                className={buttonClass(scanning ? 'secondary' : 'primary', 'sm')}
              >
                {scanning ? (
                  <>
                    <CameraOff className="size-4" aria-hidden /> Stop camera
                  </>
                ) : (
                  <>
                    <Camera className="size-4" aria-hidden /> Start camera
                  </>
                )}
              </button>
            ) : null}
          </div>
        </div>
        {cameraError ? <p className="text-sm text-red-700">{cameraError}</p> : null}

        <form action={formAction} className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label htmlFor="code" className="block text-sm font-medium text-zinc-800">
            Or enter the booking ID
          </label>
          <div className="mt-2 flex gap-2">
            <input
              ref={inputRef}
              id="code"
              name="code"
              placeholder="#3F2B8C1E"
              autoComplete="off"
              autoCapitalize="characters"
              className={inputClass}
            />
            <button type="submit" disabled={pending} className={buttonClass('primary')}>
              {pending ? 'Checking…' : 'Check in'}
            </button>
          </div>
          <p className="mt-2 text-xs text-zinc-500">The 8-character booking ID is shown on the booking in the customer’s app.</p>
        </form>
      </div>

      <div aria-live="polite">
        {!state ? (
          <div className="flex h-full min-h-48 items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500">
            The result of each scan appears here.
          </div>
        ) : state.ok && state.data ? (
          <div className="rounded-xl border border-emerald-300 bg-emerald-50 p-6">
            <div className="flex items-center gap-3 text-emerald-800">
              <CircleCheck className="size-8" aria-hidden />
              <p className="text-xl font-semibold">Access granted</p>
            </div>
            <dl className="mt-5 space-y-3 text-sm">
              <div>
                <dt className="text-emerald-700">Customer — confirm their name</dt>
                <dd className="text-2xl font-semibold text-emerald-950">{state.data.userName}</dd>
              </div>
              <div>
                <dt className="text-emerald-700">Phone</dt>
                <dd className="text-emerald-950">{state.data.userPhone ?? '—'}</dd>
              </div>
              <div>
                <dt className="text-emerald-700">Court</dt>
                <dd className="text-emerald-950">{state.data.facilityName}</dd>
              </div>
            </dl>
            <Link href={`/admin/bookings/${state.data.bookingId}`} className="mt-5 inline-block text-sm font-medium text-emerald-900 underline">
              Booking {state.data.shortId}
            </Link>
          </div>
        ) : (
          <div role="alert" className="rounded-xl border border-red-300 bg-red-50 p-6">
            <div className="flex items-center gap-3 text-red-800">
              <CircleX className="size-8" aria-hidden />
              <p className="text-xl font-semibold">Do not admit</p>
            </div>
            <p className="mt-3 text-base text-red-900">{state.message}</p>
          </div>
        )}
      </div>
    </div>
  );
}
