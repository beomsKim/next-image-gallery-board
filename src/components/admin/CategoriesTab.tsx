'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, doc, setDoc, getDoc, deleteDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminDeleteCategoryFn } from '@/lib/functions';
import { Category } from '@/types/category';
import { AdminTabProps } from '@/types/admin';
import Modal from '@/components/common/Modal';
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor,
    useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates,
    verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';

export default function CategoriesTab({ onToast }: AdminTabProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [loading, setLoading] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        const snap = await getDocs(collection(db, 'categories'));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[];
        data.sort((a, b) => {
            if (a.isDefault) return -1;
            if (b.isDefault) return 1;
            return (a.order ?? 999) - (b.order ?? 999);
        });
        setCategories(data);
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const id = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
        const existing = await getDoc(doc(db, 'categories', id));
        if (existing.exists()) {
            onToast({ message: '이미 존재하는 카테고리입니다.', type: 'error' });
            return;
        }
        await setDoc(doc(db, 'categories', id), {
            name: newCategoryName.trim(),
            isDefault: false,
            isPinned: false,
            postCount: 0,
            order: categories.length,
            createdAt: new Date(),
        });
        onToast({ message: '카테고리가 추가되었습니다.', type: 'success' });
        setNewCategoryName('');
        loadCategories();
    };

    const handleTogglePinCategory = async (cat: Category) => {
        await updateDoc(doc(db, 'categories', cat.id), { isPinned: !cat.isPinned });
        onToast({ message: cat.isPinned ? '고정이 해제되었습니다.' : '고정되었습니다.', type: 'success' });
        loadCategories();
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        if (categoryToDelete.isDefault) {
            onToast({ message: '기본 카테고리는 삭제할 수 없습니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const result = await adminDeleteCategoryFn({
                categoryId: categoryToDelete.id,
                categoryName: categoryToDelete.name,
            });

            const data = result.data as { deletedPosts: number };

            onToast({
                message: `카테고리와 ${data.deletedPosts}개 게시글이 삭제되었습니다.`,
                type: 'success',
            });
            setShowDeleteCategoryModal(false);
            setCategoryToDelete(null);
            loadCategories();
        } catch (err: any) {
            onToast({ message: err.message || '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleCategoryDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (!over || active.id === over.id) return;

        const oldIndex = categories.findIndex((c) => c.id === active.id);
        const newIndex = categories.findIndex((c) => c.id === over.id);
        const reordered = arrayMove(categories, oldIndex, newIndex);

        setCategories(reordered);

        try {
            const batch = writeBatch(db);
            for (let idx = 0; idx < reordered.length; idx++) {
                const cat = reordered[idx];
                const docRef = doc(db, 'categories', cat.id);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    batch.update(docRef, { order: idx });
                }
            }
            await batch.commit();
            onToast({ message: '순서가 변경되었습니다.', type: 'success' });
        } catch (err) {
            console.error('순서 변경 오류:', err);
            onToast({ message: '순서 변경에 실패했습니다.', type: 'error' });
            loadCategories();
        }
    };

    return (
        <div>
            <h2 className="text-lg font-bold mb-1">카테고리 관리</h2>
            <p className="text-xs text-gray-400 mb-4">드래그하여 순서를 변경할 수 있습니다</p>

            <div className="flex gap-2 mb-5">
                <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                    placeholder="새 카테고리 이름"
                    className="input-field flex-1 text-sm"
                />
                <button onClick={handleAddCategory} className="btn-primary shrink-0 text-sm">
                    추가
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={closestCenter}
                onDragEnd={handleCategoryDragEnd}
                modifiers={[restrictToVerticalAxis]}
            >
                <SortableContext
                    items={categories.map((c) => c.id)}
                    strategy={verticalListSortingStrategy}
                >
                    <div className="space-y-2">
                        {categories.map((cat) => (
                            <SortableCategoryItem
                                key={cat.id}
                                category={cat}
                                onTogglePin={() => handleTogglePinCategory(cat)}
                                onDelete={() => { setCategoryToDelete(cat); setShowDeleteCategoryModal(true); }}
                            />
                        ))}
                    </div>
                </SortableContext>
            </DndContext>

            <Modal
                isOpen={showDeleteCategoryModal}
                onClose={() => { setShowDeleteCategoryModal(false); setCategoryToDelete(null); }}
                title="카테고리 삭제"
                confirmText={loading ? '삭제 중...' : '삭제'}
                onConfirm={handleDeleteCategory}
                confirmClassName="bg-red-600 hover:bg-red-700"
            >
                <p className="text-sm text-gray-600">
                    <strong>{categoryToDelete?.name}</strong> 카테고리를 삭제하시겠습니까?
                </p>
                <p className="text-xs text-red-500 mt-2">
                    이 카테고리의 모든 게시글과 이미지가 함께 삭제됩니다.
                </p>
            </Modal>
        </div>
    );
}

function SortableCategoryItem({
    category,
    onTogglePin,
    onDelete,
}: {
    category: Category;
    onTogglePin: () => void;
    onDelete: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: category.id,
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="flex items-center gap-3 p-4 bg-white rounded-2xl border border-gray-200
                 hover:border-gray-300 transition-all"
        >
            {!category.isDefault && (
                <button
                    {...attributes}
                    {...listeners}
                    className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600
                     w-6 h-6 flex items-center justify-center shrink-0"
                >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <circle cx="4" cy="4" r="1.5" />
                        <circle cx="4" cy="8" r="1.5" />
                        <circle cx="4" cy="12" r="1.5" />
                        <circle cx="12" cy="4" r="1.5" />
                        <circle cx="12" cy="8" r="1.5" />
                        <circle cx="12" cy="12" r="1.5" />
                    </svg>
                </button>
            )}

            <div className="flex items-center gap-2 flex-wrap flex-1 min-w-0">
                <span className="font-semibold text-sm">{category.name}</span>
                {category.isDefault && <span className="badge badge-primary">기본</span>}
                {category.isPinned && <span className="badge badge-warning">📌 고정</span>}
                <span className="text-xs text-gray-400">({category.postCount}개)</span>
            </div>

            {!category.isDefault && (
                <div className="flex gap-2 shrink-0">
                    <button
                        onClick={onTogglePin}
                        className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg
                       hover:bg-amber-100 transition-colors font-medium"
                    >
                        {category.isPinned ? '고정 해제' : '고정'}
                    </button>
                    <button
                        onClick={onDelete}
                        className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg
                       hover:bg-red-100 transition-colors font-medium"
                    >
                        삭제
                    </button>
                </div>
            )}
        </div>
    );
}