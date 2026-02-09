import PostList from '@/components/posts/PostList';

export const metadata = {
  title: 'Image Gallery Board',
};

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gray-50">
      <PostList />
    </main>
  );
}