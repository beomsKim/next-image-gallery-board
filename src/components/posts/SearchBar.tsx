'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types/category';
import { FiSearch, FiX } from 'react-icons/fi';
import { BsFilterLeft } from 'react-icons/bs';

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
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        loadCategories();
    }, []);

    const loadCategories = async () => {
        try {
            const snapshot = await getDocs(
                query(collection(db, 'categories'), orderBy('name', 'asc'))
            );
            const data = snapshot.docs.map((doc) => ({
                id: doc.id,
                ...doc.data(),
            })) as Category[];

            // 고정 카테고리 먼저, 그 다음 가나다순
            data.sort((a, b) => {
                if (a.isDefault && !b.isDefault) return -1;
                if (!a.isDefault && b.isDefault) return 1;
                if (a.isPinned && !b.isPinned) return -1;
                if (!a.isPinned && b.isPinned) return 1;
                return a.name.localeCompare(b.name, 'ko');
            });

            setCategories(data);
        } catch (error) {
            console.error('카테고리 로드 실패:', error);
        }
    };

    const handleSearch = () => {
        if (searchInput.trim()) {
            onSearch(searchInput.trim());
        }
    };

    const handleClear = () => {
        setSearchInput('');
        onSearch('');
    };

    return (
        <div className="mb-6 bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            {/* 검색창 */}
            <div className="flex gap-2 mb-3">
                <div className="flex-1 relative">
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="제목 또는 카테고리 검색"
                        className="w-full pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg 
                       focus:outline-none focus:ring-2 focus:ring-primary-500 
                       focus:border-transparent text-sm"
                    />
                    {searchInput && (
                        <button
                            onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                            <FiX size={16} />
                        </button>
                    )}
                </div>
                <button
                    onClick={handleSearch}
                    className="px-4 py-2.5 bg-primary-600 text-white rounded-lg 
                     hover:bg-primary-700 transition-colors flex items-center gap-1.5 
                     text-sm font-medium shrink-0"
                >
                    <FiSearch size={16} />
                    <span className="hidden sm:inline">검색</span>
                </button>
                {/* 모바일 필터 토글 버튼 */}
                <button
                    onClick={() => setShowFilters(!showFilters)}
                    className={`md:hidden px-3 py-2.5 rounded-lg border transition-colors shrink-0
            ${showFilters
                            ? 'bg-primary-50 border-primary-300 text-primary-600'
                            : 'border-gray-200 text-gray-600'}`}
                >
                    <BsFilterLeft size={20} />
                </button>
            </div>

            {/* 카테고리 + 정렬 (데스크톱: 항상 표시 / 모바일: 토글) */}
            <div className={`${showFilters ? 'block' : 'hidden'} md:block`}>
                {/* 카테고리 버튼 */}
                <div className="flex flex-wrap gap-1.5 mb-3">
                    {categories.map((cat) => (
                        <button
                            key={cat.id}
                            onClick={() => onCategoryChange(cat.name === category ? '' : cat.name)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${category === cat.name || (cat.isDefault && !category)
                                    ? 'bg-primary-600 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                        >
                            {cat.isPinned && !cat.isDefault && '📌 '}
                            {cat.name}
                            <span className={`ml-1 text-xs ${category === cat.name || (cat.isDefault && !category)
                                    ? 'text-primary-200'
                                    : 'text-gray-400'
                                }`}>
                                {cat.postCount}
                            </span>
                        </button>
                    ))}
                </div>

                {/* 정렬 옵션 */}
                <div className="flex flex-wrap gap-1.5">
                    {[
                        { value: 'latest', label: '최신순' },
                        { value: 'oldest', label: '과거순' },
                        { value: 'views', label: '조회순' },
                        { value: 'my', label: '내 글' },
                        { value: 'liked', label: '❤️ 좋아요' },
                        { value: 'bookmarked', label: '🔖 북마크' },
                    ].map((option) => (
                        <button
                            key={option.value}
                            onClick={() => onSortChange(option.value)}
                            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all
                ${sortBy === option.value
                                    ? 'bg-gray-800 text-white shadow-sm'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}