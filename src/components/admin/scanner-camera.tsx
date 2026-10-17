'use client';

import { useEffect, useEffectEvent, useRef, useState } from 'react';
import { buttonClass } from './ui';

type Detector = { detect(source: CanvasImageSource): Promise<{ rawValue: string }[]> };
type DetectorConstructor = new (options: { formats: string[] }) => Detector;

/** Optional fallback. HID keyboard scanning never depends on camera support. */
export function ScannerCamera({ onScan }: { onScan: (code: string) => void }) {
  const [active, setActive] = useState(false);
  const [error, setError] = useState('');
  const video = useRef<HTMLVideoElement>(null);
  const scanned = useEffectEvent(onScan);
  useEffect(() => {
    if (!active) return;
    const Constructor = (globalThis as { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!Constructor || !navigator.mediaDevices?.getUserMedia) return;
    const detector = new Constructor({ formats: ['qr_code'] });
    let stopped = false;
    let stream: MediaStream | undefined;
    let timer: ReturnType<typeof setTimeout>;
    let last = '';
    const tick = async () => {
      if (stopped) return;
      if (video.current && video.current.readyState >= 2) {
        try {
          const [code] = await detector.detect(video.current);
          if (!stopped && code?.rawValue && code.rawValue !== last) { last = code.rawValue; scanned(code.rawValue); }
          if (!code) last = '';
        } catch { /* An unreadable frame does not stop the station. */ }
      }
      if (!stopped) timer = setTimeout(tick, 350);
    };
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false }).then(async media => {
      if (stopped) { media.getTracks().forEach(track => track.stop()); return; }
      stream = media;
      if (video.current) { video.current.srcObject = media; await video.current.play(); }
      void tick();
    }).catch(() => { if (!stopped) { setError('Camera unavailable. Use the USB scanner or manual test.'); setActive(false); } });
    return () => { stopped = true; clearTimeout(timer); stream?.getTracks().forEach(track => track.stop()); };
  }, [active]);
  return <details className="rounded-xl border border-zinc-200 bg-white p-4" onToggle={event => {
    if (!event.currentTarget.open) setActive(false);
  }}>
    <summary className="cursor-pointer font-medium">Optional camera scanner</summary>
    <p className="my-3 text-sm text-zinc-600">Available in browsers with BarcodeDetector support. USB scanning does not need camera access.</p>
    <button type="button" className={buttonClass('secondary')} onClick={() => {
      if (!(globalThis as { BarcodeDetector?: unknown }).BarcodeDetector || !navigator.mediaDevices?.getUserMedia) {
        setError('Camera QR detection is not supported in this browser. Use the USB scanner or manual test.'); return;
      }
      setError(''); setActive(value => !value);
    }}>{active ? 'Stop camera' : 'Start camera'}</button>
    {active ? <video ref={video} muted playsInline className="mt-4 max-h-64 w-full rounded-lg bg-black" /> : null}
    {error ? <p role="alert" className="mt-3 text-sm text-red-700">{error}</p> : null}
  </details>;
}