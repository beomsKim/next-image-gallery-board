'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types/category';

interface CategorySelectorProps {
    selectedCategory: string;
    onSelectCategory: (category: string) => void;
}

export default function CategorySelector({ selectedCategory, onSelectCategory }: CategorySelectorProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [newCategory, setNewCategory] = useState('');
    const [showInput, setShowInput] = useState(false);

    useEffect(() => { loadCategories(); }, []);

    const loadCategories = async () => {
        try {
            const snap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc')));
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[];
            data.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return a.name.localeCompare(b.name, 'ko');
            });
            setCategories(data);
            // 선택된 카테고리 없으면 "전체" 자동 선택
            if (!selectedCategory) {
                const def = data.find((c) => c.isDefault);
                if (def) onSelectCategory(def.name);
            }
        } catch (e) { console.error(e); }
    };

    const handleAddCategory = async () => {
        if (!newCategory.trim()) return;
        const id = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
        await addDoc(collection(db, 'categories'), {
            id, name: newCategory.trim(), isDefault: false, isPinned: false, postCount: 0, createdAt: new Date(),
        });
        onSelectCategory(newCategory.trim());
        setNewCategory('');
        setShowInput(false);
        loadCategories();
    };

    return (
        <div>
            <div className="flex flex-wrap gap-2 mb-3">
                {categories.map((cat) => (
                    <button key={cat.id} type="button" onClick={() => onSelectCategory(cat.name)}
                        className={`px-3 py-1.5 rounded-full text-sm transition-all
              ${selectedCategory === cat.name
                                ? 'bg-primary-600 text-white shadow-sm'
                                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                        {cat.name}
                    </button>
                ))}
                <button type="button" onClick={() => setShowInput(!showInput)}
                    className="px-3 py-1.5 rounded-full text-sm bg-dashed border-2 border-dashed border-gray-300 text-gray-500 hover:border-primary-400 hover:text-primary-600 transition-colors">
                    + 새 카테고리
                </button>
            </div>
            {showInput && (
                <div className="flex gap-2">
                    <input type="text" value={newCategory} onChange={(e) => setNewCategory(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        placeholder="카테고리 이름" className="input-field flex-1" autoFocus />
                    <button type="button" onClick={handleAddCategory} className="btn-primary shrink-0 text-sm">추가</button>
                    <button type="button" onClick={() => { setShowInput(false); setNewCategory(''); }}
                        className="btn-secondary shrink-0 text-sm">취소</button>
                </div>
            )}
        </div>
    );
}