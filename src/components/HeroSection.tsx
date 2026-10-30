"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Globe2, MapPin, Smartphone } from "lucide-react";
import { homepageSports, sportBookingHref, WEB_APP_HREF } from "@/lib/homepage-app";
import { WebAppCTA } from "./WebAppCTA";

export function HeroSection() {
  const [selected, setSelected] = useState(homepageSports[0]);

  return (
    <section id="hero" aria-labelledby="hero-heading" className="relative isolate overflow-hidden bg-go-black px-5 pb-10 pt-8 text-go-off sm:px-8 lg:px-14 lg:pb-12 lg:pt-36 xl:px-20">
      <div aria-hidden="true" className="pointer-events-none absolute -left-40 top-0 -z-10 size-[650px] rounded-full bg-go-brand/10 blur-[140px]" />
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-9 flex items-center justify-between gap-4 lg:hidden">
          <Image src="/game_on.png" alt="Game On" width={160} height={45} className="h-auto w-32" />
          <Link href={WEB_APP_HREF} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-xs font-semibold hover:border-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">Open web app<ArrowUpRight aria-hidden="true" className="size-4" /></Link>
        </div>
        <div className="grid items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-12">
          <div className="min-w-0 pb-2">
            <p className="mb-6 flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.18em] text-go-off/75 sm:text-xs"><MapPin aria-hidden="true" className="size-3.5 text-go-brand" />Sector 70, Gurugram <span aria-hidden="true" className="mx-1 text-go-brand">/</span> Your home court</p>
            <h1 id="hero-heading" className="font-display text-[clamp(3rem,13vw,5rem)] uppercase leading-[1.04] tracking-[-0.025em] lg:text-[clamp(3.5rem,6vw,6rem)]">Less scrolling.<br /><span className="text-go-brand">More playing.</span></h1>
            <p className="mt-6 max-w-lg text-base leading-relaxed text-go-off/75 sm:text-lg">Your next great game starts here. Premium courts, your favourite people, and a little time just for you.</p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <WebAppCTA href={WEB_APP_HREF} className="w-full sm:w-auto">Book the slot now</WebAppCTA>
              <a href="#sports" className="inline-flex min-h-12 items-center gap-3 rounded-full px-3 text-sm font-medium text-go-off transition-colors hover:text-go-brand focus-visible:outline-2 focus-visible:outline-go-brand">Find your sport<ArrowDown aria-hidden="true" className="size-4" /></a>
            </div>
            <p className="mt-3 flex items-center gap-2 text-xs text-go-off/65"><Globe2 aria-hidden="true" className="size-3.5" />Book in the GameOn web app. No download needed.</p>
            <div className="mt-10 flex flex-wrap gap-x-7 gap-y-4 border-t border-white/15 pt-6">
              {[["1.5", "Acres of play"], ["3", "Playing zones"], ["4", "Sports. One home."]].map(([value, label]) => (
                <div key={label} className="flex items-center gap-3"><span className="font-display text-3xl text-go-off">{value}</span><span className="max-w-24 text-xs leading-relaxed text-go-off/65">{label}</span></div>
              ))}
            </div>
          </div>
          <div className="relative min-w-0">
            <div className="relative h-[340px] overflow-hidden rounded-[28px] border border-white/15 sm:h-[430px] lg:h-[550px]">
              <Image src="/ac-indoor.jpeg" alt="Indoor badminton and pickleball courts at GameOn in Gurugram" fill preload sizes="(max-width: 1023px) 100vw, 46vw" className="object-cover" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-go-black via-go-black/10 to-go-black/20" />
              <div className="absolute left-5 right-5 top-5 flex flex-wrap items-center justify-between gap-3 sm:left-7 sm:right-7">
                <span className="rounded-full border border-white/25 bg-go-black/65 px-4 py-2 font-mono text-[10px] uppercase tracking-widest backdrop-blur-md">The venue. The vibe.</span>
                <a href="#sports" aria-label="Explore GameOn sports and courts" className="flex size-11 items-center justify-center rounded-full bg-go-brand text-go-black transition-colors hover:bg-go-off focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-go-brand"><ArrowUpRight aria-hidden="true" className="size-5" /></a>
              </div>
              <div className="absolute bottom-7 left-6 right-6 sm:bottom-9 sm:left-8 sm:right-8">
                <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.22em] text-go-off/80">Spin. Smash. Socialize.</p>
                <p className="max-w-sm font-display text-4xl uppercase leading-tight sm:text-5xl">Good games.<br />Even better company.</p>
              </div>
            </div>
            <div className="relative mx-3 -mt-3 flex items-center gap-4 rounded-2xl border border-white/15 bg-go-navy px-5 py-4 shadow-2xl sm:mx-6 sm:-mt-5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-go-brand/15 text-go-brand"><Smartphone aria-hidden="true" className="size-5" /></span>
              <div className="min-w-0 flex-1"><p className="text-sm font-semibold">Your next game. One app.</p><p className="mt-1 text-xs leading-relaxed text-go-off/65">Courts, bookings &amp; events, together.</p></div>
              <a href="#download-app" aria-label="Explore the GameOn app" className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/20 transition-colors hover:bg-go-brand hover:text-go-black focus-visible:outline-2 focus-visible:outline-go-brand"><ArrowUpRight aria-hidden="true" className="size-5" /></a>
            </div>
          </div>
        </div>
        <div className="mt-12 grid gap-6 rounded-[24px] border border-white/15 bg-white/[0.03] p-5 sm:p-7 lg:mt-16 lg:grid-cols-[1fr_1.5fr_1fr] lg:items-center lg:gap-8">
          <div><p className="font-mono text-[10px] uppercase tracking-[0.18em] text-go-brand">Make time for play</p><h2 className="mt-2 font-display text-2xl uppercase">What&apos;s your game?</h2><p className="mt-1 text-xs text-go-off/65">Pick a sport. We&apos;ll take you to the courts.</p></div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4" role="group" aria-label="Choose your sport">
            {homepageSports.map((sport) => (
              <button key={sport.id} type="button" aria-pressed={selected.id === sport.id} onClick={() => setSelected(sport)} className={`flex min-h-20 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border px-2 py-3 text-xs font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go-brand ${selected.id === sport.id ? "border-go-brand bg-go-brand/15 text-go-brand" : "border-white/10 text-go-off/75 hover:border-go-brand/60 hover:bg-white/5"}`}>
                <Image src={sport.image} alt="" width={32} height={32} className="size-8 object-contain" />{sport.label}
              </button>
            ))}
          </div>
          <div><p aria-live="polite" aria-atomic="true" className="mb-3 min-h-5 text-xs text-go-off/75">{selected.detail}</p><WebAppCTA href={sportBookingHref(selected.id)} className="w-full px-4">Book {selected.label.toLowerCase()}</WebAppCTA></div>
        </div>
      </div>
    </section>
  );
}