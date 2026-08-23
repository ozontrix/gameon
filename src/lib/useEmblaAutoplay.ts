"use client";

import { useEffect } from "react";
import type { EmblaCarouselType } from "embla-carousel";

// Auto-advance a horizontal embla carousel.
// Pauses while the user is dragging and resumes once a slide settles.
export function useEmblaAutoplay(emblaApi: EmblaCarouselType | undefined, delay = 2000) {
  useEffect(() => {
    if (!emblaApi) return;

    let timer: ReturnType<typeof setInterval> | undefined;

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = undefined;
      }
    };

    const start = () => {
      stop();
      timer = setInterval(() => {
        if (emblaApi.canScrollNext()) emblaApi.scrollNext();
        else emblaApi.scrollTo(0);
      }, delay);
    };

    start();
    emblaApi.on("pointerDown", stop);
    emblaApi.on("pointerUp", start);
    emblaApi.on("select", start);

    return () => {
      stop();
      emblaApi.off("pointerDown", stop);
      emblaApi.off("pointerUp", start);
      emblaApi.off("select", start);
    };
  }, [emblaApi, delay]);
}
