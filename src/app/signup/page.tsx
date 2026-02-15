'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import Toast from '@/components/common/Toast';

export default function SignupPage() {
    const router = useRouter();
    const { signUp } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordConfirm, setPasswordConfirm] = useState('');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== passwordConfirm) {
            setToast({ message: '비밀번호가 일치하지 않습니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await signUp(email, password);
            router.push('/');
        } catch (error: any) {
            setToast({ message: error.message, type: 'error' });
            setLoading(false);
        }
    };

    return (
        <>
            <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
                <div className="w-full max-w-md">
                    <div className="card">
                        <h1 className="text-2xl font-bold text-center mb-8">회원가입</h1>
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">이메일</label>
                                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                    className="input-field" placeholder="이메일을 입력하세요" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
                                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                                    className="input-field" placeholder="6자 이상 입력하세요" required />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호 확인</label>
                                <input type="password" value={passwordConfirm} onChange={(e) => setPasswordConfirm(e.target.value)}
                                    className="input-field" placeholder="비밀번호를 다시 입력하세요" required />
                            </div>
                            <button type="submit" disabled={loading} className="w-full btn-primary py-3">
                                {loading ? '가입 중...' : '회원가입'}
                            </button>
                        </form>
                        <p className="mt-6 text-center text-sm text-gray-500">
                            이미 계정이 있으신가요?{' '}
                            <Link href="/login" className="text-primary-600 hover:underline font-medium">로그인</Link>
                        </p>
                    </div>
                </div>
            </main>
            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </>
    );
}