"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Check, Globe2, QrCode, Smartphone, Ticket, Wallet } from "lucide-react";
import { appStoreLinks, homepageSports, sportBookingHref, WEB_APP_HREF } from "@/lib/homepage-app";
import { WebAppCTA } from "./WebAppCTA";

const features = [
  { icon: CalendarDays, title: "Your court. Your time.", text: "Explore courts and check available slots." },
  { icon: Ticket, title: "Everything in one place.", text: "Keep your bookings and event tickets together." },
  { icon: Wallet, title: "More ways to play.", text: "Discover GameOn Points, events and tournaments." },
];

export function AppDownloadSection() {
  const [selected, setSelected] = useState(homepageSports[0]);

  return (
    <section id="download-app" aria-labelledby="download-heading" className="relative scroll-mt-24 overflow-hidden px-5 py-20 text-go-off sm:px-8 lg:px-14 lg:py-28 xl:px-20">
      <div className="mx-auto max-w-[1400px]">
        <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
          <div>
            <p className="flex items-center gap-2 font-mono text-xs uppercase tracking-[0.2em] text-go-brand"><Smartphone aria-hidden="true" className="size-4" />The GameOn app</p>
            <h2 id="download-heading" className="mt-5 font-display text-[clamp(2.8rem,5.8vw,5.8rem)] uppercase leading-[1.04]">Your home court.<br /><span className="text-go-brand">In your pocket.</span></h2>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-go-off/75">The best plan is the one that makes it out of the group chat. Find your court, choose your slot, and make it game time with GameOn.</p>
            <div className="mt-8 space-y-5">
              {features.map(({ icon: Icon, title, text }) => <div key={title} className="flex gap-4"><span className="flex size-11 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-go-brand"><Icon aria-hidden="true" className="size-5" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-sm leading-relaxed text-go-off/65">{text}</p></div></div>)}
            </div>
            <div className="mt-9 rounded-2xl border border-white/15 bg-white/[0.03] p-5">
              <h3 className="text-sm font-semibold">Download the GameOn app</h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                {([{ key: "ios", label: "App Store", platform: "iOS" }, { key: "android", label: "Google Play", platform: "Android" }] as const).map(({ key, label, platform }) => appStoreLinks[key] ? (
                  <a key={key} href={appStoreLinks[key]} target="_blank" rel="noopener noreferrer" className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/25 bg-go-black px-4 py-3 transition-colors hover:border-go-brand focus-visible:outline-2 focus-visible:outline-go-brand"><span><span className="block text-[10px] text-go-off/65">Download for {platform}</span><span className="text-sm font-semibold">{label}</span></span><ArrowUpRight aria-hidden="true" className="size-5 text-go-brand" /></a>
                ) : (
                  <div key={key} className="flex min-h-16 items-center justify-between gap-3 rounded-xl border border-white/10 px-4 py-3"><span><span className="block text-[10px] text-go-off/65">{platform}</span><span className="whitespace-nowrap text-sm font-semibold">{label}</span></span><span className="shrink-0 whitespace-nowrap rounded-full bg-white/10 px-2.5 py-1 text-[10px] text-go-off/75">Coming soon</span></div>
                ))}
              </div>
              <p className="mt-3 text-xs leading-relaxed text-go-off/65">{appStoreLinks.ios && appStoreLinks.android ? "Prefer your browser? You can play that way, too." : "Until then, the GameOn web app is ready when you are."}</p>
              <WebAppCTA href={WEB_APP_HREF} className="mt-4 w-full"><Globe2 aria-hidden="true" className="size-4" />Open the web app</WebAppCTA>
            </div>
          </div>

          <div className="relative flex min-w-0 justify-center rounded-[32px] border border-white/10 bg-[radial-gradient(ellipse_at_center,var(--go-brand-light),transparent_70%)] px-4 py-10 sm:px-8 sm:py-14">
            <div aria-hidden="true" className="pointer-events-none absolute inset-6 rounded-[24px] border border-white/10 sm:inset-10"><div className="absolute inset-x-0 top-1/2 border-t border-white/10" /><div className="absolute inset-y-0 left-1/2 border-l border-white/10" /></div>
            <div className="relative w-full max-w-[300px] rounded-[38px] border border-white/25 bg-go-black p-2.5 shadow-[0_30px_80px_rgba(0,0,0,0.5)]">
              <div className="overflow-hidden rounded-[29px] bg-go-navy">
                <div aria-hidden="true" className="mx-auto mt-3 h-5 w-24 rounded-full bg-go-black" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3"><Image src="/game_on.png" alt="GameOn app preview" width={105} height={30} className="h-auto w-[105px]" /><span className="rounded-full border border-white/20 px-2 py-1 font-mono text-[9px] text-go-off/65">PREVIEW</span></div>
                  <p className="mt-6 text-xs text-go-off/65">Less planning. More playing.</p><p className="mt-1 font-display text-3xl uppercase">Make it game time.</p>
                  <div className="relative mt-5 h-32 overflow-hidden rounded-2xl"><Image src="/ac-indoor.jpeg" alt="" fill sizes="250px" className="object-cover" /><div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-go-black/90 to-transparent" /><span className="absolute bottom-3 left-3 text-xs font-semibold">Meet your next favourite court.</span></div>
                  <p className="mb-3 mt-5 text-xs font-semibold">Tap to find your game</p>
                  <div className="grid grid-cols-2 gap-2" role="group" aria-label="Explore sports in the app preview">
                    {homepageSports.map((sport) => <button type="button" key={sport.id} aria-pressed={selected.id === sport.id} onClick={() => setSelected(sport)} className={`flex min-h-16 cursor-pointer items-center gap-2 rounded-xl border p-2.5 text-[11px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-go-brand ${selected.id === sport.id ? "border-go-brand bg-go-brand/15 text-go-brand" : "border-white/10 hover:border-go-brand/60"}`}><Image src={sport.image} alt="" width={24} height={24} className="size-6 object-contain" />{sport.label}</button>)}
                  </div>
                  <div aria-live="polite" aria-atomic="true" className="mt-4 min-h-14"><p className="text-sm font-semibold">{selected.label}, your way.</p><p className="mt-1 text-xs leading-relaxed text-go-off/65">{selected.detail}</p></div>
                  <Link href={sportBookingHref(selected.id)} className="mt-3 flex min-h-12 items-center justify-center gap-2 rounded-xl bg-go-brand px-3 py-3 text-xs font-bold text-go-black transition-colors hover:bg-go-off focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand">Explore {selected.label.toLowerCase()} courts<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
                  <div aria-hidden="true" className="mt-5 flex items-center justify-between border-t border-white/10 pt-4 text-go-off/60"><Globe2 className="size-4" /><CalendarDays className="size-4" /><Ticket className="size-4" /><QrCode className="size-4" /></div>
                </div>
              </div>
            </div>
            <span className="absolute -bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/15 bg-go-navy px-5 py-3 text-xs font-medium shadow-xl"><Check aria-hidden="true" className="size-4 text-go-brand" />One app. More game.</span>
          </div>
        </div>
        <div className="mt-20 flex flex-col justify-between gap-6 border-t border-white/15 pt-8 sm:flex-row sm:items-center">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.2em] text-go-brand">See you on court</p><p className="mt-2 font-display text-3xl uppercase sm:text-4xl">Your next game is calling.</p></div><WebAppCTA>Book now in the web app</WebAppCTA>
        </div>
      </div>
    </section>
  );
}