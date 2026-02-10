import { Suspense } from 'react';
import Loading from '@/components/common/Loading';
import PostList from '@/components/posts/PostList';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <Suspense fallback={<Loading message="게시글을 불러오는 중..." />}>
        <PostList />
      </Suspense>
    </main>
  );
}