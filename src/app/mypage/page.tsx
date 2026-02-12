'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    collection, query, where, getDocs,
    orderBy, doc, getDoc
} from 'firebase/firestore';
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

    // 각 탭의 실제 개수 (삭제된 글 제외)
    const [counts, setCounts] = useState({
        my: 0,
        liked: 0,
        bookmarked: 0,
    });

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        }
    }, [authLoading, user, router]);

    // 실제 존재하는 게시글 개수 계산
    useEffect(() => {
        if (user) {
            loadCounts();
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            loadPosts();
        }
    }, [activeTab, user]);

    const loadCounts = async () => {
        if (!user) return;

        try {
            // 내가 쓴 글 개수
            const myQuery = query(
                collection(db, 'posts'),
                where('authorId', '==', user.uid)
            );
            const mySnapshot = await getDocs(myQuery);

            // 좋아요한 글 중 실제 존재하는 것
            let likedCount = 0;
            if (user.likedPosts?.length > 0) {
                const chunks = chunkArray(user.likedPosts, 10);
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'posts'),
                        where('__name__', 'in', chunk)
                    );
                    const snap = await getDocs(q);
                    likedCount += snap.size;
                }
            }

            // 북마크한 글 중 실제 존재하는 것
            let bookmarkedCount = 0;
            if (user.bookmarkedPosts?.length > 0) {
                const chunks = chunkArray(user.bookmarkedPosts, 10);
                for (const chunk of chunks) {
                    const q = query(
                        collection(db, 'posts'),
                        where('__name__', 'in', chunk)
                    );
                    const snap = await getDocs(q);
                    bookmarkedCount += snap.size;
                }
            }

            setCounts({
                my: mySnapshot.size,
                liked: likedCount,
                bookmarked: bookmarkedCount,
            });
        } catch (error) {
            console.error('개수 로드 실패:', error);
        }
    };

    const loadPosts = async () => {
        if (!user) return;
        setLoading(true);

        try {
            let postsData: Post[] = [];

            if (activeTab === 'my') {
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
                if (user.likedPosts?.length > 0) {
                    // 10개씩 나눠서 조회 (Firestore 'in' 제한)
                    const chunks = chunkArray(user.likedPosts, 10);
                    for (const chunk of chunks) {
                        const q = query(
                            collection(db, 'posts'),
                            where('__name__', 'in', chunk)
                        );
                        const snap = await getDocs(q);
                        const chunkPosts = snap.docs.map((d) => ({
                            id: d.id,
                            ...d.data(),
                        })) as Post[];
                        postsData = [...postsData, ...chunkPosts];
                    }
                }

            } else if (activeTab === 'bookmarked') {
                if (user.bookmarkedPosts?.length > 0) {
                    const chunks = chunkArray(user.bookmarkedPosts, 10);
                    for (const chunk of chunks) {
                        const q = query(
                            collection(db, 'posts'),
                            where('__name__', 'in', chunk)
                        );
                        const snap = await getDocs(q);
                        const chunkPosts = snap.docs.map((d) => ({
                            id: d.id,
                            ...d.data(),
                        })) as Post[];
                        postsData = [...postsData, ...chunkPosts];
                    }
                }
            }

            setPosts(postsData);

            // 탭 전환 후 실제 개수로 업데이트
            setCounts((prev) => ({ ...prev, [activeTab]: postsData.length }));

        } catch (error) {
            console.error('게시글 로드 실패:', error);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) return <Loading message="로딩 중..." />;
    if (!user) return null;

    const tabs = [
        { id: 'my' as TabType, label: '내가 쓴 글', count: counts.my },
        { id: 'liked' as TabType, label: '❤️ 좋아요', count: counts.liked },
        { id: 'bookmarked' as TabType, label: '🔖 북마크', count: counts.bookmarked },
    ];

    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-7xl mx-auto p-4">
                {/* 프로필 헤더 */}
                <div className="card mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-2xl font-bold mb-1">{user.nickname}</h1>
                            <p className="text-gray-500 text-sm">{user.email}</p>
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
                <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap font-medium
                ${activeTab === tab.id
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}
                        >
                            {tab.label}
                            <span className={`ml-2 text-sm px-1.5 py-0.5 rounded-full
                ${activeTab === tab.id
                                    ? 'bg-primary-700 text-white'
                                    : 'bg-gray-100 text-gray-500'}`}
                            >
                                {tab.count}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 게시글 리스트 */}
                {loading ? (
                    <Loading message="게시글을 불러오는 중..." />
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-400 text-lg">게시글이 없습니다.</p>
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

// 배열을 n개씩 나누는 유틸 함수
function chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
        chunks.push(array.slice(i, i + size));
    }
    return chunks;
}