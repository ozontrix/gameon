import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../db/supabase';

export type UserRole = 'USER' | 'ADMIN' | 'STAFF';

const ROLES: readonly UserRole[] = ['USER', 'ADMIN', 'STAFF'];

export interface AuthenticatedUser {
  id: string;
  role: UserRole;
  provider: 'email' | 'phone';
}

export async function withAuth(
  request: Request,
  allowedRoles: UserRole[],
  handler: (request: Request, user: AuthenticatedUser) => Promise<NextResponse>
) {
  console.log(`[API CALL] ${request.method} ${new URL(request.url).pathname}`);

  const authHeader = request.headers.get('authorization');

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    // ONLY Accept Supabase JWTs. We strictly verify them against our environment keys.
    const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !sbUser) {
      throw new Error(error?.message || 'Invalid token');
    }

    // Roles live in app_metadata, which only the service role can write.
    const role = sbUser.app_metadata?.role;
    const user: AuthenticatedUser = {
      id: sbUser.id,
      role: ROLES.includes(role) ? role : 'USER',
      provider: sbUser.app_metadata?.provider === 'phone' ? 'phone' : 'email',
    };

    if (!allowedRoles.includes(user.role)) {
      return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    return handler(request, user);
  } catch (error) {
    console.error('Auth Error:', error);
    return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
  }
}
