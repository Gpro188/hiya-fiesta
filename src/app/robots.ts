import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/dashboard/', '/super-admin/'],
    },
    sitemap: 'https://hiyafiesta.online/sitemap.xml',
  };
}
