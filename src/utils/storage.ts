// 조회수 관리
export const hasViewedPost = (postId: string): boolean => {
    if (typeof window === 'undefined') return false;

    const key = `viewed_${postId}`;
    const viewData = localStorage.getItem(key);

    if (!viewData) return false;

    const { timestamp } = JSON.parse(viewData);
    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    // 24시간이 지났으면 만료
    if (now - timestamp > twentyFourHours) {
        localStorage.removeItem(key);
        return false;
    }

    return true;
};

export const markPostAsViewed = (postId: string): void => {
    if (typeof window === 'undefined') return;

    const key = `viewed_${postId}`;
    const viewData = {
        timestamp: Date.now(),
    };

    localStorage.setItem(key, JSON.stringify(viewData));
};

// 로컬 스토리지 정리 (만료된 항목 삭제)
export const cleanupExpiredViews = (): void => {
    if (typeof window === 'undefined') return;

    const now = Date.now();
    const twentyFourHours = 24 * 60 * 60 * 1000;

    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('viewed_')) {
            const viewData = localStorage.getItem(key);
            if (viewData) {
                const { timestamp } = JSON.parse(viewData);
                if (now - timestamp > twentyFourHours) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
};