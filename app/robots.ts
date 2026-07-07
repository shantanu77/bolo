import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/api/',
          '/dashboard',
          '/practice',
          '/progress',
          '/profile',
          '/billing',
          '/leaderboard',
          '/superadmin',
          '/onboarding',
          '/learning-guides',
        ],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
