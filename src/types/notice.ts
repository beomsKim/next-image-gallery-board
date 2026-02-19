import { Timestamp } from 'firebase/firestore';

export type NoticeType = '공지' | '이벤트';

export interface Notice {
    id: string;
    type: NoticeType;
    title: string;
    content: string;
    isPinned: boolean;
    startAt?: Timestamp | Date;
    endAt?: Timestamp | Date;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
}