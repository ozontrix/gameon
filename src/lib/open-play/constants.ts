export const OPEN_PLAY_DATE = '2026-10-18';
export const OPEN_PLAY_DATE_LABEL = 'Sunday, 18 October 2026';
export const OPEN_PLAY_REGISTRATION_CLOSE = '2026-10-18T18:30:00+00:00';
export { PUBLIC_PAID_BOOKING_START } from '@/lib/utils/booking-dates';
export const PAID_PLAY_DATE_LABEL = '19 October 2026';
export const OPEN_PLAY_VENUE = 'GameOn Multisports · Sector 70, Gurugram';
export const OPEN_PLAY_MAP_URL = 'https://maps.google.com/?q=28.394516,77.0126389';
export const OPEN_PLAY_PHONE = '+91 74948 25740';
export const OPEN_PLAY_SPORT_IDS = ['cricket', 'football', 'badminton', 'pickleball'] as const;
export type OpenPlaySport = typeof OPEN_PLAY_SPORT_IDS[number];
export const OPEN_PLAY_SPORTS: { id: OpenPlaySport; name: string; line: string; detail: string; color: string }[] = [
  { id: 'cricket', name: 'Cricket', line: 'Bring your best shot.', detail: 'Big hits. New teammates. Box cricket on the turf.', color: '#F38F2F' },
  { id: 'football', name: 'Football', line: 'Find your Sunday squad.', detail: 'Trade the group chat for a game on the turf.', color: '#A8D5A2' },
  { id: 'badminton', name: 'Badminton', line: 'Make a little racket.', detail: 'A friendly rally or a big smash. Your call.', color: '#C3B1EF' },
  { id: 'pickleball', name: 'Pickleball', line: 'Meet your new favourite.', detail: 'Curious about pickleball? This is your invitation.', color: '#F0CE78' },
];

export function openPlayIsClosed(now = Date.now()): boolean {
  return now >= Date.parse(OPEN_PLAY_REGISTRATION_CLOSE);
}