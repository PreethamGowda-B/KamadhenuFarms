import { NextRequest, NextResponse } from 'next/server';

const ADMIN_COOKIE_NAME = 'khf_admin_token';
const SALES_COOKIE_NAME = 'khf_sales_token';

/**
 * Edge Runtime compatible HMAC-SHA256 JWT signature verification using native Web Crypto API.
 * Validates token structure (3 segments), header algorithm (HS256), cryptographic signature,
 * token expiry (exp claim), and expected role.
 */
async function verifyJwtEdge(token: string | undefined, expectedRole: string): Promise<boolean> {
  if (!token || typeof token !== 'string') return false;

  const secret = process.env.JWT_SECRET;
  if (!secret) return false;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;

    const [headerB64, payloadB64, signatureB64] = parts;

    const base64UrlDecode = (str: string): string => {
      let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
      const pad = b64.length % 4;
      if (pad) b64 += '='.repeat(4 - pad);
      return atob(b64);
    };

    // 1. Verify Header algorithm & type
    const header = JSON.parse(base64UrlDecode(headerB64));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') {
      return false;
    }

    // 2. Cryptographic Signature Verification via Web Crypto API (Constant-time)
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    let sigB64 = signatureB64.replace(/-/g, '+').replace(/_/g, '/');
    const sigPad = sigB64.length % 4;
    if (sigPad) sigB64 += '='.repeat(4 - sigPad);
    const sigBinary = atob(sigB64);
    const sigBytes = new Uint8Array(sigBinary.length);
    for (let i = 0; i < sigBinary.length; i++) {
      sigBytes[i] = sigBinary.charCodeAt(i);
    }

    const dataBytes = enc.encode(`${headerB64}.${payloadB64}`);
    const isValidSignature = await crypto.subtle.verify('HMAC', key, sigBytes, dataBytes);
    if (!isValidSignature) {
      return false;
    }

    // 3. Verify Payload claims and expiration
    const payload = JSON.parse(base64UrlDecode(payloadB64));
    const now = Math.floor(Date.now() / 1000);

    if (payload.exp && now > payload.exp) {
      return false;
    }

    if (payload.role !== expectedRole) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 0. Static Service Worker Bypass: Never redirect or intercept Web Push service worker on any domain/subdomain
  if (pathname === '/firebase-messaging-sw.js' || pathname.startsWith('/firebase-messaging-sw.js')) {
    return NextResponse.next();
  }

  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || req.nextUrl.hostname || '').toLowerCase();
  const proto = req.headers.get('x-forwarded-proto') || 'https';

  // Handle CORS Preflight OPTIONS requests
  if (req.method === 'OPTIONS') {
    const origin = req.headers.get('origin') || '*';
    return new NextResponse(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, rsc, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept',
        'Access-Control-Allow-Credentials': 'true',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  // Force HTTPS in production to prevent CORS redirects during client fetch
  if (proto === 'http' && !host.includes('localhost') && !host.includes('127.0.0.1')) {
    return NextResponse.redirect(`https://${host}${req.nextUrl.pathname}${req.nextUrl.search}`, 308);
  }

  // Helper to add CORS headers to outgoing response
  const setCorsHeaders = (res: NextResponse) => {
    const origin = req.headers.get('origin');
    if (origin) {
      res.headers.set('Access-Control-Allow-Origin', origin);
      res.headers.set('Access-Control-Allow-Credentials', 'true');
    } else {
      res.headers.set('Access-Control-Allow-Origin', '*');
    }
    res.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, rsc, Next-Router-State-Tree, Next-Router-Prefetch, Next-Url, Accept');
    return res;
  };

  // 1. Check Subdomains
  const isAdminSubdomain = host.startsWith('admin.');
  const isFormSubdomain = host.startsWith('form.');

  // 2. Validate Admin JWT Session from Cookie with HMAC-SHA256 Signature Verification
  const adminToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  const isAdminAuthenticated = await verifyJwtEdge(adminToken, 'ADMIN');

  // 3. Validate Sales Executive JWT Session from Cookie with HMAC-SHA256 Signature Verification
  const salesToken = req.cookies.get(SALES_COOKIE_NAME)?.value;
  const isSalesAuthenticated = await verifyJwtEdge(salesToken, 'SALES_EXECUTIVE');

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
      pathname === '/orders' ||
      pathname.startsWith('/orders/') ||
      pathname === '/referrals' ||
      pathname.startsWith('/referrals/') ||
      pathname === '/shops' ||
      pathname.startsWith('/shops/') ||
      pathname === '/customers' ||
      pathname.startsWith('/customers/') ||
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
      if (pathname === '/orders') {
        return NextResponse.rewrite(new URL('/admin/orders', req.url));
      }
      if (pathname.startsWith('/orders/')) {
        const id = pathname.replace('/orders/', '');
        return NextResponse.rewrite(new URL(`/admin/orders/${id}`, req.url));
      }
      if (pathname === '/referrals') {
        return NextResponse.rewrite(new URL('/admin/referrals', req.url));
      }
      if (pathname === '/shops') {
        return NextResponse.rewrite(new URL('/admin/shops', req.url));
      }
      if (pathname.startsWith('/shops/')) {
        const id = pathname.replace('/shops/', '');
        return NextResponse.rewrite(new URL(`/admin/shops/${id}`, req.url));
      }
      if (pathname === '/customers') {
        return NextResponse.rewrite(new URL('/admin/customers', req.url));
      }
      if (pathname.startsWith('/customers/')) {
        const id = pathname.replace('/customers/', '');
        return NextResponse.rewrite(new URL(`/admin/customers/${id}`, req.url));
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

  const res = NextResponse.next();
  if (pathname.startsWith('/api')) {
    return setCorsHeaders(res);
  }
  return res;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except static assets and service workers
     */
    '/((?!_next/static|_next/image|favicon|apple-touch-icon|android-chrome|icon|apple-icon|site\\.webmanifest|robots\\.txt|sitemap\\.xml|assets/|styles\\.css|script\\.js|firebase-messaging-sw\\.js).*)',
  ],
};
