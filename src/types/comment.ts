import { Timestamp } from 'firebase/firestore';

export interface Comment {
    id: string;
    postId: string;
    authorId: string;
    authorNickname: string;
    content: string;
    parentId?: string | null; // null이면 최상위 댓글, 있으면 답글
    replyToNickname?: string; // 답글 대상 닉네임
    likes: number;
    likedBy: string[]; // 좋아요 누른 uid 목록
    isDeleted: boolean; // 삭제된 댓글 (내용만 지우고 구조 유지)
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}