import { MetadataRoute } from 'next';
import { collection, getDocs, orderBy, query, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://yoursite.com';

    // 정적 페이지
    const staticPages: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: 'daily', priority: 1 },
        { url: `${baseUrl}/notices`, lastModified: new Date(), changeFrequency: 'weekly', priority: 0.8 },
    ];

    // 동적 게시글 페이지
    try {
        const snap = await getDocs(
            query(collection(db, 'posts'), orderBy('createdAt', 'desc'), limit(200))
        );
        const postPages: MetadataRoute.Sitemap = snap.docs.map((d) => ({
            url: `${baseUrl}/posts/${d.id}`,
            lastModified: d.data().updatedAt?.toDate() || new Date(),
            changeFrequency: 'weekly' as const,
            priority: 0.7,
        }));
        return [...staticPages, ...postPages];
    } catch {
        return staticPages;
    }
}