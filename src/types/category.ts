export interface Category {
    id: string;
    name: string;
    postCount: number;
    isDefault: boolean;
    isPinned: boolean;
    createdAt: Date;
}