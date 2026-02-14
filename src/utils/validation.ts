export const validateEmail = (email: string): boolean => {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
};

export const validatePassword = (password: string): boolean => {
    return password.length >= 6;
};

export const validateNickname = (nickname: string): boolean => {
    return nickname.length >= 2 && nickname.length <= 20;
};

export const validateTitle = (title: string): boolean => {
    return title.trim().length >= 1 && title.trim().length <= 50;
};

export const validateContent = (content: string): boolean => {
    return content.length <= 500;
};

export const validateCategory = (category: string): boolean => {
    return category.trim().length >= 1;
};

export const normalizeCategory = (category: string): string => {
    return category.trim().toLowerCase().replace(/\s+/g, '');
};