'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Post } from '@/types/post';
import { formatRelativeTime, formatNumber } from '@/utils/format';
import { AiOutlineHeart, AiFillHeart, AiOutlineEye } from 'react-icons/ai';
import { BsBookmark, BsBookmarkFill } from 'react-icons/bs';
import { FiMoreVertical } from 'react-icons/fi';
import Toast from '@/components/common/Toast';

interface PostCardProps {
    post: Post;
    showCheckbox?: boolean;
    checked?: boolean;
    onCheck?: (postId: string, checked: boolean) => void;
}

export default function PostCard({ post, showCheckbox, checked, onCheck }: PostCardProps) {
    const router = useRouter();
    const { user } = useAuth();

    const [liked, setLiked] = useState(user?.likedPosts?.includes(post.id) || false);
    const [bookmarked, setBookmarked] = useState(user?.bookmarkedPosts?.includes(post.id) || false);
    const [likeCount, setLikeCount] = useState(post.likes);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleCardClick = () => {
        router.push(`/posts/${post.id}`);
    };

    const handleLike = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user) {
            setToast({ message: '로그인이 필요합니다.', type: 'error' });
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);
            const postRef = doc(db, 'posts', post.id);

            if (liked) {
                // 좋아요 취소
                await updateDoc(userRef, {
                    likedPosts: arrayRemove(post.id),
                });
                await updateDoc(postRef, {
                    likes: post.likes - 1,
                });
                setLiked(false);
                setLikeCount(prev => prev - 1);
            } else {
                // 좋아요
                await updateDoc(userRef, {
                    likedPosts: arrayUnion(post.id),
                });
                await updateDoc(postRef, {
                    likes: post.likes + 1,
                });
                setLiked(true);
                setLikeCount(prev => prev + 1);
            }
        } catch (error) {
            console.error('좋아요 처리 실패:', error);
            setToast({ message: '오류가 발생했습니다.', type: 'error' });
        }
    };

    const handleBookmark = async (e: React.MouseEvent) => {
        e.stopPropagation();

        if (!user) {
            setToast({ message: '로그인이 필요합니다.', type: 'error' });
            return;
        }

        try {
            const userRef = doc(db, 'users', user.uid);

            if (bookmarked) {
                // 북마크 취소
                await updateDoc(userRef, {
                    bookmarkedPosts: arrayRemove(post.id),
                });
                setBookmarked(false);
                setToast({ message: '북마크가 해제되었습니다.', type: 'success' });
            } else {
                // 북마크
                await updateDoc(userRef, {
                    bookmarkedPosts: arrayUnion(post.id),
                });
                setBookmarked(true);
                setToast({ message: "'북마크' 정렬로 확인 가능합니다.", type: 'success' });
            }
        } catch (error) {
            console.error('북마크 처리 실패:', error);
            setToast({ message: '오류가 발생했습니다.', type: 'error' });
        }
    };

    return (
        <>
            <div
                className="card cursor-pointer hover:shadow-xl transition-all relative group"
                onClick={handleCardClick}
            >
                {/* 체크박스 */}
                {showCheckbox && (
                    <div className="absolute top-2 left-2 z-10">
                        <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                                e.stopPropagation();
                                onCheck?.(post.id, e.target.checked);
                            }}
                            className="w-5 h-5 cursor-pointer"
                        />
                    </div>
                )}

                {/* 핀 표시 */}
                {post.isPinned && (
                    <div className="absolute top-2 right-2 bg-primary-600 text-white text-xs px-2 py-1 rounded z-10">
                        📌 고정
                    </div>
                )}

                {/* 썸네일 */}
                <div className="relative aspect-square w-full bg-gray-100 rounded-lg overflow-hidden mb-3">
                    <Image
                        src={post.thumbnailUrl || '/images/default-thumbnail.png'}
                        alt={post.title}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform"
                        loading="lazy"
                    />
                </div>

                {/* 제목 */}
                <h3 className="font-semibold text-lg mb-2 line-clamp-2">
                    {post.title}
                </h3>

                {/* 카테고리 */}
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded">
                        {post.category}
                    </span>
                </div>

                {/* 작성자 및 날짜 */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-3">
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/?author=${post.authorNickname}`);
                        }}
                        className="hover:underline"
                    >
                        {post.authorNickname}
                    </button>
                    <span>{formatRelativeTime(post.createdAt.toDate())}</span>
                </div>

                {/* 통계 */}
                <div className="flex items-center justify-between border-t pt-3">
                    <div className="flex items-center gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                            <AiOutlineEye size={18} />
                            {formatNumber(post.views)}
                        </div>
                        <button
                            onClick={handleLike}
                            className={`flex items-center gap-1 transition-colors ${liked ? 'text-red-500' : 'hover:text-red-500'
                                }`}
                        >
                            {liked ? <AiFillHeart size={18} /> : <AiOutlineHeart size={18} />}
                            {formatNumber(likeCount)}
                        </button>
                    </div>

                    <button
                        onClick={handleBookmark}
                        className={`transition-colors ${bookmarked ? 'text-primary-600' : 'text-gray-400 hover:text-primary-600'
                            }`}
                    >
                        {bookmarked ? <BsBookmarkFill size={18} /> : <BsBookmark size={18} />}
                    </button>
                </div>
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
}