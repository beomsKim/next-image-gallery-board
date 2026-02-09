import ResetPasswordForm from '@/components/auth/ResetPasswordForm';

export const metadata = {
    title: '비밀번호 찾기 - Image Gallery Board',
};

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <ResetPasswordForm />
    </main>
  );
}