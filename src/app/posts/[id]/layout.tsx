import { Metadata } from 'next';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function generateMetadata(
    { params }: { params: Promise<{ id: string }> }
): Promise<Metadata> {
    const { id } = await params;
    try {
        const postDoc = await getDoc(doc(db, 'posts', id));
        if (!postDoc.exists()) return { title: '게시글 없음 | 갤러리' };
        const post = postDoc.data();
        return {
            title: `${post.title} | 갤러리`,
            description: post.content?.slice(0, 120) || '이미지 갤러리',
            openGraph: {
                title: post.title,
                description: post.content?.slice(0, 120) || '',
                images: post.thumbnailUrl ? [{ url: post.thumbnailUrl, width: 800, height: 600 }] : [],
                type: 'article',
            },
            twitter: {
                card: 'summary_large_image',
                title: post.title,
                images: post.thumbnailUrl ? [post.thumbnailUrl] : [],
            },
        };
    } catch {
        return { title: '갤러리' };
    }
}

export default function PostLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}