/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
  async headers() {
    const isProd = process.env.NODE_ENV === 'production';
    const cspDirectives = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://sdk.cashfree.com https://www.gstatic.com https://va.vercel-scripts.com https://checkout.razorpay.com https://vercel.live",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://vercel.live",
      "font-src 'self' data: https://fonts.gstatic.com https://vercel.live",
      "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://*.tile.openstreetmap.org https://maps.gstatic.com https://maps.googleapis.com https://vercel.live",
      "connect-src 'self' https://api.cashfree.com https://sandbox.cashfree.com https://sdk.cashfree.com https://payments.cashfree.com https://fcmregistrations.googleapis.com https://firebaseinstallations.googleapis.com https://*.googleapis.com https://www.gstatic.com https://vitals.vercel-insights.com https://va.vercel-scripts.com https://res.cloudinary.com https://vercel.live wss://ws-us3.pusher.com https://sockjs-us3.pusher.com",
      "frame-src 'self' https://www.google.com https://sdk.cashfree.com https://payments.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com https://api.razorpay.com https://vercel.live",
      "form-action 'self' https://payments.cashfree.com https://sandbox.cashfree.com https://api.cashfree.com",
      ...(isProd ? ["upgrade-insecure-requests"] : []),
    ].join('; ');

    const securityHeaders = [
      { key: 'Content-Security-Policy', value: cspDirectives },
      { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy', value: 'camera=(self), microphone=(), geolocation=(self), payment=(self "https://sdk.cashfree.com" "https://payments.cashfree.com" "https://sandbox.cashfree.com" "https://api.cashfree.com" "https://checkout.razorpay.com")' },
      ...(isProd
        ? [{ key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' }]
        : []),
    ];

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/assets/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
      {
        source: '/:all*(svg|jpg|jpeg|png|webp|ico|woff|woff2)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, stale-while-revalidate=604800',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
