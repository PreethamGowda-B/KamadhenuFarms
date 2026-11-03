import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

/**
 * POST /api/admin/notifications/register-token
 * Registers an FCM push token for an authenticated administrator.
 * Strictly verified: requires valid HMAC-SHA256 admin session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '403 Forbidden: Administrator authorization required' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, deviceType, browser } = body;

    if (!token || typeof token !== 'string' || token.trim().length < 20) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing FCM device token' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const userAgent = req.headers.get('user-agent') || undefined;

    // Upsert token strictly bound to this authenticated admin
    const device = await prisma.deviceToken.upsert({
      where: { token: cleanToken },
      update: {
        isAdmin: true,
        adminEmail: admin.email,
        isActive: true,
        lastUsedAt: new Date(),
        deviceType: deviceType || 'desktop',
        browser: browser || 'other',
        userAgent,
      },
      create: {
        token: cleanToken,
        isAdmin: true,
        adminEmail: admin.email,
        isActive: true,
        deviceType: deviceType || 'desktop',
        browser: browser || 'other',
        userAgent,
      },
    });

    console.log(`📱 [Admin Push Registration] Registered device token for ${admin.email} (Device: ${device.deviceType}, ID: ${device.id})`);

    return NextResponse.json({
      success: true,
      message: 'Admin device push notification token registered successfully',
      deviceId: device.id,
    });
  } catch (error: any) {
    console.error('Failed to register admin device token:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error registering admin device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notifications/register-token
 * Unregisters / disables an FCM push token for the authenticated administrator.
 */
export async function DELETE(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '403 Forbidden: Administrator authorization required' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json(
        { success: false, message: 'Missing token to unregister' },
        { status: 400 }
      );
    }

    await prisma.deviceToken.updateMany({
      where: {
        token: token.trim(),
        adminEmail: admin.email,
      },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Admin device token unregistered',
    });
  } catch (error: any) {
    console.error('Failed to unregister admin device token:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error unregistering device' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/notifications/register-token
 * Returns active registered devices for the current admin.
 */
export async function GET(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '403 Forbidden: Administrator authorization required' },
        { status: 403 }
      );
    }

    const devices = await prisma.deviceToken.findMany({
      where: {
        adminEmail: admin.email,
        isAdmin: true,
        isActive: true,
      },
      select: {
        id: true,
        deviceType: true,
        browser: true,
        lastUsedAt: true,
        createdAt: true,
      },
      orderBy: { lastUsedAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      devices,
    });
  } catch (error: any) {
    console.error('Failed to list admin devices:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error listing devices' },
      { status: 500 }
    );
  }
}
