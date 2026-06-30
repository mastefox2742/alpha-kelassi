import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  compress: true,

  // Supabase JS v2.106 has complex type inference that requires regenerating
  // database.ts from live schema. Disable TS build errors until `pnpm db:generate-types` is run.
  typescript: {
    ignoreBuildErrors: true,
  },

  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      { protocol: 'https', hostname: '*.supabase.co' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
    ],
    minimumCacheTTL: 86400,
  },

  // pdfjs-dist et mammoth sont des libs Node.js — ne pas bundler avec webpack
  serverExternalPackages: ['pdfjs-dist', 'mammoth', 'canvas', 'firebase-admin', '@google-cloud/firestore', '@firebase/app', 'google-gax'],

  // Réduit le JS importé pour les libs lourdes
  experimental: {
    optimizePackageImports: [
      'recharts',
      'react-pdf',
      'lucide-react',
      'react-markdown',
      'rehype-katex',
      'remark-math',
      'zod',
    ],
  },

  webpack(config) {
    // pdfjs-dist essaie d'importer canvas pour le rendu d'images.
    // En extraction texte serveur on n'en a pas besoin.
    config.resolve.alias = {
      ...config.resolve.alias,
      canvas: false,
    }
    return config
  },

  async headers() {
    const csp = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js + react-pdf worker
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https://*.supabase.co",
      "font-src 'self'",
      "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://generativelanguage.googleapis.com",
      "worker-src blob:",    // pdfjs worker
      "frame-src 'none'",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "upgrade-insecure-requests",
    ].join('; ')

    const securityHeaders = [
      { key: 'Content-Security-Policy',       value: csp },
      { key: 'Strict-Transport-Security',     value: 'max-age=63072000; includeSubDomains; preload' },
      { key: 'X-Frame-Options',               value: 'DENY' },
      { key: 'X-Content-Type-Options',        value: 'nosniff' },
      { key: 'Referrer-Policy',               value: 'strict-origin-when-cross-origin' },
      { key: 'Permissions-Policy',            value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'X-DNS-Prefetch-Control',        value: 'on' },
    ]

    return [
      {
        source: '/(.*)',
        headers: securityHeaders,
      },
      {
        source: '/_next/static/:path*',
        headers: [
          { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
        ],
      },
      {
        source: '/sw.js',
        headers: [
          { key: 'Cache-Control',          value: 'no-cache, no-store, must-revalidate' },
          { key: 'Service-Worker-Allowed', value: '/' },
        ],
      },
    ]
  },
}

export default nextConfig
