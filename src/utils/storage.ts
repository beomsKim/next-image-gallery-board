const VIEW_PREFIX = 'viewed_post_';
const EXPIRY_HOURS = 24;

export const hasViewedPost = (postId: string): boolean => {
    try {
        const key = `${VIEW_PREFIX}${postId}`;
        const item = localStorage.getItem(key);
        if (!item) return false;
        const { expiry } = JSON.parse(item);
        if (Date.now() > expiry) {
            localStorage.removeItem(key);
            return false;
        }
        return true;
    } catch {
        return false;
    }
};

export const markPostAsViewed = (postId: string): void => {
    try {
        const key = `${VIEW_PREFIX}${postId}`;
        const expiry = Date.now() + EXPIRY_HOURS * 60 * 60 * 1000;
        localStorage.setItem(key, JSON.stringify({ expiry }));
    } catch { }
};

export const clearExpiredViews = (): void => {
    try {
        Object.keys(localStorage)
            .filter((key) => key.startsWith(VIEW_PREFIX))
            .forEach((key) => {
                const item = localStorage.getItem(key);
                if (item) {
                    const { expiry } = JSON.parse(item);
                    if (Date.now() > expiry) localStorage.removeItem(key);
                }
            });
    } catch { }
};