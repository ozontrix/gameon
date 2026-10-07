import type { OpenPlaySport } from '@/lib/open-play/constants';

/** Original, lightweight equipment illustrations; decorative next to sport labels. */
export function SportArt({ sport, className = '' }: { sport: OpenPlaySport; className?: string }) {
  return <svg viewBox="0 0 160 140" className={className} fill="none" aria-hidden="true" focusable="false">
    <ellipse cx="80" cy="126" rx="57" ry="7" fill="currentColor" opacity=".09" />
    {sport === 'cricket' ? <>
      <path d="M48 111V47M64 111V47M80 111V47M45 44H82" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
      <g transform="rotate(28 108 75)"><path d="M108 17V50" stroke="#F3F2ED" strokeWidth="10" strokeLinecap="round" /><path d="M97 47H119V112Q108 120 97 112Z" fill="currentColor" /><path d="M108 57V102" stroke="#0B0B0C" strokeWidth="2" opacity=".35" /></g>
      <circle cx="40" cy="105" r="13" fill="#F3F2ED" /><path d="M33 95Q46 105 33 115" stroke="#0B0B0C" strokeWidth="2" strokeDasharray="3 3" />
    </> : sport === 'football' ? <>
      <circle cx="80" cy="70" r="49" fill="currentColor" /><circle cx="80" cy="70" r="46" stroke="#0B0B0C" strokeOpacity=".2" strokeWidth="2" />
      <path d="M80 48 100 62 92 85H68L60 62Z" fill="#0B0B0C" /><path d="M80 48V23M100 62 125 54M92 85 109 109M68 85 51 109M60 62 35 54" stroke="#0B0B0C" strokeWidth="3" />
      <path d="m80 23 13 6-13 9-13-9ZM125 54l3 14-14-6ZM109 109l-14 8-1-16ZM51 109l-11-11 16-3ZM35 54l5-14 10 12Z" fill="#0B0B0C" />
    </> : sport === 'badminton' ? <>
      <g transform="rotate(-28 62 67)"><ellipse cx="62" cy="49" rx="26" ry="35" stroke="currentColor" strokeWidth="6" /><path d="M44 25V73M55 16V82M66 16V82M77 25V73M36 36H87M35 49H89M36 62H87M43 75H80" stroke="currentColor" strokeWidth="1.2" opacity=".55" /><path d="M62 85V121" stroke="#F3F2ED" strokeWidth="7" strokeLinecap="round" /></g>
      <g transform="rotate(18 114 75)"><path d="M101 81 93 39 108 44 117 34 126 43 140 40 125 86Z" fill="#F3F2ED" /><path d="M101 81H125L121 95Q112 104 104 95Z" fill="currentColor" /><path d="M108 45 110 81M126 44 118 81" stroke="#0B0B0C" strokeWidth="2" opacity=".25" /></g>
    </> : <>
      <g transform="rotate(-24 66 70)"><rect x="34" y="15" width="63" height="76" rx="24" fill="currentColor" /><path d="M65 92V122" stroke="#F3F2ED" strokeWidth="12" strokeLinecap="round" /><path d="M44 34H87M41 47H90M41 60H90M45 73H86" stroke="#0B0B0C" strokeOpacity=".17" strokeWidth="2" /></g>
      <circle cx="117" cy="91" r="24" fill="#F3F2ED" />{[[110, 77], [125, 78], [104, 91], [119, 92], [130, 96], [111, 105]].map(([cx, cy]) => <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r="3.5" fill="#0B0B0C" />)}
    </>}
  </svg>;
}