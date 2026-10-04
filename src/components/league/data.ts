/**
 * Game On Multisports League — content for the booking flow.
 *
 * Shared catalog used by the registration screens and server-side payment quote.
 *
 * Fees mirror the Game On Multisports League registration sheet:
 *   Pickleball  U14 singles ₹1,000/person · U14 doubles ₹1,600/team
 *               Open singles ₹1,200/person · Open doubles ₹2,400/team · Mixed doubles ₹2,400/team
 *   Badminton   Singles ₹1,000/person · Doubles ₹2,000/team
 *   Cricket     7v7 · 6 overs a side · ₹2,000 per team
 *   Football    6v6 · 30 minutes full time · ₹2,000 per team
 */

export type SportId = "badminton" | "pickleball" | "cricket" | "football";

export type EntryMode = "individual" | "team";

export interface Category {
  /** Stable id used in the draft, e.g. `mens-doubles`. */
  id: string;
  name: string;
  /** Two-word label for tight cards, e.g. "Men's · Doubles". */
  short: string;
  fee: number;
  /** Fixed tournament day, not a player-selectable booking date. */
  date: string;
  /** Who can enter and how many entries the bracket holds. */
  format: string;
  /** How many people one entry covers (1 singles, 2 doubles, 7 cricket…). */
  squadSize: number;
}

export interface Sport {
  id: SportId;
  name: string;
  emoji: string;
  /** Muted tint for the icon tile — matches the marketing site's sport colours. */
  accent: string;
  /**
   * Punchy one-liner under the sport name on the cards. Left empty for the team
   * sports, where the description already carries every fact we want to show.
   */
  tagline: string;
  description: string;
  mode: EntryMode;
  slotLength: string;
  capacity: string;
  categories: Category[];
}

export const SPORTS: Sport[] = [
  {
    id: "badminton",
    name: "Badminton",
    emoji: "🏸",
    accent: "#A855F7",
    tagline: "All-time classic",
    description: "5 courts — 2 AC wooden courts and 3 synthetic indoor courts.",
    mode: "individual",
    slotLength: "60 min per match slot",
    capacity: "7 categories",
    categories: [
      { id: "u13-boys-singles", name: "U-13 Singles Boys", short: "U-13 Boys · Singles", fee: 1000, date: "2026-10-17", format: "Under 13 · Boys", squadSize: 1 },
      { id: "u13-girls-singles", name: "U-13 Singles Girls", short: "U-13 Girls · Singles", fee: 1000, date: "2026-10-17", format: "Under 13 · Girls", squadSize: 1 },
      { id: "u17-boys-singles", name: "U-17 Singles Boys", short: "U-17 Boys · Singles", fee: 1000, date: "2026-10-17", format: "Under 17 · Boys", squadSize: 1 },
      { id: "mixed-doubles", name: "Open Mixed Doubles", short: "Open · Mixed Doubles", fee: 2000, date: "2026-10-17", format: "Open · Mixed pair", squadSize: 2 },
      { id: "mens-singles", name: "Open Singles Men", short: "Men · Singles", fee: 1000, date: "2026-10-18", format: "Open · Men", squadSize: 1 },
      { id: "womens-singles", name: "Open Singles Women", short: "Women · Singles", fee: 1000, date: "2026-10-18", format: "Open · Women", squadSize: 1 },
      { id: "mens-doubles", name: "Doubles Men", short: "Men · Doubles", fee: 2000, date: "2026-10-18", format: "Open · Men", squadSize: 2 },
    ],
  },
  {
    id: "pickleball",
    name: "Pickleball",
    emoji: "🏓",
    accent: "#F5D000",
    tagline: "Fastest growing sport",
    description: "4 courts — 2 indoor AC and 2 outdoor courts.",
    mode: "individual",
    slotLength: "60 min per match slot",
    capacity: "5 categories",
    categories: [
      { id: "u14-singles", name: "Under 14 Singles", short: "Under 14 · Singles", fee: 1000, date: "2026-10-17", format: "Under 14", squadSize: 1 },
      { id: "u14-doubles", name: "Under 14 Doubles", short: "Under 14 · Doubles", fee: 1600, date: "2026-10-17", format: "Under 14", squadSize: 2 },
      { id: "mixed-doubles", name: "Open Mixed Doubles", short: "Open · Mixed Doubles", fee: 2400, date: "2026-10-17", format: "Open · Mixed pair", squadSize: 2 },
      { id: "open-singles", name: "Open Singles", short: "Open · Singles", fee: 1200, date: "2026-10-18", format: "Open category", squadSize: 1 },
      { id: "open-doubles", name: "Open Doubles", short: "Open · Doubles", fee: 2400, date: "2026-10-18", format: "Open category", squadSize: 2 },
    ],
  },
  {
    id: "cricket",
    name: "Box Cricket 7v7",
    emoji: "🏏",
    accent: "#34D399",
    tagline: "",
    description: "Box cricket arena — six overs a side, seven players a side.",
    mode: "team",
    slotLength: "60 min per match slot",
    capacity: "12 teams",
    categories: [
      {
        id: "team",
        name: "Team Entry (7v7)",
        short: "Team · 7v7",
        fee: 2000,
        date: "2026-10-18",
        format: "12 teams · 6 overs a side",
        squadSize: 7,
      },
    ],
  },
  {
    id: "football",
    name: "Football 6v6",
    emoji: "⚽",
    accent: "#38BDF8",
    tagline: "",
    description: "Box football arena — 6v6.",
    mode: "team",
    slotLength: "45 min per match slot",
    capacity: "8 teams",
    categories: [
      {
        id: "team",
        name: "Team Entry (6v6)",
        short: "Team · 6v6",
        fee: 2000,
        date: "2026-10-17",
        format: "8 teams · 30 minutes full time",
        squadSize: 6,
      },
    ],
  },
];

export function findSport(id: string | null | undefined): Sport | null {
  return SPORTS.find((sport) => sport.id === id) ?? null;
}

export function findCategory(
  sport: Sport | null,
  categoryId: string | null | undefined
): Category | null {
  if (!sport) return null;
  return sport.categories.find((category) => category.id === categoryId) ?? null;
}

/**
 * Resolves the bracket ids an entry holds, in the order the player picked them.
 * One entry can hold several brackets (Men's Singles + Men's Doubles), so every
 * screen works from this list rather than from a single category.
 */
export function findCategories(sport: Sport | null, ids: string[]): Category[] {
  if (!sport) return [];
  return [...new Set(ids)]
    .map((id) => sport.categories.find((category) => category.id === id) ?? null)
    .filter((category): category is Category => category !== null);
}

/** Tickets in an entry — one per player, across every bracket it holds. */
export function entryTickets(categories: Category[]): number {
  return categories.reduce((sum, category) => sum + category.squadSize, 0);
}

/** Entry fee for a set of brackets — the sum of their fees. */
export function entryFees(categories: Category[]): number {
  return categories.reduce((sum, category) => sum + category.fee, 0);
}

/** Sorted match days; a multi-category entry can span both tournament days. */
export function categoryDates(categories: { date: string }[]): string[] {
  return [...new Set(categories.map((category) => category.date))].sort();
}

export function categoryFeeUnit(category: Pick<Category, "squadSize">): string {
  return category.squadSize === 1 ? "person" : "team";
}

export function scheduleLabel(categories: { date: string }[]): string {
  const dates = categoryDates(categories);
  return dates.length ? dates.map(formatDayLabel).join(" & ") : "Select a category";
}

/* ────────────────────────────── Money ────────────────────────────── */

export function formatINR(value: number): string {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

/* ────────────────────────────── Add-ons ────────────────────────────── */

export interface AddOn {
  id: string;
  name: string;
  description: string;
  price: number;
  /** `player` multiplies by squad size, `team` is charged once per entry. */
  unit: "player" | "team";
  emoji: string;
}

export const ADD_ONS: AddOn[] = [
  {
    id: "jersey",
    name: "Official league jersey",
    description: "Dry-fit jersey with your name and squad number",
    price: 500,
    unit: "player",
    emoji: "👕",
  },
  {
    id: "recording",
    name: "Match photos & video recording",
    description: "Full-match video, edited highlights and the photo gallery",
    price: 999,
    unit: "team",
    emoji: "🎥",
  },
];

/* ────────────────────────────── Coupons ────────────────────────────── */

export interface Coupon {
  code: string;
  label: string;
  percent: number;
  minSubtotal: number;
}

export const COUPONS: Coupon[] = [
  { code: "EARLYBIRD", label: "15% off entries above ₹1,500", percent: 15, minSubtotal: 1500 },
];

export function findCoupon(code: string): Coupon | null {
  const clean = code.trim().toUpperCase();
  return COUPONS.find((coupon) => coupon.code === clean) ?? null;
}

/* ────────────────────────────── Slots ────────────────────────────── */

export type SlotPeriod = "Morning" | "Afternoon" | "Evening" | "Night";
export type SlotState = "open" | "filling" | "full";

export interface Slot {
  time: string;
  period: SlotPeriod;
  left: number;
  state: SlotState;
}

const SLOT_TIMES: { time: string; period: SlotPeriod }[] = [
  { time: "7:00 AM", period: "Morning" },
  { time: "8:00 AM", period: "Morning" },
  { time: "9:00 AM", period: "Morning" },
  { time: "10:00 AM", period: "Morning" },
  { time: "12:00 PM", period: "Afternoon" },
  { time: "1:00 PM", period: "Afternoon" },
  { time: "2:00 PM", period: "Afternoon" },
  { time: "3:00 PM", period: "Afternoon" },
  { time: "4:00 PM", period: "Evening" },
  { time: "5:00 PM", period: "Evening" },
  { time: "6:00 PM", period: "Evening" },
  { time: "7:00 PM", period: "Evening" },
  { time: "8:00 PM", period: "Night" },
  { time: "9:00 PM", period: "Night" },
  { time: "10:00 PM", period: "Night" },
];

export const SLOT_PERIODS: SlotPeriod[] = ["Morning", "Afternoon", "Evening", "Night"];

/**
 * Deterministic FNV-1a hash — the same sport + date always renders the same
 * availability on the server and on the client, so there is no hydration skew.
 */
function hash(input: string): number {
  let value = 2166136261;
  for (let i = 0; i < input.length; i += 1) {
    value ^= input.charCodeAt(i);
    value = Math.imul(value, 16777619);
  }
  return Math.abs(value);
}

export function slotsFor(sport: SportId, date: string): Slot[] {
  return SLOT_TIMES.map((slot) => {
    const seed = hash(`${sport}:${date}:${slot.time}`);
    if (seed % 9 === 0) return { ...slot, left: 0, state: "full" as SlotState };
    const left = 1 + (seed % 5);
    return { ...slot, left, state: left <= 2 ? ("filling" as SlotState) : ("open" as SlotState) };
  });
}

export interface DayOption {
  iso: string;
  weekday: string;
  date: string;
  month: string;
  isToday: boolean;
}

/** The next `count` days for the date strip. */
export function upcomingDays(count = 12): DayOption[] {
  const today = new Date();
  return Array.from({ length: count }, (_, index) => {
    const day = new Date(today.getFullYear(), today.getMonth(), today.getDate() + index);
    const iso = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(
      day.getDate()
    ).padStart(2, "0")}`;
    return {
      iso,
      weekday: index === 0 ? "Today" : day.toLocaleDateString("en-IN", { weekday: "short" }),
      date: String(day.getDate()).padStart(2, "0"),
      month: day.toLocaleDateString("en-IN", { month: "short" }),
      isToday: index === 0,
    };
  });
}

export function formatDayLabel(iso: string | null): string {
  if (!iso) return "Select a date";
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/* ─────────────────────── Home screen content ─────────────────────── */

export interface HeroSlide {
  id: string;
  image: string;
  kicker: string;
  title: string;
  highlight: string;
  copy: string;
  cta: string;
  href: string;
}

export const HERO_SLIDES: HeroSlide[] = [
  {
    id: "indoor",
    image: "/ac-indoor.jpeg",
    kicker: "League · Indoor Courts",
    title: "Indoor Courts.",
    highlight: "All Weather.",
    copy: "Air-conditioned badminton and pickleball, open till late.",
    cta: "Book badminton",
    href: "/gameon-multisports-league/sports/badminton",
  },
  {
    id: "turf",
    image: "/outdoor.jpeg",
    kicker: "League · Astro Turf",
    title: "Turf Under",
    highlight: "Floodlights.",
    copy: "Box cricket 7v7 and football 6v6 on a 100 × 60 ft arena.",
    cta: "Book the turf",
    href: "/gameon-multisports-league/sports/cricket",
  },
  {
    id: "season",
    image: "/hero_background.png",
    kicker: "Game On Multisports League · Season 1",
    title: "4 Sports.",
    highlight: "One Arena.",
    copy: "4 sports, 14 categories and a ₹3 lakh+ overall prize pool on 17 & 18 October 2026.",
    cta: "See all sports",
    href: "/gameon-multisports-league/sports",
  },
];

export type FacilityIcon = "climate" | "floor" | "open" | "nets";

export interface Facility {
  icon: FacilityIcon;
  title: string;
  copy: string;
}

export const FACILITIES: Facility[] = [
  { icon: "climate", title: "Climate Control", copy: "Premium AC indoor courts" },
  { icon: "floor", title: "Pro Flooring", copy: "Synthetic & wooden surfaces" },
  { icon: "open", title: "Open Air", copy: "Premium outdoor courts" },
  { icon: "nets", title: "Practice Nets", copy: "Dedicated turf & boxes" },
];

export interface FlowStep {
  step: string;
  title: string;
  copy: string;
}

export const FLOW_STEPS: FlowStep[] = [
  { step: "01", title: "Pick your sport", copy: "Badminton, pickleball, box cricket or football." },
  { step: "02", title: "Choose a category", copy: "Singles, doubles, mixed doubles or a team entry." },
  { step: "03", title: "Review your entry", copy: "Check each category's fixed match day, your details and entry fees." },
  { step: "04", title: "Pay & get your pass", copy: "Pay securely through Razorpay and get your confirmation pass." },
];

export interface LeagueEvent {
  id: string;
  name: string;
  sport: string;
  period: string;
  day: string;
  venue: string;
  entry: string;
  bracket: string;
  filled: number;
  status: "Registration open" | "Few slots left" | "Waitlist";
  href: string;
}

export const LEAGUE_EVENTS: LeagueEvent[] = [
  {
    id: "badminton-open",
    name: "Badminton Open",
    sport: "Badminton",
    period: "17 – 18 Oct 2026",
    day: "Sat & Sun",
    venue: "Indoor Courts · Zone A",
    entry: "from ₹1,000",
    bracket: "U-13 · U-17 · Open singles & doubles",
    filled: 64,
    status: "Registration open",
    href: "/gameon-multisports-league/sports/badminton",
  },
  {
    id: "pickleball-championship",
    name: "Pickleball Championship",
    sport: "Pickleball",
    period: "17 – 18 Oct 2026",
    day: "Sat & Sun",
    venue: "Indoor + Outdoor · Zone B",
    entry: "from ₹1,000",
    bracket: "Under 14 · Open singles, doubles & mixed doubles",
    filled: 52,
    status: "Registration open",
    href: "/gameon-multisports-league/sports/pickleball",
  },
  {
    id: "box-cricket-league",
    name: "Box Cricket 7v7 League",
    sport: "Cricket",
    period: "18 Oct 2026",
    day: "Sun",
    venue: "Astro Turf Arena · Zone C",
    entry: "₹2,000 / team",
    bracket: "12 teams · 6 overs a side",
    filled: 83,
    status: "Few slots left",
    href: "/gameon-multisports-league/sports/cricket",
  },
  {
    id: "football-6v6-cup",
    name: "Football 6v6 Cup",
    sport: "Football",
    period: "17 Oct 2026",
    day: "Sat",
    venue: "Astro Turf Arena · Zone C",
    entry: "₹2,000 / team",
    bracket: "8 teams · 30 minutes full time",
    filled: 71,
    status: "Registration open",
    href: "/gameon-multisports-league/sports/football",
  },
];

export interface EventStat {
  value: string;
  label: string;
}

/** Multisports League registration statistics. */
export const EVENT_STATS: EventStat[] = [
  { value: "₹3 lakh+", label: "Overall prize pool" },
  { value: "4", label: "Sports" },
  { value: String(SPORTS.reduce((sum, sport) => sum + sport.categories.length, 0)), label: "Categories" },
  { value: "20", label: "Teams on the turf" },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Who can register for Game On Multisports League?",
    a: "Choose an age-appropriate category: U-13 Boys/Girls or U-17 Boys in badminton, Under 14 in pickleball, or an open category. Team entries are box cricket 7v7 and football 6v6.",
  },
  {
    q: "What is included in the entry fee?",
    a: "Your match slots, courts or turf, match officials, shuttles, balls and stumps, plus medals, trophies and certificates for the winners.",
  },
  {
    q: "How many matches do I get to play?",
    a: "Every entry is guaranteed a minimum of two league matches. Doubles entries are guaranteed at least three games per match.",
  },
  {
    q: "When will I play?",
    a: "Every category has a fixed date, shown before you register. Football is on 17 October and Cricket on 18 October 2026. Badminton and pickleball categories run across both days. Organisers share exact match timings separately.",
  },
  {
    q: "Do you offer refunds?",
    a: "Entries cancelled more than 72 hours before the event get a full refund to the original payment method. After that the entry is transferable.",
  },
];

export const LEAGUE_PROMO = {
  code: "EARLYBIRD",
  title: "Get 15% Off Your Entry",
  copy: "Use code EARLYBIRD on entries above ₹1,500.",
};
