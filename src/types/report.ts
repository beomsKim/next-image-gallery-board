import { Timestamp } from 'firebase/firestore';

export interface Report {
    id: string;
    postId: string;
    postTitle: string;
    reporterId: string;
    reporterNickname: string;
    reason: string;
    createdAt: Timestamp | Date;
    status: 'pending' | 'resolved' | 'dismissed';
}