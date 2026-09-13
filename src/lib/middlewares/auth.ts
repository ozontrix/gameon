import { NextResponse } from 'next/server';

export interface AuthenticatedUser {
  id: string;
  role: 'USER' | 'ADMIN' | 'STAFF';
}

// In a real application, you would use something like `jose` to verify JWTs,
// or Supabase's `auth.getUser()` if you're using Supabase Auth.
// This is a placeholder structure to represent the middleware logic.

export async function withAuth(
  request: Request,
  allowedRoles: ('USER' | 'ADMIN' | 'STAFF')[],
  handler: (request: Request, user: AuthenticatedUser) => Promise<NextResponse>
) {
  const authHeader = request.headers.get('authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ success: false, error: 'Unauthorized: Missing token' }, { status: 401 });
  }

  const token = authHeader.split(' ')[1];

  try {
    // TODO: Verify token and extract user information.
    // Example: const user = await verifyToken(token);
    
    // Placeholder user for demonstration:
    const user: AuthenticatedUser = {
      id: 'placeholder-uuid',
      role: 'ADMIN', // Hardcoded for demo purposes
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
