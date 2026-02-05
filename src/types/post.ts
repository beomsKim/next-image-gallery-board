export interface Post {
    id: string;
    title: string;
    content: string;
    category: string;
    images: string[];
    thumbnailUrl: string;
    authorId: string;
    authorNickname: string;
    views: number;
    likes: number;
    isPinned: boolean;
    createdAt: Date;
    updatedAt: Date;
}

export interface PostFormData {
    title: string;
    content: string;
    category: string;
    images: File[];
}