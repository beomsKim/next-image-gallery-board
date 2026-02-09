'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import PostForm from '@/components/posts/PostForm';
import Loading from '@/components/common/Loading';

export default function EditPostPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const postId = params.id;

    const [initialData, setInitialData] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadPost();
    }, [postId]);

    const loadPost = async () => {
        try {
            const postDoc = await getDoc(doc(db, 'posts', postId));

            if (!postDoc.exists()) {
                alert('게시글을 찾을 수 없습니다.');
                router.push('/');
                return;
            }

            const postData = postDoc.data();

            // 권한 확인
            if (postData.authorId !== user?.uid && !user?.isAdmin) {
                alert('수정 권한이 없습니다.');
                router.push('/');
                return;
            }

            setInitialData({
                title: postData.title,
                content: postData.content,
                category: postData.category,
                images: postData.images,
            });
        } catch (error) {
            console.error('게시글 로드 실패:', error);
            alert('게시글을 불러오는데 실패했습니다.');
        router.push('/');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <Loading message="게시글을 불러오는 중..." />;
    }

    if (!initialData) {
        return null;
    }

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <PostForm postId={postId} initialData={initialData} />
        </main>
    );
}