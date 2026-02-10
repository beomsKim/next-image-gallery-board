import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
    return [
        {
            url: 'https://next-image-gallery-board.vercel.app',
            lastModified: new Date(),
            changeFrequency: 'daily',
            priority: 1,
        },
        {
            url: 'https://next-image-gallery-board.vercel.app/login',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
        {
            url: 'https://next-image-gallery-board.vercel.app/signup',
            lastModified: new Date(),
            changeFrequency: 'monthly',
            priority: 0.5,
        },
    ];
}