/**
 * What a slot length is called in copy: 60 → "1 Hour", 90 → "1 Hour 30 Minutes".
 *
 * Kept with the sport types because the listing, the detail screen and the
 * booking summary all label the same option and must agree on the wording.
 */
export function durationLabel(minutes: number): string {
  if (!minutes || minutes < 60) return `${minutes} Minutes`;

  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  const hourPart = hours === 1 ? '1 Hour' : `${hours} Hours`;

  if (rest === 0) return hourPart;
  return `${hourPart} ${rest} Minutes`;
}
