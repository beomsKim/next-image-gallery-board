import PostForm from '@/components/posts/PostForm';

export const metadata = {
    title: '글쓰기 - Image Gallery Board',
};

export default function NewPostPage() {
    return (
        <main className="min-h-screen bg-gray-50 py-8">
            <PostForm />
        </main>
    );
}