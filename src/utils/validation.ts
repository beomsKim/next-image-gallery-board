export const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= 6;
};

export const validateNickname = (nickname: string): boolean => {
    return nickname.length >= 2 && nickname.length <= 20;
};

export const validateTitle = (title: string): boolean => {
    return title.trim().length > 0 && title.length <= 50;
};

export const validateContent = (content: string): boolean => {
    return content.length <= 500;
};

export const validateCategory = (category: string): boolean => {
    return category.trim().length > 0;
};

export const normalizeCategory = (category: string): string => {
    return category.trim().toLowerCase().replace(/\s+/g, '');
};

export const validateImageSize = (file: File): boolean => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    return file.size <= maxSize;
};

export const validateImageCount = (count: number): boolean => {
    return count >= 1 && count <= 5;
};