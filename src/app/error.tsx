'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Error({
    error,
    reset,
}: {
    error: Error;
    reset: () => void;
}) {
    const router = useRouter();

    useEffect(() => {
        console.error('App Error:', error);
    }, [error]);

    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center">
                <p className="text-7xl mb-4">⚠️</p>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">오류가 발생했어요</h1>
                <p className="text-gray-400 mb-8">일시적인 오류입니다. 다시 시도해주세요.</p>
                <div className="flex gap-3 justify-center">
                    <button onClick={reset} className="btn-primary px-6 py-3">
                        다시 시도
                    </button>
                    <button onClick={() => router.push('/')} className="btn-secondary px-6 py-3">
                        홈으로
                    </button>
                </div>
            </div>
        </main>
    );
}