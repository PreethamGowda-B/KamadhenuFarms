import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'khf_admin_token';
const JWT_SECRET = process.env.JWT_SECRET || 'kamadhenu-luxury-secret-key-2026-super-secure';

export async function middleware(req: NextRequest) {
  const { pathname, hostname } = req.nextUrl;

  // Subdomain detection: if request comes to admin.kamadhenuhoneyfarms.in
  const isAdminSubdomain = hostname.startsWith('admin.');

  const isAdminPageRoute = pathname.startsWith('/admin');
  const isAdminApiRoute = pathname.startsWith('/api/admin');

  const isLoginRoute = pathname === '/admin/login' || pathname === '/api/admin/login';

  // If visiting admin route or admin subdomain
  if (isAdminPageRoute || isAdminApiRoute || isAdminSubdomain) {
    if (isLoginRoute) {
      return NextResponse.next();
    }

    const token = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
    let isAuthenticated = false;

    if (token) {
      try {
        const parts = token.split('.');
        if (parts.length === 3) {
          const body = parts[1];
          const payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
          const now = Math.floor(Date.now() / 1000);
          if (payload.exp && now < payload.exp && payload.role === 'ADMIN') {
            isAuthenticated = true;
          }
        }
      } catch (e) {
        isAuthenticated = false;
      }
    }

    if (!isAuthenticated) {
      // Return 403 for API routes
      if (isAdminApiRoute) {
        return NextResponse.json(
          { success: false, message: '403 Unauthorized: Admin authentication required' },
          { status: 403 }
        );
      }

      // Redirect pages to /admin/login
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
};
