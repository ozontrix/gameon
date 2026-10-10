import { OPEN_PLAY_DATE_LABEL } from "@/lib/open-play/constants";

export interface HomeHighlight {
  id: string;
  label: string;
  eyebrow: string;
  title: string;
  accent: string;
  description: string;
  detail: string;
  image: string;
  imageAlt: string;
  imagePosition: string;
  imageFit: "cover" | "contain";
  href: string;
  cta: string;
}

// Replace these venue photos with campaign artwork in /public/home-highlights.
// Use imageFit: "contain" for posters so dates and text are never cropped.
// Add another entry here to add a slide; the controls update automatically.
export const homeHighlights: HomeHighlight[] = [
  {
    id: "open-play",
    label: "Open play",
    eyebrow: "Meet. Play. Belong.",
    title: "YOUR NEXT GAME.",
    accent: "YOUR NEW SQUAD.",
    description: "Four sports. Fresh faces. One great day out. Join us for open play and find your people on the court.",
    detail: OPEN_PLAY_DATE_LABEL,
    image: "/outdoor.jpeg",
    imageAlt: "Game On's outdoor courts and sports turf in Gurugram",
    imagePosition: "center",
    imageFit: "cover",
    href: "/open-play-registrations",
    cta: "Register for open play",
  },
  {
    id: "multisports-league",
    label: "Multi Sports League",
    eyebrow: "The stage is yours.",
    title: "BRING YOUR GAME.",
    accent: "MAKE YOUR MARK.",
    description: "Game On Multi Sports League brings badminton, pickleball, box cricket and football together. Explore the categories and get your squad in.",
    detail: "Game On Multi Sports League",
    image: "/ac-indoor.jpeg",
    imageAlt: "Game On's indoor badminton and pickleball courts",
    imagePosition: "center",
    imageFit: "cover",
    href: "/gameon-multisports-league",
    cta: "Explore the league",
  },
];