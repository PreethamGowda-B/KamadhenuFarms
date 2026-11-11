import { beforeEach, describe, expect, it, vi } from 'vitest';

const { sendEachForMulticastMock, getAppsMock, updateManyMock } = vi.hoisted(() => ({
  sendEachForMulticastMock: vi.fn(),
  getAppsMock: vi.fn(),
  updateManyMock: vi.fn(),
}));

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(() => ({ name: 'mock-app' })),
  getApps: getAppsMock,
  cert: vi.fn((c) => c),
  applicationDefault: vi.fn(),
}));

vi.mock('firebase-admin/messaging', () => ({
  getMessaging: vi.fn(() => ({
    sendEachForMulticast: sendEachForMulticastMock,
  })),
}));

vi.mock('@/lib/prisma', () => ({
  prisma: {
    deviceToken: {
      updateMany: updateManyMock,
    },
  },
}));

import { sendMulticastPush } from '@/lib/firebaseAdmin';

describe('Firebase Admin FCM token cleanup & resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getAppsMock.mockReturnValue([{ name: 'mock-app' }]);
    updateManyMock.mockResolvedValue({ count: 1 });
  });

  it('awaits prisma.deviceToken.updateMany for expired and invalid tokens', async () => {
    sendEachForMulticastMock.mockResolvedValueOnce({
      successCount: 1,
      failureCount: 3,
      responses: [
        { success: true },
        { success: false, error: { code: 'messaging/registration-token-not-registered' } },
        { success: false, error: { code: 'messaging/invalid-registration-token' } },
        { success: false, error: { code: 'messaging/internal-error' } },
      ],
    });

    const result = await sendMulticastPush({
      tokens: ['valid-tok', 'expired-tok', 'malformed-tok', 'transient-err-tok'],
      title: 'Order Confirmed',
      body: 'Your order is confirmed',
      clickAction: '/orders',
    });

    expect(result.successCount).toBe(1);
    expect(result.failureCount).toBe(3);
    expect(result.invalidTokens).toEqual(['expired-tok', 'malformed-tok']);
    expect(updateManyMock).toHaveBeenCalledTimes(1);
    expect(updateManyMock).toHaveBeenCalledWith({
      where: { token: { in: ['expired-tok', 'malformed-tok'] } },
      data: { isActive: false },
    });
  });

  it('swallows FCM multicast exceptions without crashing the caller', async () => {
    sendEachForMulticastMock.mockRejectedValueOnce(new Error('FCM 503 Unavailable'));

    const result = await sendMulticastPush({
      tokens: ['tok-1', 'tok-2'],
      title: 'Order Update',
      body: 'Order shipped',
    });

    expect(result).toEqual({
      successCount: 0,
      failureCount: 2,
      invalidTokens: [],
    });
    expect(updateManyMock).not.toHaveBeenCalled();
  });
});
