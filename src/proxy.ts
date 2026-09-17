import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

const LOGIN_PATH = '/admin/login';

/** Sections only admins may open. Pages check this again on the server. */
const ADMIN_ONLY = ['/admin/refunds', '/admin/venues', '/admin/courts', '/admin/sports', '/admin/closures', '/admin/team', '/admin/activity'];

/**
 * Admin panel gatekeeper.
 *
 * Keeps the Supabase session cookies fresh and redirects anyone without an
 * ADMIN or STAFF role to the login page. This is an optimistic check only:
 * every admin page and server action verifies the role again on the server.
 */
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? '',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  // Verifies the access token (refreshing it when needed) before trusting its claims.
  const { data } = await supabase.auth.getClaims();
  const role = data?.claims?.app_metadata?.role;
  const isStaff = role === 'ADMIN' || role === 'STAFF';

  const { pathname, search } = request.nextUrl;
  const onLoginPage = pathname === LOGIN_PATH;

  const redirectTo = (target: URL) => {
    const redirect = NextResponse.redirect(target);
    // Carry over any refreshed session cookies.
    response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
    return redirect;
  };

  if (!isStaff && !onLoginPage) {
    const login = new URL(LOGIN_PATH, request.url);
    login.searchParams.set('next', `${pathname}${search}`);
    return redirectTo(login);
  }

  if (isStaff && onLoginPage) {
    return redirectTo(new URL('/admin', request.url));
  }

  // Redirect before rendering starts, so staff never see an admin page's loading state.
  if (role === 'STAFF' && ADMIN_ONLY.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    return redirectTo(new URL('/admin?denied=1', request.url));
  }

  return response;
}

export const config = {
  matcher: ['/admin/:path*'],
};
