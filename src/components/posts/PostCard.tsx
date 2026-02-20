'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import {
    doc, updateDoc, arrayUnion, arrayRemove
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toggleLikeFn } from '@/lib/functions';
import { useAuth } from '@/hooks/useAuth';
import { usePostLike } from '@/hooks/usePostLike';
import { Post } from '@/types/post';
import { formatRelativeTime, formatNumber } from '@/utils/format';
import { AiOutlineHeart, AiFillHeart, AiOutlineEye } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FiMessageCircle } from 'react-icons/fi';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

interface PostCardProps {
    post: Post;
    showCheckbox?: boolean;
    checked?: boolean;
    onCheck?: (postId: string, checked: boolean) => void;
}

export default function PostCard({ post, showCheckbox, checked, onCheck }: PostCardProps) {
    const router = useRouter();
    const { user } = useAuth();
    const [liked, setLiked] = useState(false);
    const [bookmarked, setBookmarked] = useState(false);
    const [likeCount, setLikeCount] = useState(post.likes || 0);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showLoginModal, setShowLoginModal] = useState(false);
    const [imgLoaded, setImgLoaded] = useState(false);

    useEffect(() => {
        setLiked(user?.likedPosts?.includes(post.id) || false);
        setBookmarked(user?.bookmarkedPosts?.includes(post.id) || false);
    }, [user, post.id]);

    const handleCardClick = () => {
        if (!user) { setShowLoginModal(true); return; }
        router.push(`/posts/${post.id}`);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            setShowLoginModal(true);
            return;
        }

        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((p) => newLiked ? p + 1 : p - 1);

        try {
            const result = await toggleLikeFn({ postId: post.id });
            const data = result.data as { liked: boolean };
            setLiked(data.liked);

            if (data.liked) {
                user.likedPosts = [...(user.likedPosts || []), post.id];
            } else {
                user.likedPosts = (user.likedPosts || []).filter((id) => id !== post.id);
            }
        } catch (err: any) {
            setLiked(!newLiked);
            setLikeCount((p) => newLiked ? p - 1 : p + 1);
            setToast({ message: err.message || '오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) { setShowLoginModal(true); return; }
        const nb = !bookmarked;
        setBookmarked(nb);
        try {
            if (nb) {
                await updateDoc(doc(db, 'users', user.uid), { bookmarkedPosts: arrayUnion(post.id) });
                user.bookmarkedPosts = [...(user.bookmarkedPosts || []), post.id];
                setToast({ message: '북마크 추가!', type: 'success' });
            } else {
                await updateDoc(doc(db, 'users', user.uid), { bookmarkedPosts: arrayRemove(post.id) });
                user.bookmarkedPosts = (user.bookmarkedPosts || []).filter((id) => id !== post.id);
            }
        } catch {
            setBookmarked(!nb);
            setToast({ message: '오류가 발생했습니다.', type: 'error' });
        }
    };

    return (
        <>
            <div
                onClick={handleCardClick}
                className="bg-white rounded-2xl overflow-hidden shadow-card border border-gray-100 hover:shadow-md hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-200 cursor-pointer group"
            >
                {/* 썸네일 - 세로 비율 */}
                <div className="relative w-full overflow-hidden bg-gray-100" style={{ paddingBottom: '140%' }}>
                    {user ? (
                        <>
                            {/* 스켈레톤 */}
                            {!imgLoaded && (
                                <div className="absolute inset-0 skeleton" />
                            )}
                            <Image
                                src={post.thumbnailUrl || '/images/placeholder.png'}
                                alt={post.title}
                                fill
                                className={`
                                    object-cover group-hover:scale-105 transition-all duration-500
                                    ${imgLoaded ? 'opacity-100' : 'opacity-0'}
                                `}
                                loading="lazy"
                                onLoad={() => setImgLoaded(true)}
                                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
                            />
                        </>
                    ) : (
                        <>
                            <Image
                                src={post.thumbnailUrl || '/images/placeholder.png'}
                                alt="" fill aria-hidden
                                className="object-cover scale-110"
                                style={{ filter: 'blur(22px) brightness(0.55)', transform: 'scale(1.2)' }}
                                loading="lazy"
                            />
                            {/* 픽셀 오버레이 */}
                            <div className="absolute inset-0" style={{
                                background: `repeating-linear-gradient(0deg,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.1) 2px,transparent 2px,transparent 10px), repeating-linear-gradient(90deg,rgba(0,0,0,0.1) 0,rgba(0,0,0,0.1) 2px,transparent 2px,transparent 10px)`,
                            }} />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/15">
                                <div className="bg-white/90 backdrop-blur-sm rounded-2xl px-4 py-3.5 text-center shadow-xl mx-4 border border-white/50">
                                    <p className="text-xl mb-1">🔒</p>
                                    <p className="text-gray-800 font-bold text-xs">회원 전용</p>
                                    <p className="text-gray-500 text-[11px] mt-0.5">로그인 후 감상하세요</p>
                                </div>
                            </div>
                        </>
                    )}

                    {/* 고정 뱃지 */}
                    {post.isPinned && (
                        <div className="absolute top-2 left-2">
                            <div className="flex items-center gap-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-[10px] font-bold px-2 py-1 rounded-lg shadow-md">
                                <span>📌</span>
                                <span>고정</span>
                            </div>
                        </div>
                    )}

                    {/* 체크박스 */}
                    {showCheckbox && (
                        <div className="absolute top-2 right-2">
                            <div
                                onClick={(e) => { e.stopPropagation(); onCheck?.(post.id, !checked); }}
                                className={`
                                    w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer
                                    ${checked ? 'bg-indigo-600 border-indigo-600' : 'bg-white/80 border-gray-300'}
                                `}
                            >
                                {checked && (
                                    <svg width="12" height="10" viewBox="0 0 12 10" fill="none">
                                        <path d="M1 5l3.5 3.5L11 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>
                        </div>
                    )}

                    {/* 좋아요/북마크 오버레이 (호버 시 표시) */}
                    <div className="absolute bottom-0 left-0 right-0 p-2 opacity-0 group-hover:opacity-100
                         transition-opacity duration-200 flex justify-between items-end
                         bg-gradient-to-t from-black/40 to-transparent">
                        <button onClick={handleLike}
                            className={`flex items-center gap-1 text-xs font-bold px-2 py-1 rounded-lg
                         backdrop-blur-sm transition-all active:scale-90
                         ${liked ? 'bg-red-500 text-white' : 'bg-white/80 text-gray-700'}`}>
                            {liked ? <AiFillHeart size={13} /> : <AiOutlineHeart size={13} />}
                            {formatNumber(likeCount)}
                        </button>
                        <button onClick={handleBookmark}
                            className={`p-1.5 rounded-lg backdrop-blur-sm transition-all active:scale-90
                         ${bookmarked ? 'bg-indigo-500 text-white' : 'bg-white/80 text-gray-700'}`}>
                            {bookmarked ? <BsBookmarkFill size={13} /> : <BsBookmark size={13} />}
                        </button>
                    </div>
                </div>

                {/* 카드 정보 */}
                <div className="p-3">
                    <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg">
                            {post.category}
                        </span>
                        <span className="text-[10px] text-gray-400">
                            {formatRelativeTime(post.createdAt instanceof Date ? post.createdAt : post.createdAt.toDate())}
                        </span>
                    </div>

                    {/* 제목 1줄 말줄임 */}
                    <h3 className="font-semibold text-gray-900 text-sm truncate leading-snug mb-2">
                        {post.title}
                    </h3>

                    <div className="flex items-center justify-between">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                if (!user) { setShowLoginModal(true); return; }
                                router.push(`/?author=${post.authorNickname}`);
                            }}
                            className="text-[11px] text-gray-400 hover:text-indigo-600 truncate max-w-[60%] transition-colors">
                            {post.authorNickname}
                        </button>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400">
                            <span className="flex items-center gap-0.5">
                                <AiOutlineEye size={12} />
                                {formatNumber(post.views || 0)}
                            </span>
                            <span className={`flex items-center gap-0.5 ${liked ? 'text-red-500' : ''}`}>
                                <AiOutlineHeart size={12} />
                                {formatNumber(likeCount)}
                            </span>
                            {(post.commentCount ?? 0) > 0 && (
                                <span className="flex items-center gap-0.5">
                                    <FiMessageCircle size={11} />
                                    {formatNumber(post.commentCount || 0)}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <Modal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)}
                title="로그인이 필요해요" confirmText="로그인하기" cancelText="취소"
                onConfirm={() => { setShowLoginModal(false); router.push('/login'); }}>
                <div className="text-center py-2">
                    <p className="text-5xl mb-4">🔒</p>
                    <p className="text-gray-700 font-semibold mb-1">회원만 볼 수 있어요</p>
                    <p className="text-gray-400 text-sm">가입하면 모든 이미지를 자유롭게 즐길 수 있어요!</p>
                </div>
            </Modal>
        </>
    );
}