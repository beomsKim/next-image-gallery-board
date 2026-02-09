'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types/category';
import { FiSearch } from 'react-icons/fi';

interface SearchBarProps {
    category: string;
    sortBy: string;
    onCategoryChange: (category: string) => void;
    onSortChange: (sort: any) => void;
    onSearch: (query: string) => void;
}

export default function SearchBar({
    category,
    sortBy,
    onCategoryChange,
    onSortChange,
    onSearch,
}: SearchBarProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchInput, setSearchInput] = useState('');

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const snapshot = await getDocs(collection(db, 'categories'));
            const categoriesData = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Category[];

            // 고정 카테고리를 맨 앞으로
            categoriesData.sort((a, b) => {
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return a.name.localeCompare(b.name, 'ko');
            });

            setCategories(categoriesData);
        } catch (error) {
            console.error('카테고리 로드 실패:', error);
        }
    };

    const handleSearch = () => {
        if (searchInput.trim()) {
            onSearch(searchInput.trim());
        }
    };

    return (
        <div className="mb-6 space-y-4">
            {/* 카테고리 */}
            <div className="flex flex-wrap gap-2">
                {categories.map((cat) => (
                    <button
                        key={cat.id}
                        onClick={() => onCategoryChange(cat.name)}
                        className={`px-4 py-2 rounded-lg transition-colors ${
                        category === cat.name
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                        }`}
                    >
                        {cat.name} {cat.isPinned && '📌'} ({cat.postCount})
                    </button>
                ))}
            </div>

            {/* 정렬 & 검색 */}
            <div className="flex flex-col md:flex-row gap-4">
                {/* 정렬 */}
                <select
                    value={sortBy}
                    onChange={(e) => onSortChange(e.target.value)}
                    className="input-field"
                >
                    <option value="latest">최신순</option>
                    <option value="oldest">과거순</option>
                    <option value="views">조회순</option>
                    <option value="my">내 글</option>
                    <option value="liked">추천</option>
                    <option value="bookmarked">북마크</option>
                </select>

                {/* 검색 */}
                <div className="flex-1 flex gap-2">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="제목 또는 카테고리로 검색"
                        className="input-field flex-1"
                    />
                    <button onClick={handleSearch} className="btn-primary">
                        <FiSearch size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
}