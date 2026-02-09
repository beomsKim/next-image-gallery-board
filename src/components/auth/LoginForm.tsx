'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { validateEmail, validatePassword } from '@/utils/validation';
import { FcGoogle } from 'react-icons/fc';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';

export default function LoginForm() {
    const router = useRouter();
    const { signIn, signInWithGoogle } = useAuth();
    
    const [formData, setFormData] = useState({
        email: '',
        password: '',
    });
    
    const [errors, setErrors] = useState({
        email: '',
        password: '',
    });
    
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

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
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        
        // 유효성 검사
        if (!validateEmail(formData.email) || !validatePassword(formData.password)) {
            setToast({ message: '입력 정보를 확인해주세요.', type: 'error' });
            return;
        }

        setLoading(true);
        
        try {
            await signIn(formData.email, formData.password);
            setToast({ message: '로그인되었습니다.', type: 'success' });
            setTimeout(() => router.push('/'), 1000);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        setLoading(true);
        
        try {
            await signInWithGoogle();
            setToast({ message: '로그인되었습니다.', type: 'success' });
            setTimeout(() => router.push('/'), 1000);
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <div className="w-full max-w-md">
                <form onSubmit={handleSubmit} className="card">
                    <h2 className="text-2xl font-bold mb-6 text-center">로그인</h2>
                    
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
                    <div className="mb-6">
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
                    
                    {/* 로그인 버튼 */}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full btn-primary mb-4"
                    >
                        {loading ? '로그인 중...' : '로그인'}
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
                    
                    {/* Google 로그인 */}
                    <button
                        type="button"
                        onClick={handleGoogleSignIn}
                        disabled={loading}
                        className="w-full flex items-center justify-center gap-2 btn-secondary mb-4"
                    >
                        <FcGoogle size={20} />
                        Google로 로그인
                    </button>
                    
                    {/* 링크 */}
                    <div className="flex justify-between text-sm">
                        <button
                            type="button"
                            onClick={() => router.push('/signup')}
                            className="text-primary-600 hover:underline"
                        >
                        회원가입
                        </button>
                        <button
                            type="button"
                            onClick={() => router.push('/reset-password')}
                            className="text-gray-600 hover:underline"
                        >
                        비밀번호 찾기
                        </button>
                    </div>
                </form>
            </div>
            
            {loading && <Loading message="로그인 중입니다..." />}
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
}