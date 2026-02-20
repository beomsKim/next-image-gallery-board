import { useState } from 'react';
import { toggleLikeFn } from '@/lib/functions';
import { useAuth } from './useAuth';

export function usePostLike(postId: string, initialLiked: boolean, initialCount: number) {
    const { user } = useAuth();
    const [liked, setLiked] = useState(initialLiked);
    const [likeCount, setLikeCount] = useState(initialCount);

    const handleLike = async () => {
        if (!user) {
            return { error: '로그인이 필요합니다.' };
        }

        const newLiked = !liked;
        setLiked(newLiked);
        setLikeCount((p) => newLiked ? p + 1 : p - 1);

        try {
            const result = await toggleLikeFn({ postId });
            const data = result.data as { liked: boolean };
            setLiked(data.liked);

            if (data.liked) {
                user.likedPosts = [...(user.likedPosts || []), postId];
            } else {
                user.likedPosts = (user.likedPosts || []).filter((id) => id !== postId);
            }

            return { success: true };
        } catch (err: any) {
            setLiked(!newLiked);
            setLikeCount((p) => newLiked ? p - 1 : p + 1);
            return { error: err.message || '오류가 발생했습니다.' };
        }
    };

    return { liked, likeCount, handleLike };
}