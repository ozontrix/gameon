/**
 * Game On Olympics — content for the booking flow.
 *
 * UI/UX prototype: every sport, category, fee, slot and add-on lives in this
 * one file so the screens can never drift apart. When the flow goes live these
 * constants are swapped for API responses (/api/v1/public/sports/catalog).
 *
 * Fees mirror the Game On Olympics registration sheet:
 *   Pickleball  MS ₹800 · MD ₹1,500 · WS ₹800 · WD ₹1,500 · XD ₹800
 *   Badminton   MS ₹1,000 · MD ₹1,800 · WS ₹1,000 · WD ₹1,800 · XD ₹1,800
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
  tagline: string;
  description: string;
  mode: EntryMode;
  venue: string;
  surface: string;
  slotLength: string;
  format: string;
  capacity: string;
  categories: Category[];
  highlights: string[];
  rules: string[];
}

export const SPORTS: Sport[] = [
  {
    id: "badminton",
    name: "Badminton",
    emoji: "🏸",
    accent: "#A855F7",
    tagline: "All-time classic",
    description:
      "5 synthetic courts — 2 air-conditioned & 3 indoor — with BWF-grade flooring and shuttles on the house.",
    mode: "individual",
    venue: "Indoor Courts · Zone A",
    surface: "BWF-grade synthetic",
    slotLength: "60 min per match slot",
    format: "League + knockout · best of 3 games to 21",
    capacity: "104 player entries",
    highlights: [
      "2 AC + 3 non-AC courts",
      "Shuttles provided every match",
      "Medals, trophies & certificates",
    ],
    rules: [
      "Best of 3 games, 21 points, rally point scoring.",
      "Umpire decision is final; shuttle changed every 11 points.",
      "Report 15 minutes before your slot.",
    ],
    categories: [
      { id: "mens-singles", name: "Men's Singles", short: "Men's · Singles", fee: 1000, format: "32 entries", squadSize: 1 },
      { id: "mens-doubles", name: "Men's Doubles", short: "Men's · Doubles", fee: 1800, format: "32 entries", squadSize: 2 },
      { id: "womens-singles", name: "Women's Singles", short: "Women's · Singles", fee: 1000, format: "16 entries", squadSize: 1 },
      { id: "womens-doubles", name: "Women's Doubles", short: "Women's · Doubles", fee: 1800, format: "8 entries", squadSize: 2 },
      { id: "mixed-doubles", name: "Mixed Doubles", short: "Mixed · Doubles", fee: 1800, format: "16 entries", squadSize: 2 },
    ],
  },
  {
    id: "pickleball",
    name: "Pickleball",
    emoji: "🏓",
    accent: "#F5D000",
    tagline: "Fastest growing sport",
    description:
      "2 premium indoor AC courts + 2 outdoor courts, with pro-grade paddles and balls included for every match.",
    mode: "individual",
    venue: "Indoor + Outdoor Courts · Zone B",
    surface: "Cushioned acrylic",
    slotLength: "60 min per match slot",
    format: "Round robin pools → semifinals → final",
    capacity: "80 player entries",
    highlights: [
      "2 Indoor AC + 2 Outdoor",
      "Paddles & balls provided",
      "Beginner-friendly brackets",
    ],
    rules: [
      "Games to 11 points, win by 2, best of 3.",
      "Double bounce rule and non-volley zone apply.",
      "Bring your own paddle or use the venue's pro paddles.",
    ],
    categories: [
      { id: "mens-singles", name: "Men's Singles", short: "Men's · Singles", fee: 800, format: "32 entries", squadSize: 1 },
      { id: "mens-doubles", name: "Men's Doubles", short: "Men's · Doubles", fee: 1500, format: "16 entries", squadSize: 2 },
      { id: "womens-singles", name: "Women's Singles", short: "Women's · Singles", fee: 800, format: "16 entries", squadSize: 1 },
      { id: "womens-doubles", name: "Women's Doubles", short: "Women's · Doubles", fee: 1500, format: "8 entries", squadSize: 2 },
      { id: "mixed-doubles", name: "Mixed Doubles", short: "Mixed · Doubles", fee: 800, format: "8 entries", squadSize: 2 },
    ],
  },
  {
    id: "cricket",
    name: "Box Cricket 7v7",
    emoji: "🏏",
    accent: "#34D399",
    tagline: "Shared turf arena",
    description:
      "100 × 60 ft astroturf arena under floodlights with a digital scoreboard — 6 overs a side, 7 players a side.",
    mode: "team",
    venue: "Astro Turf Arena · Zone C",
    surface: "Astro turf, floodlit",
    slotLength: "60 min per match slot",
    format: "7v7 · 6 overs a side · league + playoffs",
    capacity: "12 teams",
    highlights: ["6 overs a side, 7v7", "Floodlit evening slots", "Live digital scoreboard"],
    rules: [
      "Maximum 6 overs per innings, 7 players a side.",
      "Squad of 10 allowed — 3 rolling substitutes.",
      "Two sets of stumps, bats and balls provided.",
    ],
    categories: [
      {
        id: "team",
        name: "Team Entry (7v7)",
        short: "Team · 7v7",
        fee: 2000,
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
    tagline: "Turf under floodlights",
    description:
      "6v6 on the same astro turf arena — 30 minutes full time, rolling subs and a referee for every game.",
    mode: "team",
    venue: "Astro Turf Arena · Zone C",
    surface: "Astro turf, floodlit",
    slotLength: "45 min per match slot",
    format: "6v6 · 30 minutes full time · league + playoffs",
    capacity: "8 teams",
    highlights: ["6v6 · 30 minutes full time", "Referee & scoreboard", "Rolling substitutions"],
    rules: [
      "30 minutes full time, 15-minute halves.",
      "Rolling substitutions; studs are not permitted on turf.",
      "Match ball and bibs provided by the venue.",
    ],
    categories: [
      {
        id: "team",
        name: "Team Entry (6v6)",
        short: "Team · 6v6",
        fee: 2000,
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

/* ────────────────────────────── Money ────────────────────────────── */

export const PLATFORM_FEE = 49;
export const GST_RATE = 0.18;

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
    name: "Official Olympics jersey",
    description: "Dry-fit jersey with your name and squad number",
    price: 500,
    unit: "player",
    emoji: "👕",
  },
  {
    id: "merch",
    name: "Fan merch kit",
    description: "Event tee, cap and sticker pack",
    price: 250,
    unit: "player",
    emoji: "🧢",
  },
  {
    id: "recording",
    name: "Match recording & photos",
    description: "Full-match footage plus an edited highlights reel",
    price: 999,
    unit: "team",
    emoji: "🎥",
  },
  {
    id: "physio",
    name: "Physio & recovery desk",
    description: "On-court taping, ice bath and recovery drinks",
    price: 399,
    unit: "team",
    emoji: "🧊",
  },
  {
    id: "pizza",
    name: "Pizza & drinks combo",
    description: "Squad refuel right after the match",
    price: 249,
    unit: "player",
    emoji: "🍕",
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
  { code: "GAMEON10", label: "10% off your entry", percent: 10, minSubtotal: 0 },
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
    kicker: "Olympics · Indoor Courts",
    title: "Indoor Courts.",
    highlight: "All Weather.",
    copy: "Air-conditioned badminton and pickleball, open till late.",
    cta: "Book badminton",
    href: "/gameon-olympics/sports/badminton",
  },
  {
    id: "turf",
    image: "/outdoor.jpeg",
    kicker: "Olympics · Astro Turf",
    title: "Turf Under",
    highlight: "Floodlights.",
    copy: "Box cricket 7v7 and football 6v6 on a 100 × 60 ft arena.",
    cta: "Book the turf",
    href: "/gameon-olympics/sports/cricket",
  },
  {
    id: "season",
    image: "/hero_background.png",
    kicker: "Game On Olympics · Season 1",
    title: "4 Sports.",
    highlight: "One Arena.",
    copy: "204 entries, 8 categories, trophies, medals and jerseys to win.",
    cta: "See all sports",
    href: "/gameon-olympics/sports",
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
  { step: "03", title: "Lock your slot", copy: "Pick a date and a match slot that suits your squad." },
  { step: "04", title: "Pay & get your pass", copy: "UPI, card, netbanking — or pay at the venue." },
];

export interface OlympicsEvent {
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

export const OLYMPICS_EVENTS: OlympicsEvent[] = [
  {
    id: "badminton-open",
    name: "Badminton Open",
    sport: "Badminton",
    period: "12 – 13 Dec 2026",
    day: "Sat & Sun",
    venue: "Indoor Courts · Zone A",
    entry: "from ₹1,000",
    bracket: "MS · MD · WS · WD · XD",
    filled: 64,
    status: "Registration open",
    href: "/gameon-olympics/sports/badminton",
  },
  {
    id: "pickleball-championship",
    name: "Pickleball Championship",
    sport: "Pickleball",
    period: "13 – 14 Dec 2026",
    day: "Sun & Mon",
    venue: "Indoor + Outdoor · Zone B",
    entry: "from ₹800",
    bracket: "MS · MD · WS · WD · XD",
    filled: 52,
    status: "Registration open",
    href: "/gameon-olympics/sports/pickleball",
  },
  {
    id: "box-cricket-league",
    name: "Box Cricket 7v7 League",
    sport: "Cricket",
    period: "19 – 20 Dec 2026",
    day: "Sat & Sun",
    venue: "Astro Turf Arena · Zone C",
    entry: "₹2,000 / team",
    bracket: "12 teams · 6 overs a side",
    filled: 83,
    status: "Few slots left",
    href: "/gameon-olympics/sports/cricket",
  },
  {
    id: "football-6v6-cup",
    name: "Football 6v6 Cup",
    sport: "Football",
    period: "26 – 27 Dec 2026",
    day: "Sat & Sun",
    venue: "Astro Turf Arena · Zone C",
    entry: "₹2,000 / team",
    bracket: "8 teams · 30 minutes full time",
    filled: 71,
    status: "Registration open",
    href: "/gameon-olympics/sports/football",
  },
];

export interface EventStat {
  value: string;
  label: string;
}

/** Straight from the Olympics registration sheet. */
export const EVENT_STATS: EventStat[] = [
  { value: "204", label: "Player entries" },
  { value: "4", label: "Sports" },
  { value: "8", label: "Categories" },
  { value: "20", label: "Teams on the turf" },
];

export interface Faq {
  q: string;
  a: string;
}

export const FAQS: Faq[] = [
  {
    q: "Who can register for Game On Olympics?",
    a: "Anyone 14 and above. Pick an individual bracket (singles, doubles, mixed doubles) or bring a squad for box cricket 7v7 and football 6v6.",
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
    q: "Can I change my slot after booking?",
    a: "Yes — you can move to another open slot up to 24 hours before your first match from My Bookings, subject to availability.",
  },
  {
    q: "Do you offer refunds?",
    a: "Entries cancelled more than 72 hours before the event get a full refund to the original payment method. After that the entry is transferable.",
  },
];

export const OLYMPICS_PROMO = {
  code: "GAMEON10",
  title: "Get 10% Off Your Next Game",
  copy: "Use code GAMEON10 at checkout.",
};
