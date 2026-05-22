import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const base = process.env['NEXT_PUBLIC_SITE_URL'] ?? 'https://kelassi.app'
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/cours', '/examens', '/cgu', '/confidentialite'],
        disallow: [
          '/dashboard',
          '/tuteur',
          '/flashcards',
          '/progression',
          '/billing',
          '/compte',
          '/admin',
          '/onboarding',
          '/api/',
        ],
      },
    ],
    sitemap: `${base}/sitemap.xml`,
  }
}
