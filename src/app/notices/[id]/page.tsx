'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Notice } from '@/types/notice';
import { formatDate } from '@/utils/format';
import Loading from '@/components/common/Loading';

export default function NoticeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const [notice, setNotice] = useState<Notice | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        getDoc(doc(db, 'notices', id)).then((snap) => {
            if (snap.exists()) setNotice({ id: snap.id, ...snap.data() } as Notice);
            else router.push('/notices');
            setLoading(false);
        });
    }, [id, router]);

    if (loading) return <Loading message="불러오는 중..." />;
    if (!notice) return null;

    return (
        <main className="min-h-screen bg-slate-50 pb-24 md:pb-8">
            <div className="max-w-3xl mx-auto px-4 py-6">
                <button onClick={() => router.back()}
                    className="text-sm text-gray-400 hover:text-gray-600 mb-4 flex items-center gap-1">
                    ← 목록으로
                </button>

                <div className="bg-white rounded-3xl p-6 shadow-sm border border-gray-100">
                    <div className="flex items-center gap-2 mb-3">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-bold
              ${notice.type === '공지' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}>
                            {notice.type === '공지' ? '📌 공지' : '🎉 이벤트'}
                        </span>
                        {notice.type === '이벤트' && notice.endAt && (
                            <span className="text-xs text-gray-400">
                                이벤트 기간: ~ {formatDate((notice.endAt as any)?.toDate?.() || notice.endAt)}
                            </span>
                        )}
                    </div>

                    <h1 className="text-xl font-bold text-gray-900 mb-2">{notice.title}</h1>
                    <p className="text-xs text-gray-400 mb-6">
                        {formatDate((notice.createdAt as any)?.toDate?.() || notice.createdAt)}
                    </p>

                    <div className="whitespace-pre-wrap text-gray-700 leading-relaxed border-t border-gray-100 pt-5">
                        {notice.content}
                    </div>
                </div>
            </div>
        </main>
    );
}