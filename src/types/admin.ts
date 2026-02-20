import { User } from './user';
import { Category } from './category';
import { Post } from './post';

export type AdminTab = 'users' | 'categories' | 'posts' | 'filters' | 'withdrawal' | 'reports' | 'notices';

export interface TabConfig {
    id: AdminTab;
    label: string;
}

export interface ToastMessage {
    message: string;
    type: 'success' | 'error';
}

export interface AdminTabProps {
    onToast: (toast: ToastMessage) => void;
}