'use client';

import { useState, useEffect } from 'react';
import { collection, query, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notice } from '@/types/notice';
import { formatDate } from '@/utils/format';
import { useRouter } from 'next/navigation';
import Loading from '@/components/common/Loading';

export default function NoticesPage() {
    const router = useRouter();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [activeType, setActiveType] = useState<'전체' | '공지' | '이벤트'>('전체');
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadNotices(); }, []);

    const loadNotices = async () => {
        try {
            const snap = await getDocs(
                query(collection(db, 'notices'), orderBy('isPinned', 'desc'), orderBy('createdAt', 'desc'))
            );
            setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[]);
        } finally {
            setLoading(false);
        }
    };

    const filtered = notices.filter((n) => activeType === '전체' || n.type === activeType);

    return (
        <main className="min-h-screen bg-slate-50 pb-24 md:pb-8">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-5">📢 공지 · 이벤트</h1>

                {/* 타입 필터 탭 */}
                <div className="flex bg-white rounded-2xl p-1 gap-1 mb-5 shadow-sm border border-gray-100">
                    {(['전체', '공지', '이벤트'] as const).map((type) => (
                        <button key={type} onClick={() => setActiveType(type)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all
                ${activeType === type ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                            {type === '공지' ? '📌 공지' : type === '이벤트' ? '🎉 이벤트' : '전체'}
                        </button>
                    ))}
                </div>

                {loading ? (
                    <Loading message="불러오는 중..." fullscreen={false} />
                ) : filtered.length === 0 ? (
                    <div className="text-center py-16">
                        <p className="text-4xl mb-3">📭</p>
                        <p className="text-gray-400">등록된 항목이 없습니다.</p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map((notice) => (
                            <button key={notice.id}
                                onClick={() => router.push(`/notices/${notice.id}`)}
                                className="w-full bg-white rounded-2xl p-4 border border-gray-100
                           hover:border-indigo-200 hover:shadow-sm transition-all text-left group">
                                <div className="flex items-start gap-3">
                                    <div className="flex flex-col gap-1 min-w-0 flex-1">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {notice.isPinned && (
                                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-bold shrink-0">
                                                    📌 고정
                                                </span>
                                            )}
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold shrink-0
                        ${notice.type === '공지' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                                                {notice.type === '공지' ? '📌 공지' : '🎉 이벤트'}
                                            </span>
                                            {notice.type === '이벤트' && notice.endAt && (
                                                <span className="text-[10px] text-gray-400">
                                                    ~ {formatDate(
                                                        (notice.endAt as any)?.toDate?.() || notice.endAt
                                                    )} 까지
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition-colors">
                                            {notice.title}
                                        </h3>
                                        <p className="text-xs text-gray-400">
                                            {formatDate((notice.createdAt as any)?.toDate?.() || notice.createdAt)}
                                        </p>
                                    </div>
                                    <span className="text-gray-300 group-hover:text-indigo-400 transition-colors shrink-0">›</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </main>
    );
}