import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit, verifyAdminPassword, signJwt, ADMIN_COOKIE_NAME } from '@/lib/auth';
import { logAdminAction } from '@/lib/audit';

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // 1. Rate Limiting Check
    const rateCheck = checkRateLimit(ip);
    if (!rateCheck.allowed) {
      logAdminAction('UNKNOWN', 'LOGIN_RATE_LIMITED', undefined, `IP: ${ip}`, ip);
      return NextResponse.json(
        {
          success: false,
          message: 'Too many login attempts. Please try again in 15 minutes.',
        },
        { status: 429 }
      );
    }

    const body = await req.json();
    const { email, password, rememberMe } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: 'Email and password are required' },
        { status: 400 }
      );
    }

    // 2. Credential Verification
    const isValidEmail = email.trim().toLowerCase() === 'admin@kamadhenuhoneyfarms.in';
    const isValidPassword = verifyAdminPassword(password);

    if (!isValidEmail || !isValidPassword) {
      logAdminAction(email, 'LOGIN_FAILED', undefined, `Invalid credentials for ${email}`, ip);
      return NextResponse.json(
        { success: false, message: 'Invalid admin email or password' },
        { status: 401 }
      );
    }

    // 3. Generate Signed JWT Token (8 hours or 30 days if rememberMe)
    const expiresInSeconds = rememberMe ? 30 * 24 * 3600 : 8 * 3600;
    const token = signJwt({ email: 'admin@kamadhenuhoneyfarms.in', role: 'ADMIN' }, expiresInSeconds);

    // 4. Audit Log
    logAdminAction('admin@kamadhenuhoneyfarms.in', 'LOGIN_SUCCESS', undefined, `RememberMe: ${!!rememberMe}`, ip);

    // 5. Create Response & Set HttpOnly Cookie
    const response = NextResponse.json({
      success: true,
      message: 'Admin authentication successful',
      user: {
        email: 'admin@kamadhenuhoneyfarms.in',
        role: 'ADMIN',
      },
    });

    response.cookies.set({
      name: ADMIN_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: expiresInSeconds,
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error during login' },
      { status: 500 }
    );
  }
}
