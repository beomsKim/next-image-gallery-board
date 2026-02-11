import { Timestamp } from 'firebase/firestore';

export interface User {
    uid: string;
    email: string;
    nickname: string;
    isAdmin: boolean;
    createdAt: Timestamp | Date;
    updatedAt: Timestamp | Date;
    likedPosts: string[];
    bookmarkedPosts: string[];
}

export interface UserProfile extends User {
    photoURL?: string;
}