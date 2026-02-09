import LoginForm from '@/components/auth/LoginForm';

export const metadata = {
    title: '로그인 - Image Gallery Board',
};

export default function LoginPage() {
    return (
        <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
            <LoginForm />
        </main>
    );
}