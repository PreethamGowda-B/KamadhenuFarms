import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCustomerSessionFromRequest } from '@/lib/customerAuth';

/**
 * POST /api/customer/notifications/register-token
 * Registers an FCM push token for an authenticated customer.
 * Security: Strictly derives customer identity from verified session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, message: '401 Unauthorized: Valid customer session required' },
        { status: 401 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { token, deviceType, browser } = body;

    if (!token || typeof token !== 'string' || token.trim().length < 20) {
      return NextResponse.json(
        { success: false, message: 'Invalid or missing device token' },
        { status: 400 }
      );
    }

    const cleanToken = token.trim();
    const userAgent = req.headers.get('user-agent') || undefined;

    // Upsert token bound to verified customer session ID
    const device = await prisma.deviceToken.upsert({
      where: { token: cleanToken },
      update: {
        customerId: session.id,
        isAdmin: false,
        isActive: true,
        lastUsedAt: new Date(),
        deviceType: deviceType || 'mobile',
        browser: browser || 'other',
        userAgent,
      },
      create: {
        token: cleanToken,
        customerId: session.id,
        isAdmin: false,
        isActive: true,
        deviceType: deviceType || 'mobile',
        browser: browser || 'other',
        userAgent,
      },
    });

    console.log(`📱 [Customer Push Registration] Registered device token for customer ${session.id} (Device: ${device.deviceType})`);

    return NextResponse.json({
      success: true,
      message: 'Notification updates enabled for this device',
      deviceId: device.id,
    });
  } catch (error: any) {
    console.error('Failed to register customer device token:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error registering notification device' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/customer/notifications/register-token
 * Unregisters customer push token.
 */
export async function DELETE(req: NextRequest) {
  try {
    const session = await getCustomerSessionFromRequest(req);
    if (!session || !session.id) {
      return NextResponse.json(
        { success: false, message: '401 Unauthorized: Valid customer session required' },
        { status: 401 }
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
        customerId: session.id,
      },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Customer device token unregistered',
    });
  } catch (error: any) {
    console.error('Failed to unregister customer device token:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error unregistering device' },
      { status: 500 }
    );
  }
}
