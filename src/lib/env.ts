/**
 * Safe runtime environment variable audit & validation helper.
 * NEVER reads, returns, or logs actual secret values.
 */

export interface EnvValidationReport {
  valid: boolean;
  missingRequired: string[];
  invalidFormat: string[];
  warnings: string[];
}

function hasValue(name: string): boolean {
  const val = process.env[name];
  return typeof val === 'string' && val.trim().length > 0;
}

export function validateServerEnvironment(): EnvValidationReport {
  const missingRequired: string[] = [];
  const invalidFormat: string[] = [];
  const warnings: string[] = [];

  // 1. Core Database & Auth
  if (!hasValue('DATABASE_URL')) missingRequired.push('DATABASE_URL');
  if (!hasValue('DIRECT_URL')) {
    warnings.push('DIRECT_URL unset (required by Prisma directUrl for schema migrations against Supabase PgBouncer)');
  }

  const jwtSecret = process.env.JWT_SECRET?.trim() || '';
  if (!jwtSecret) {
    missingRequired.push('JWT_SECRET');
  } else if (jwtSecret.length < 32) {
    invalidFormat.push('JWT_SECRET (must be >= 32 characters)');
  }

  const adminHash = process.env.ADMIN_PASSWORD_HASH?.trim() || '';
  if (!adminHash) {
    missingRequired.push('ADMIN_PASSWORD_HASH');
  } else if (!adminHash.startsWith('scrypt:') || adminHash.split(':').length !== 3) {
    invalidFormat.push('ADMIN_PASSWORD_HASH (must use scrypt:<salt>:<hex> format)');
  }

  // 2. Separate HMAC secret for order-access tokens
  const orderTokenSecret = process.env.ORDER_TOKEN_SECRET?.trim() || '';
  if (!orderTokenSecret) {
    warnings.push('ORDER_TOKEN_SECRET unset (falling back to domain-separated JWT_SECRET)');
  } else if (orderTokenSecret.length < 32) {
    invalidFormat.push('ORDER_TOKEN_SECRET (must be >= 32 characters)');
  }

  // 3. Payment Gateway (Cashfree)
  if (!hasValue('CASHFREE_APP_ID') && !hasValue('CASHFREE_CLIENT_ID')) {
    missingRequired.push('CASHFREE_APP_ID or CASHFREE_CLIENT_ID');
  }
  if (!hasValue('CASHFREE_SECRET_KEY') && !hasValue('CASHFREE_CLIENT_SECRET')) {
    missingRequired.push('CASHFREE_SECRET_KEY or CASHFREE_CLIENT_SECRET');
  }
  if (
    process.env.VERCEL_ENV === 'preview' &&
    process.env.CASHFREE_ENV?.trim().toUpperCase() !== 'SANDBOX'
  ) {
    invalidFormat.push('CASHFREE_ENV (must be SANDBOX on Vercel Preview deployments)');
  }

  // 4. Shared Distributed Security (Upstash Redis)
  const hasUpstashUrl = hasValue('UPSTASH_REDIS_REST_URL');
  const hasUpstashToken = hasValue('UPSTASH_REDIS_REST_TOKEN');
  if (!hasUpstashUrl || !hasUpstashToken) {
    warnings.push(
      'UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN unset (using process-local fallback store)'
    );
  }

  // 5. Push Notifications (Firebase Admin)
  const hasServiceJson = hasValue('FIREBASE_SERVICE_ACCOUNT_KEY');
  const hasDiscreteFirebase =
    hasValue('FIREBASE_PROJECT_ID') &&
    hasValue('FIREBASE_CLIENT_EMAIL') &&
    hasValue('FIREBASE_PRIVATE_KEY');
  if (!hasServiceJson && !hasDiscreteFirebase) {
    warnings.push('Firebase Admin credentials unset (FCM push runs in simulation mode)');
  }

  // 6. Transactional Email (SMTP) & Shipping (Shiprocket) & Uploads (Cloudinary)
  if (!hasValue('SMTP_USER') || !hasValue('SMTP_PASS')) {
    warnings.push('SMTP_USER/SMTP_PASS unset (email dispatch runs in simulation mode)');
  }
  if (!hasValue('SHIPROCKET_TOKEN') && (!hasValue('SHIPROCKET_EMAIL') || !hasValue('SHIPROCKET_PASSWORD'))) {
    warnings.push('Shiprocket credentials unset (using Zonal shipping rate fallback)');
  }
  if (!hasValue('CLOUDINARY_CLOUD_NAME') || !hasValue('CLOUDINARY_API_KEY') || !hasValue('CLOUDINARY_API_SECRET')) {
    warnings.push('Cloudinary credentials incomplete (image/document uploads disabled)');
  }

  return {
    valid: missingRequired.length === 0 && invalidFormat.length === 0,
    missingRequired,
    invalidFormat,
    warnings,
  };
}
