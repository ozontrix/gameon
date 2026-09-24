import { NextResponse } from 'next/server';
import { TournamentService } from '@/lib/services/tournament.service';

/** Public, unauthenticated: the tournaments the app's Tournaments rail lists. */
export async function GET() {
  try {
    const tournaments = await TournamentService.listPublic();
    return NextResponse.json({ success: true, data: tournaments });
  } catch (error) {
    console.error('Get Tournaments Error:', error);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
