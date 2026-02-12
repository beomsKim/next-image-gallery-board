'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
    collection, query, where, orderBy,
    getDocs, deleteDoc, doc, getDoc, updateDoc
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
    const { user } = useAuth();  // user가 null이어도 페이지 접근 허용

    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPosts, setSelectedPosts] = useState<Set<string>>(new Set());
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const [category, setCategory] = useState<string>('');
    const [sortBy, setSortBy] = useState<string>('latest');
    const [searchQuery, setSearchQuery] = useState('');

    // 로그인 체크 없이 바로 로드
    useEffect(() => {
        loadPosts();
    }, [category, sortBy, searchQuery]);

    const loadPosts = async () => {
        setLoading(true);

        try {
            let q = query(collection(db, 'posts'));
            const authorParam = searchParams.get('author');

            // 정렬 조건
            if (sortBy === 'my' && user) {
                q = query(q, where('authorId', '==', user.uid), orderBy('createdAt', 'desc'));
            } else if (authorParam) {
                q = query(q, where('authorNickname', '==', authorParam), orderBy('createdAt', 'desc'));
            } else if (category && category !== '전체') {
                if (sortBy === 'oldest') {
                    q = query(q, where('category', '==', category), orderBy('createdAt', 'asc'));
                } else if (sortBy === 'views') {
                    q = query(q, where('category', '==', category), orderBy('views', 'desc'));
                } else {
                    q = query(q, where('category', '==', category), orderBy('createdAt', 'desc'));
                }
            } else {
                if (sortBy === 'oldest') {
                    q = query(q, orderBy('createdAt', 'asc'));
                } else if (sortBy === 'views') {
                    q = query(q, orderBy('views', 'desc'));
                } else {
                    q = query(q, orderBy('createdAt', 'desc'));
                }
            }

            const snapshot = await getDocs(q);
            let postsData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Post[];

            // 좋아요/북마크 필터 (로그인 유저만)
            if (user && sortBy === 'liked') {
                postsData = postsData.filter((post) =>
                    user.likedPosts?.includes(post.id)
                );
            } else if (user && sortBy === 'bookmarked') {
                postsData = postsData.filter((post) =>
                    user.bookmarkedPosts?.includes(post.id)
                );
            }

            // 검색 필터
            if (searchQuery) {
                postsData = postsData.filter((post) =>
                    post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    post.category.toLowerCase().includes(searchQuery.toLowerCase())
                );
            }

            // 고정 게시글 맨 위로
            postsData.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return 0;
            });

            setPosts(postsData);
        } catch (error) {
            console.error('게시글 로드 실패:', error);
            setToast({ message: '게시글을 불러오는데 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
            // 본인 글 또는 관리자만 선택 가능
            const selectablePosts = posts.filter(
                (p) => p.authorId === user?.uid || user?.isAdmin
            );
            setSelectedPosts(new Set(selectablePosts.map((p) => p.id)));
        } else {
            setSelectedPosts(new Set());
        }
    };

    const handleSelectPost = (postId: string, checked: boolean) => {
        const newSelected = new Set(selectedPosts);
        if (checked) {
            newSelected.add(postId);
        } else {
            newSelected.delete(postId);
        }
        setSelectedPosts(newSelected);
    };

    const handleDeleteSelected = () => {
        if (selectedPosts.size === 0) {
            setToast({ message: '삭제할 게시글을 선택해주세요.', type: 'error' });
            return;
        }
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        try {
            setLoading(true);

            const postsToDelete = posts.filter((p) => selectedPosts.has(p.id));

            const canDelete = postsToDelete.every(
                (p) => p.authorId === user?.uid || user?.isAdmin
            );

            if (!canDelete) {
                setToast({
                    message: '삭제 권한이 없는 게시글이 포함되어 있습니다.',
                    type: 'error'
                });
                return;
            }

            await Promise.all(
                postsToDelete.map(async (post) => {
                    // Storage 이미지 삭제
                    if (post.images?.length > 0) {
                        await Promise.all(
                            post.images.map(async (imageUrl) => {
                                try {
                                    await deleteObject(ref(storage, imageUrl));
                                } catch (err) {
                                    console.warn('이미지 삭제 실패:', err);
                                }
                            })
                        );
                    }
                    // 게시글 삭제
                    await deleteDoc(doc(db, 'posts', post.id));
                })
            );

            setToast({ message: '게시글이 삭제되었습니다.', type: 'success' });
            setSelectedPosts(new Set());
            loadPosts();
        } catch (error) {
            console.error('삭제 실패:', error);
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    return (
        <>
            <div className="max-w-7xl mx-auto p-4">
                {/* 검색 및 필터 */}
                <SearchBar
                    category={category}
                    sortBy={sortBy}
                    onCategoryChange={setCategory}
                    onSortChange={setSortBy}
                    onSearch={setSearchQuery}
                />

                {/* 상단 액션바 */}
                <div className="flex items-center justify-between h-10 mb-4">
                    <div className="flex items-center gap-4">
                        {/* 로그인 유저만 체크박스/삭제 버튼 표시 */}
                        {user && (
                            <>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={selectedPosts.size === posts.filter(
                                            p => p.authorId === user.uid || user.isAdmin
                                        ).length && posts.length > 0}
                                        onChange={(e) => handleSelectAll(e.target.checked)}
                                        className="w-5 h-5"
                                    />
                                    <span className="text-sm">모두 선택</span>
                                </label>

                                {selectedPosts.size > 0 && (
                                    <button
                                        onClick={handleDeleteSelected}
                                        className="btn-secondary text-red-600"
                                    >
                                        선택 삭제 ({selectedPosts.size})
                                    </button>
                                )}
                            </>
                        )}
                    </div>

                    {/* 게시글 개수 */}
                    <div className="text-sm text-gray-600">
                        {!loading && posts.length > 0 && `총 ${posts.length}개`}
                    </div>
                </div>

                {/* 게시글 그리드 */}
                {loading ? (
                    <Loading message="게시글을 불러오는 중..." />
                ) : posts.length === 0 ? (
                    <div className="text-center py-20">
                        <p className="text-gray-500 text-lg">
                            {searchQuery ? '검색 결과가 없습니다.' : '게시글이 없습니다.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 xs:grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-5 3xl:grid-cols-8 gap-4">
                        {posts.map((post) => (
                            <PostCard
                                key={post.id}
                                post={post}
                                showCheckbox={!!user && (post.authorId === user.uid || user.isAdmin)}
                                checked={selectedPosts.has(post.id)}
                                onCheck={handleSelectPost}
                            />
                        ))}
                    </div>
                )}
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="게시글 삭제"
                confirmText="삭제"
                cancelText="취소"
                onConfirm={confirmDelete}
            >
                <p className="text-gray-700">
                    정말 선택한 게시글을 삭제하시겠습니까?
                    <br />선택된 게시글: {selectedPosts.size}개
                </p>
            </Modal>
        </>
    );
}