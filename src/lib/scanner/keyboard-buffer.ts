import { SCANNER_CONFIG, type ScannerConfig } from './config';

export type ScannerKey = {
  key: string;
  repeat?: boolean;
  isComposing?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  metaKey?: boolean;
};

/** Pure timing detector. No booking data is trusted here; the server parses it. */
export class KeyboardScanBuffer {
  private value = '';
  private firstAt = 0;
  private lastAt = 0;
  private overflow = false;
  readonly config: ScannerConfig;

  constructor(config: Partial<ScannerConfig> = {}) {
    this.config = { ...SCANNER_CONFIG, ...config };
  }

  reset() { this.value = ''; this.firstAt = 0; this.lastAt = 0; this.overflow = false; }

  private rapid() {
    return this.value.length >= this.config.minLength && !this.overflow &&
      (this.lastAt - this.firstAt) / (this.value.length - 1) <= this.config.maxAverageCharacterMs;
  }

  finish(): string | null {
    let code = this.rapid() ? this.value : null;
    this.reset();
    if (code && this.config.prefix) {
      if (!code.startsWith(this.config.prefix)) return null;
      code = code.slice(this.config.prefix.length);
    }
    if (code && this.config.suffix) {
      if (!code.endsWith(this.config.suffix)) return null;
      code = code.slice(0, -this.config.suffix.length);
    }
    return code || null;
  }

  feed(event: ScannerKey, now: number): { code: string | null; consume: boolean } {
    if (event.isComposing || event.ctrlKey || event.altKey || event.metaKey || event.repeat) {
      this.reset();
      return { code: null, consume: false };
    }
    // Shift is normal for uppercase/punctuation. Do not split a scan on it.
    if (event.key === 'Shift') return { code: null, consume: false };
    if (this.value && now - this.lastAt > this.config.maxInterCharacterMs) this.reset();
    if (event.key === 'Enter') {
      const code = this.finish();
      return { code, consume: code !== null };
    }
    if (event.key.length !== 1 || /[\u0000-\u001f\u007f]/.test(event.key)) {
      this.reset();
      return { code: null, consume: false };
    }
    if (!this.value) this.firstAt = now;
    this.lastAt = now;
    if (this.value.length < this.config.maxLength) this.value += event.key;
    else this.overflow = true;
    // On this dedicated page printable keys outside editable controls have no
    // purpose. Suppressing from the first key also prevents browser type-ahead.
    return { code: null, consume: true };
  }
}

export function isScannerExcluded(target: EventTarget | null): boolean {
  return target instanceof Element && Boolean(target.closest(
    'input, textarea, select, [contenteditable]:not([contenteditable="false"]), [role="textbox"], [data-scanner-ignore]',
  ));
}