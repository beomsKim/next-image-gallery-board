'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
    collection, addDoc, updateDoc, doc, getDoc,
    serverTimestamp, arrayUnion
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useImageUpload } from '@/hooks/useImageUpload';
import { getFilterWords, containsBadWord } from '@/utils/filterWords';
import { validateTitle } from '@/utils/validation';
import ImageUploader from './ImageUploader';
import CategorySelector from './CategorySelector';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';
import Loading from '@/components/common/Loading';

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
    const { images, uploading, uploadProgress, addImages, removeImage, reorderImages, uploadImages, reset } = useImageUpload();

    const [title, setTitle] = useState(initialData?.title || '');
    const [content, setContent] = useState(initialData?.content || '');
    const [category, setCategory] = useState(initialData?.category || '전체');
    const [submitting, setSubmitting] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [savedPostId, setSavedPostId] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    useEffect(() => {
        if (!user) router.push('/login');
    }, [user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;

        if (!validateTitle(title)) {
            setToast({ message: '제목을 1자 이상 50자 이하로 입력해주세요.', type: 'error' });
            return;
        }
        if (images.length === 0 && !initialData) {
            setToast({ message: '이미지를 1장 이상 업로드해주세요.', type: 'error' });
            return;
        }

        // 비속어 검사
        const { badWords } = await getFilterWords();
        if (containsBadWord(title, badWords)) {
            setToast({ message: '제목에 사용할 수 없는 단어가 포함되어 있습니다.', type: 'error' });
            return;
        }
        if (content && containsBadWord(content, badWords)) {
            setToast({ message: '내용에 사용할 수 없는 단어가 포함되어 있습니다.', type: 'error' });
            return;
        }

        setSubmitting(true);
        try {
            let imageUrls = initialData?.images || [];
            let thumbnailUrl = initialData?.images?.[0] || '';

            if (images.length > 0) {
                const tempId = postId || `temp_${Date.now()}`;
                imageUrls = await uploadImages(tempId);
                thumbnailUrl = imageUrls[0];
            }

            if (postId) {
                // 수정
                const existingDoc = await getDoc(doc(db, 'posts', postId));
                const existingHistory = existingDoc.data()?.editHistory || [];
                await updateDoc(doc(db, 'posts', postId), {
                    title: title.trim(),
                    content: content.trim(),
                    category,
                    images: imageUrls,
                    thumbnailUrl,
                    updatedAt: new Date(),
                    editHistory: [...existingHistory, { editedAt: new Date() }],
                });
                setSavedPostId(postId);
            } else {
                // 신규
                const docRef = await addDoc(collection(db, 'posts'), {
                    title: title.trim(),
                    content: content.trim(),
                    category,
                    images: imageUrls,
                    thumbnailUrl,
                    authorId: user.uid,
                    authorNickname: user.nickname,
                    views: 0,
                    likes: 0,
                    isPinned: false,
                    editHistory: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                });
                setSavedPostId(docRef.id);
            }

            setShowSuccessModal(true);
        } catch (e) {
            console.error('저장 실패:', e);
            setToast({ message: '저장에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        router.push(savedPostId ? `/posts/${savedPostId}` : '/');
    };

    if (!user) return null;

    return (
        <>
            <div className="max-w-4xl mx-auto p-4">
                <div className="card">
                    <h1 className="text-2xl font-bold mb-6">{postId ? '게시글 수정' : '글쓰기'}</h1>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* 카테고리 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">카테고리</label>
                            <CategorySelector selectedCategory={category} onSelectCategory={setCategory} />
                        </div>

                        {/* 제목 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                제목 <span className="text-red-500">*</span>
                            </label>
                            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                                className="input-field" placeholder="제목을 입력하세요 (최대 50자)" maxLength={50} />
                            <p className="text-xs text-gray-400 mt-1 text-right">{title.length}/50</p>
                        </div>

                        {/* 내용 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">내용</label>
                            <textarea value={content} onChange={(e) => setContent(e.target.value)}
                                className="input-field resize-none" rows={6}
                                placeholder="내용을 입력하세요 (선택, 최대 500자)" maxLength={500} />
                            <p className="text-xs text-gray-400 mt-1 text-right">{content.length}/500</p>
                        </div>

                        {/* 이미지 */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                이미지 <span className="text-red-500">*</span>
                            </label>
                            <ImageUploader
                                images={images}
                                onAddImages={(files) => addImages(files).catch((e) => setToast({ message: e.message, type: 'error' }))}
                                onRemoveImage={removeImage}
                                onReorderImages={reorderImages}
                            />
                        </div>

                        {/* 버튼 */}
                        <div className="flex gap-3 justify-end pt-2">
                            <button type="button" onClick={() => router.back()} className="btn-secondary">
                                취소
                            </button>
                            <button type="submit" disabled={submitting || uploading} className="btn-primary min-w-[100px]">
                                {submitting || uploading ? `업로드 중... ${uploadProgress}%` : postId ? '수정 완료' : '등록'}
                            </button>
                        </div>
                    </form>
                </div>
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            {(submitting || uploading) && <Loading message="업로드 중..." progress={uploadProgress} />}

            <Modal isOpen={showSuccessModal} onClose={handleSuccessConfirm}
                title={postId ? '수정 완료' : '등록 완료'} confirmText="확인" onConfirm={handleSuccessConfirm}>
                <p className="text-gray-700">
                    {postId ? '게시글이 수정되었습니다.' : '게시글이 등록되었습니다.'}
                </p>
            </Modal>
        </>
    );
}