import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'khf_admin_token';
const SALES_COOKIE_NAME = 'khf_sales_token';

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname;

  // 1. Check Subdomains
  const isAdminSubdomain = host.startsWith('admin.');
  const isFormSubdomain = host.startsWith('form.');

  // 2. Validate Admin JWT Session from Cookie
  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  let isAdminAuthenticated = false;

  if (adminToken) {
    try {
      const parts = adminToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && now < payload.exp && payload.role === 'ADMIN') {
          isAdminAuthenticated = true;
        }
      }
    } catch (e) {
      isAdminAuthenticated = false;
    }
  }

  // 3. Validate Sales Executive JWT Session from Cookie
  const salesToken = req.cookies.get(SALES_COOKIE_NAME)?.value;
  let isSalesAuthenticated = false;

  if (salesToken) {
    try {
      const parts = salesToken.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8'));
        const now = Math.floor(Date.now() / 1000);
        if (payload.exp && now < payload.exp && payload.role === 'SALES_EXECUTIVE') {
          isSalesAuthenticated = true;
        }
      }
    } catch (e) {
      isSalesAuthenticated = false;
    }
  }

  // 4. FORM SUBDOMAIN ROUTING (form.kamadhenuhoneyfarms.in)
  if (isFormSubdomain) {
    // Prevent admin routes on form subdomain
    if (pathname.startsWith('/admin')) {
      return NextResponse.redirect(new URL('/shop-form', req.url));
    }

    if (pathname === '/' || pathname === '/form') {
      return NextResponse.rewrite(new URL('/shop-form', req.url));
    }

    if (pathname === '/dashboard') {
      return NextResponse.rewrite(new URL('/sales', req.url));
    }

    if (pathname === '/login') {
      return NextResponse.rewrite(new URL('/sales/login', req.url));
    }

    return NextResponse.next();
  }

  // 5. Protected Admin API Routes Enforcement (/api/admin/*)
  if (pathname.startsWith('/api/admin')) {
    if (pathname === '/api/admin/login' || pathname === '/api/admin/logout') {
      return NextResponse.next();
    }
    if (!isAdminAuthenticated) {
      return NextResponse.json(
        { success: false, message: '403 Unauthorized: Admin authentication required' },
        { status: 403 }
      );
    }
    return NextResponse.next();
  }

  // 6. ADMIN SUBDOMAIN ROUTING (admin.kamadhenuhoneyfarms.in)
  if (isAdminSubdomain) {
    // A. Root URL
    if (pathname === '/') {
      if (isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      } else {
        return NextResponse.redirect(new URL('/login', req.url));
      }
    }

    // B. Login Page
    if (pathname === '/login') {
      if (isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
      return NextResponse.rewrite(new URL('/admin/login', req.url));
    }

    // C. Protected Subdomain Routes
    if (
      pathname === '/dashboard' || 
      pathname === '/applications' || 
      pathname.startsWith('/applications/') ||
      pathname === '/shops' ||
      pathname.startsWith('/shops/') ||
      pathname === '/analytics' || 
      pathname === '/settings' ||
      pathname.startsWith('/admin')
    ) {
      if (!isAdminAuthenticated) {
        const loginUrl = new URL('/login', req.url);
        loginUrl.searchParams.set('from', pathname);
        return NextResponse.redirect(loginUrl);
      }

      if (pathname === '/dashboard' || pathname === '/applications') {
        return NextResponse.rewrite(new URL('/admin/recruitment', req.url));
      }
      if (pathname.startsWith('/applications/')) {
        const id = pathname.replace('/applications/', '');
        return NextResponse.rewrite(new URL(`/admin/recruitment/applications/${id}`, req.url));
      }
      if (pathname === '/shops') {
        return NextResponse.rewrite(new URL('/admin/shops', req.url));
      }
      if (pathname.startsWith('/shops/')) {
        const id = pathname.replace('/shops/', '');
        return NextResponse.rewrite(new URL(`/admin/shops/${id}`, req.url));
      }
      if (pathname === '/analytics') {
        return NextResponse.rewrite(new URL('/admin/recruitment/analytics', req.url));
      }
      if (pathname === '/settings') {
        return NextResponse.rewrite(new URL('/admin/settings', req.url));
      }
      if (pathname === '/admin/login' && isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }

      return NextResponse.next();
    }

    // D. Prevent public website from EVER loading on admin subdomain
    if (!isAdminAuthenticated) {
      return NextResponse.redirect(new URL('/login', req.url));
    } else {
      return NextResponse.redirect(new URL('/dashboard', req.url));
    }
  }

  // 7. MAIN WEBSITE ROUTING (kamadhenuhoneyfarms.in, www.kamadhenuhoneyfarms.in)
  if (pathname.startsWith('/admin')) {
    if (pathname === '/admin/login') {
      if (isAdminAuthenticated) {
        return NextResponse.redirect(new URL('/admin/recruitment', req.url));
      }
      return NextResponse.next();
    }

    if (!isAdminAuthenticated) {
      const loginUrl = new URL('/admin/login', req.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 8. Sales Dashboard Protection (/sales)
  if (pathname.startsWith('/sales') && pathname !== '/sales/login') {
    if (!isSalesAuthenticated && !isAdminAuthenticated) {
      const loginUrl = new URL('/sales/login', req.url);
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
