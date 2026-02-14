'use client';

import { use, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    doc, getDoc, updateDoc, deleteDoc,
    increment, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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

export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: postId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [post, setPost] = useState<Post | null>(null);
    const [loading, setLoading] = useState(true);
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [likeCount, setLikeCount] = useState(0);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => { loadPost(); }, [postId]);

    useEffect(() => {
        if (user && post) {
            setLiked(user.likedPosts?.includes(postId) || false);
            setBookmarked(user.bookmarkedPosts?.includes(postId) || false);
        }
    }, [user, postId, post]);

    useEffect(() => {
        if (post && !hasViewedPost(postId)) {
            updateDoc(doc(db, 'posts', postId), { views: increment(1) }).catch(console.error);
            markPostAsViewed(postId);
        }
    }, [post]);

    const loadPost = async () => {
        try {
            const postDoc = await getDoc(doc(db, 'posts', postId));
            if (!postDoc.exists()) { router.push('/'); return; }
            const data = { id: postDoc.id, ...postDoc.data() } as Post;
            setPost(data);
            setLikeCount(data.likes || 0);
            if (user) {
                setLiked(user.likedPosts?.includes(postId) || false);
                setBookmarked(user.bookmarkedPosts?.includes(postId) || false);
            }
        } catch (e) {
            console.error('게시글 로드 실패:', e);
        } finally {
            setLoading(false);
        }
    };

    const handleLike = async () => {
        if (!user) { setToast({ message: '로그인이 필요합니다.', type: 'error' }); return; }
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((p) => newLiked ? p + 1 : p - 1);
        try {
            if (newLiked) {
                await updateDoc(doc(db, 'users', user.uid), { likedPosts: arrayUnion(postId) });
                await updateDoc(doc(db, 'posts', postId), { likes: increment(1) });
                user.likedPosts = [...(user.likedPosts || []), postId];
            } else {
                await updateDoc(doc(db, 'users', user.uid), { likedPosts: arrayRemove(postId) });
                await updateDoc(doc(db, 'posts', postId), { likes: increment(-1) });
                user.likedPosts = (user.likedPosts || []).filter((id) => id !== postId);
            }
        } catch {
            setLiked(!newLiked);
            setLikeCount((p) => newLiked ? p - 1 : p + 1);
            setToast({ message: '오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleBookmark = async () => {
        if (!user) { setToast({ message: '로그인이 필요합니다.', type: 'error' }); return; }
        const newBookmarked = !bookmarked;
        setBookmarked(newBookmarked);
        try {
            if (newBookmarked) {
                await updateDoc(doc(db, 'users', user.uid), { bookmarkedPosts: arrayUnion(postId) });
                user.bookmarkedPosts = [...(user.bookmarkedPosts || []), postId];
                setToast({ message: '북마크에 추가되었습니다.', type: 'success' });
            } else {
                await updateDoc(doc(db, 'users', user.uid), { bookmarkedPosts: arrayRemove(postId) });
                user.bookmarkedPosts = (user.bookmarkedPosts || []).filter((id) => id !== postId);
                setToast({ message: '북마크가 해제되었습니다.', type: 'success' });
            }
        } catch {
            setBookmarked(!newBookmarked);
            setToast({ message: '오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            if (post?.images?.length) {
                await Promise.all(post.images.map(async (url) => {
                    try { await deleteObject(ref(storage, url)); } catch { }
                }));
            }
            await deleteDoc(doc(db, 'posts', postId));
            router.push('/');
        } catch {
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    const canEdit = user && (user.uid === post?.authorId || user.isAdmin);

    if (loading) return <Loading message="게시글을 불러오는 중..." />;
    if (!post) return null;

    const createdAt = post.createdAt instanceof Date ? post.createdAt : post.createdAt.toDate();

    return (
        <>
            <main className="min-h-screen bg-slate-50 pb-24 md:pb-8">
                {/* 헤더 */}
                <div className="sticky top-14 md:top-16 z-30 bg-white/95 backdrop-blur-sm border-b border-gray-100 px-4 py-3">
                    <div className="max-w-4xl mx-auto flex items-center gap-3">
                        <button onClick={() => router.back()}
                            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100
                       active:scale-95 transition-all text-gray-600">
                            ←
                        </button>
                        <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate text-sm">{post.title}</p>
                            <p className="text-xs text-gray-400">{post.authorNickname}</p>
                        </div>
                        {canEdit && (
                            <div className="flex gap-1">
                                <button onClick={() => router.push(`/posts/edit/${postId}`)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-gray-100
                           active:scale-95 transition-all text-gray-600 text-sm">
                                    ✏️
                                </button>
                                <button onClick={() => setShowDeleteModal(true)}
                                    className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-red-50
                           active:scale-95 transition-all text-red-500 text-sm">
                                    🗑
                                </button>
                            </div>
                        )}
                    </div>
                </div>

                <div className="max-w-4xl mx-auto px-3 sm:px-4 py-4">
                    {/* 카드 */}
                    <div className="bg-white rounded-3xl overflow-hidden shadow-card border border-gray-100 mb-4">
                        {/* 메타 정보 */}
                        <div className="px-5 pt-5 pb-4">
                            <div className="flex items-center gap-2 mb-3">
                                <span className="badge-primary">{post.category}</span>
                                {post.isPinned && (
                                    <span className="badge bg-gradient-to-r from-amber-100 to-orange-100 text-amber-700">
                                        📌 고정
                                    </span>
                                )}
                            </div>
                            <h1 className="text-xl sm:text-2xl font-bold text-gray-900 leading-snug mb-3">{post.title}</h1>
                            <div className="flex items-center justify-between text-sm text-gray-400">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full
                               flex items-center justify-center">
                                        <span className="text-white text-xs font-bold">{post.authorNickname.charAt(0)}</span>
                                    </div>
                                    <span className="font-medium text-gray-600">{post.authorNickname}</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span>{formatDateTime(createdAt)}</span>
                                    <span className="flex items-center gap-1">
                                        <AiOutlineEye size={14} />
                                        {formatNumber(post.views || 0)}
                                    </span>
                                </div>
                            </div>

                            {/* 수정이력 */}
                            {post.editHistory?.length > 0 && (
                                <details className="mt-3 pt-3 border-t border-gray-50 group">
                                    <summary className="text-xs text-gray-300 cursor-pointer hover:text-gray-400
                                   list-none flex items-center gap-1 select-none">
                                        <span className="group-open:rotate-90 transition-transform inline-block">▶</span>
                                        수정됨 ({post.editHistory.length}회)
                                    </summary>
                                    <div className="mt-2 space-y-1 pl-3">
                                        {post.editHistory.map((h: any, i: number) => (
                                            <p key={i} className="text-xs text-gray-300">
                                                {i + 1}차 · {formatDateTime(h.editedAt instanceof Date ? h.editedAt : h.editedAt.toDate())}
                                            </p>
                                        ))}
                                    </div>
                                </details>
                            )}
                        </div>

                        {/* 이미지 */}
                        {post.images?.length > 0 && (
                            <div className="border-t border-gray-50">
                                {post.images.map((url, i) => (
                                    <div key={i} className="border-b border-gray-50 last:border-b-0">
                                        <Image src={url} alt={`${post.title} - ${i + 1}`}
                                            width={800} height={600}
                                            className="w-full h-auto" />
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* 내용 */}
                        {post.content && (
                            <div className="px-5 py-4 text-gray-700 leading-relaxed whitespace-pre-wrap border-t border-gray-50">
                                {post.content}
                            </div>
                        )}

                        {/* 좋아요/북마크 */}
                        <div className="px-5 py-4 border-t border-gray-100 flex gap-3">
                            <button onClick={handleLike}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                         font-semibold text-sm transition-all active:scale-[0.97]
                         ${liked
                                        ? 'bg-red-50 text-red-500 border-2 border-red-200'
                                        : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-red-50'}`}>
                                {liked ? <AiFillHeart size={20} /> : <AiOutlineHeart size={20} />}
                                {formatNumber(likeCount)}
                            </button>
                            <button onClick={handleBookmark}
                                className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl
                         font-semibold text-sm transition-all active:scale-[0.97]
                         ${bookmarked
                                        ? 'bg-indigo-50 text-indigo-600 border-2 border-indigo-200'
                                        : 'bg-gray-50 text-gray-500 border-2 border-transparent hover:bg-indigo-50'}`}>
                                {bookmarked ? <BsBookmarkFill size={17} /> : <BsBookmark size={17} />}
                                {bookmarked ? '저장됨' : '저장'}
                            </button>
                        </div>
                    </div>

                    <button onClick={() => router.back()}
                        className="w-full btn-secondary py-3.5">
                        ← 목록으로
                    </button>
                </div>
            </main>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}
                title="게시글 삭제" confirmText="삭제" cancelText="취소" onConfirm={handleDelete}
                confirmClassName="btn-primary bg-red-600 hover:bg-red-700">
                <p className="text-gray-600">삭제하면 복구할 수 없습니다. 정말 삭제하시겠습니까?</p>
            </Modal>
        </>
    );
}