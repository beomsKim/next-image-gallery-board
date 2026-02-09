import SignupForm from '@/components/auth/SignupForm';

export const metadata = {
    title: '회원가입 - Image Gallery Board',
};

export default function SignupPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4 bg-gray-50">
          <SignupForm />
    </main>
  );
}