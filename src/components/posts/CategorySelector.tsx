'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types/category';

interface CategorySelectorProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
    allowNew?: boolean;
}

export default function CategorySelector({
    selectedCategory,
    onSelectCategory,
    allowNew = true,
}: CategorySelectorProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [showNewInput, setShowNewInput] = useState(false);
    const [newCategory, setNewCategory] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const q = query(collection(db, 'categories'), orderBy('name', 'asc'));
            const snapshot = await getDocs(q);
            const categoriesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Category[];
            
            setCategories(categoriesData);
            
            // 기본 카테고리가 없으면 선택
            if (!selectedCategory && categoriesData.length > 0) {
                const defaultCategory = categoriesData.find((c) => c.isDefault);
                if (defaultCategory) {
                    onSelectCategory(defaultCategory.name);
                }
            }
        } catch (error) {
            console.error('카테고리 로드 실패:', error);
        }
    };

    const handleNewCategory = () => {
        if (newCategory.trim()) {
            onSelectCategory(newCategory.trim());
            setNewCategory('');
            setShowNewInput(false);
        }
    };

    return (
        <div>
            <label className="block text-sm font-medium mb-2">
                카테고리 <span className="text-red-500">*</span>
            </label>
            
            {/* 기존 카테고리 선택 */}
            <div className="flex flex-wrap gap-2 mb-2">
                {categories.map((category) => (
                    <button
                        key={category.id}
                        type="button"
                        onClick={() => onSelectCategory(category.name)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                        selectedCategory === category.name
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                        {category.name}
                        {category.isPinned && ' 📌'}
                    </button>
                ))}
                
                {allowNew && !showNewInput && (
                    <button
                        type="button"
                        onClick={() => setShowNewInput(true)}
                        className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
                    >
                        + 새 카테고리
                    </button>
                )}
            </div>
            
            {/* 새 카테고리 입력 */}
            {showNewInput && (
                <div className="flex gap-2 mb-2">
                    <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleNewCategory()}
                        placeholder="카테고리 이름"
                        className="input-field flex-1"
                        maxLength={20}
                    />
                    <button
                        type="button"
                        onClick={handleNewCategory}
                        className="btn-primary"
                    >
                        추가
                    </button>
                    <button
                        type="button"
                        onClick={() => {
                        setShowNewInput(false);
                        setNewCategory('');
                        }}
                        className="btn-secondary"
                    >
                        취소
                    </button>
                </div>
            )}
            
            {/* 선택된 카테고리 표시 */}
            {selectedCategory && (
                <p className="text-sm text-gray-600">
                    선택된 카테고리: <span className="font-medium">{selectedCategory}</span>
                </p>
            )}
        </div>
    );
}