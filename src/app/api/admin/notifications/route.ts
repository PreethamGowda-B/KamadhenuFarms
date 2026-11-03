import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getAdminSessionFromRequest } from '@/lib/auth';

/**
 * GET /api/admin/notifications
 * Returns unread notification count and the latest admin notifications.
 * Strictly protected: requires a valid HMAC-SHA256 admin session.
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

    const { searchParams } = new URL(req.url);
    const limitParam = parseInt(searchParams.get('limit') || '20', 10);
    const limit = Math.min(Math.max(1, isNaN(limitParam) ? 20 : limitParam), 50);
    const unreadOnly = searchParams.get('unreadOnly') === 'true';

    // Concurrently fetch unread count and latest notifications
    const [unreadCount, notifications] = await Promise.all([
      prisma.adminNotification.count({
        where: { isRead: false },
      }),
      prisma.adminNotification.findMany({
        where: unreadOnly ? { isRead: false } : undefined,
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          link: true,
          isRead: true,
          metadata: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json(
      {
        success: true,
        unreadCount,
        notifications,
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('Failed to fetch admin notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error fetching notifications' },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/admin/notifications
 * Marks individual or all notifications as read.
 */
export async function PATCH(req: NextRequest) {
  try {
    const admin = getAdminSessionFromRequest(req);
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json(
        { success: false, message: '403 Forbidden: Administrator authorization required' },
        { status: 403 }
      );
    }

    const body = await req.json().catch(() => ({}));
    const { action, id } = body;

    if (action === 'MARK_ALL_READ') {
      await prisma.adminNotification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read',
        unreadCount: 0,
      });
    }

    if (id && typeof id === 'string' && id.trim()) {
      const cleanId = id.trim();
      const existing = await prisma.adminNotification.findUnique({
        where: { id: cleanId },
        select: { id: true, isRead: true },
      });

      if (!existing) {
        return NextResponse.json(
          { success: false, message: 'Notification not found' },
          { status: 404 }
        );
      }

      await prisma.adminNotification.update({
        where: { id: cleanId },
        data: { isRead: true },
      });

      const unreadCount = await prisma.adminNotification.count({
        where: { isRead: false },
      });

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read',
        unreadCount,
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid payload: provide either id or action "MARK_ALL_READ"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to update admin notifications:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error updating notification' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/notifications
 * Clears read notifications or deletes a specific notification.
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

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const clearRead = searchParams.get('clearRead') === 'true';

    if (clearRead) {
      await prisma.adminNotification.deleteMany({
        where: { isRead: true },
      });
      return NextResponse.json({ success: true, message: 'Read notifications cleared' });
    }

    if (id) {
      await prisma.adminNotification.delete({
        where: { id },
      });
      return NextResponse.json({ success: true, message: 'Notification deleted' });
    }

    return NextResponse.json(
      { success: false, message: 'Specify either id or clearRead=true' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Failed to delete admin notification:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error deleting notification' },
      { status: 500 }
    );
  }
}
