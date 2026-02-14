'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Category } from '@/types/category';
import { FiSearch, FiX, FiSliders } from 'react-icons/fi';

interface SearchBarProps {
    category: string;
    sortBy: string;
    onCategoryChange: (category: string) => void;
    onSortChange: (sort: string) => void;
    onSearch: (query: string) => void;
}

const SORT_OPTIONS = [
    { value: 'latest', label: '최신순', emoji: '🕐' },
    { value: 'oldest', label: '과거순', emoji: '📅' },
    { value: 'views', label: '조회순', emoji: '👁' },
    { value: 'my', label: '내 글', emoji: '✏️' },
    { value: 'liked', label: '좋아요', emoji: '❤️' },
    { value: 'bookmarked', label: '북마크', emoji: '🔖' },
];

export default function SearchBar({ category, sortBy, onCategoryChange, onSortChange, onSearch }: SearchBarProps) {
    const [categories, setCategories] = useState<Category[]>([]);
    const [searchInput, setSearchInput] = useState('');
    const [showFilters, setShowFilters] = useState(false);

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
        } catch { }
    };

    const handleSearch = () => { if (searchInput.trim()) onSearch(searchInput.trim()); };
    const handleClear = () => { setSearchInput(''); onSearch(''); };

    return (
        <div className="mb-4 space-y-3">
            {/* 검색창 */}
            <div className="flex gap-2">
                <div className="flex-1 relative">
                    <FiSearch size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    <input
                        type="text"
                        value={searchInput}
                        onChange={(e) => setSearchInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        placeholder="제목, 카테고리 검색"
                        className="w-full pl-10 pr-10 py-3 border border-gray-200 rounded-2xl bg-white
                       focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent
                       text-[16px] placeholder-gray-400"
                    />
                    {searchInput && (
                        <button onClick={handleClear}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6
                         flex items-center justify-center rounded-full bg-gray-200
                         text-gray-500 hover:bg-gray-300 transition-colors">
                            <FiX size={13} />
                        </button>
                    )}
                </div>

                <button onClick={handleSearch}
                    className="px-5 py-3 bg-indigo-600 text-white rounded-2xl
                     hover:bg-indigo-700 active:scale-95 transition-all
                     font-semibold text-sm shrink-0">
                    검색
                </button>

                {/* 모바일 필터 토글 */}
                <button onClick={() => setShowFilters(!showFilters)}
                    className={`md:hidden w-12 h-12 flex items-center justify-center rounded-2xl
                     border-2 transition-all shrink-0
                     ${showFilters
                            ? 'bg-indigo-600 border-indigo-600 text-white'
                            : 'bg-white border-gray-200 text-gray-500'}`}>
                    <FiSliders size={18} />
                </button>
            </div>

            {/* 필터 영역 */}
            <div className={`${showFilters ? 'block' : 'hidden'} md:block space-y-2.5`}>
                {/* 카테고리 수평 스크롤 */}
                <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    {categories.map((cat) => {
                        const isActive = category === cat.name || (!category && cat.isDefault);
                        return (
                            <button key={cat.id}
                                onClick={() => onCategoryChange(cat.isDefault ? '' : cat.name === category ? '' : cat.name)}
                                className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold
                           whitespace-nowrap transition-all active:scale-95 shrink-0
                           ${isActive
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 border border-gray-200 hover:border-indigo-300'}`}>
                                {cat.name}
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold
                                 ${isActive ? 'bg-indigo-500 text-white' : 'bg-gray-100 text-gray-500'}`}>
                                    {cat.postCount}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {/* 정렬 옵션 */}
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                    {SORT_OPTIONS.map((opt) => (
                        <button key={opt.value} onClick={() => onSortChange(opt.value)}
                            className={`flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold
                         whitespace-nowrap transition-all active:scale-95 shrink-0
                         ${sortBy === opt.value
                                    ? 'bg-gray-900 text-white'
                                    : 'bg-white text-gray-600 border border-gray-200 hover:border-gray-300'}`}>
                            <span>{opt.emoji}</span>
                            {opt.label}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
}