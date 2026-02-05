export interface User {
    uid: string;
    email: string;
    nickname: string;
    isAdmin: boolean;
    createdAt: Date;
    updatedAt: Date;
    likedPosts: string[];
    bookmarkedPosts: string[];
}

export interface UserProfile extends User {
    photoURL?: string;
}