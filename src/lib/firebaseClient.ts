'use client';

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getMessaging, getToken, onMessage, Messaging } from 'firebase/messaging';

// Public client Firebase configuration from environment
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || '',
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || '',
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || 'kamadhenu-honey-farms',
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || '',
};

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY || '';

/**
 * Checks if Web Push notifications are supported in the current environment
 */
export function isPushNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'Notification' in window &&
    'serviceWorker' in navigator &&
    'PushManager' in window
  );
}

/**
 * Returns current browser notification permission ('default', 'granted', 'denied')
 */
export function getNotificationPermissionState(): NotificationPermission {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'denied';
  }
  return Notification.permission;
}

/**
 * Detects device form factor and browser for token metadata
 */
export function getClientDeviceInfo(): { deviceType: string; browser: string } {
  if (typeof window === 'undefined') {
    return { deviceType: 'unknown', browser: 'unknown' };
  }

  const ua = navigator.userAgent.toLowerCase();
  let deviceType = 'desktop';
  if (/mobile|android|iphone|ipod/.test(ua)) {
    deviceType = 'mobile';
  } else if (/ipad|tablet/.test(ua)) {
    deviceType = 'tablet';
  }

  let browser = 'other';
  if (ua.includes('edg/')) browser = 'edge';
  else if (ua.includes('chrome')) browser = 'chrome';
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'safari';
  else if (ua.includes('firefox')) browser = 'firefox';

  return { deviceType, browser };
}

/**
 * Initializes client Firebase messaging and registers service worker
 */
let clientMessaging: Messaging | null = null;

function getClientMessaging(): Messaging | null {
  if (typeof window === 'undefined') return null;
  if (!isPushNotificationSupported()) return null;

  if (clientMessaging) return clientMessaging;

  try {
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    clientMessaging = getMessaging(app);
    return clientMessaging;
  } catch (err) {
    console.warn('[FCM Client] Error initializing client messaging:', err);
    return null;
  }
}

/**
 * Requests browser notification permission and retrieves the FCM registration token
 */
export async function requestPushToken(): Promise<{
  token: string | null;
  permission: NotificationPermission;
  error?: string;
}> {
  if (!isPushNotificationSupported()) {
    return {
      token: null,
      permission: 'denied',
      error: 'Push notifications are not supported on this browser or platform.',
    };
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      return { token: null, permission, error: 'Notification permission was denied.' };
    }

    // Register service worker with query params so it knows the project ID
    const swUrl = `/firebase-messaging-sw.js?projectId=${encodeURIComponent(
      firebaseConfig.projectId
    )}&messagingSenderId=${encodeURIComponent(
      firebaseConfig.messagingSenderId
    )}&apiKey=${encodeURIComponent(firebaseConfig.apiKey)}&appId=${encodeURIComponent(
      firebaseConfig.appId
    )}`;

    const registration = await navigator.serviceWorker.register(swUrl, { scope: '/' });
    await navigator.serviceWorker.ready;

    const messaging = getClientMessaging();
    if (!messaging) {
      return { token: null, permission, error: 'Failed to initialize Firebase Messaging.' };
    }

    const tokenOptions: { serviceWorkerRegistration: ServiceWorkerRegistration; vapidKey?: string } = {
      serviceWorkerRegistration: registration,
    };

    if (VAPID_KEY && VAPID_KEY.trim()) {
      tokenOptions.vapidKey = VAPID_KEY.trim();
    }

    const token = await getToken(messaging, tokenOptions);
    if (!token) {
      return { token: null, permission, error: 'No FCM registration token received.' };
    }

    return { token, permission };
  } catch (err: any) {
    console.error('[FCM Client] Error requesting push token:', err);
    return {
      token: null,
      permission: getNotificationPermissionState(),
      error: err.message || 'Failed to generate push token.',
    };
  }
}

/**
 * Listens for foreground FCM messages while the tab is active
 */
export function onForegroundFcmMessage(
  callback: (payload: { title: string; body: string; data?: any }) => void
): () => void {
  const messaging = getClientMessaging();
  if (!messaging) return () => {};

  return onMessage(messaging, (payload) => {
    console.log('[FCM Foreground] Message received:', payload);
    const title = payload.notification?.title || payload.data?.title || 'Kamadhenu Honey Farms';
    const body = payload.notification?.body || payload.data?.body || '';
    callback({ title, body, data: payload.data });
  });
}
