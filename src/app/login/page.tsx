'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FcGoogle } from 'react-icons/fc';
import { FiMail, FiLock, FiEye, FiEyeOff, FiImage } from 'react-icons/fi';
import Toast from '@/components/common/Toast';

export default function LoginPage() {
    const router = useRouter();
    const { signIn, signInWithGoogle } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            await signIn(email, password);
            router.push('/');
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleGoogle = async () => {
        try {
            await signInWithGoogle();
            router.push('/');
        } catch (err: any) {
            setToast({ message: err.message, type: 'error' });
        }
    };

    return (
        <>
            <main className="min-h-[calc(100vh-56px)] flex flex-col items-center justify-center
                       p-4 sm:p-6 bg-slate-50">
                <div className="w-full max-w-sm">
                    {/* 로고 */}
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-indigo-600 rounded-3xl flex items-center justify-center
                           mx-auto mb-4 shadow-lg">
                            <FiImage size={28} className="text-white" />
                        </div>
                        <h1 className="text-2xl font-bold text-gray-900">다시 돌아오셨군요</h1>
                        <p className="text-gray-400 text-sm mt-1">갤러리에 로그인하세요</p>
                    </div>

                    {/* 구글 로그인 */}
                    <button onClick={handleGoogle}
                        className="w-full flex items-center justify-center gap-3 py-3.5
                       bg-white border-2 border-gray-200 rounded-2xl
                       font-semibold text-gray-700 text-sm
                       hover:border-gray-300 hover:bg-gray-50
                       active:scale-[0.98] transition-all mb-4">
                        <FcGoogle size={22} />
                        Google로 계속하기
                    </button>

                    <div className="relative mb-4">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-gray-200" />
                        </div>
                        <div className="relative flex justify-center">
                            <span className="px-3 bg-slate-50 text-xs text-gray-400 font-medium">또는 이메일로</span>
                        </div>
                    </div>

                    {/* 이메일 폼 */}
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="relative">
                            <FiMail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="input-field pl-11" placeholder="이메일" required autoComplete="email" />
                        </div>
                        <div className="relative">
                            <FiLock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                            <input type={showPw ? 'text' : 'password'} value={password} onChange={(e) => setPassword(e.target.value)}
                                className="input-field pl-11 pr-12" placeholder="비밀번호" required autoComplete="current-password" />
                            <button type="button" onClick={() => setShowPw(!showPw)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                                {showPw ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                            </button>
                        </div>

                        <button type="submit" disabled={loading}
                            className="w-full btn-primary py-3.5 text-base mt-1">
                            {loading ? '로그인 중...' : '로그인'}
                        </button>
                    </form>

                    {/* 하단 링크 */}
                    <div className="mt-6 space-y-3 text-center text-sm">
                        <Link href="/reset-password" className="block text-gray-400 hover:text-gray-600 transition-colors">
                            비밀번호를 잊으셨나요?
                        </Link>
                        <p className="text-gray-500">
                            아직 계정이 없으신가요?{' '}
                            <Link href="/signup" className="text-indigo-600 font-semibold hover:text-indigo-700">
                                회원가입
                            </Link>
                        </p>
                    </div>
                </div>
            </main>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
}