import { Timestamp } from 'firebase/firestore';
import { formatDistanceToNow, format } from 'date-fns';
import { ko } from 'date-fns/locale';

const toDate = (date: Date | Timestamp): Date => {
    return date instanceof Date ? date : date.toDate();
};

export const formatRelativeTime = (date: Date | Timestamp): string => {
    try {
        return formatDistanceToNow(toDate(date), { addSuffix: true, locale: ko });
    } catch {
        return '';
    }
};

export const formatDateTime = (date: Date | Timestamp): string => {
    try {
        return format(toDate(date), 'yyyy.MM.dd HH:mm', { locale: ko });
    } catch {
        return '';
    }
};

export const formatDate = (date: Date | Timestamp | undefined): string => {
    if (!date) return '-';
    try {
        return format(toDate(date), 'yyyy.MM.dd', { locale: ko });
    } catch {
        return '-';
    }
};

export const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return String(num);
};