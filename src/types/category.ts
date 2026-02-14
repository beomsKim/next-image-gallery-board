import { Timestamp } from 'firebase/firestore';

export interface Category {
    id: string;
    name: string;
    isDefault: boolean;
    isPinned: boolean;
    postCount: number;
    createdAt: Timestamp | Date;
}