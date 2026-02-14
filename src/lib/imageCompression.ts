import imageCompression from 'browser-image-compression';

export const compressImage = async (file: File): Promise<File> => {
    return imageCompression(file, {
        maxSizeMB: 2,
        maxWidthOrHeight: 1200,
        useWebWorker: true,
        fileType: 'image/webp',
    });
};

export const createThumbnail = async (file: File): Promise<File> => {
    return imageCompression(file, {
        maxSizeMB: 0.1,
        maxWidthOrHeight: 200,
        useWebWorker: true,
        fileType: 'image/webp',
    });
};

export const validateImage = (file: File): { valid: boolean; error?: string } => {
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        return { valid: false, error: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP만 가능)' };
    }
    if (file.size > 5 * 1024 * 1024) {
        return { valid: false, error: '이미지 크기는 5MB 이하여야 합니다.' };
    }
    return { valid: true };
};