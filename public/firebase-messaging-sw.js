/**
 * Kamadhenu Honey Farms - Firebase Cloud Messaging Service Worker
 * Handles background push notifications when the website or admin portal is closed.
 */

/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

// Parse configuration from service worker query parameters if passed during registration
const urlParams = new URL(self.location.href).searchParams;
const projectId = urlParams.get('projectId') || 'kmd-farms';
const messagingSenderId = urlParams.get('messagingSenderId') || '';
const apiKey = urlParams.get('apiKey') || '';
const appId = urlParams.get('appId') || '';

const firebaseConfig = {
  apiKey: apiKey || 'dummy-key',
  projectId: projectId,
  messagingSenderId: messagingSenderId,
  appId: appId || '1:000000000000:web:0000000000000000000000',
};

if (!firebase.apps.length) {
  try {
    firebase.initializeApp(firebaseConfig);
  } catch (e) {
    console.warn('[FCM SW] Firebase initializeApp note:', e);
  }
}

let messaging = null;
try {
  if (firebase.messaging.isSupported()) {
    messaging = firebase.messaging();
  }
} catch (e) {
  console.warn('[FCM SW] Messaging support check note:', e);
}

if (messaging) {
  messaging.onBackgroundMessage((payload) => {
    console.log('[FCM SW] Received background message:', payload);

    const notificationTitle = payload.notification?.title || payload.data?.title || 'Kamadhenu Honey Farms';
    const notificationBody = payload.notification?.body || payload.data?.body || 'You have a new update regarding your order.';
    const clickAction = payload.fcmOptions?.link || payload.data?.click_action || payload.data?.url || '/';

    const notificationOptions = {
      body: notificationBody,
      icon: payload.notification?.icon || '/favicon.ico',
      badge: payload.notification?.badge || '/favicon.ico',
      tag: payload.notification?.tag || payload.data?.tag || `khf_push_${Date.now()}`,
      data: {
        url: clickAction,
        orderId: payload.data?.orderId,
        orderNumber: payload.data?.orderNumber,
      },
      requireInteraction: false,
    };

    return self.registration.showNotification(notificationTitle, notificationOptions);
  });
}

// Validate notification click URL to prevent open redirects or script execution
function sanitizeNotificationUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '/';
  const trimmed = rawUrl.trim();
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }
  try {
    const parsed = new URL(trimmed, self.location.origin);
    if (
      parsed.origin === self.location.origin ||
      /^(www\.|admin\.|form\.)?kamadhenuhoneyfarms\.in$/i.test(parsed.hostname)
    ) {
      return parsed.toString();
    }
  } catch (e) {}
  return '/';
}

// Notification Click Event Handler: Opens or focuses relevant tab
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = sanitizeNotificationUrl(event.notification.data?.url);

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // Check if an existing tab is open with the same domain
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      // If no tab is open, open a new window
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
