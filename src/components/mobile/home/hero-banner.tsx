'use client';

/**
 * The auto-advancing hero at the top of Home — the web twin of the app
 * `components/home/hero-banner.tsx`.
 *
 * The slides come from the admin panel, so marketing can change them without a
 * release, and a slide with a `link` is tappable where one without it is not.
 *
 * The carousel is a CSS scroll-snap track rather than a transform-driven one:
 * that is what gives a browser the same native paging feel, keyboard support and
 * rubber-banding the handset gets from `pagingEnabled`, without re-implementing
 * momentum. Autoplay still drives it, and pauses while the pointer is down so a
 * swipe is never yanked away mid-gesture.
 */

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

import { HERO_AUTOPLAY_MS } from '@/lib/mobile/constants/motion';
import { Brand, Layout, Radius, Spacing, Typography } from '@/lib/mobile/theme';
import { useHomeContent } from '../home-content-provider';
import { RemoteImage } from '../ui';

/** Aspect ratio of the hero, so the photo is never squeezed. */
const ASPECT = 2.05;

export function HeroBanner() {
  const { content } = useHomeContent();
  const slides = content.banners.hero;
  const track = useRef<HTMLDivElement | null>(null);
  const [index, setIndex] = useState(0);

  // Advance on a timer, wrapping at the end. Paused while the pointer is down.
  useEffect(() => {
    if (slides.length < 2) return;
    let paused = false;
    const element = track.current;

    const hold = () => {
      paused = true;
    };
    const release = () => {
      paused = false;
    };
    element?.addEventListener('pointerdown', hold);
    element?.addEventListener('pointerup', release);

    const timer = setInterval(() => {
      if (paused) return;
      const next = (index + 1) % slides.length;
      setIndex(next);
      element?.scrollTo({ left: next * (element.clientWidth || 1), behavior: 'smooth' });
    }, HERO_AUTOPLAY_MS);

    return () => {
      clearInterval(timer);
      element?.removeEventListener('pointerdown', hold);
      element?.removeEventListener('pointerup', release);
    };
  }, [index, slides.length]);

  if (slides.length === 0) return null;

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        backgroundColor: Brand.backgroundElement,
        aspectRatio: String(ASPECT),
      }}>
      <div
        ref={track}
        className="mobile-scroll"
        onScroll={(event) => {
          const element = event.currentTarget;
          const width = element.clientWidth || 1;
          setIndex(Math.round(element.scrollLeft / width));
        }}
        style={{
          display: 'flex',
          height: '100%',
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
        }}>
        {slides.map((slide) => {
          const label = [slide.title, slide.titleAccent, slide.subtitle].filter(Boolean).join('. ');
          const slideStyle = {
            position: 'relative' as const,
            flex: '0 0 100%',
            height: '100%',
            scrollSnapAlign: 'start' as const,
          };

          const body = (
            <>
              {slide.imageUrl ? (
                <RemoteImage
                  uri={slide.imageUrl}
                  accessibilityLabel={slide.title}
                  style={{ position: 'absolute', inset: 0 }}
                />
              ) : null}

              {/* Scrim gradient, so the headline stays legible over any photo. */}
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  background:
                    'linear-gradient(90deg, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.45) 55%, rgba(0,0,0,0.1) 100%)',
                }}
              />

              <span
                style={{
                  position: 'absolute',
                  left: Layout.gutter,
                  right: '30%',
                  top: 0,
                  bottom: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'center',
                  gap: Spacing.xxs,
                }}>
                <span style={{ ...Typography.display, color: Brand.text, lineHeight: 1.05 }}>
                  {slide.title}
                </span>
                {slide.titleAccent ? (
                  <span style={{ ...Typography.display, color: Brand.accent, lineHeight: 1.05 }}>
                    {slide.titleAccent}
                  </span>
                ) : null}
                {slide.subtitle ? (
                  <span
                    style={{
                      ...Typography.bodySmall,
                      color: Brand.textSecondary,
                      paddingTop: Spacing.xs,
                    }}>
                    {slide.subtitle}
                  </span>
                ) : null}
              </span>
            </>
          );

          return slide.link ? (
            <Link key={slide.id} href={slide.link} aria-label={label} style={{ ...slideStyle, textDecoration: 'none' }}>
              {body}
            </Link>
          ) : (
            <div key={slide.id} style={slideStyle}>
              {body}
            </div>
          );
        })}
      </div>

      {slides.length > 1 ? (
        <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            bottom: Spacing.md,
            left: 0,
            right: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            gap: Spacing.sm,
          }}>
          {slides.map((slide, position) => (
            <span
              key={slide.id}
              style={{
                width: position === index ? 16 : 6,
                height: 6,
                borderRadius: Radius.pill,
                backgroundColor: position === index ? Brand.white : Brand.highlight,
                transition: 'width 180ms ease, background-color 180ms ease',
              }}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}