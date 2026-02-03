import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  /* config options here */

  // Output mode - standalone for serverless deployment
  output: 'standalone',

  // !! TODO: FIX TYPE ERRORS !!
  // These should be removed after fixing all TypeScript and ESLint errors
  // Keeping them temporarily to maintain deployment stability
  // Track progress in GitHub Issues
  typescript: {
    ignoreBuildErrors: true, // TODO: Remove after fixing type errors
  },
  eslint: {
    ignoreDuringBuilds: true, // TODO: Remove after fixing lint errors
  },

  // Performance optimizations
  experimental: {
    optimizePackageImports: ['recharts', 'lucide-react', '@radix-ui/react-icons'],
    webVitalsAttribution: ['CLS', 'LCP', 'FCP', 'FID', 'TTFB'],
  },

  // Security headers
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: '/(.*)',
        headers: [
          {
            key: 'X-DNS-Prefetch-Control',
            value: 'on',
          },
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
            value: 'origin-when-cross-origin',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
        ],
      },
    ]
  },

  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
      {
        protocol: 'https',
        hostname: '**.vercel-storage.com',
      },
      {
        protocol: 'https',
        hostname: 'fanvue.com',
      },
    ],
  },

  // Production optimizations
  reactStrictMode: true,

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

export default nextConfig
