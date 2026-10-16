'use client';

/**
 * The floodlit-stadium backdrop behind the auth screens. The web twin of the app
 * `components/auth/auth-backdrop.tsx`.
 *
 * Its gradient stops are illustration shading rather than semantic colours, so
 * they stay local rather than going into `theme.ts` — the same rule the handset
 * build follows.
 */

export function AuthBackdrop() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        overflow: 'hidden',
      }}>
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 390 844"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}>
        <defs>
          <linearGradient id="gameon-auth-bg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#1a120b" />
            <stop offset="0.5" stopColor="#0e0b08" />
            <stop offset="1" stopColor="#080605" />
          </linearGradient>
          <radialGradient id="gameon-auth-flood" cx="0.5" cy="0.5" r="0.5">
            <stop offset="0" stopColor="#f5c97a" stopOpacity="0.5" />
            <stop offset="1" stopColor="#f5c97a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="gameon-auth-vignette" cx="0.5" cy="0.5" r="0.75">
            <stop offset="0.55" stopColor="#000000" stopOpacity="0" />
            <stop offset="1" stopColor="#000000" stopOpacity="0.55" />
          </radialGradient>
        </defs>

        <rect width="390" height="844" fill="url(#gameon-auth-bg)" />

        {/* floodlight glows near the top corners */}
        <circle cx="70" cy="64" r="160" fill="url(#gameon-auth-flood)" />
        <circle cx="320" cy="64" r="160" fill="url(#gameon-auth-flood)" />

        <rect width="390" height="844" fill="url(#gameon-auth-vignette)" />
      </svg>
    </div>
  );
}
