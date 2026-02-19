import type { Metadata } from 'next';
import GoogleAnalytics from '@/components/analytics/GoogleAnalytics';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/contexts/AuthContext';
import Header from '@/components/layout/Header';
import NoticeBanner from '@/components/notices/NoticeBanner';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Image Gallery Board',
  description: 'Next.js + Firebase 이미지 갤러리 게시판',
  openGraph: {
    title: 'Image Gallery Board',
    description: 'Next.js + Firebase 이미지 갤러리 게시판',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
      </head>
      <body className={inter.className}>
        <GoogleAnalytics />
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <NoticeBanner />
            <Header />
            <main className="flex-1">{children}</main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}