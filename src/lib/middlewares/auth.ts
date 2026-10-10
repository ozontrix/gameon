import { NextResponse } from 'next/server';
import { supabaseAdmin } from '../db/supabase';
import { decodeJwt } from 'jose';
import { isPhoneSessionToken, PhoneSessionError, verifyPhoneSession } from '../phone-session';

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

  let user: AuthenticatedUser;
  try {
    if (isPhoneSessionToken(token)) {
      const identity = await verifyPhoneSession(token);
      user = { id: identity.user_id, role: ROLES.includes(identity.role as UserRole) ? identity.role as UserRole : 'USER', provider: 'phone' };
    } else {
      let claims;
      try { claims = decodeJwt(token); } catch { throw new PhoneSessionError('Invalid token'); }
      const metadata = claims.app_metadata as { provider?: string } | undefined;
      if (metadata?.provider === 'phone' && !claims.session_id) throw new PhoneSessionError('Legacy phone session: sign in again');
      const { data: { user: sbUser }, error } = await supabaseAdmin.auth.getUser(token);

      if (error?.status && error.status >= 500) throw error;
      if (error || !sbUser) throw new PhoneSessionError('Invalid token');

      // Roles live in app_metadata, which only the service role can write.
      const role = sbUser.app_metadata?.role;
      user = {
        id: sbUser.id,
        role: ROLES.includes(role) ? role : 'USER',
        provider: sbUser.app_metadata?.provider === 'phone' ? 'phone' : 'email',
      };

    }
  } catch (error) {
    if (error instanceof PhoneSessionError) {
      return NextResponse.json({ success: false, error: 'Unauthorized: Invalid token' }, { status: 401 });
    }
    console.error('Authentication service unavailable');
    return NextResponse.json({ success: false, error: 'Authentication temporarily unavailable' }, { status: 503 });
  }
  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json({ success: false, error: 'Forbidden: Insufficient permissions' }, { status: 403 });
  }
  return handler(request, user);
}
