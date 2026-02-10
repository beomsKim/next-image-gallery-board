'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/post';
import PostCard from '@/components/posts/PostCard';
import Loading from '@/components/common/Loading';

type TabType = 'my' | 'liked' | 'bookmarked';

export default function MyPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();

    const [activeTab, setActiveTab] = useState<TabType>('my');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [activeTab, user]);

    const loadPosts = async () => {
        if (!user) return;

        setLoading(true);

        try {
            let postsData: Post[] = [];

            if (activeTab === 'my') {
                // 내가 쓴 글
                const q = query(
                    collection(db, 'posts'),
                    where('authorId', '==', user.uid),
                    orderBy('createdAt', 'desc')
                );
                const snapshot = await getDocs(q);
                postsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                })) as Post[];
            } else if (activeTab === 'liked') {
                // 좋아요한 글
                if (user.likedPosts.length > 0) {
                    const q = query(
                        collection(db, 'posts'),
                        where('__name__', 'in', user.likedPosts.slice(0, 10)) // Firestore 제한: 최대 10개
                    );
                    const snapshot = await getDocs(q);
                    postsData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Post[];
                }
            } else if (activeTab === 'bookmarked') {
                // 북마크한 글
                if (user.bookmarkedPosts.length > 0) {
                    const q = query(
                        collection(db, 'posts'),
                        where('__name__', 'in', user.bookmarkedPosts.slice(0, 10))
                    );
                    const snapshot = await getDocs(q);
                    postsData = snapshot.docs.map((doc) => ({
                        id: doc.id,
                        ...doc.data(),
                    })) as Post[];
                }
            }

            setPosts(postsData);
        } catch (error) {
            console.error('게시글 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return <Loading message="로딩 중..." />;
    }

    if (!user) {
        return null;
    }

    const tabs = [
        { id: 'my' as TabType, label: `내가 쓴 글 (${posts.length})`, count: posts.length },
        { id: 'liked' as TabType, label: '좋아요한 글', count: user.likedPosts.length },
        { id: 'bookmarked' as TabType, label: '북마크한 글', count: user.bookmarkedPosts.length },
    ];

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto p-4">
                {/* 프로필 헤더 */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-2">{user.nickname}</h1>
                            <p className="text-gray-600">{user.email}</p>
                        </div>
                        <button
                            onClick={() => router.push('/profile')}
                            className="btn-secondary"
                        >
                            프로필 수정
                        </button>
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex gap-2 mb-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-6 py-3 rounded-lg transition-colors ${activeTab === tab.id
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            {tab.label} ({tab.count})
                        </button>
                    ))}
                </div>

                {/* 게시글 리스트 */}
                {loading ? (
                    <Loading message="게시글을 불러오는 중..." />
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">게시글이 없습니다.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post} />
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}