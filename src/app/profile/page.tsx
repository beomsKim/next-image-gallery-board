'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNicknameCheck } from '@/hooks/useNicknameCheck';
import { getFilterWords, isForbiddenNickname } from '@/utils/filterWords';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

const WITHDRAWAL_REASONS = [
    '더 이상 서비스를 이용하지 않아서',
    '개인정보 보호를 위해',
    '다른 계정으로 재가입 예정',
    '서비스가 불편해서',
    '콘텐츠가 마음에 들지 않아서',
    '기타',
];

export default function ProfilePage() {
    const router = useRouter();
    const { user, updateUserProfile, deleteAccount, loading: authLoading } = useAuth();
    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [withdrawalReasons, setWithdrawalReasons] = useState<string[]>([]);

    const { isChecking, isAvailable, message: nicknameMessage } = useNicknameCheck(nickname, user?.nickname);

    useEffect(() => {
        if (!authLoading && !user) router.push('/login');
        if (user) { setNickname(user.nickname); setEmail(user.email); }
    }, [user, authLoading, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user) return;
        if (nickname !== user.nickname && isAvailable === false) {
            setToast({ message: '이미 사용 중인 닉네임입니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            if (nickname !== user.nickname) {
                const { forbiddenNicknames } = await getFilterWords();
                if (isForbiddenNickname(nickname, forbiddenNicknames)) {
                    setToast({ message: '사용할 수 없는 닉네임입니다.', type: 'error' });
                    setLoading(false);
                    return;
                }
            }
            await updateUserProfile({
                nickname: nickname !== user.nickname ? nickname : undefined,
                email: email !== user.email ? email : undefined,
            });
            setToast({ message: '프로필이 수정되었습니다.', type: 'success' });
        } catch (error: any) {
            if (error.message?.includes('|info')) {
                setToast({ message: error.message.replace('|info', ''), type: 'success' });
            } else {
                setToast({ message: error.message, type: 'error' });
            }
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        try {
            await deleteAccount(withdrawalReasons);
            router.push('/');
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setShowDeleteModal(false);
        }
    };

    const toggleReason = (reason: string) => {
        setWithdrawalReasons((prev) =>
            prev.includes(reason) ? prev.filter((r) => r !== reason) : [...prev, reason]
        );
    };

    if (authLoading || !user) return <Loading message="로딩 중..." />;

    return (
        <>
            <main className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-lg mx-auto p-4">
                    <div className="card">
                        <h1 className="text-2xl font-bold mb-6">프로필 수정</h1>
                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">닉네임</label>
                                <input type="text" value={nickname} onChange={(e) => setNickname(e.target.value)}
                                    className="input-field" />
                                {nickname !== user.nickname && nicknameMessage && (
                                    <p className={`text-xs mt-1 ${isAvailable ? 'text-green-600' : 'text-red-500'}`}>
                                        {isChecking ? '확인 중...' : nicknameMessage}
                                    </p>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="input-field" />
                                {email !== user.email && (
                                    <p className="text-xs mt-1 text-amber-600">
                                        변경 시 새 이메일로 인증 링크가 발송됩니다.
                                    </p>
                                )}
                            </div>
                            <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                                {loading ? '저장 중...' : '저장'}
                            </button>
                        </form>

                        <hr className="my-8" />

                        <div>
                            <h2 className="text-lg font-semibold text-red-600 mb-2">회원 탈퇴</h2>
                            <p className="text-sm text-gray-500 mb-4">
                                탈퇴 시 작성하신 게시글의 작성자는 "탈퇴한 사용자"로 변경됩니다.
                            </p>
                            <button onClick={() => setShowDeleteModal(true)}
                                className="text-sm text-red-500 hover:text-red-700 underline">
                                회원 탈퇴하기
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)}
                title="회원 탈퇴" confirmText="탈퇴하기" cancelText="취소" onConfirm={handleDeleteAccount}
                confirmClassName="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <div className="space-y-3">
                    <p className="text-gray-700 font-medium">탈퇴 사유를 선택해주세요. (선택)</p>
                    <div className="space-y-2">
                        {WITHDRAWAL_REASONS.map((reason) => (
                            <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                                <input type="checkbox" checked={withdrawalReasons.includes(reason)}
                                    onChange={() => toggleReason(reason)}
                                    className="w-4 h-4 accent-red-500" />
                                <span className="text-sm text-gray-600 group-hover:text-gray-900">{reason}</span>
                            </label>
                        ))}
                    </div>
                    <p className="text-xs text-red-500 pt-2">⚠️ 탈퇴 후 계정 복구는 불가능합니다.</p>
                </div>
            </Modal>
        </>
    );
}