'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { FcGoogle } from 'react-icons/fc';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

export default function SignupForm() {
    const router = useRouter();
    const { signUp, signInWithGoogle } = useAuth();

    const [formData, setFormData] = useState({
        email: '',
        password: '',
        passwordConfirm: '',
    });

    const [errors, setErrors] = useState({
        email: '',
        password: '',
        passwordConfirm: '',
    });

    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
    const [showEmailVerificationModal, setShowEmailVerificationModal] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));

        // 실시간 유효성 검사
        if (name === 'email') {
            setErrors(prev => ({
                ...prev,
                email: validateEmail(value) ? '' : '올바른 이메일 형식이 아닙니다.',
            }));
        } else if (name === 'password') {
            setErrors(prev => ({
                ...prev,
                password: validatePassword(value) ? '' : '비밀번호는 6자 이상이어야 합니다.',
            }));
        } else if (name === 'passwordConfirm') {
            setErrors(prev => ({
                ...prev,
                passwordConfirm: value === formData.password ? '' : '비밀번호가 일치하지 않습니다.',
            }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // 유효성 검사
        if (!validateEmail(formData.email)) {
            setToast({ message: '올바른 이메일을 입력해주세요.', type: 'error' });
            return;
        }

        if (!validatePassword(formData.password)) {
            setToast({ message: '비밀번호는 6자 이상이어야 합니다.', type: 'error' });
            return;
        }

        if (formData.password !== formData.passwordConfirm) {
            setToast({ message: '비밀번호가 일치하지 않습니다.', type: 'error' });
            return;
        }

        setLoading(true);

        try {
            await signUp(formData.email, formData.password);
            setShowEmailVerificationModal(true);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignUp = async () => {
        setLoading(true);

        try {
            await signInWithGoogle();
            setToast({ message: '회원가입이 완료되었습니다.', type: 'success' });
            setTimeout(() => router.push('/'), 1000);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleEmailVerificationConfirm = () => {
        setShowEmailVerificationModal(false);
        router.push('/login');
    };

    return (
        <>
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="card">
                    <h2 className="text-2xl font-bold mb-6 text-center">회원가입</h2>

                    {/* 이메일 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">이메일</label>
                        <input
                            type="email"
                            name="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="example@email.com"
                            required
                        />
                        {errors.email && (
                            <p className="text-red-500 text-sm mt-1">{errors.email}</p>
                        )}
                    </div>

                    {/* 비밀번호 */}
                    <div className="mb-4">
                        <label className="block text-sm font-medium mb-2">비밀번호</label>
                        <input
                            type="password"
                            name="password"
                            value={formData.password}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="6자 이상"
                            required
                        />
                        {errors.password && (
                            <p className="text-red-500 text-sm mt-1">{errors.password}</p>
                        )}
                    </div>

                    {/* 비밀번호 확인 */}
                    <div className="mb-6">
                        <label className="block text-sm font-medium mb-2">비밀번호 확인</label>
                        <input
                            type="password"
                            name="passwordConfirm"
                            value={formData.passwordConfirm}
                            onChange={handleChange}
                            className="input-field"
                            placeholder="비밀번호 재입력"
                            required
                        />
                        {errors.passwordConfirm && (
                            <p className="text-red-500 text-sm mt-1">{errors.passwordConfirm}</p>
                        )}
                    </div>

                    {/* 회원가입 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mb-4"
                    >
                        {loading ? '가입 중...' : '회원가입'}
                    </button>

                    {/* 구분선 */}
                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-gray-500">또는</span>
                        </div>
                    </div>

                    {/* Google 회원가입 */}
                    <button
                        type="button"
                        onClick={handleGoogleSignUp}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 btn-secondary mb-4"
                    >
                        <FcGoogle size={20} />
                        Google로 계속하기
                    </button>

                    {/* 로그인 링크 */}
                    <div className="text-center text-sm">
                        <span className="text-gray-600">이미 계정이 있으신가요? </span>
                        <button
                            type="button"
                            onClick={() => router.push('/login')}
                            className="text-primary-600 hover:underline"
                        >
                            로그인
                        </button>
                    </div>
                </form>
            </div>

            {loading && <Loading message="회원가입 중입니다..." />}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 이메일 인증 안내 모달 */}
            <Modal
                isOpen={showEmailVerificationModal}
                onClose={handleEmailVerificationConfirm}
                title="이메일 인증"
                confirmText="확인"
                onConfirm={handleEmailVerificationConfirm}
            >
                <p className="text-gray-700">
                    회원가입이 완료되었습니다!
                    <br />
                    <br />
                    이메일로 인증 링크가 발송되었습니다.
                    <br />
                    이메일을 확인하고 인증을 완료해주세요.
                </p>
            </Modal>
        </>
    );
}