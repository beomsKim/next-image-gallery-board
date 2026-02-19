'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { collection, query, where, orderBy, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notice } from '@/types/notice';
import { FiChevronLeft, FiChevronRight, FiX } from 'react-icons/fi';

export default function NoticeBanner() {
    const router = useRouter();
    const [notices, setNotices] = useState<Notice[]>([]);
    const [current, setCurrent] = useState(0);
    const [dismissed, setDismissed] = useState(false);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        // 오늘 닫기 했는지 확인
        const dismissedAt = localStorage.getItem('banner_dismissed');
        if (dismissedAt) {
            const today = new Date().toDateString();
            if (dismissedAt === today) { setDismissed(true); return; }
        }
        loadNotices();
    }, []);

    const loadNotices = async () => {
        try {
            const snap = await getDocs(
                query(
                    collection(db, 'notices'),
                    where('isPinned', '==', true),
                    orderBy('createdAt', 'desc'),
                    limit(5)
                )
            );
            const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[];
            setNotices(data);
        } catch { }
    };

    // 자동 슬라이드 (4초마다)
    const next = useCallback(() => {
        setCurrent((p) => (p + 1) % notices.length);
    }, [notices.length]);

    useEffect(() => {
        if (notices.length <= 1 || paused) return;
        const timer = setInterval(next, 4000);
        return () => clearInterval(timer);
    }, [notices.length, paused, next]);

    const handleDismiss = () => {
        localStorage.setItem('banner_dismissed', new Date().toDateString());
        setDismissed(true);
    };

    if (dismissed || notices.length === 0) return null;

    const notice = notices[current];

    return (
        <div
            className="w-full bg-gradient-to-r from-indigo-600 to-indigo-500
                 text-white relative overflow-hidden"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
        >
            <div className="max-w-7xl mx-auto px-4 h-11 flex items-center gap-2">

                {/* 타입 뱃지 */}
                <span className={`shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full
          ${notice.type === '이벤트'
                        ? 'bg-rose-400/80 text-white'
                        : 'bg-white/20 text-white'}`}>
                    {notice.type === '이벤트' ? '🎉 이벤트' : '📌 공지'}
                </span>

                {/* 제목 - 클릭 시 상세 이동 */}
                <button
                    onClick={() => router.push(`/notices/${notice.id}`)}
                    className="flex-1 text-sm font-medium truncate text-left
                     hover:underline underline-offset-2 transition-all"
                >
                    {notice.title}
                </button>

                {/* 슬라이드 컨트롤 (2개 이상일 때) */}
                {notices.length > 1 && (
                    <div className="flex items-center gap-1 shrink-0">
                        <button
                            onClick={() => setCurrent((p) => (p - 1 + notices.length) % notices.length)}
                            className="w-6 h-6 flex items-center justify-center rounded-md
                         hover:bg-white/20 transition-colors"
                        >
                            <FiChevronLeft size={14} />
                        </button>
                        <span className="text-[11px] font-medium opacity-80 min-w-[28px] text-center">
                            {current + 1}/{notices.length}
                        </span>
                        <button
                            onClick={() => setCurrent((p) => (p + 1) % notices.length)}
                            className="w-6 h-6 flex items-center justify-center rounded-md
                         hover:bg-white/20 transition-colors"
                        >
                            <FiChevronRight size={14} />
                        </button>
                    </div>
                )}

                {/* 오늘 하루 닫기 */}
                <button
                    onClick={handleDismiss}
                    className="shrink-0 flex items-center gap-1 text-[11px] opacity-70
                     hover:opacity-100 transition-opacity ml-1"
                    title="오늘 하루 닫기"
                >
                    <FiX size={14} />
                    <span className="hidden sm:inline">닫기</span>
                </button>
            </div>

            {/* 진행 바 (자동 슬라이드 시각화) */}
            {notices.length > 1 && !paused && (
                <div className="absolute bottom-0 left-0 h-0.5 bg-white/30 w-full">
                    <div
                        key={current}
                        className="h-full bg-white/70 animate-progress"
                    />
                </div>
            )}
        </div>
    );
}