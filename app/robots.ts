import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
    return {
        rules: {
            userAgent: '*',
            allow: '/',
            disallow: ['/api/', '/manager/', '/login', '/register'],
        },
        sitemap: 'https://efvcup.vn/sitemap.xml',
    }
}
