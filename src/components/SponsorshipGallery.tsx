"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

// ─── The sponsorship deck ───
// The slides live in `public/sponsorship` and are exported with their page serial in
// the filename (_page-0001 … _page-0016), so card 01 shows _page-0001, card 02 shows
// _page-0002, and so on — the serial number in the filename is the display order.
const DECK_FILE_PREFIX = "Sponsorship for Launch - GameOn Multi Sports _page-";
const DECK_PAGE_COUNT = 16;

const slides = Array.from({ length: DECK_PAGE_COUNT }, (_, i) => {
  const page = String(i + 1).padStart(4, "0");
  return {
    id: i + 1,
    src: `/sponsorship/${DECK_FILE_PREFIX}${page}.jpg`,
    alt: `Game On sponsorship deck — slide ${i + 1} of ${DECK_PAGE_COUNT}`,
  };
});

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

export function SponsorshipGallery() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const closeViewer = useCallback(() => setOpenIndex(null), []);

  const stepViewer = useCallback((delta: number) => {
    setOpenIndex((current) =>
      current === null ? current : (current + delta + slides.length) % slides.length
    );
  }, []);

  // Keyboard controls + scroll lock while a slide is open full screen
  useEffect(() => {
    if (openIndex === null) return;

    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeViewer();
      else if (event.key === "ArrowRight") stepViewer(1);
      else if (event.key === "ArrowLeft") stepViewer(-1);
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKey);

    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [openIndex, closeViewer, stepViewer]);

  const activeSlide = openIndex === null ? null : slides[openIndex];

  return (
    <>
      {/* ─── Cards — one per slide, in serial order, image only ─── */}
      <ul className="mx-auto flex max-w-6xl flex-col gap-4 px-3 sm:px-4 lg:gap-7 lg:px-5">
        {slides.map((slide, i) => (
          <motion.li
            key={slide.id}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.55, ease: "easeOut" }}
          >
            <button
              type="button"
              onClick={() => setOpenIndex(i)}
              aria-label={`View slide ${slide.id} of ${slides.length} full screen`}
              className="group block w-full cursor-zoom-in rounded-[24px] focus:outline-none focus-visible:ring-2 focus-visible:ring-go-brand/60 focus-visible:ring-offset-2 focus-visible:ring-offset-go-black"
            >
              <div className="relative aspect-[16/9] overflow-hidden rounded-[24px] border border-white/[0.08] bg-go-navy-glass shadow-[0_12px_45px_-22px_rgba(0,0,0,0.9)] transition-all duration-500 group-hover:border-go-brand/30 group-hover:shadow-[0_24px_70px_-26px_rgba(243,143,47,0.4)]">
                <Image
                  src={slide.src}
                  alt={slide.alt}
                  fill
                  sizes="(min-width: 1152px) 1080px, (min-width: 640px) 90vw, 100vw"
                  priority={i === 0}
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                {/* Hover sheen + expand hint — the card itself stays image-only */}
                <span className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <span className="pointer-events-none absolute right-3 top-3 flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-black/50 opacity-0 backdrop-blur-md transition-opacity duration-300 group-hover:opacity-100 sm:right-4 sm:top-4">
                  <Maximize2 className="h-4 w-4 text-go-off/80" />
                </span>
              </div>
            </button>
          </motion.li>
        ))}
      </ul>

      {/* ─── Full-screen viewer — click a card to read a slide up close ─── */}
      <AnimatePresence>
        {activeSlide && (
          <motion.div
            key="sponsorship-viewer"
            className="fixed inset-0 z-[100] flex flex-col bg-black/90 backdrop-blur-md"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            role="dialog"
            aria-modal="true"
            aria-label={`Sponsorship slide ${activeSlide.id} of ${slides.length}`}
          >
            {/* Top bar — counter + close */}
            <div className="flex items-center justify-between px-4 pt-4 sm:px-6">
              <span className="font-mono text-[11px] tracking-[0.2em] text-go-off/40">
                {String(activeSlide.id).padStart(2, "0")} / {slides.length}
              </span>
              <button
                type="button"
                onClick={closeViewer}
                aria-label="Close"
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.06] transition-colors hover:bg-white/[0.12]"
              >
                <X className="h-4 w-4 text-go-off/70" />
              </button>
            </div>

            {/* The slide itself — click outside it to close */}
            <div
              className="flex flex-1 items-center justify-center px-3 py-4 sm:px-6"
              onClick={closeViewer}
            >
              <motion.div
                key={activeSlide.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={spring}
                onClick={(e) => e.stopPropagation()}
              >
                <Image
                  src={activeSlide.src}
                  alt={activeSlide.alt}
                  width={1600}
                  height={900}
                  sizes="100vw"
                  className="h-auto max-h-[78vh] w-auto max-w-full rounded-[18px] border border-white/10 object-contain shadow-2xl"
                />
              </motion.div>
            </div>

            {/* Prev / next */}
            <div className="flex items-center justify-center gap-3 pb-[max(env(safe-area-inset-bottom),16px)]">
              <button
                type="button"
                onClick={() => stepViewer(-1)}
                aria-label="Previous slide"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-go-off/70 transition-all hover:bg-white/[0.12] hover:text-go-brand"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => stepViewer(1)}
                aria-label="Next slide"
                className="flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-go-off/70 transition-all hover:bg-white/[0.12] hover:text-go-brand"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
