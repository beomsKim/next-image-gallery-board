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

function chunkArray<T>(arr: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < arr.length; i += size) chunks.push(arr.slice(i, i + size));
    return chunks;
}

export default function MyPage() {
    const router = useRouter();
    const { user, loading: authLoading } = useAuth();
    const [activeTab, setActiveTab] = useState<TabType>('my');
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState({ my: 0, liked: 0, bookmarked: 0 });

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
    }, [authLoading, user, router]);

    useEffect(() => {
        if (user) loadCounts();
    }, [user]);

    useEffect(() => {
        if (user) loadPosts();
    }, [activeTab, user]);

    const loadCounts = async () => {
        if (!user) return;
        try {
            const mySnap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.uid)));
            let likedCount = 0;
            if (user.likedPosts?.length > 0) {
                for (const chunk of chunkArray(user.likedPosts, 10)) {
                    const snap = await getDocs(query(collection(db, 'posts'), where('__name__', 'in', chunk)));
                    likedCount += snap.size;
                }
            }
            let bookmarkedCount = 0;
            if (user.bookmarkedPosts?.length > 0) {
                for (const chunk of chunkArray(user.bookmarkedPosts, 10)) {
                    const snap = await getDocs(query(collection(db, 'posts'), where('__name__', 'in', chunk)));
                    bookmarkedCount += snap.size;
                }
            }
            setCounts({ my: mySnap.size, liked: likedCount, bookmarked: bookmarkedCount });
        } catch (e) { console.error(e); }
    };

    const loadPosts = async () => {
        if (!user) return;
        setLoading(true);
        try {
            let postsData: Post[] = [];
            if (activeTab === 'my') {
                const snap = await getDocs(query(collection(db, 'posts'), where('authorId', '==', user.uid), orderBy('createdAt', 'desc')));
                postsData = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
            } else {
                const ids = activeTab === 'liked' ? user.likedPosts : user.bookmarkedPosts;
                if (ids?.length > 0) {
                    for (const chunk of chunkArray(ids, 10)) {
                        const snap = await getDocs(query(collection(db, 'posts'), where('__name__', 'in', chunk)));
                        postsData = [...postsData, ...snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]];
                    }
                }
            }
            setPosts(postsData);
            setCounts((prev) => ({ ...prev, [activeTab]: postsData.length }));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    if (authLoading) return <Loading message="로딩 중..." />;
    if (!user) return null;

    const tabs: { id: TabType; label: string }[] = [
        { id: 'my', label: '내가 쓴 글' },
        { id: 'liked', label: '❤️ 좋아요' },
        { id: 'bookmarked', label: '🔖 북마크' },
    ];

    return (
        <main className="min-h-screen bg-slate-50 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-4">

                {/* 프로필 카드 */}
                <div className="bg-white rounded-3xl p-5 mb-4 shadow-card border border-gray-100">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 bg-gradient-to-br from-indigo-500 to-purple-600
                         rounded-2xl flex items-center justify-center shrink-0">
                            <span className="text-white font-bold text-xl">{user.nickname.charAt(0)}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="font-bold text-gray-900 text-lg truncate">{user.nickname}</h1>
                            <p className="text-gray-400 text-sm truncate">{user.email}</p>
                        </div>
                        <button onClick={() => router.push('/profile')}
                            className="shrink-0 btn-secondary text-sm py-2">
                            수정
                        </button>
                    </div>

                    {/* 통계 */}
                    <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-gray-50">
                        {[
                            { label: '게시글', value: counts.my },
                            { label: '좋아요', value: counts.liked },
                            { label: '북마크', value: counts.bookmarked },
                        ].map((stat) => (
                            <div key={stat.label} className="text-center">
                                <p className="text-lg font-bold text-gray-900">{stat.value}</p>
                                <p className="text-xs text-gray-400">{stat.label}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* 탭 */}
                <div className="flex bg-white rounded-2xl p-1 gap-1 mb-4 shadow-card border border-gray-100">
                    {tabs.map((tab) => (
                        <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl
                       text-sm font-semibold transition-all active:scale-95
                       ${activeTab === tab.id
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-gray-500 hover:text-gray-700'}`}>
                            {tab.label}
                            <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold
                             ${activeTab === tab.id
                                    ? 'bg-indigo-500 text-indigo-100'
                                    : 'bg-gray-100 text-gray-500'}`}>
                                {counts[tab.id]}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 게시글 */}
                {loading ? (
                    <Loading message="불러오는 중..." fullscreen={false} />
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-3">
                        <p className="text-5xl">
                            {activeTab === 'my' ? '✏️' : activeTab === 'liked' ? '❤️' : '🔖'}
                        </p>
                        <p className="text-gray-400 font-medium">아직 없어요</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2.5 sm:gap-3">
                        {posts.map((post) => <PostCard key={post.id} post={post} />)}
                    </div>
                )}
            </div>
        </main>
    );
}