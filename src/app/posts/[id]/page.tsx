'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, getDoc, updateDoc, deleteDoc, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/post';
import { formatDateTime, formatNumber } from '@/utils/format';
import { hasViewedPost, markPostAsViewed } from '@/utils/storage';
import { AiOutlineHeart, AiFillHeart, AiOutlineEye } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FiEdit, FiTrash2 } from 'react-icons/fi';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

export default function PostDetailPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const postId = params.id;

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        loadPost();
    }, [postId]);

    useEffect(() => {
        // 조회수 증가 (24시간에 1회만)
        if (post && !hasViewedPost(postId)) {
            incrementViews();
            markPostAsViewed(postId);
        }
    }, [post, postId]);

    const loadPost = async () => {
        try {
            const postDoc = await getDoc(doc(db, 'posts', postId));

            if (!postDoc.exists()) {
                setToast({ message: '게시글을 찾을 수 없습니다.', type: 'error' });
                router.push('/');
                return;
            }

            const postData = {
                id: postDoc.id,
                ...postDoc.data(),
            } as Post;

            setPost(postData);

            if (user) {
                setLiked(user.likedPosts.includes(postId));
                setBookmarked(user.bookmarkedPosts.includes(postId));
            }
        } catch (error) {
            console.error('게시글 로드 실패:', error);
            setToast({ message: '게시글을 불러오는데 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const incrementViews = async () => {
        try {
            await updateDoc(doc(db, 'posts', postId), {
                views: increment(1),
            });
        } catch (error) {
            console.error('조회수 증가 실패:', error);
        }
    };

    const handleEdit = () => {
        router.push(`/posts/edit/${postId}`);
    };

    const handleDelete = async () => {
        try {
            await deleteDoc(doc(db, 'posts', postId));
            setToast({ message: '게시글이 삭제되었습니다.', type: 'success' });
            setTimeout(() => router.push('/'), 1000);
        } catch (error) {
            console.error('삭제 실패:', error);
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setShowDeleteModal(false);
        }
    };

    const canEdit = user && (user.uid === post?.authorId || user.isAdmin);

    if (loading) {
        return <Loading message="게시글을 불러오는 중..." />;
    }

    if (!post) {
        return null;
    }

    return (
        <>
            <main className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-4xl mx-auto p-4">
                    <div className="card">
                        {/* 헤더 */}
                        <div className="border-b pb-4 mb-6">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-sm bg-gray-100 px-3 py-1 rounded">
                                            {post.category}
                                        </span>
                                        {post.isPinned && (
                                            <span className="text-sm bg-primary-100 text-primary-700 px-3 py-1 rounded">
                                                📌 고정
                                            </span>
                                        )}
                                    </div>
                                    <h1 className="text-3xl font-bold mb-4">{post.title}</h1>
                                </div>

                                {canEdit && (
                                    <div className="flex gap-2">
                                        <button onClick={handleEdit} className="btn-secondary">
                                            <FiEdit size={18} />
                                        </button>
                                        <button
                                            onClick={() => setShowDeleteModal(true)}
                                            className="btn-secondary text-red-600"
                                        >
                                            <FiTrash2 size={18} />
                                        </button>
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between text-sm text-gray-600">
                                <div className="flex items-center gap-4">
                                    <span>{post.authorNickname}</span>
                                    <span>{formatDateTime(post.createdAt.toDate())}</span>
                                    {post.updatedAt && post.updatedAt !== post.createdAt && (
                                        <span className="text-gray-400">
                                            (수정: {formatDateTime(post.updatedAt.toDate())})
                                        </span>
                                    )}
                                </div>

                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                        <AiOutlineEye size={18} />
                                        {formatNumber(post.views)}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <AiOutlineHeart size={18} />
                                        {formatNumber(post.likes)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 이미지 갤러리 */}
                        <div className="mb-6">
                            {post.images.map((imageUrl, index) => (
                                <div key={index} className="mb-4 relative aspect-video w-full">
                                    <Image
                                        src={imageUrl}
                                        alt={`${post.title} - ${index + 1}`}
                                        fill
                                        className="object-contain rounded-lg"
                                    />
                                </div>
                            ))}
                        </div>

                        {/* 내용 */}
                        {post.content && (
                            <div className="mb-6 whitespace-pre-wrap text-gray-700">
                                {post.content}
                            </div>
                        )}

                        {/* 액션 버튼 */}
                        <div className="flex items-center justify-center gap-4 border-t pt-6">
                            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                {liked ? <AiFillHeart size={24} className="text-red-500" /> : <AiOutlineHeart size={24} />}
                                <span>{formatNumber(post.likes)}</span>
                            </button>

                            <button className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 transition-colors">
                                {bookmarked ? <BsBookmarkFill size={20} className="text-primary-600" /> : <BsBookmark size={20} />}
                                북마크
                            </button>
                        </div>
                    </div>

                    {/* 목록으로 버튼 */}
                    <div className="mt-6 text-center">
                        <button onClick={() => router.push('/')} className="btn-secondary">
                            목록으로
                        </button>
                    </div>
                </div>
            </main>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 삭제 확인 모달 */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="게시글 삭제"
                confirmText="삭제"
                cancelText="취소"
                onConfirm={handleDelete}
            >
                <p className="text-gray-700">정말 삭제하시겠습니까?</p>
            </Modal>
        </>
    );
}