import { initializeApp, getApps, cert, applicationDefault, App } from 'firebase-admin/app';
import { getMessaging, MulticastMessage, Messaging } from 'firebase-admin/messaging';
import { prisma } from '@/lib/prisma';

let firebaseApp: App | null = null;
let firebaseMessaging: Messaging | null = null;

/**
 * Initializes Firebase Admin SDK using environment credentials.
 * Supports individual variables or a full JSON service account string.
 */
export function getFirebaseAdmin(): Messaging | null {
  if (firebaseMessaging) {
    return firebaseMessaging;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    firebaseApp = existingApps[0];
    firebaseMessaging = getMessaging(firebaseApp);
    return firebaseMessaging;
  }

  try {
    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;

    if (serviceAccountJson) {
      const parsed = JSON.parse(serviceAccountJson);
      firebaseApp = initializeApp({
        credential: cert(parsed),
      });
      firebaseMessaging = getMessaging(firebaseApp);
      console.log('✅ [Firebase Admin] Initialized with FIREBASE_SERVICE_ACCOUNT_KEY');
      return firebaseMessaging;
    }

    if (projectId && clientEmail && privateKey) {
      // Handle escaped newline characters in Vercel environment variables
      if (privateKey.includes('\\n')) {
        privateKey = privateKey.replace(/\\n/g, '\n');
      }

      firebaseApp = initializeApp({
        credential: cert({
          projectId,
          clientEmail,
          privateKey,
        }),
      });
      firebaseMessaging = getMessaging(firebaseApp);
      console.log(`✅ [Firebase Admin] Initialized with Project: ${projectId}`);
      return firebaseMessaging;
    }

    // If running in Google Cloud or environment with default credentials
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      firebaseApp = initializeApp({
        credential: applicationDefault(),
      });
      firebaseMessaging = getMessaging(firebaseApp);
      return firebaseMessaging;
    }

    console.warn(
      '⚠️ [Firebase Admin] Credentials not configured. Push notifications will be simulated in logs.\n' +
      'To enable live web push, set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in your environment.'
    );
    return null;
  } catch (error) {
    console.error('❌ [Firebase Admin] Initialization failure:', error);
    return null;
  }
}

export interface PushMessagePayload {
  tokens: string[];
  title: string;
  body: string;
  data?: Record<string, string>;
  icon?: string;
  badge?: string;
  clickAction?: string;
  tag?: string;
}

export interface PushSendResult {
  successCount: number;
  failureCount: number;
  invalidTokens: string[];
}

/**
 * Sends multicast web push notification to an array of FCM device tokens.
 * Automatically cleans up inactive / expired tokens from the database.
 */
export async function sendMulticastPush(payload: PushMessagePayload): Promise<PushSendResult> {
  const { tokens, title, body, data = {}, icon = '/favicon.ico', badge = '/favicon.ico', clickAction, tag } = payload;

  if (!tokens || tokens.length === 0) {
    return { successCount: 0, failureCount: 0, invalidTokens: [] };
  }

  // Deduplicate tokens
  const uniqueTokens = Array.from(new Set(tokens.filter(Boolean)));
  const messaging = getFirebaseAdmin();

  if (!messaging) {
    console.log(
      `📲 [Push Notification Simulation] To ${uniqueTokens.length} device(s):\n` +
      `Title: "${title}"\n` +
      `Body: "${body}"\n` +
      `Action URL: ${clickAction || 'N/A'}`
    );
    return { successCount: uniqueTokens.length, failureCount: 0, invalidTokens: [] };
  }

  const invalidTokens: string[] = [];
  let successCount = 0;
  let failureCount = 0;

  try {
    // Construct FCM v1 Web Push payload
    const message: MulticastMessage = {
      tokens: uniqueTokens,
      notification: {
        title,
        body,
      },
      data: {
        ...data,
        click_action: clickAction || '/',
        url: clickAction || '/',
      },
      webpush: {
        headers: {
          Urgency: 'high',
        },
        notification: {
          title,
          body,
          icon,
          badge,
          tag: tag || `khf_push_${Date.now()}`,
          requireInteraction: false,
          data: {
            ...data,
            click_action: clickAction || '/',
            url: clickAction || '/',
          },
        },
        fcmOptions: {
          link: clickAction || '/',
        },
      },
    };

    const response = await messaging.sendEachForMulticast(message);
    successCount = response.successCount;
    failureCount = response.failureCount;

    // Detect invalid or unregistered tokens and mark them for cleanup
    response.responses.forEach((resp: any, idx: number) => {
      if (!resp.success && resp.error) {
        const errCode = resp.error.code;
        if (
          errCode === 'messaging/registration-token-not-registered' ||
          errCode === 'messaging/invalid-registration-token' ||
          errCode === 'messaging/mismatched-credential'
        ) {
          invalidTokens.push(uniqueTokens[idx]);
        }
      }
    });

    // Cleanup stale tokens from PostgreSQL asynchronously
    if (invalidTokens.length > 0) {
      console.log(`🧹 [Firebase Admin] Deactivating ${invalidTokens.length} expired or invalid device token(s).`);
      prisma.deviceToken.updateMany({
        where: { token: { in: invalidTokens } },
        data: { isActive: false },
      }).catch((e: any) => console.warn('Failed to deactivate invalid tokens:', e));
    }

    console.log(`✅ [Firebase Admin Push] Sent to ${uniqueTokens.length} tokens: ${successCount} success, ${failureCount} failed.`);
    return { successCount, failureCount, invalidTokens };
  } catch (error) {
    console.error('❌ [Firebase Admin Push] Error executing sendEachForMulticast:', error);
    return { successCount: 0, failureCount: uniqueTokens.length, invalidTokens: [] };
  }
}
