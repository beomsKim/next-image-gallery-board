'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useNicknameCheck } from '@/hooks/useNicknameCheck';
import { getFilterWords, isForbiddenNickname } from '@/utils/filterWords';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

export default function ProfilePage() {
    const router = useRouter();
    const { user, loading: authLoading, updateUserProfile, deleteAccount } = useAuth();

    const [nickname, setNickname] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const { isChecking, isAvailable, message: nicknameMessage } = useNicknameCheck(nickname, user?.nickname);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push('/login');
        } else if (user) {
            setNickname(user.nickname);
            setEmail(user.email);
        }
    }, [authLoading, user, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) return;

        // 금지 닉네임 검사
        if (nickname !== user.nickname) {
            const { forbiddenNicknames } = await getFilterWords();
            if (isForbiddenNickname(nickname, forbiddenNicknames)) {
                setToast({ message: '사용할 수 없는 닉네임입니다.', type: 'error' });
                return;
            }
        }

        // 변경사항 확인
        if (nickname === user.nickname && email === user.email) {
            setToast({ message: '변경된 정보가 없습니다.', type: 'error' });
            return;
        }

        // 닉네임 변경 시 유효성 검사
        if (nickname !== user.nickname && !isAvailable) {
            setToast({ message: '사용할 수 없는 닉네임입니다.', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            await updateUserProfile({
                nickname: nickname !== user.nickname ? nickname : undefined,
                email: email !== user.email ? email : undefined,
            });

            setToast({ message: '프로필이 수정되었습니다.', type: 'success' });

            // 이메일 변경 시 알림
            if (email !== user.email) {
                setToast({
                    message: '이메일 변경을 위한 인증 메일이 발송되었습니다.',
                    type: 'success',
                });
            }
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteAccount = async () => {
        setLoading(true);

        try {
            await deleteAccount();
            setToast({ message: '회원 탈퇴가 완료되었습니다.', type: 'success' });
            setTimeout(() => router.push('/'), 1000);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
            setShowDeleteModal(false);
        }
    };

    if (authLoading) {
        return <Loading message="로딩 중..." />;
    }

    if (!user) {
        return null;
    }

    return (
        <>
            <main className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-2xl mx-auto p-4">
                    <form onSubmit={handleSubmit} className="card">
                        <h2 className="text-2xl font-bold mb-6">프로필 수정</h2>

                        {/* 닉네임 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">닉네임</label>
                            <input
                                type="text"
                                value={nickname}
                                onChange={(e) => setNickname(e.target.value)}
                                className="input-field"
                                minLength={2}
                                maxLength={20}
                                required
                            />
                            {nickname !== user.nickname && (
                                <p
                                    className={`text-sm mt-1 ${isChecking
                                        ? 'text-gray-500'
                                        : isAvailable
                                            ? 'text-green-600'
                                            : 'text-red-600'
                                        }`}
                                >
                                    {isChecking ? '확인 중...' : nicknameMessage}
                                </p>
                            )}
                        </div>

                        {/* 이메일 */}
                        <div className="mb-6">
                            <label className="block text-sm font-medium mb-2">이메일</label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                required
                            />
                            {email !== user.email && (
                                <p className="text-sm text-orange-600 mt-1">
                                    이메일 변경 시 재인증이 필요합니다.
                                </p>
                            )}
                        </div>

                        {/* 버튼 */}
                        <div className="flex gap-4 mb-6">
                            <button
                                type="submit"
                                disabled={loading || (nickname !== user.nickname && !isAvailable)}
                                className="flex-1 btn-primary"
                            >
                                {loading ? '저장 중...' : '저장'}
                            </button>
                            <button
                                type="button"
                                onClick={() => router.back()}
                                disabled={loading}
                                className="flex-1 btn-secondary"
                            >
                                취소
                            </button>
                        </div>

                        {/* 구분선 */}
                        <div className="border-t pt-6">
                            <h3 className="text-lg font-semibold text-red-600 mb-4">위험 구역</h3>
                            <button
                                type="button"
                                onClick={() => setShowDeleteModal(true)}
                                disabled={loading}
                                className="w-full btn-secondary text-red-600 border-red-600 hover:bg-red-50"
                            >
                                회원 탈퇴
                            </button>
                        </div>
                    </form>
                </div>
            </main>

            {loading && <Loading message="처리 중..." />}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 탈퇴 확인 모달 */}
            <Modal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                title="회원 탈퇴"
                confirmText="탈퇴"
                cancelText="취소"
                onConfirm={handleDeleteAccount}
            >
                <div className="text-gray-700">
                    <p className="font-semibold mb-4">정말 탈퇴하시겠습니까?</p>
                    <p className="text-sm mb-4">
                        탈퇴 시 다음 사항이 적용됩니다:
                    </p>
                    <ul className="list-disc list-inside text-sm space-y-2 mb-4">
                        <li>계정 정보가 삭제됩니다</li>
                        <li>작성한 게시글은 "탈퇴한 사용자"로 표시됩니다</li>
                        <li>좋아요 및 북마크 정보가 삭제됩니다</li>
                        <li>이 작업은 되돌릴 수 없습니다</li>
                    </ul>

                    {/* 탈퇴 사유 (선택) */}
                    <div className="border-t pt-4">
                        <p className="text-sm font-medium mb-2">탈퇴 사유 (선택)</p>
                        <div className="space-y-2 text-sm">
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                자주 사용하지 않음
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                개인정보 보호
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                서비스 불만족
                            </label>
                            <label className="flex items-center gap-2">
                                <input type="checkbox" className="rounded" />
                                기타
                            </label>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    );
}