"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import useEmblaCarousel from "embla-carousel-react";
import { ArrowDown, ArrowRight, ChevronLeft, ChevronRight, MapPin, Pause, Play } from "lucide-react";
import { homeHighlights } from "@/lib/home-highlights";
import { useEmblaAutoplay } from "@/lib/useEmblaAutoplay";

const AUTOPLAY_DELAY = 6500;
const MOTION_QUERY = "(prefers-reduced-motion: reduce)";

function subscribeToMotion(callback: () => void) {
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

const getReducedMotion = () => window.matchMedia(MOTION_QUERY).matches;
const getServerReducedMotion = () => true;

export function HomeHighlights() {
  const sectionRef = useRef<HTMLElement>(null);
  const reducedMotion = useSyncExternalStore(subscribeToMotion, getReducedMotion, getServerReducedMotion);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start", duration: reducedMotion ? 0 : 30 });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [inView, setInView] = useState(false);
  const autoplayEnabled = !paused && !hovered && inView && !reducedMotion && homeHighlights.length > 1;

  useEmblaAutoplay(emblaApi, AUTOPLAY_DELAY, autoplayEnabled);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) return;
    const observer = new IntersectionObserver(([entry]) => setInView(entry.isIntersecting), { threshold: 0.2 });
    observer.observe(section);
    return () => observer.disconnect();
  }, []);

  const syncSelection = useCallback(() => {
    if (emblaApi) setSelectedIndex(emblaApi.selectedScrollSnap());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    emblaApi.on("select", syncSelection);
    emblaApi.on("reInit", syncSelection);
    return () => {
      emblaApi.off("select", syncSelection);
      emblaApi.off("reInit", syncSelection);
    };
  }, [emblaApi, syncSelection]);

  const controlClass = "flex size-12 shrink-0 cursor-pointer items-center justify-center rounded-full border border-go-white/20 bg-go-white/5 text-go-white transition-colors hover:border-go-brand hover:bg-go-brand hover:text-go-black disabled:cursor-default disabled:opacity-40";

  return (
    <section
      id="hero"
      ref={sectionRef}
      aria-label="What's happening at Game On"
      aria-roledescription="carousel"
      className="relative overflow-hidden bg-go-black px-4 pb-8 pt-7 text-go-off sm:px-8 sm:pb-10 lg:px-6 lg:pt-28"
      onPointerEnter={(event) => { if (event.pointerType === "mouse") setHovered(true); }}
      onPointerLeave={(event) => { if (event.pointerType === "mouse") setHovered(false); }}
      onFocusCapture={(event) => {
        // Keyboard focus stops rotation until the visitor explicitly starts it.
        if (!(event.target instanceof HTMLElement) || !event.target.closest("[data-rotation-control]")) setPaused(true);
      }}
      onKeyDown={(event) => {
        if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
        event.preventDefault();
        setPaused(true);
        if (event.key === "ArrowLeft") emblaApi?.scrollPrev(reducedMotion);
        else emblaApi?.scrollNext(reducedMotion);
      }}
    >
      <div className="mx-auto max-w-[1400px]">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3 sm:mb-6">
          <div className="flex items-center gap-3">
            <span aria-hidden="true" className="h-5 w-1 rounded-full bg-go-brand" />
            <h1 className="text-xs font-semibold uppercase tracking-[0.18em] sm:text-sm">Happening at <span className="text-go-brand">Game On</span></h1>
          </div>
          <span className="hidden items-center gap-1.5 text-xs text-go-off/70 sm:inline-flex"><MapPin aria-hidden="true" className="size-3.5 text-go-brand" />Sector 70, Gurugram</span>
        </div>

        {/* Controls are outside the draggable viewport; inactive links cannot receive focus. */}
        <div ref={emblaRef} className="overflow-hidden rounded-[24px] border border-go-white/10 bg-go-navy shadow-[0_24px_80px_rgba(0,0,0,0.3)] sm:rounded-[32px]">
          <div className="flex touch-pan-y touch-pinch-zoom">
            {homeHighlights.map((slide, index) => (
              <article
                key={slide.id}
                id={`highlight-${slide.id}`}
                role="group"
                aria-roledescription="slide"
                aria-label={`${index + 1} of ${homeHighlights.length}: ${slide.label}`}
                aria-hidden={index !== selectedIndex}
                inert={index !== selectedIndex}
                className="relative flex min-w-0 flex-[0_0_100%] flex-col overflow-hidden lg:min-h-[580px] lg:flex-row"
              >
                <div className={`relative h-[230px] shrink-0 bg-go-black sm:h-[320px] lg:absolute lg:inset-y-0 lg:right-0 lg:h-auto ${slide.imageFit === "contain" ? "lg:w-[44%]" : "lg:w-[62%]"}`}>
                  <Image
                    src={slide.image}
                    alt={slide.imageAlt}
                    fill
                    sizes={slide.imageFit === "contain" ? "(min-width: 1440px) 620px, (min-width: 1024px) 44vw, 100vw" : "(min-width: 1440px) 870px, (min-width: 1024px) 62vw, 100vw"}
                    preload={index === 0}
                    draggable={false}
                    style={{ objectFit: slide.imageFit, objectPosition: slide.imagePosition }}
                  />
                  {slide.imageFit === "cover" && <>
                    <div aria-hidden="true" className="absolute inset-0 bg-linear-to-t from-go-navy via-transparent to-go-black/10 lg:bg-linear-to-r lg:from-go-navy lg:via-go-navy/25 lg:to-transparent" />
                    <div aria-hidden="true" className="absolute inset-0 hidden bg-linear-to-t from-go-black/50 via-transparent to-transparent lg:block" />
                  </>}
                  <span className="absolute right-4 top-4 rounded-full border border-go-white/25 bg-go-black/70 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-go-white backdrop-blur-md sm:right-6 sm:top-6">{slide.label}</span>
                </div>

                <div className={`relative z-10 flex flex-1 flex-col justify-center px-5 pb-7 pt-3 sm:px-8 sm:pb-9 lg:px-12 lg:py-14 xl:px-16 ${slide.imageFit === "contain" ? "lg:max-w-[56%]" : "lg:max-w-[58%]"}`}>
                  <p className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-go-brand"><span aria-hidden="true" className="size-1.5 rounded-full bg-go-brand" />{slide.eyebrow}</p>
                  <h2 className="font-display text-[clamp(2.1rem,5vw,4.5rem)] leading-[1.08] tracking-tight">
                    <span className="block">{slide.title}</span>
                    <span className="mt-1 block text-go-brand">{slide.accent}</span>
                  </h2>
                  <p className="mt-5 max-w-md text-base leading-relaxed text-go-off/80">{slide.description}</p>
                  <p className="mt-5 text-sm font-semibold text-go-off">{slide.detail}</p>
                  <Link href={slide.href} tabIndex={index === selectedIndex ? 0 : -1} className="mt-6 inline-flex min-h-12 w-full items-center justify-center gap-3 self-start rounded-full bg-go-brand px-6 py-3 text-sm font-bold text-go-black transition-colors hover:bg-go-off sm:w-auto">
                    {slide.cta}<ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
                <span aria-hidden="true" className="absolute bottom-7 right-8 hidden font-display text-7xl text-go-white/30 lg:block">0{index + 1}</span>
              </article>
            ))}
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-x-4 gap-y-3">
          <div className="flex items-center gap-1" role="group" aria-label="Choose a highlight">
            {homeHighlights.map((slide, index) => (
              <button key={slide.id} type="button" aria-label={`Show ${slide.label}`} aria-controls={`highlight-${slide.id}`} aria-current={index === selectedIndex ? "true" : undefined} disabled={!emblaApi} onClick={() => { setPaused(true); emblaApi?.scrollTo(index, reducedMotion); }} className="flex size-12 cursor-pointer items-center justify-center rounded-full disabled:cursor-default">
                <span aria-hidden="true" className={`h-1.5 rounded-full transition-[width,background-color] duration-300 motion-reduce:transition-none ${index === selectedIndex ? "w-8 bg-go-brand" : "w-2 bg-go-off/40 hover:bg-go-off"}`} />
              </button>
            ))}
            <span className="ml-2 text-xs tabular-nums text-go-off/70" aria-hidden="true">{String(selectedIndex + 1).padStart(2, "0")} / {String(homeHighlights.length).padStart(2, "0")}</span>
          </div>
          <div className="flex items-center gap-2">
            {!reducedMotion && homeHighlights.length > 1 && <button type="button" data-rotation-control aria-label={paused ? "Play slideshow" : "Pause slideshow"} onClick={() => setPaused((value) => !value)} className={controlClass}>{paused ? <Play aria-hidden="true" className="size-4" /> : <Pause aria-hidden="true" className="size-4" />}</button>}
            <button type="button" aria-label="Previous highlight" disabled={!emblaApi || homeHighlights.length < 2} onClick={() => { setPaused(true); emblaApi?.scrollPrev(reducedMotion); }} className={controlClass}><ChevronLeft aria-hidden="true" className="size-5" /></button>
            <button type="button" aria-label="Next highlight" disabled={!emblaApi || homeHighlights.length < 2} onClick={() => { setPaused(true); emblaApi?.scrollNext(reducedMotion); }} className={controlClass}><ChevronRight aria-hidden="true" className="size-5" /></button>
          </div>
        </div>
        <p className="sr-only" aria-live={autoplayEnabled ? "off" : "polite"} aria-atomic="true">{homeHighlights[selectedIndex].label}, slide {selectedIndex + 1} of {homeHighlights.length}</p>
        <a href="#discover-gameon" className="mx-auto mt-6 flex min-h-12 w-fit items-center gap-2 px-3 text-xs font-medium uppercase tracking-[0.15em] text-go-off/70 transition-colors hover:text-go-brand">Discover the Game On experience<ArrowDown aria-hidden="true" className="size-4" /></a>
      </div>
    </section>
  );
}