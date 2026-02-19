import { Timestamp } from 'firebase/firestore';

export type NotificationType = 'like' | 'comment' | 'reply';

export interface Notification {
    id: string;
    userId: string;       // 알림 받는 사람
    fromUserId: string;   // 알림 발생시킨 사람
    fromNickname: string;
    type: NotificationType;
    postId: string;
    postTitle: string;
    commentContent?: string;
    isRead: boolean;
    createdAt: Timestamp | Date;
}