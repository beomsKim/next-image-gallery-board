'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import PostForm from '@/components/posts/PostForm';
import Loading from '@/components/common/Loading';

export default function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: postId } = use(params);
    const router = useRouter();
    const { user } = useAuth();
    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (postId) loadPost();
    }, [postId]);

    const loadPost = async () => {
        try {
            const postDoc = await getDoc(doc(db, 'posts', postId));
            if (!postDoc.exists()) { router.push('/'); return; }
            const data = postDoc.data();
            if (data.authorId !== user?.uid && !user?.isAdmin) {
                alert('수정 권한이 없습니다.');
                router.push('/');
                return;
            }
            setInitialData({
                title: data.title, content: data.content,
                category: data.category, images: data.images || [],
            });
        } catch {
            alert('게시글을 불러오는데 실패했습니다.');
            router.push('/');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <Loading message="게시글을 불러오는 중..." />;
    if (!initialData) return null;

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <PostForm postId={postId} initialData={initialData} />
        </main>
    );
}