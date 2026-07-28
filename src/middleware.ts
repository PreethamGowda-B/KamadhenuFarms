import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'khf_admin_token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname;

  // 1. Check if request comes from admin subdomain (e.g. admin.kamadhenuhoneyfarms.in or admin.localhost)
  const isAdminSubdomain = host.startsWith('admin.');

  // 2. Validate JWT Session from Cookie
  const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  let isAuthenticated = false;

  if (token) {
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && now < payload.exp && payload.role === 'ADMIN') {
          isAuthenticated = true;
        }
      }
    } catch (e) {
      isAuthenticated = false;
    }
  }

  // 3. Protected API Routes Enforcement (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
      return NextResponse.next();
    }
    if (!isAuthenticated) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin authentication required' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 4. ADMIN SUBDOMAIN ROUTING (admin.kamadhenuhoneyfarms.in)
  if (isAdminSubdomain) {
    // A. Root URL (https://admin.kamadhenuhoneyfarms.in/)
    if (pathname === '/') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } else {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // B. Login Page (/login)
    if (pathname === '/login') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.rewrite(new URL('/admin/login', req.url));
    }

    // C. Protected Subdomain Routes (/dashboard, /applications, /analytics, /settings)
    if (
      pathname === '/dashboard' || 
      pathname === '/applications' || 
      pathname.startsWith('/applications/') ||
      pathname === '/analytics' || 
      pathname === '/settings' ||
      pathname.startsWith('/admin')
    ) {
      if (!isAuthenticated) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
      }

      // Perform internal rewrites to corresponding app router pages
      if (pathname === '/dashboard' || pathname === '/applications') {
        return NextResponse.rewrite(new URL('/admin/recruitment', req.url));
      }
      if (pathname.startsWith('/applications/')) {
        const id = pathname.replace('/applications/', '');
        return NextResponse.rewrite(new URL(`/admin/recruitment/applications/${id}`, req.url));
      }
      if (pathname === '/analytics') {
        return NextResponse.rewrite(new URL('/admin/recruitment/analytics', req.url));
      }
      if (pathname === '/settings') {
        return NextResponse.rewrite(new URL('/admin/settings', req.url));
      }
      if (pathname === '/admin/login' && isAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      return NextResponse.next();
    }

    // D. Prevent public website from EVER loading on admin subdomain
    if (!isAuthenticated) {
      return NextResponse.redirect(new URL('/login', req.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // 5. MAIN WEBSITE ROUTING (kamadhenuhoneyfarms.in, www.kamadhenuhoneyfarms.in)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (isAuthenticated) {
        return NextResponse.redirect(new URL('/admin/recruitment', req.url));
      }
      return NextResponse.next();
    }

    if (!isAuthenticated) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets
     */
    '/((?!_next/static|_next/image|favicon.ico|assets/|styles.css|script.js).*)',
  ],
};
