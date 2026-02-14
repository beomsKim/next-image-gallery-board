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
}

export const useImageUpload = () => {
    const [images, setImages] = useState<UploadedImage[]>([]);
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);

    const addImages = async (files: FileList | File[]) => {
        const fileArray = Array.from(files);
        if (images.length + fileArray.length > 5) {
            throw new Error('이미지는 최대 5장까지 업로드할 수 있습니다.');
        }
        for (const file of fileArray) {
            const v = validateImage(file);
            if (!v.valid) throw new Error(v.error);
        }
        const newImages: UploadedImage[] = fileArray.map((file) => ({
            id: `${Date.now()}-${Math.random()}`,
            file,
            preview: URL.createObjectURL(file),
        }));
        setImages((prev) => [...prev, ...newImages]);
        return newImages;
    };

    const removeImage = (id: string) => {
        setImages((prev) => {
            const img = prev.find((i) => i.id === id);
            if (img) URL.revokeObjectURL(img.preview);
            return prev.filter((i) => i.id !== id);
        });
    };

    const reorderImages = (startIndex: number, endIndex: number) => {
        setImages((prev) => {
            const result = [...prev];
            const [removed] = result.splice(startIndex, 1);
            result.splice(endIndex, 0, removed);
            return result;
        });
    };

    const uploadImages = async (postId: string): Promise<string[]> => {
        setUploading(true);
        setUploadProgress(0);
        try {
            const results = await Promise.all(
                images.map(async (image, index) => {
                    const compressed = await compressImage(image.file);
                    const thumbFile = await createThumbnail(image.file);
                    const origRef = ref(storage, `posts/${postId}/original/${image.id}.webp`);
                    const thumbRef = ref(storage, `posts/${postId}/thumbnails/${image.id}_thumb.webp`);
                    const task = uploadBytesResumable(origRef, compressed);
                    task.on('state_changed', (snap) => {
                        const p = (snap.bytesTransferred / snap.totalBytes) * 100;
                        setUploadProgress(Math.round((index * 100 + p) / images.length));
                    });
                    await task;
                    await uploadBytesResumable(thumbRef, thumbFile);
                    return getDownloadURL(origRef);
                })
            );
            setUploading(false);
            setUploadProgress(100);
            return results;
        } catch (error) {
            setUploading(false);
            setUploadProgress(0);
            throw new Error('이미지 업로드에 실패했습니다.');
        }
    };

    const deleteImages = async (imageUrls: string[]) => {
        await Promise.all(
            imageUrls.map(async (url) => {
                try { await deleteObject(ref(storage, url)); } catch { }
            })
        );
    };

    const reset = () => {
        images.forEach((img) => URL.revokeObjectURL(img.preview));
        setImages([]);
        setUploadProgress(0);
    };

    return { images, uploading, uploadProgress, addImages, removeImage, reorderImages, uploadImages, deleteImages, reset };
};