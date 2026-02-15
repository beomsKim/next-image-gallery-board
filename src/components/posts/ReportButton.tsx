'use client';

import { useState } from 'react';
import { collection, addDoc, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { FiFlag } from 'react-icons/fi';
import Modal from '@/components/common/Modal';
import Toast from '@/components/common/Toast';

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
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleReport = async () => {
        if (!user || !selectedReason) return;
        setLoading(true);
        try {
            // 중복 신고 확인
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
                status: 'pending',
                createdAt: new Date(),
            });

            setToast({ message: '신고가 접수되었습니다.', type: 'success' });
            setShowModal(false);
            setSelectedReason('');
        } catch {
            setToast({ message: '신고에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    if (!user) return null;

    return (
        <>
            <button
                onClick={() => setShowModal(true)}
                className="flex items-center gap-1.5 text-xs text-gray-400
                   hover:text-red-500 transition-colors py-1 px-2 rounded-lg hover:bg-red-50"
            >
                <FiFlag size={13} />
                신고
            </button>

            <Modal
                isOpen={showModal}
                onClose={() => { setShowModal(false); setSelectedReason(''); }}
                title="게시글 신고"
                confirmText={loading ? '접수 중...' : '신고하기'}
                cancelText="취소"
                onConfirm={handleReport}
                confirmClassName="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold disabled:opacity-50"
            >
                <div className="space-y-3">
                    <p className="text-sm text-gray-500">신고 사유를 선택해주세요.</p>
                    <div className="space-y-2">
                        {REPORT_REASONS.map((reason) => (
                            <label key={reason}
                                className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all
                  ${selectedReason === reason
                                        ? 'border-red-400 bg-red-50'
                                        : 'border-gray-200 hover:border-gray-300'}`}>
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
                </div>
            </Modal>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
}