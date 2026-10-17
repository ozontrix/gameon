'use client';

import { useEffect, useEffectEvent } from 'react';
import { KeyboardScanBuffer, isScannerExcluded } from './keyboard-buffer';
import type { ScannerConfig } from './config';

export function useBarcodeScanner(onScan: (code: string) => void, config?: Partial<ScannerConfig>) {
  const scanned = useEffectEvent(onScan);
  useEffect(() => {
    const buffer = new KeyboardScanBuffer(config);
    let timer: ReturnType<typeof setTimeout> | undefined;
    let terminatorAt = -Infinity;
    const reset = () => { clearTimeout(timer); buffer.reset(); terminatorAt = -Infinity; };
    const keydown = (event: KeyboardEvent) => {
      if (document.hidden || isScannerExcluded(event.composedPath()[0] ?? event.target)) { reset(); return; }
      if (event.key === 'Enter' && performance.now() - terminatorAt <= buffer.config.idleTimeoutMs) {
        event.preventDefault(); event.stopImmediatePropagation(); return;
      }
      const result = buffer.feed(event, performance.now());
      if (result.consume) { event.preventDefault(); event.stopImmediatePropagation(); }
      if (result.code) { terminatorAt = performance.now(); scanned(result.code); }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (buffer.config.allowTimeoutCompletion) {
          const code = buffer.finish();
          if (code) scanned(code);
        } else buffer.reset();
      }, buffer.config.idleTimeoutMs);
    };
    window.addEventListener('keydown', keydown, true);
    window.addEventListener('blur', reset);
    document.addEventListener('visibilitychange', reset);
    return () => {
      reset();
      window.removeEventListener('keydown', keydown, true);
      window.removeEventListener('blur', reset);
      document.removeEventListener('visibilitychange', reset);
    };
  }, [config]);
}