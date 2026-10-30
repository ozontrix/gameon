import type { SportKind } from "@/lib/mobile/constants/sports";

export const WEB_APP_HREF = "/app";
export const SPORTS_APP_HREF = "/app/sports";

export function sportBookingHref(sport?: string) {
  const filters: Record<string, string> = {
    pickleball: "pickleball", badminton: "badminton",
    "box-cricket": "cricket&sport=football", "cricket-nets": "cricket",
    cricket: "cricket", football: "football",
  };
  return sport && filters[sport] ? `${SPORTS_APP_HREF}?sport=${filters[sport]}` : SPORTS_APP_HREF;
}

export const homepageSports: { id: SportKind; label: string; image: string; detail: string }[] = [
  { id: "pickleball", label: "Pickleball", image: "/sports/pickleball.png", detail: "Indoor AC + outdoor courts" },
  { id: "badminton", label: "Badminton", image: "/sports/badminton.png", detail: "AC + non-AC indoor courts" },
  { id: "cricket", label: "Cricket", image: "/sports/cricket.png", detail: "Practice nets + box cricket turf" },
  { id: "football", label: "Football", image: "/sports/football.png", detail: "Floodlit shared astro turf" },
];

// Publish only configured store listings; never send visitors to fake downloads.
function storeUrl(value: string | undefined, hostname: string) {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname === hostname && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export const appStoreLinks = {
  android: storeUrl(process.env.NEXT_PUBLIC_GAMEON_PLAY_STORE_URL, "play.google.com"),
  ios: storeUrl(process.env.NEXT_PUBLIC_GAMEON_APP_STORE_URL, "apps.apple.com"),
};