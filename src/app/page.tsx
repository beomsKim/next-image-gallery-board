export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4">
          Image Gallery Board
        </h1>
        <p className="text-gray-600 mb-8">
          Next.js + TypeScript + Firebase로 만든 이미지 갤러리 게시판
        </p>
        <div className="flex gap-4 justify-center">
          <button className="btn-primary">
            로그인
          </button>
          <button className="btn-secondary">
            둘러보기
          </button>
        </div>
      </div>
    </main>
  );
}