import Link from 'next/link';

export default function NotFound() {
    return (
        <main className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
            <div className="text-center">
                <p className="text-8xl font-black text-indigo-600 mb-4">404</p>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">페이지를 찾을 수 없어요</h1>
                <p className="text-gray-400 mb-8">요청하신 페이지가 존재하지 않거나 이동되었습니다.</p>
                <Link href="/" className="btn-primary px-8 py-3 inline-block">
                    홈으로 돌아가기
                </Link>
            </div>
        </main>
    );
}