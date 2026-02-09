'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail } from '@/utils/validation';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

export default function ResetPasswordForm() {
    const router = useRouter();
    const { resetPassword } = useAuth();

    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showSuccessModal, setShowSuccessModal] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setEmail(value);
        setError(validateEmail(value) ? '' : '올바른 이메일 형식이 아닙니다.');
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateEmail(email)) {
            setToast({ message: '올바른 이메일을 입력해주세요.', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            await resetPassword(email);
            setShowSuccessModal(true);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSuccessConfirm = () => {
        setShowSuccessModal(false);
        router.push('/login');
    };

    return (
        <>
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="card">
                    <h2 className="text-2xl font-bold mb-2 text-center">비밀번호 찾기</h2>
                    <p className="text-gray-600 text-center mb-6 text-sm">
                        가입하신 이메일로 비밀번호 재설정 링크를 보내드립니다.
                    </p>

                    {/* 이메일 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">이메일</label>
                        <input
                            type="email"
                            value={email}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="example@email.com"
                            required
                        />
                        {error && (
                            <p className="text-red-500 text-sm mt-1">{error}</p>
                        )}
                    </div>

                    {/* 전송 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mb-4"
                    >
                        {loading ? '전송 중...' : '재설정 링크 전송'}
                    </button>

                    {/* 로그인 링크 */}
                    <div className="text-center text-sm">
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-gray-600 hover:underline"
                        >
                            로그인으로 돌아가기
                        </button>
                    </div>
                </form>
            </div>

            {loading && <Loading message="전송 중입니다..." />}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 성공 모달 */}
            <Modal
                isOpen={showSuccessModal}
                onClose={handleSuccessConfirm}
                title="이메일 전송 완료"
                confirmText="확인"
                onConfirm={handleSuccessConfirm}
            >
                <p className="text-gray-700">
                    비밀번호 재설정 링크가 이메일로 전송되었습니다.
                    <br />
                    <br />
                    이메일을 확인하고 비밀번호를 재설정해주세요.
                </p>
            </Modal>
        </>
    );
}