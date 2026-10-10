import Image from "next/image";
import Link from "next/link";
import { ArrowRight, CalendarDays, MapPin, Music2, Trophy, Users } from "lucide-react";
import { pageMetadata } from "@/lib/seo";
import { Breadcrumbs } from "@/components/seo/breadcrumbs";

export const metadata = pageMetadata({
  title: "October Events — Sportsx Dandia & Multi Sports League",
  path: "/gameon-multisports-league",
  description:
    "Choose your next Game On event at Sector 70, Gurugram: Sportsx Dandia open play on 18 October 2026 or GameOn Multi Sports League on 24–25 October 2026. Register for open play or explore the league's sports and categories.",
});

const events = [
  {
    id: "sportsx-dandia",
    name: "Sportsx Dandia",
    category: "Open play · Meet & play",
    date: "18",
    dateLabel: "18 October 2026",
    day: "Sunday",
    image: "/outdoor.jpeg",
    imageAlt: "Outdoor courts and sports turf at Game On, Gurugram",
    description:
      "Come for the games. Stay for the vibe. A day of open play, new connections and a little dandiya to round out the evening.",
    highlights: [
      { icon: Users, label: "Open play" },
      { icon: Music2, label: "Dandiya & evening vibes" },
    ],
    href: "/open-play-registrations",
    action: "Register for open play",
    accent: "text-[#D8C4FF]",
    badge: "border-[#D8C4FF]/30 bg-[#D8C4FF]/15 text-[#D8C4FF]",
    hover: "hover:border-[#D8C4FF]/60",
    button: "bg-[#D8C4FF] text-go-black group-hover:bg-[#E7DBFF]",
  },
  {
    id: "multisports-league",
    name: "GameOn Multi Sports League",
    category: "Tournament · Bring your game",
    date: "24–25",
    dateLabel: "24–25 October 2026",
    day: "Saturday & Sunday",
    image: "/ac-indoor.jpeg",
    imageAlt: "Indoor badminton and pickleball courts at Game On, Gurugram",
    description:
      "Your sport. Your squad. Your moment. Take on the competition in badminton, pickleball, box cricket or football.",
    highlights: [
      { icon: Trophy, label: "4 sports" },
      { icon: Users, label: "Singles, doubles & teams" },
    ],
    href: "/gameon-multisports-league-updated",
    action: "Explore the league",
    accent: "text-go-brand",
    badge: "border-go-brand/30 bg-go-brand/15 text-go-brand",
    hover: "hover:border-go-brand/60",
    button: "bg-go-brand text-go-black group-hover:bg-[#FFA654]",
  },
] as const;

export default function MultisportsLeagueHome() {
  return (
    <div className="pb-2 sm:pb-6">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Game On Events", path: "/gameon-multisports-league" }]} />

      <header className="mb-8 sm:mb-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Image
            src="/game_on.png"
            alt="Game On"
            width={893}
            height={250}
            sizes="150px"
            className="h-9 w-auto object-contain sm:h-10"
          />
          <span className="inline-flex items-center gap-2 rounded-full border border-go-brand/25 bg-go-brand/10 px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-go-brand">
            <CalendarDays className="size-4" aria-hidden="true" />
            October 2026
          </span>
        </div>

        <p className="mt-7 font-mono text-xs uppercase tracking-[0.2em] text-go-off/70">Two events. One Game On.</p>
        <h1 className="mt-3 font-display text-[clamp(2.5rem,6vw,4.5rem)] uppercase leading-[1.05] text-go-white">
          Choose your kind<br className="sm:hidden" /> of <span className="text-go-brand">game.</span>
        </h1>
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-go-off/75">
          Play for the good times or compete for the glory. Pick your event and we’ll take you to the next step.
        </p>
        <p className="mt-4 flex items-center gap-2 text-sm text-go-off/70">
          <MapPin className="size-4 shrink-0 text-go-brand" aria-hidden="true" />
          Game On · Sector 70, Gurugram
        </p>
      </header>

      <section aria-label="Choose a Game On event" className="grid gap-5 md:grid-cols-2 md:gap-6">
        {events.map((event) => (
          <Link
            key={event.id}
            href={event.href}
            aria-labelledby={`${event.id}-title ${event.id}-action`}
            aria-describedby={`${event.id}-date`}
            data-event={event.id}
            className={`group flex min-w-0 cursor-pointer flex-col overflow-hidden rounded-[24px] border border-white/15 bg-go-navy/60 shadow-xl transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand motion-reduce:transition-none ${event.hover}`}
          >
            <div className="relative h-52 overflow-hidden bg-go-navy sm:h-60 lg:h-64">
              <Image
                src={event.image}
                alt={event.imageAlt}
                fill
                sizes="(max-width: 767px) calc(100vw - 32px), (max-width: 1152px) calc(50vw - 36px), 540px"
                loading="eager"
                className="object-cover"
              />
              <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-go-black/80 via-go-black/15 to-go-black/25" />
              <span className={`absolute left-5 top-5 inline-flex items-center rounded-full border bg-go-black/85 px-3 py-2 text-xs font-semibold backdrop-blur-sm ${event.accent} ${event.id === "sportsx-dandia" ? "border-[#D8C4FF]/40" : "border-go-brand/40"}`}>
                {event.id === "sportsx-dandia" ? "Play & celebrate" : "Compete & conquer"}
              </span>
              <div id={`${event.id}-date`} className="absolute inset-x-5 bottom-5 flex flex-wrap items-end justify-between gap-3 text-go-white">
                <div>
                  <span className="sr-only">{event.dateLabel}</span>
                  <div aria-hidden="true" className={`font-display text-5xl leading-none sm:text-6xl ${event.accent}`}>{event.date}</div>
                  <div aria-hidden="true" className="mt-2 font-mono text-xs uppercase tracking-[0.18em]">October 2026</div>
                </div>
                <span className="rounded-full border border-white/20 bg-go-black/75 px-3 py-2 text-xs font-medium">{event.day}</span>
              </div>
            </div>

            <div className="flex flex-1 flex-col p-5 sm:p-7">
              <p className={`font-mono text-[11px] uppercase tracking-[0.13em] ${event.accent}`}>{event.category}</p>
              <h2 id={`${event.id}-title`} className="mt-3 font-display text-3xl uppercase leading-tight text-go-white sm:text-4xl">
                {event.name}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-go-off/75">{event.description}</p>

              <div className="mb-6 mt-5 flex flex-wrap gap-2">
                {event.highlights.map(({ icon: Icon, label }) => (
                  <span key={label} className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-medium ${event.badge}`}>
                    <Icon className="size-3.5 shrink-0" aria-hidden="true" />
                    {label}
                  </span>
                ))}
              </div>

              <span id={`${event.id}-action`} className={`mt-auto flex min-h-12 items-center justify-between gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-colors duration-200 motion-reduce:transition-none ${event.button}`}>
                {event.action}
                <ArrowRight className="size-5 shrink-0" aria-hidden="true" />
              </span>
            </div>
          </Link>
        ))}
      </section>

      <p className="mt-6 text-center text-sm leading-relaxed text-go-off/65">
        Different ways to play. The same love for the game.
      </p>
    </div>
  );
}
