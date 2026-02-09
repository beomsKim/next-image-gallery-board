import imageCompression from 'browser-image-compression';

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    useWebWorker?: boolean;
    fileType?: string;
}

export const compressImage = async (
    file: File,
    options: CompressionOptions = {}
): Promise<File> => {
    const defaultOptions = {
        maxSizeMB: 2, // 최대 2MB
        maxWidthOrHeight: 1200, // 최대 1200px
        useWebWorker: true,
        fileType: 'image/webp', // WebP로 변환
    };

    const compressionOptions = { ...defaultOptions, ...options };

    try {
        const compressedFile = await imageCompression(file, compressionOptions);
        return compressedFile;
    } catch (error) {
        console.error('이미지 압축 실패:', error);
        throw new Error('이미지 압축에 실패했습니다.');
    }
};

export const createThumbnail = async (file: File): Promise<File> => {
    const thumbnailOptions = {
        maxSizeMB: 0.1, // 최대 100KB
        maxWidthOrHeight: 200, // 200x200px
        useWebWorker: true,
        fileType: 'image/webp',
    };

    try {
        const thumbnail = await imageCompression(file, thumbnailOptions);
        return thumbnail;
    } catch (error) {
        console.error('썸네일 생성 실패:', error);
        throw new Error('썸네일 생성에 실패했습니다.');
    }
};

export const validateImage = (file: File): { valid: boolean; error?: string } => {
    // 파일 타입 확인
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        return {
            valid: false,
            error: '지원하지 않는 이미지 형식입니다. (JPG, PNG, WebP만 가능)',
        };
    }

    // 파일 크기 확인 (5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
        return {
            valid: false,
            error: '이미지 크기는 5MB 이하여야 합니다.',
        };
    }

    return { valid: true };
};