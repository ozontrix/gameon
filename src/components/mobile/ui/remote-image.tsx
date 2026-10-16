'use client';

/**
 * A remote image that shows a shimmering skeleton until it has loaded.
 *
 * Every card in the app waits on a photo, and an empty coloured rectangle while
 * it arrives is the difference between a build that feels finished and one that
 * feels stalled. The skeleton fills the exact frame the image will occupy, so
 * nothing shifts when it swaps in — and it stays for a failed load rather than
 * leaving a blank hole, which is the more honest resting state when a photo
 * will never arrive.
 *
 * A plain `<img>` rather than the framework's optimiser: these URLs are
 * short-lived Supabase signed links and Unsplash CDN addresses, so proxying
 * them buys nothing and would need every host declared in `next.config.ts`.
 */

import { useState, type CSSProperties } from 'react';

import { Skeleton } from './skeleton';

export function RemoteImage({
  uri,
  /** Sizing lives on the wrapper, so the skeleton matches the image exactly. */
  style,
  contentFit = 'cover',
  radius = 0,
  accessibilityLabel,
}: {
  uri: string;
  style?: CSSProperties;
  contentFit?: 'cover' | 'contain' | 'fill';
  radius?: number;
  accessibilityLabel?: string;
}) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: radius,
        ...style,
      }}>
      {loaded ? null : (
        <Skeleton width="100%" height="100%" radius={radius} style={{ position: 'absolute', inset: 0 }} />
      )}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={uri}
        alt={accessibilityLabel ?? ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          objectFit: contentFit,
          opacity: loaded ? 1 : 0,
          transition: 'opacity 240ms ease',
        }}
      />
    </div>
  );
}
