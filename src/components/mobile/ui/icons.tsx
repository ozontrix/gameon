'use client';

/**
 * The app's glyphs.
 *
 * The handset build draws icons with `@expo/vector-icons`, whose two families
 * have two jobs: **Ionicons** for all interface chrome (navigation, actions,
 * status, form affordances), and **MaterialCommunityIcons** for subject matter
 * Ionicons has no glyph for (the sports themselves, court surfaces).
 *
 * A browser has no icon font, so this file loads the *same two glyph sets* as
 * plain path data — `ionicons/icons` ships each Ionicons glyph as an SVG data
 * URI and `@mdi/js` ships each MDI glyph as a path string — and inlines them.
 * The result is pixel-identical to the app, no font download, and no layout
 * shift while a font loads.
 *
 * **Weight rule** (unchanged from the app): outline is the default; filled is
 * reserved for state — a focused tab, a selected radio, a satisfied condition,
 * a rating. Decorative and inline metadata icons stay outline, so a filled
 * glyph always means something.
 *
 * Glyphs are imported by name rather than through a namespace so the bundler
 * can drop the ~1,300 Ionicons this build never renders.
 */

import {
  addOutline,
  alertCircleOutline,
  arrowBack,
  arrowForward,
  calendar,
  calendarOutline,
  callOutline,
  cameraOutline,
  cardOutline,
  cashOutline,
  checkmark,
  checkmarkCircle,
  checkmarkCircleOutline,
  chevronBack,
  chevronDown,
  chevronForward,
  chevronUp,
  close,
  copyOutline,
  createOutline,
  downloadOutline,
  giftOutline,
  helpCircleOutline,
  home,
  homeOutline,
  informationCircleOutline,
  linkOutline,
  location,
  lockClosedOutline,
  logInOutline,
  logoWhatsapp,
  mailOutline,
  notifications,
  notificationsOutline,
  openOutline,
  optionsOutline,
  person,
  personCircleOutline,
  personOutline,
  pricetagOutline,
  qrCode,
  refresh,
  removeOutline,
  searchOutline,
  shareOutline,
  shieldCheckmark,
  shieldCheckmarkOutline,
  speedometerOutline,
  star,
  starOutline,
  tennisball,
  tennisballOutline,
  ticketOutline,
  timeOutline,
  trashOutline,
  trendingUpOutline,
  trophy,
  trophyOutline,
  walletOutline,
  warningOutline,
} from 'ionicons/icons';
import {
  mdiBadminton,
  mdiCricket,
  mdiGrass,
  mdiSnowflake,
  mdiSoccer,
  mdiTableTennis,
  mdiTextureBox,
  mdiWall,
} from '@mdi/js';

/** Every Ionicons glyph this build renders. */
const ION = {
  addOutline,
  alertCircleOutline,
  arrowBack,
  arrowForward,
  calendar,
  calendarOutline,
  callOutline,
  cameraOutline,
  cardOutline,
  cashOutline,
  checkmark,
  checkmarkCircle,
  checkmarkCircleOutline,
  chevronBack,
  chevronDown,
  chevronForward,
  chevronUp,
  close,
  copyOutline,
  createOutline,
  downloadOutline,
  giftOutline,
  helpCircleOutline,
  home,
  homeOutline,
  informationCircleOutline,
  linkOutline,
  location,
  lockClosedOutline,
  logInOutline,
  logoWhatsapp,
  mailOutline,
  notifications,
  notificationsOutline,
  openOutline,
  optionsOutline,
  person,
  personCircleOutline,
  personOutline,
  pricetagOutline,
  qrCode,
  refresh,
  removeOutline,
  searchOutline,
  shareOutline,
  shieldCheckmark,
  shieldCheckmarkOutline,
  speedometerOutline,
  star,
  starOutline,
  tennisball,
  tennisballOutline,
  ticketOutline,
  timeOutline,
  trashOutline,
  trendingUpOutline,
  trophy,
  trophyOutline,
  walletOutline,
  warningOutline,
} as const;

/** Every MaterialCommunityIcons glyph this build renders. */
const MDI = {
  badminton: mdiBadminton,
  tableTennis: mdiTableTennis,
  cricket: mdiCricket,
  soccer: mdiSoccer,
  snowflake: mdiSnowflake,
  grass: mdiGrass,
  textureBox: mdiTextureBox,
  wall: mdiWall,
} as const;

export type IonName = keyof typeof ION;
export type MdiName = keyof typeof MDI;

/**
 * Ionicons exports a whole `<svg>` as a data URI. Its inner markup is extracted
 * once per glyph so it can be inlined into our own `<svg>` element — which is
 * what lets `currentColor` reach it, so one glyph can be themed by the text
 * colour around it instead of being locked to the colour it was baked with.
 */
const innerCache = new Map<string, string>();

function ionInner(name: IonName): string {
  const cached = innerCache.get(name);
  if (cached !== undefined) return cached;

  const dataUri = ION[name];
  const comma = dataUri.indexOf(',');
  const raw = comma === -1 ? dataUri : decodeURIComponent(dataUri.slice(comma + 1));
  const inner = raw.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');

  innerCache.set(name, inner);
  return inner;
}

export type IconProps = {
  size?: number;
  color?: string;
  /** Accessible label. Icons are decorative by default, as in the app. */
  label?: string;
};

/** An Ionicons glyph, inline. */
export function Ion({ name, size = 22, color = 'currentColor', label }: IconProps & { name: IonName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 512 512"
      fill={color}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}
      dangerouslySetInnerHTML={{ __html: ionInner(name) }}
    />
  );
}

/** A MaterialCommunityIcons glyph, inline. */
export function Mdi({ name, size = 22, color = 'currentColor', label }: IconProps & { name: MdiName }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
      style={{ display: 'block', flexShrink: 0 }}>
      <path d={MDI[name]} />
    </svg>
  );
}
