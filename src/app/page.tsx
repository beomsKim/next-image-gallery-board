import { Suspense } from 'react';
import PostList from '@/components/posts/PostList';
import Loading from '@/components/common/Loading';

export default function HomePage() {
  return (
    <Suspense fallback={<Loading message="로딩 중..." />}>
      <PostList />
    </Suspense>
  );
}