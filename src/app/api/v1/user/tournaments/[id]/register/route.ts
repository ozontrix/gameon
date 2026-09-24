import { NextResponse } from 'next/server';
import { z } from 'zod';
import { withAuth } from '@/lib/middlewares/auth';
import { TournamentError, TournamentService } from '@/lib/services/tournament.service';

const registerSchema = z.object({
  teamName: z.string().trim().min(2).max(120),
  captainName: z.string().trim().min(2).max(120),
  contactPhone: z.string().trim().min(6).max(20),
  contactEmail: z.string().trim().email().max(200).optional().or(z.literal('')),
  notes: z.string().trim().max(600).optional(),
});

/** Holds a team slot in a tournament. The entry fee is priced server-side. */
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return withAuth(request, ['USER', 'ADMIN', 'STAFF'], async (req, user) => {
    try {
      const { id } = await params;
      const body = await req.json();
      const validation = registerSchema.safeParse(body);
      if (!validation.success) {
        return NextResponse.json(
          { error: 'Invalid payload', details: validation.error.format() },
          { status: 400 }
        );
      }

      const registration = await TournamentService.register(user.id, {
        tournamentId: id,
        teamName: validation.data.teamName,
        captainName: validation.data.captainName,
        contactPhone: validation.data.contactPhone,
        contactEmail: validation.data.contactEmail || undefined,
        notes: validation.data.notes,
      });

      return NextResponse.json(
        { success: true, registrationId: registration.id, amount: registration.amount_paid },
        { status: 201 }
      );
    } catch (error) {
      if (error instanceof TournamentError) {
        return NextResponse.json({ success: false, error: error.message }, { status: error.status });
      }
      console.error('Register Tournament Error:', error);
      return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
  });
}
