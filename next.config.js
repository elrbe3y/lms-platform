/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['localhost', 'video.bunnycdn.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.bunnycdn.com',
      },
    ],
  },
  // تفعيل RTL Support
  i18n: {
    locales: ['ar'],
    defaultLocale: 'ar',
  },
  // تحسينات الأمان
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },
}

module.exports = nextConfig
