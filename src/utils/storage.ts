const VIEW_PREFIX = 'viewed_post_';
const EXPIRY_HOURS = 24;

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