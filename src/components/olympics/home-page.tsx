"use client";

/**
 * Game On Olympics — main landing screen.
 *
 * This is the entry point of the Olympics flow: greeting, hero carousel,
 * sport tiles, the running promo, tournaments, venue features, how the
 * booking flow works, event stats and FAQs.
 */

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  ChevronDown,
  ChevronRight,
  Layers,
  MapPin,
  RefreshCw,
  Settings,
  Snowflake,
  Sun,
  Target,
  Trophy,
  Zap,
} from "lucide-react";
import {
  EVENT_STATS,
  FACILITIES,
  FAQS,
  FLOW_STEPS,
  HERO_SLIDES,
  OLYMPICS_EVENTS,
  OLYMPICS_PROMO,
  SPORTS,
  formatINR,
  type FacilityIcon,
} from "@/components/olympics/data";
import {
  Button,
  Chip,
  IconTile,
  Kicker,
  Panel,
  Progress,
  SectionTitle,
} from "@/components/olympics/ui";
import { cn } from "@/lib/utils";

const FACILITY_ICONS: Record<FacilityIcon, typeof Snowflake> = {
  climate: Snowflake,
  floor: Layers,
  open: Sun,
  nets: Target,
};

function greetingFor(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/** Auto-advancing hero carousel — three venue stories. */
function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const slide = HERO_SLIDES[index];

  useEffect(() => {
    const timer = setInterval(() => {
      setIndex((current) => (current + 1) % HERO_SLIDES.length);
    }, 5200);
    return () => clearInterval(timer);
  }, []);

  return (
    <section className="relative mb-6">
      <div className="relative h-[380px] overflow-hidden rounded-[26px] border border-white/10 sm:h-[400px] lg:h-[430px]">
        <AnimatePresence initial={false}>
          <motion.div
            key={slide.id}
            className="absolute inset-0"
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Image
              src={slide.image}
              alt=""
              fill
              sizes="(max-width: 1024px) 100vw, 1100px"
              className="object-cover"
              priority
            />
          </motion.div>
        </AnimatePresence>

        <div className="absolute inset-0 bg-gradient-to-t from-go-black via-go-black/65 to-go-black/10" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <Kicker>{slide.kicker}</Kicker>
          <motion.h2
            key={`${slide.id}-title`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mt-2 font-display text-3xl uppercase leading-[0.95] text-go-white sm:text-4xl lg:text-5xl"
          >
            {slide.title}
            <br />
            <span className="text-go-brand">{slide.highlight}</span>
          </motion.h2>
          <p className="mt-3 max-w-md text-sm text-go-off/70">{slide.copy}</p>

          <div className="mt-5 flex items-center gap-3">
            <Button href={slide.href} size="md">
              {slide.cta}
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button href="/gameon-olympics/events" variant="ghost" size="md">
              Events
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-2">
            {HERO_SLIDES.map((item, itemIndex) => (
              <button
                key={item.id}
                type="button"
                aria-label={`Show ${item.kicker}`}
                onClick={() => setIndex(itemIndex)}
                className={cn(
                  "h-1.5 rounded-full transition-all",
                  itemIndex === index ? "w-6 bg-go-brand" : "w-1.5 bg-white/35 hover:bg-white/60"
                )}
              />
            ))}
            <span className="ml-auto hidden items-center gap-1.5 text-[10px] uppercase tracking-[0.16em] text-go-off/40 sm:flex">
              <RefreshCw className="h-3 w-3" />
              {index + 1} / {HERO_SLIDES.length}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function GameOnOlympicsHome() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <div className="pb-2">
      {/* ─── Greeting ─── */}
      <div className="mb-5 flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-[26px] uppercase leading-tight text-go-white sm:text-3xl">
            <span suppressHydrationWarning>{greetingFor(new Date().getHours())},</span>{" "}
            <span className="text-go-brand">Chander</span> 👋
          </h1>
          <p className="mt-1 text-sm text-go-off/55">Ready for your next game?</p>
        </div>
        <Link
          href="/gameon-olympics/account"
          aria-label="Account settings"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-go-brand/40 bg-go-brand/15 text-go-brand transition-transform active:scale-95"
        >
          <Settings className="h-5 w-5" />
        </Link>
      </div>

      <HeroCarousel />

      {/* ─── Sport tiles ─── */}
      <section className="mb-6">
        <SectionTitle title="Olympics Sports" action="All sports" href="/gameon-olympics/sports" />
        <div className="grid grid-cols-4 gap-2.5 sm:gap-3">
          {SPORTS.map((sport) => (
            <Link
              key={sport.id}
              href={`/gameon-olympics/sports/${sport.id}`}
              className="group flex flex-col items-center gap-2 rounded-[20px] border border-white/[0.07] bg-white/[0.03] px-2 py-3 text-center transition-all hover:border-go-brand/40 hover:bg-go-brand/[0.07] active:scale-[0.97]"
            >
              <IconTile emoji={sport.emoji} accent={sport.accent} />
              <span className="text-[11px] font-semibold leading-tight text-go-white">
                {sport.name.replace("Box Cricket 7v7", "Box Cricket").replace(" 6v6", "")}
              </span>
              <span className="font-mono text-[9px] uppercase tracking-wider text-go-off/40">
                from {formatINR(Math.min(...sport.categories.map((c) => c.fee)))}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* ─── Promo ─── */}
      <section className="mb-6">
        <Panel className="border-go-brand/25 bg-go-brand/[0.08]">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Kicker>{OLYMPICS_PROMO.code === "GAMEON10" ? "Special offer" : "Offer"}</Kicker>
                <Chip tone="brand" icon={Zap}>
                  NEW
                </Chip>
              </div>
              <h3 className="mt-2 font-display text-xl uppercase leading-tight text-go-white sm:text-2xl">
                {OLYMPICS_PROMO.title}
              </h3>
              <p className="mt-1.5 text-[13px] text-go-off/60">{OLYMPICS_PROMO.copy}</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="rounded-full border border-dashed border-go-brand/50 bg-go-black/40 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-go-brand">
                  {OLYMPICS_PROMO.code}
                </span>
                <Button href="/gameon-olympics/sports" size="sm" variant="ghost">
                  Use it
                  <ChevronRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
            <span className="hidden text-5xl sm:block" aria-hidden>
              🏸
            </span>
          </div>
        </Panel>
      </section>

      {/* ─── Tournaments ─── */}
      <section className="mb-6">
        <Panel className="bg-white/[0.04]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-go-brand/30 bg-go-brand/15 text-go-brand">
              <Trophy className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display text-lg uppercase leading-tight text-go-white">
                Tournaments &amp; Events
              </h3>
              <p className="mt-0.5 text-[13px] text-go-off/55">
                Join our competitive leagues and open plays.
              </p>
            </div>
            <Button href="/gameon-olympics/events" size="sm" className="shrink-0">
              Explore
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Panel>
      </section>

      {/* ─── Upcoming brackets ─── */}
      <section className="mb-6">
        <SectionTitle
          title="Registration Open"
          action="All events"
          href="/gameon-olympics/events"
        />
        <div className="grid gap-3 lg:grid-cols-2">
          {OLYMPICS_EVENTS.slice(0, 2).map((event) => (
            <Panel key={event.id} className="flex flex-col">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="font-display text-lg uppercase leading-tight text-go-white">
                    {event.name}
                  </h3>
                  <p className="mt-1 text-[12px] text-go-off/50">
                    {event.period} · {event.day}
                  </p>
                </div>
                <Chip tone={event.status === "Few slots left" ? "warn" : "success"}>
                  {event.status}
                </Chip>
              </div>

              <p className="mt-3 text-[13px] text-go-off/65">{event.bracket}</p>

              <div className="mt-3">
                <div className="mb-1.5 flex items-center justify-between text-[11px] text-go-off/45">
                  <span>Bracket filled</span>
                  <span className="font-mono text-go-off/70">{event.filled}%</span>
                </div>
                <Progress value={event.filled} tone={event.filled > 80 ? "warn" : "brand"} />
              </div>

              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="font-mono text-[12px] font-semibold text-go-brand">
                  {event.entry}
                </span>
                <Button href={event.href} size="sm" variant="ghost">
                  Register
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Panel>
          ))}
        </div>
      </section>

      {/* ─── What's included + venue ─── */}
      <section className="mb-6 grid gap-3 lg:grid-cols-2">
        <Panel>
          <Kicker>Every entry includes</Kicker>
          <ul className="mt-3 space-y-2.5">
            {[
              "Minimum two league matches per entry",
              "Match officials, shuttles, balls and stumps",
              "Medals, trophies and certificates",
              "Live scores shared to your WhatsApp",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-go-off/75">
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-go-brand/20 text-go-brand">
                  <Check className="h-2.5 w-2.5" />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </Panel>

        <Panel>
          <Kicker>Where you play</Kicker>
          <h3 className="mt-2 font-display text-xl uppercase leading-tight text-go-white">
            Game On Arena
          </h3>
          <p className="mt-1.5 flex items-start gap-1.5 text-[13px] text-go-off/60">
            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-go-brand/70" />
            SportsCube Center for Excellence, Sector 70, Gurugram
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {[
              { label: "Badminton", value: "5 courts" },
              { label: "Pickleball", value: "4 courts" },
              { label: "Box cricket", value: "100 × 60 ft" },
              { label: "Football", value: "Floodlit turf" },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-[16px] border border-white/[0.07] bg-white/[0.03] px-3 py-2"
              >
                <p className="text-[11px] uppercase tracking-wider text-go-off/40">{row.label}</p>
                <p className="text-[13px] font-semibold text-go-white">{row.value}</p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* ─── Facilities ─── */}
      <section className="mb-6">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FACILITIES.map((facility) => {
            const Icon = FACILITY_ICONS[facility.icon];
            return (
              <div
                key={facility.title}
                className="flex flex-col gap-2 rounded-[18px] border border-white/[0.06] bg-white/[0.02] px-3 py-3.5"
              >
                <Icon className="h-5 w-5 text-go-brand" />
                <p className="text-[13px] font-semibold text-go-white">{facility.title}</p>
                <p className="text-[11px] leading-snug text-go-off/45">{facility.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── How booking works ─── */}
      <section className="mb-6">
        <SectionTitle title="How booking works" />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {FLOW_STEPS.map((step) => (
            <Panel key={step.step} className="flex flex-col gap-2">
              <span className="font-display text-2xl leading-none text-go-brand/50">
                {step.step}
              </span>
              <p className="text-[14px] font-semibold text-go-white">{step.title}</p>
              <p className="text-[12px] leading-relaxed text-go-off/50">{step.copy}</p>
            </Panel>
          ))}
        </div>
      </section>

      {/* ─── Season stats ─── */}
      <section className="mb-6">
        <Panel className="bg-white/[0.04]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Kicker>Game On Olympics · Season 1</Kicker>
              <h3 className="mt-2 font-display text-xl uppercase leading-tight text-go-white">
                Registration is live
              </h3>
            </div>
            <Chip tone="brand" icon={Zap}>
              Filling fast
            </Chip>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            {EVENT_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-[18px] border border-white/[0.07] bg-go-black/40 px-3 py-3 text-center"
              >
                <p className="font-display text-2xl leading-none text-go-brand">{stat.value}</p>
                <p className="mt-1.5 text-[10px] uppercase tracking-wider text-go-off/50">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </Panel>
      </section>

      {/* ─── FAQ ─── */}
      <section className="mb-6">
        <SectionTitle title="Good to know" />
        <div className="overflow-hidden rounded-[22px] border border-white/[0.07] bg-white/[0.02]">
          {FAQS.map((faq, index) => {
            const open = openFaq === index;
            return (
              <div key={faq.q} className="border-b border-white/[0.06] last:border-b-0">
                <button
                  type="button"
                  onClick={() => setOpenFaq(open ? null : index)}
                  aria-expanded={open}
                  className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.03]"
                >
                  <span className="flex-1 text-[13.5px] font-medium text-go-white">{faq.q}</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-go-brand transition-transform",
                      open && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {open ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-4 pb-4 text-[13px] leading-relaxed text-go-off/60">
                        {faq.a}
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── Closing CTA ─── */}
      <section className="mb-2">
        <Panel className="border-go-brand/25 bg-gradient-to-br from-go-brand/[0.16] via-go-brand/[0.06] to-transparent text-center">
          <span className="text-3xl" aria-hidden>
            🏆
          </span>
          <h3 className="mt-3 font-display text-2xl uppercase leading-tight text-go-white">
            Ready to play?
          </h3>
          <p className="mx-auto mt-2 max-w-sm text-[13px] text-go-off/60">
            Pick your sport, choose a category and lock a match slot — it takes about two minutes.
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
            <Button href="/gameon-olympics/sports" size="lg" full className="sm:w-auto">
              Book a slot
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              href="/gameon-olympics/bookings"
              variant="ghost"
              size="lg"
              full
              className="sm:w-auto"
            >
              My bookings
            </Button>
          </div>
        </Panel>
      </section>
    </div>
  );
}
