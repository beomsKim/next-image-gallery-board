import { useState } from 'react';
import { toggleLikeFn } from '@/lib/functions';
import { useAuth } from './useAuth';

interface UsePostLikeReturn {
    liked: boolean;
    likeCount: number;
    handleLike: () => Promise<{ success?: boolean; error?: string }>;
}

export function usePostLike(
    postId: string,
    initialLiked: boolean,
    initialCount: number
): UsePostLikeReturn {
    const { user } = useAuth();
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialCount);

    const handleLike = async () => {
        if (!user) {
            return { error: '로그인이 필요합니다.' };
        }

        // 낙관적 업데이트 (UI 먼저 변경)
        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((prev) => newLiked ? prev + 1 : prev - 1);

        try {
            // 서버에 실제 요청
            const result = await toggleLikeFn({ postId });
            const data = result.data as { liked: boolean };

            // 서버 결과로 동기화
            setLiked(data.liked);

            // user 객체의 likedPosts 배열 업데이트
            if (data.liked) {
                user.likedPosts = [...(user.likedPosts || []), postId];
            } else {
                user.likedPosts = (user.likedPosts || []).filter((id) => id !== postId);
            }

            return { success: true };
        } catch (err: any) {
            // 실패 시 롤백 (원래 상태로 되돌림)
            setLiked(!newLiked);
            setLikeCount((prev) => newLiked ? prev - 1 : prev + 1);
            return { error: err.message || '오류가 발생했습니다.' };
        }
    };

    return { liked, likeCount, handleLike };
}