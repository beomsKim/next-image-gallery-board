'use client';

import { useState } from 'react';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '@/lib/firebase';
import { compressImage, createThumbnail, validateImage } from '@/lib/imageCompression';

export interface UploadedImage {
    id: string;
    file: File;
    preview: string;
    url?: string;
    thumbnailUrl?: string;
}

export const useImageUpload = () => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    // 이미지 추가
    const addImages = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        
        // 개수 제한 (5개)
        if (images.length + fileArray.length > 5) {
            throw new Error('이미지는 최대 5장까지 업로드할 수 있습니다.');
        }

        // 유효성 검사
        for (const file of fileArray) {
            const validation = validateImage(file);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
        }

        // 이미지 미리보기 생성
        const newImages: UploadedImage[] = fileArray.map((file) => ({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
        }));

        setImages((prev) => [...prev, ...newImages]);
        return newImages;
    };

    // 이미지 제거
    const removeImage = (id: string) => {
        setImages((prev) => {
            const image = prev.find((img) => img.id === id);
            if (image) {
                URL.revokeObjectURL(image.preview);
            }
            return prev.filter((img) => img.id !== id);
        });
    };

    // 이미지 순서 변경
    const reorderImages = (startIndex: number, endIndex: number) => {
        setImages((prev) => {
            const result = Array.from(prev);
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        });
    };

    // Firebase Storage에 업로드
    const uploadImages = async (postId: string): Promise<string[]> => {
        if (images.length === 0) {
            throw new Error('업로드할 이미지가 없습니다.');
        }

        setUploading(true);
        setUploadProgress(0);

        try {
            const uploadPromises = images.map(async (image, index) => {
                // 이미지 압축
                const compressedImage = await compressImage(image.file);
                const thumbnail = await createThumbnail(image.file);

                // 원본 이미지 업로드
                const originalRef = ref(storage, `posts/${postId}/original/${image.id}.webp`);
                const originalUploadTask = uploadBytesResumable(originalRef, compressedImage);

                // 썸네일 업로드
                const thumbnailRef = ref(storage, `posts/${postId}/thumbnails/${image.id}_thumb.webp`);
                const thumbnailUploadTask = uploadBytesResumable(thumbnailRef, thumbnail);

                // 업로드 진행률 추적
                originalUploadTask.on('state_changed', (snapshot) => {
                    const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100;
                    setUploadProgress((prev) => {
                        const newProgress = (prev * index + progress) / (index + 1);
                        return Math.round(newProgress);
                    });
                });

                // 업로드 완료 대기
                await originalUploadTask;
                await thumbnailUploadTask;

                // 다운로드 URL 가져오기
                const originalUrl = await getDownloadURL(originalRef);
                const thumbnailUrl = await getDownloadURL(thumbnailRef);

                return { originalUrl, thumbnailUrl };
            });

            const results = await Promise.all(uploadPromises);
            
            setUploading(false);
            setUploadProgress(100);

            // 원본 이미지 URL만 반환
            return results.map((r) => r.originalUrl);
        } catch (error) {
            setUploading(false);
            setUploadProgress(0);
            console.error('이미지 업로드 실패:', error);
            throw new Error('이미지 업로드에 실패했습니다. 다시 시도해주세요.');
        }
    };

    // Firebase Storage에서 이미지 삭제
    const deleteImages = async (imageUrls: string[]) => {
        try {
            const deletePromises = imageUrls.map(async (url) => {
                const imageRef = ref(storage, url);
                await deleteObject(imageRef);
                
                // 썸네일도 삭제
                const thumbnailUrl = url.replace('/original/', '/thumbnails/').replace('.webp', '_thumb.webp');
                const thumbnailRef = ref(storage, thumbnailUrl);
                await deleteObject(thumbnailRef).catch(() => {
                // 썸네일이 없을 수도 있으므로 에러 무시
                });
            });

            await Promise.all(deletePromises);
        } catch (error) {
            console.error('이미지 삭제 실패:', error);
            throw new Error('이미지 삭제에 실패했습니다.');
        }
    };

    // 초기화
    const reset = () => {
        images.forEach((image) => URL.revokeObjectURL(image.preview));
        setImages([]);
        setUploadProgress(0);
    };

    return {
        images,
        uploading,
        uploadProgress,
        addImages,
        removeImage,
        reorderImages,
        uploadImages,
        deleteImages,
        reset,
    };
};