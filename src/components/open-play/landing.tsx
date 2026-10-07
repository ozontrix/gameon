'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { ArrowDown, ArrowRight, CalendarDays, Check, Coffee, Heart, MapPin, Music2, Navigation, Pizza, Sparkles, Users, Zap } from 'lucide-react';
import { OPEN_PLAY_DATE_LABEL, OPEN_PLAY_MAP_URL, OPEN_PLAY_PHONE, OPEN_PLAY_SPORTS, PAID_PLAY_DATE_LABEL, type OpenPlaySport } from '@/lib/open-play/constants';
import { OpenPlayRegistrationForm } from './registration-form';
import { SportArt } from './sport-art';

const faqs = [
  ['Is open play really free?', 'Yes. Cricket, football, badminton and pickleball open play on 18 October 2026 is free. There is no registration fee and no payment step. Regular paid court bookings start from 19 October 2026.'],
  ['Can I come alone or bring my friends?', 'Both! Come solo, with a friend or with your usual crew. Each participant should register their own preferred sport so the team can plan the day.'],
  ['Do I need to be an experienced player?', 'Not at all. Open play welcomes beginners and regular players. Pick the sport you would love to try, or the one you already love.'],
  ['What time should I arrive?', 'The team will share exact open play timings and evening event details on your registered mobile number. The DJ party is in the evening.'],
  ['Does registration reserve a court?', 'No. This is an open play registration, not a private court booking or a fixed timed slot. Playing turns will be coordinated by the team at the venue.'],
  ['What about the evening parties?', 'A DJ party, pizza party and coffee party are planned, with a little dandiya too. Only sports open play is advertised as free; food and beverage arrangements will be shared by the team.'],
  ['What should I bring?', 'Wear comfortable sportswear and appropriate footwear, and bring a water bottle. Contact the team for equipment arrangements or any accessibility needs. Minors should come with a parent or guardian.'],
];

export function OpenPlayLanding({ closed }: { closed: boolean }) {
  const [sport, setSport] = useState<OpenPlaySport | ''>('');
  const reduceMotion = useReducedMotion();
  const reveal = { initial: false as const, whileInView: { y: reduceMotion ? 0 : [12, 0] }, viewport: { once: true }, transition: { duration: reduceMotion ? 0 : 0.4 } };
  return <div className="op-page">
    <a href="#register" className="op-skip">Skip to registration</a>
    <div className="op-ambient" aria-hidden="true" />
    <header className="op-header op-container">
      <Link href="/" aria-label="GameOn home"><Image src="/game_on.png" alt="Game On" width={893} height={250} priority className="h-8 w-auto sm:h-10" sizes="150px" /></Link>
      <span className="hidden items-center gap-2 font-mono text-[11px] uppercase tracking-widest text-go-off/70 sm:inline-flex"><span className="size-1.5 rounded-full bg-go-brand" />Sector 70, Gurugram</span>
      <a href="#register" className="op-secondary text-sm">{closed ? 'What’s next' : 'Get on the list'}<ArrowRight className="size-4" /></a>
    </header>
    <main>
      <section className="op-container op-hero" aria-labelledby="op-hero-title">
        <div className="op-hero-copy">
          <motion.div initial={false} animate={{ y: [6, 0] }} transition={{ duration: reduceMotion ? 0 : 0.5 }}>
            <p className="op-date-pill"><CalendarDays className="size-4" />{OPEN_PLAY_DATE_LABEL}<span className="op-pill-separator" />FREE OPEN PLAY</p>
            <h1 id="op-hero-title" className="op-title">YOUR SUNDAY.<br /><span>ON US.</span><Sparkles className="op-title-spark" aria-hidden="true" /></h1>
            <p className="op-hero-sub">Four sports. Zero playing fees.<br className="sm:hidden" /> A whole lot of GameOn.</p>
            <p className="op-body mt-4 max-w-lg">Put the plans on pause. Pick up a racket, find your squad, or try something new. On October 18, everyone’s invited to play for free.</p>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-3 text-sm text-go-off/85">{['All skill levels', 'Come solo or with friends', 'No payment needed'].map(text => <span key={text} className="flex items-center gap-2"><Check className="size-4 text-go-brand" />{text}</span>)}</div>
            <div className="mt-7 flex items-center gap-4"><a href="#register" className="op-cta">{closed ? 'Explore what’s next' : 'I’m in. Let’s play.'}<ArrowRight className="size-5" /></a><span className="max-w-24 text-xs leading-relaxed text-go-off/70">Just your name &amp; mobile to start.</span></div>
          </motion.div>
          <div className="op-hero-art" aria-hidden="true">
            <span className="op-art-caption">OFFLINE IS THE NEW GAME PLAN.</span>
            <Image src="/open-play/court-scene.svg" alt="" width={760} height={310} className="w-full" priority />
            <span className="op-art-stamp"><span>18</span><small>OCT / SUN</small></span>
          </div>
        </div>
        <div id="register" className="op-register"><OpenPlayRegistrationForm closed={closed} sport={sport} onSportChange={setSport} /></div>
      </section>

      <div className="op-ribbon" aria-label="Free play, good company and evening celebrations"><div className="op-container flex flex-wrap items-center justify-center gap-x-8 gap-y-3 py-4 font-mono text-xs uppercase tracking-widest"><span>Play for ₹0</span><Zap className="size-4" aria-hidden="true" /><span>Find your people</span><Zap className="hidden size-4 sm:block" aria-hidden="true" /><span>Stay for the vibe</span><a href="#sports" className="inline-flex items-center gap-2 underline underline-offset-4">Meet the sports<ArrowDown className="size-3" /></a></div></div>

      <section id="sports" className="op-container op-section" aria-labelledby="op-sports-title">
        <div className="flex flex-wrap items-end justify-between gap-5"><div><p className="op-eyebrow">One address. Four ways to play.</p><h2 id="op-sports-title" className="op-heading mt-3">WHAT’S YOUR <span className="text-go-brand">GAME?</span></h2></div><p className="op-body max-w-sm">Your regular sport. Your first-ever rally.<br />There’s a place for both here.</p></div>
        <div className="mt-8 grid grid-cols-2 gap-3 lg:grid-cols-4">{OPEN_PLAY_SPORTS.map((sport, index) => <motion.a key={sport.id} href="#register" onClick={() => setSport(sport.id)} {...reveal} className="op-sport-card" style={{ '--sport-color': sport.color } as React.CSSProperties}>
          <div className="flex items-center justify-between"><span className="font-mono text-[10px] text-go-off/60">0{index + 1} / OPEN PLAY</span><ArrowRight className="size-4 text-go-off/65" /></div>
          <SportArt sport={sport.id} className="op-card-art" />
          <h3 className="font-display text-2xl uppercase sm:text-3xl">{sport.name}</h3><p className="mt-2 text-sm font-medium" style={{ color: sport.color }}>{sport.line}</p><p className="mt-3 hidden text-sm leading-relaxed text-go-off/75 sm:block">{sport.detail}</p>
          <div className="mt-6 flex items-center justify-between border-t border-white/10 pt-4"><span className="text-xs text-go-off/75">18 October</span><span className="font-mono text-xs text-go-brand">FREE TO PLAY</span></div>
        </motion.a>)}</div>
      </section>

      <section className="op-container pb-8" aria-labelledby="op-evening-title">
        <motion.div {...reveal} className="op-evening">
          <div className="op-evening-glow" aria-hidden="true" />
          <div className="relative grid items-center gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div><p className="op-eyebrow">From match point to party mode</p><h2 id="op-evening-title" className="op-heading mt-3">GOOD GAMES.<br /><span className="text-go-brand">GREAT AFTERS.</span></h2><p className="op-body mt-4 max-w-md">The final whistle isn’t the end of the plan. Hang back, catch the music and make a Sunday of it.</p><p className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-2 text-xs text-go-off/75"><Sparkles className="size-3.5" />A little dandiya to round out the night, too.</p></div>
            <div className="grid gap-3">{[
              { icon: Music2, title: 'DJ party', detail: 'Evening beats. Courtside energy.', label: 'TURN IT UP', color: '#C3B1EF' },
              { icon: Pizza, title: 'Pizza party', detail: 'Because great games deserve great company.', label: 'STAY A LITTLE', color: '#F38F2F' },
              { icon: Coffee, title: 'Coffee party', detail: 'Good conversations, one cup at a time.', label: 'MEET YOUR PEOPLE', color: '#F0CE78' },
            ].map(({ icon: Icon, ...item }) => <div className="op-party-row" key={item.title}><span className="op-party-icon" style={{ color: item.color }}><Icon className="size-7" aria-hidden="true" /></span><div className="min-w-0"><span className="font-mono text-[9px] tracking-widest text-go-off/65">{item.label}</span><h3 className="mt-1 text-xl font-semibold">{item.title}</h3><p className="mt-1 text-sm text-go-off/75">{item.detail}</p></div></div>)}</div>
          </div>
          <p className="relative mt-7 border-t border-white/10 pt-4 text-xs leading-relaxed text-go-off/65">Exact timings and food &amp; beverage arrangements will be shared by the team. Free access refers to sports open play.</p>
        </motion.div>
      </section>

      <section className="op-container op-section" aria-labelledby="op-how-title">
        <div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="op-eyebrow">Less scrolling. More playing.</p><h2 id="op-how-title" className="op-heading mt-3">THREE STEPS.<br />ONE GOOD SUNDAY.</h2><a href="#register" className="mt-5 inline-flex min-h-11 items-center gap-3 text-sm font-semibold text-go-brand hover:underline">Join the open play list<ArrowRight className="size-4" /></a></div><div className="grid gap-4">{[
          { icon: Heart, title: 'Pick the sport you love.', copy: 'Or the one you’ve always wanted to try. Choose your preferred sport in the form.' },
          { icon: Users, title: 'Tell us who’s joining.', copy: 'Your name and mobile number are all we need. No account, no checkout, no fuss.' },
          { icon: MapPin, title: 'Show up. Get your game on.', copy: 'We’ll share timings on your mobile. Come to Sector 70 on October 18 ready to play.' },
        ].map(({ icon: Icon, title, copy }, index) => <div key={title} className="op-step"><span className="op-step-number">0{index + 1}</span><div><h3 className="flex items-center gap-2 text-lg font-semibold"><Icon className="size-4 shrink-0 text-go-brand" />{title}</h3><p className="op-body mt-2 text-sm">{copy}</p></div></div>)}</div></div>
      </section>

      <section className="op-container pb-8" aria-labelledby="op-location-title"><div className="op-location"><div><p className="op-eyebrow">Your new neighbourhood game plan</p><h2 id="op-location-title" className="mt-3 font-display text-3xl uppercase sm:text-4xl">SEE YOU IN SECTOR 70.</h2><p className="op-body mt-3">GameOn Multisports, Gurugram.<br />Come for the sport. Leave with a story.</p><a href={OPEN_PLAY_MAP_URL} target="_blank" rel="noopener noreferrer" className="op-secondary mt-5 w-fit"><Navigation className="size-4" />Get directions</a></div><div className="op-date-block"><CalendarDays className="size-6 text-go-brand" /><p className="mt-3 font-display text-6xl">18 <span className="text-go-brand">OCT</span></p><p className="mt-2 font-mono text-xs uppercase tracking-widest">Sunday / 2026 / Free open play</p><div className="mt-5 border-t border-white/15 pt-4 text-sm text-go-off/80">Keep the game going.<br /><strong className="text-go-white">Paid booking slots from {PAID_PLAY_DATE_LABEL}.</strong></div></div></div></section>

      <section className="op-container op-section" aria-labelledby="op-faq-title"><div className="grid gap-8 lg:grid-cols-[.8fr_1.2fr]"><div><p className="op-eyebrow">Good to know</p><h2 id="op-faq-title" className="op-heading mt-3">A FEW QUICK<br />ANSWERS.</h2><p className="op-body mt-4">Something else on your mind?</p><a href="tel:+917494825740" className="mt-2 inline-flex min-h-11 items-center text-go-brand hover:underline">{OPEN_PLAY_PHONE}</a></div><div className="divide-y divide-white/10">{faqs.map(([question, answer]) => <details key={question} className="op-faq"><summary>{question}<span aria-hidden="true">+</span></summary><p className="pb-5 pr-7 text-sm leading-relaxed text-go-off/80">{answer}</p></details>)}</div></div></section>

      {!closed ? <section className="op-container pb-16"><div className="op-final"><p className="op-eyebrow">Make room for a better Sunday</p><h2 className="op-heading mt-3">THE ONLY THING MISSING?<br /><span className="text-go-brand">YOU.</span></h2><p className="op-body mx-auto mt-4 max-w-md">October 18. Four sports. Free open play.<br />Let’s turn “we should play sometime” into a plan.</p><a href="#register" className="op-cta mt-6">Put me on the list<ArrowRight className="size-5" /></a></div></section> : null}
    </main>
    <footer className="op-container flex flex-col gap-4 border-t border-white/10 py-7 text-xs text-go-off/65 sm:flex-row sm:items-center sm:justify-between"><p>© {new Date().getFullYear()} GameOn Multisports. More play. More people.</p><div className="flex gap-5"><Link href="/privacy" className="py-2 hover:text-go-white">Privacy</Link><Link href="/terms" className="py-2 hover:text-go-white">Terms</Link><a href="tel:+917494825740" className="py-2 hover:text-go-white">Contact us</a></div></footer>
    {!closed ? <div className="op-mobile-cta"><div><p className="text-sm font-semibold">18 October · Free open play</p><p className="text-xs text-go-off/70">Your Sunday. On us.</p></div><a href="#register" className="op-cta px-5 py-3 text-sm">Join free<ArrowRight className="size-4" /></a></div> : null}
  </div>;
}