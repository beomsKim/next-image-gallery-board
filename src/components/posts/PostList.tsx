'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    collection, query, where, orderBy, getDocs,
    limit, startAfter, QueryDocumentSnapshot, DocumentData,
    deleteDoc, doc, updateDoc
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/post';
import PostCard from './PostCard';
import SearchBar from './SearchBar';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

export default function PostList() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { user } = useAuth();

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [category, setCategory] = useState('');
    const [sortBy, setSortBy] = useState('latest');
    const [searchQuery, setSearchQuery] = useState('');

    const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot<DocumentData> | null>(null);
    const [hasMore, setHasMore] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);

    const PAGE_SIZE = 20;

    useEffect(() => { loadPosts(true); }, [category, sortBy, searchQuery, user]);

    const loadPosts = async (reset = true) => {
        if (reset) {
            setLoading(true);
            setLastDoc(null);
            setHasMore(true);
        } else {
            setLoadingMore(true);
        }

        try {
            const authorParam = searchParams.get('author');
            let baseQuery;

            if (sortBy === 'my' && user) {
                baseQuery = query(
                    collection(db, 'posts'),
                    where('authorId', '==', user.uid),
                    orderBy('createdAt', 'desc'),
                    limit(PAGE_SIZE)
                );
            } else if (authorParam) {
                baseQuery = query(
                    collection(db, 'posts'),
                    where('authorNickname', '==', authorParam),
                    orderBy('createdAt', 'desc'),
                    limit(PAGE_SIZE)
                );
            } else if (category && category !== '전체') {
                const sortField = sortBy === 'views' ? 'views' : 'createdAt';
                const sortDir = sortBy === 'oldest' ? 'asc' : 'desc';
                baseQuery = query(
                    collection(db, 'posts'),
                    where('category', '==', category),
                    orderBy(sortField, sortDir),
                    limit(PAGE_SIZE)
                );
            } else {
                const sortField = sortBy === 'views' ? 'views' : 'createdAt';
                const sortDir = sortBy === 'oldest' ? 'asc' : 'desc';
                baseQuery = query(
                    collection(db, 'posts'),
                    orderBy(sortField, sortDir),
                    limit(PAGE_SIZE)
                );
            }

            // 페이지네이션 - 다음 페이지
            if (!reset && lastDoc) {
                baseQuery = query(baseQuery, startAfter(lastDoc));
            }

            const snap = await getDocs(baseQuery);
            let data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];

            // liked/bookmarked 클라이언트 필터
            if (sortBy === 'liked' && user) {
                data = data.filter((p) => user.likedPosts?.includes(p.id));
            } else if (sortBy === 'bookmarked' && user) {
                data = data.filter((p) => user.bookmarkedPosts?.includes(p.id));
            }

            // 검색 필터
            if (searchQuery) {
                data = data.filter((p) =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // 고정 글 상단 정렬
            data.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });

            if (reset) {
                setPosts(data);
            } else {
                setPosts((prev) => [...prev, ...data]);
            }

            setLastDoc(snap.docs[snap.docs.length - 1] || null);
            setHasMore(snap.docs.length === PAGE_SIZE);
        } catch (e) {
            console.error('게시글 로드 실패:', e);
            setToast({ message: '게시글을 불러오는데 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
            setLoadingMore(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            const selectable = posts.filter((p) => p.authorId === user?.uid || user?.isAdmin);
            setSelectedPosts(new Set(selectable.map((p) => p.id)));
        } else {
            setSelectedPosts(new Set());
        }
    };

    const handleSelectPost = (postId: string, checked: boolean) => {
        const next = new Set(selectedPosts);
        checked ? next.add(postId) : next.delete(postId);
        setSelectedPosts(next);
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);
            const toDelete = posts.filter((p) => selectedPosts.has(p.id));
            const canDelete = toDelete.every((p) => p.authorId === user?.uid || user?.isAdmin);
            if (!canDelete) {
                setToast({ message: '삭제 권한이 없는 게시글이 포함되어 있습니다.', type: 'error' });
                return;
            }
            await Promise.all(toDelete.map(async (post) => {
                if (post.images?.length) {
                    await Promise.all(post.images.map(async (url) => {
                        try { await deleteObject(ref(storage, url)); } catch { }
                    }));
                }
                await deleteDoc(doc(db, 'posts', post.id));
            }));
            setToast({ message: '게시글이 삭제되었습니다.', type: 'success' });
            setSelectedPosts(new Set());
            loadPosts();
        } catch {
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    const selectableCount = posts.filter((p) => p.authorId === user?.uid || user?.isAdmin).length;

    return (
        <>
            <div className="max-w-7xl mx-auto px-3 sm:px-4 pt-3 pb-24 md:pb-8">
                <SearchBar
                    category={category} sortBy={sortBy}
                    onCategoryChange={setCategory} onSortChange={setSortBy} onSearch={setSearchQuery}
                />

                {/* 액션바 */}
                {user && (
                    <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <div
                                onClick={() => handleSelectAll(selectedPosts.size !== selectableCount)}
                                className={`w-5 h-5 rounded-md border-2 flex items-center justify-center
                         transition-all cursor-pointer
                         ${selectedPosts.size === selectableCount && selectableCount > 0
                                        ? 'bg-indigo-600 border-indigo-600'
                                        : 'border-gray-300 bg-white'}`}
                            >
                                {selectedPosts.size === selectableCount && selectableCount > 0 && (
                                    <svg width="10" height="8" viewBox="0 0 12 10" fill="none">
                                        <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                            <span className="text-xs text-gray-500 font-medium">전체 선택</span>
                        </label>

                        <div className="flex items-center gap-2">
                            {selectedPosts.size > 0 && (
                                <button onClick={() => setShowDeleteModal(true)}
                                    className="text-xs font-semibold text-red-500 bg-red-50
                           px-3 py-1.5 rounded-xl hover:bg-red-100 active:scale-95 transition-all">
                                    🗑 {selectedPosts.size}개 삭제
                                </button>
                            )}
                            {!loading && posts.length > 0 && (
                                <span className="text-xs text-gray-400">총 {posts.length}개</span>
                            )}
                        </div>
                    </div>
                )}

                {/* 게시글 그리드 */}
                {loading ? (
                    <Loading message="불러오는 중..." fullscreen={false} />
                ) : posts.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 gap-3">
                        <p className="text-5xl">🖼</p>
                        <p className="text-gray-400 font-medium">
                            {searchQuery ? '검색 결과가 없어요' : '게시글이 없어요'}
                        </p>
                        {user && (
                            <button onClick={() => router.push('/posts/new')} className="btn-primary text-sm mt-2">
                                첫 게시글 작성하기
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-2 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-5 2xl:grid-cols-6 3xl:grid-cols-8 gap-2.5 sm:gap-3">
                        {posts.map((post) => (
                            <PostCard key={post.id} post={post}
                                showCheckbox={!!user && (post.authorId === user.uid || user.isAdmin)}
                                checked={selectedPosts.has(post.id)}
                                onCheck={handleSelectPost}
                            />
                        ))}
                    </div>
                )}
            </div>

            {hasMore && !loading && posts.length > 0 && (
                <div className="flex justify-center mt-8 mb-4">
                    <button
                        onClick={() => loadPosts(false)}
                        disabled={loadingMore}
                        className="btn-secondary px-10 py-3 text-sm font-semibold"
                    >
                        {loadingMore ? (
                            <span className="flex items-center gap-2">
                                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                                로딩 중...
                            </span>
                        ) : '더 보기'}
                    </button>
                </div>
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}
                title="게시글 삭제" confirmText="삭제" cancelText="취소" onConfirm={confirmDelete}
                confirmClassName="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <p className="text-gray-700">선택한 게시글 {selectedPosts.size}개를 삭제하시겠습니까?</p>
            </Modal>
        </>
    );
}