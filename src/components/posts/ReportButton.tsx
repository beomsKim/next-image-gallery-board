'use client';

import { useState } from 'react';
import { createPortal } from 'react-dom';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { FiFlag } from 'react-icons/fi';

const REPORT_REASONS = [
    '스팸/광고',
    '음란물/선정적 콘텐츠',
    '혐오/차별 발언',
    '개인정보 침해',
    '저작권 침해',
    '기타',
];

interface ReportButtonProps {
    postId: string;
    postTitle: string;
}

export default function ReportButton({ postId, postTitle }: ReportButtonProps) {
    const { user } = useAuth();
    const [showModal, setShowModal] = useState(false);
    const [selectedReason, setSelectedReason] = useState('');
    const [etcContent, setEtcContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleReport = async () => {
        if (!user || !selectedReason) return;
        if (selectedReason === '기타' && !etcContent.trim()) {
            setToast({ message: '기타 내용을 입력해주세요.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            const q = query(
                collection(db, 'reports'),
                where('postId', '==', postId),
                where('reporterId', '==', user.uid)
            );
            const existing = await getDocs(q);
            if (!existing.empty) {
                setToast({ message: '이미 신고한 게시글입니다.', type: 'error' });
                setShowModal(false);
                return;
            }

            await addDoc(collection(db, 'reports'), {
                postId,
                postTitle,
                reporterId: user.uid,
                reporterNickname: user.nickname,
                reason: selectedReason,
                etcContent: selectedReason === '기타' ? etcContent.trim() : '',
                status: 'pending',
                createdAt: new Date(),
            });

            setToast({ message: '신고가 접수되었습니다.', type: 'success' });
            setShowModal(false);
            setSelectedReason('');
            setEtcContent('');
        } catch {
            setToast({ message: '신고에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setShowModal(false);
        setSelectedReason('');
        setEtcContent('');
    };

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400
                    hover:text-red-500 transition-colors py-1.5 px-2.5 rounded-xl hover:bg-red-50"
            >
                <FiFlag size={13} />
                신고
            </button>

            {showModal && typeof window !== 'undefined' && createPortal(
                <div className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center">
                    {/* 배경 - 클릭 시 닫기 */}
                    <div
                        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* 모달 컨텐츠 */}
                    <div className="relative w-full sm:max-w-md bg-white
                        rounded-t-3xl sm:rounded-3xl shadow-2xl
                        max-h-[90vh] overflow-y-auto m-0 sm:m-4">

                        {/* X 버튼 - 모바일/데스크톱 공통 */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center
                                rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600
                                transition-colors z-10"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M12 4L4 12M4 4l8 8" />
                            </svg>
                        </button>

                        {/* 모바일 핸들 */}
                        <div className="sm:hidden flex justify-center pt-3 pb-1">
                            <div className="w-10 h-1 bg-gray-200 rounded-full" />
                        </div>

                        <div className="px-6 pt-4 pb-6">
                            <h3 className="text-lg font-bold text-gray-900 mb-1">게시글 신고</h3>
                            <p className="text-sm text-gray-400 mb-4">신고 사유를 선택해주세요.</p>

                            <div className="space-y-2 mb-4">
                                {REPORT_REASONS.map((reason) => (
                                    <label
                                        key={reason}
                                        className={`flex items-center gap-3 p-3 rounded-xl border-2
                                            cursor-pointer transition-all
                                            ${selectedReason === reason
                                            ? 'border-red-400 bg-red-50'
                                            : 'border-gray-200 hover:border-gray-300'}`}
                                    >
                                        <input
                                            type="radio"
                                            value={reason}
                                            checked={selectedReason === reason}
                                            onChange={() => setSelectedReason(reason)}
                                            className="accent-red-500"
                                        />
                                        <span className="text-sm font-medium">{reason}</span>
                                    </label>
                                ))}
                            </div>

                            {selectedReason === '기타' && (
                                <textarea
                                    value={etcContent}
                                    onChange={(e) => setEtcContent(e.target.value)}
                                    placeholder="신고 내용을 자세히 입력해주세요."
                                    rows={3}
                                    maxLength={200}
                                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl text-sm
                                        focus:outline-none focus:border-red-400 resize-none mb-4"
                                />
                            )}

                            <div className="flex gap-3">
                                <button
                                    onClick={handleClose}
                                    className="flex-1 py-3 rounded-xl border-2 border-gray-200
                                        text-gray-600 font-semibold text-sm hover:bg-gray-50 transition-all"
                                >
                                    취소
                                </button>
                                <button
                                    onClick={handleReport}
                                    disabled={!selectedReason || loading}
                                    className="flex-1 py-3 rounded-xl bg-red-600 text-white font-semibold
                                        text-sm hover:bg-red-700 transition-all
                                        disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                                >
                                    {loading ? '접수 중...' : '신고하기'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {toast && (
                <div className="fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-[10000]
                    flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg
                    text-white text-sm font-medium max-w-[90vw] bg-emerald-500">
                    {toast.message}
                </div>
            )}
        </>
    );
}