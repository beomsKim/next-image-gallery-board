'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { validateTitle, validateContent, validateCategory, normalizeCategory } from '@/utils/validation';
import ImageUploader from './ImageUploader';
import CategorySelector from './CategorySelector';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

interface PostFormProps {
    postId?: string;
    initialData?: {
        title: string;
        content: string;
        category: string;
        images: string[];
    };
}

export default function PostForm({ postId, initialData }: PostFormProps) {
    const router = useRouter();
    const { user } = useAuth();
    const {
        images,
        uploading,
        uploadProgress,
        addImages,
        removeImage,
        reorderImages,
        uploadImages,
        deleteImages,
        reset,
    } = useImageUpload();

    const [formData, setFormData] = useState({
        title: initialData?.title || '',
        content: initialData?.content || '',
        category: initialData?.category || '',
    });

    const [errors, setErrors] = useState({
        title: '',
        content: '',
        category: '',
        images: '',
    });

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [createdPostId, setCreatedPostId] = useState<string>('');

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData((prev) => ({ ...prev, [name]: value }));

        // 실시간 유효성 검사
        if (name === 'title') {
            setErrors((prev) => ({
                ...prev,
                title: validateTitle(value) ? '' : '제목은 1자 이상 50자 이하여야 합니다.',
            }));
        } else if (name === 'content') {
            setErrors((prev) => ({
                ...prev,
                content: validateContent(value) ? '' : '내용은 500자 이하여야 합니다.',
            }));
        }
    };

    const handleCategorySelect = (category: string) => {
        setFormData((prev) => ({ ...prev, category }));
        setErrors((prev) => ({ ...prev, category: '' }));
    };

    const handleAddImages = async (files: FileList) => {
        try {
            await addImages(files);
            setErrors((prev) => ({ ...prev, images: '' }));
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!validateTitle(formData.title)) {
            setToast({ message: '제목을 확인해주세요.', type: 'error' });
            return;
        }

        if (!validateContent(formData.content)) {
            setToast({ message: '내용을 확인해주세요.', type: 'error' });
            return;
        }

        if (!validateCategory(formData.category)) {
            setToast({ message: '카테고리를 선택해주세요.', type: 'error' });
            return;
        }

        if (images.length === 0 && !initialData) {
            setToast({ message: '이미지를 최소 1장 이상 업로드해주세요.', type: 'error' });
            return;
        }

        if (!user) {
            setToast({ message: '로그인이 필요합니다.', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            let imageUrls: string[] = initialData?.images || [];

            // 새 이미지가 있으면 업로드
            if (images.length > 0) {
                const tempPostId = postId || `temp_${Date.now()}`;
                imageUrls = await uploadImages(tempPostId);
            }

            // 카테고리 정규화
            const normalizedCategory = normalizeCategory(formData.category);

            // 게시글 데이터
            const postData = {
                title: formData.title.trim(),
                content: formData.content.trim(),
                category: formData.category,
                images: imageUrls,
                thumbnailUrl: imageUrls[0] || '/images/default-thumbnail.png',
                authorId: user.uid,
                authorNickname: user.nickname,
                views: 0,
                likes: 0,
                isPinned: false,
                updatedAt: new Date(),
            };

            if (postId) {
                // 수정
                await updateDoc(doc(db, 'posts', postId), postData);
            } else {
                // 새 글 작성
                const docRef = await addDoc(collection(db, 'posts'), {
                    ...postData,
                    createdAt: new Date(),
                });
                setCreatedPostId(docRef.id);
            }

            // 카테고리 업데이트 또는 생성
            await updateOrCreateCategory(formData.category, normalizedCategory);

            setShowSuccessModal(true);
        } catch (error: any) {
            console.error('게시글 저장 실패:', error);
            setToast({ message: error.message || '게시글 저장에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const updateOrCreateCategory = async (categoryName: string, normalizedName: string) => {
        try {
            const categoryRef = doc(db, 'categories', normalizedName);
            const categoryDoc = await getDoc(categoryRef);

            if (categoryDoc.exists()) {
                // 기존 카테고리 업데이트
                await updateDoc(categoryRef, {
                    postCount: categoryDoc.data().postCount + 1,
                });
            } else {
                // 새 카테고리 생성
                await setDoc(categoryRef, {
                    id: normalizedName,
                    name: categoryName,
                    isDefault: false,
                    isPinned: false,
                    postCount: 1,
                    createdAt: new Date(),
                });
            }
        } catch (error) {
            console.error('카테고리 업데이트 실패:', error);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        router.push(`/posts/${postId || createdPostId}`);
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="max-w-4xl mx-auto p-4">
                <div className="card">
                    <h2 className="text-2xl font-bold mb-6">
                        {postId ? '게시글 수정' : '글쓰기'}
                    </h2>

                    {/* 카테고리 */}
                    <div className="mb-6">
                        <CategorySelector
                            selectedCategory={formData.category}
                            onSelectCategory={handleCategorySelect}
                        />
                        {errors.category && (
                            <p className="text-red-500 text-sm mt-1">{errors.category}</p>
                        )}
                    </div>

                    {/* 제목 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            제목 <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            name="title"
                            value={formData.title}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="제목을 입력하세요 (최대 50자)"
                            maxLength={50}
                            required
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {formData.title.length}/50
                        </p>
                        {errors.title && (
                            <p className="text-red-500 text-sm mt-1">{errors.title}</p>
                        )}
                    </div>

                    {/* 이미지 업로드 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            이미지 {!postId && <span className="text-red-500">*</span>}
                        </label>
                        <ImageUploader
                            images={images}
                            onAddImages={handleAddImages}
                            onRemoveImage={removeImage}
                            onReorderImages={reorderImages}
                        />
                        {errors.images && (
                            <p className="text-red-500 text-sm mt-1">{errors.images}</p>
                        )}
                    </div>

                    {/* 내용 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">
                            내용 <span className="text-gray-400">(선택)</span>
                        </label>
                        <textarea
                            name="content"
                            value={formData.content}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="내용을 입력하세요 (최대 500자)"
                            rows={10}
                            maxLength={500}
                        />
                        <p className="text-sm text-gray-500 mt-1">
                            {formData.content.length}/500
                        </p>
                        {errors.content && (
                            <p className="text-red-500 text-sm mt-1">{errors.content}</p>
                        )}
                    </div>

                    {/* 버튼 */}
                    <div className="flex gap-4">
                        <button
                            type="submit"
                            disabled={loading || uploading}
                            className="flex-1 btn-primary"
                        >
                            {loading || uploading ? '저장 중...' : postId ? '수정 완료' : '글쓰기'}
                        </button>
                        <button
                            type="button"
                            onClick={() => router.back()}
                            disabled={loading || uploading}
                            className="flex-1 btn-secondary"
                        >
                            취소
                        </button>
                    </div>
                </div>
            </form>

            {(loading || uploading) && (
                <Loading
                    progress={uploading ? uploadProgress : undefined}
                    message={uploading ? '이미지 업로드 중...' : '게시글 저장 중...'}
                />
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 성공 모달 */}
            <Modal
                isOpen={showSuccessModal}
                onClose={handleSuccessConfirm}
                title={postId ? '수정 완료' : '글쓰기 완료'}
                confirmText="확인"
                onConfirm={handleSuccessConfirm}
            >
                <p className="text-gray-700">
                    {postId ? '게시글이 수정되었습니다.' : '글쓰기가 완료되었습니다.'}
                </p>
            </Modal>
        </>
    );
}