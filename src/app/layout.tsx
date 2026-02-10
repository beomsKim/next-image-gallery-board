import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import Header from "@/components/layout/Header";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Image Gallery Board",
  description: "Next.js 기반 이미지 갤러리 게시판 - 사진을 공유하고 소통하세요",
  keywords: ["이미지 갤러리", "게시판", "사진 공유", "Next.js"],
  authors: [{ name: "next.js gallery board" }],
  openGraph: {
    title: "Image Gallery Board",
    description: "이미지 갤러리 게시판",
    type: "website",
    locale: "ko_KR",
  },
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <AuthProvider>
          <div className="min-h-screen flex flex-col">
            <Header />
            <div className="flex-1">
              {children}
            </div>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}