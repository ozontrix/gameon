/** HID keyboard mode needs no device permission or reconnect handler. */
export const SCANNER_CONFIG = {
  maxInterCharacterMs: 80,
  maxAverageCharacterMs: 35,
  idleTimeoutMs: 180,
  minLength: 8,
  maxLength: 128,
  duplicateCooldownMs: 1200,
  resultDisplayMs: 5000,
  requestTimeoutMs: 12000,
  // Only strip explicitly configured affixes, never arbitrary QR contents.
  prefix: '',
  suffix: '',
  allowTimeoutCompletion: false,
};

export type ScannerConfig = typeof SCANNER_CONFIG;