'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    collection, query, where, orderBy, getDocs,
    deleteDoc, doc, getDoc, updateDoc
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

    useEffect(() => { loadPosts(); }, [category, sortBy, searchQuery, user]);

    const loadPosts = async () => {
        setLoading(true);
        try {
            const authorParam = searchParams.get('author');
            let q = query(collection(db, 'posts'));

            if (sortBy === 'my' && user) {
                q = query(q, where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
            } else if (sortBy === 'liked' && user) {
                q = query(q, orderBy('createdAt', 'desc'));
            } else if (sortBy === 'bookmarked' && user) {
                q = query(q, orderBy('createdAt', 'desc'));
            } else if (authorParam) {
                q = query(q, where('authorNickname', '==', authorParam), orderBy('createdAt', 'desc'));
            } else if (category && category !== '전체') {
                if (sortBy === 'oldest') q = query(q, where('category', '==', category), orderBy('createdAt', 'asc'));
                else if (sortBy === 'views') q = query(q, where('category', '==', category), orderBy('views', 'desc'));
                else q = query(q, where('category', '==', category), orderBy('createdAt', 'desc'));
            } else {
                if (sortBy === 'oldest') q = query(q, orderBy('createdAt', 'asc'));
                else if (sortBy === 'views') q = query(q, orderBy('views', 'desc'));
                else q = query(q, orderBy('createdAt', 'desc'));
            }

            const snap = await getDocs(q);
            let data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];

            if (sortBy === 'liked' && user) {
                data = data.filter((p) => user.likedPosts?.includes(p.id));
            } else if (sortBy === 'bookmarked' && user) {
                data = data.filter((p) => user.bookmarkedPosts?.includes(p.id));
            }

            if (searchQuery) {
                data = data.filter((p) =>
                    p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    p.category.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            data.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });

            setPosts(data);
        } catch (e) {
            console.error('게시글 로드 실패:', e);
            setToast({ message: '게시글을 불러오는데 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
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

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}
                title="게시글 삭제" confirmText="삭제" cancelText="취소" onConfirm={confirmDelete}
                confirmClassName="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <p className="text-gray-700">선택한 게시글 {selectedPosts.size}개를 삭제하시겠습니까?</p>
            </Modal>
        </>
    );
}