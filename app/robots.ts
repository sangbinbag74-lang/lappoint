import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/admin', '/admin/stats', '/auth/callback'] },
    sitemap: 'https://lappoint.xyz/sitemap.xml',
  }
}
