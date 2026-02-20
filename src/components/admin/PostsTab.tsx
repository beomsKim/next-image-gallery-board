'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, updateDoc, doc, deleteDoc, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Post } from '@/types/post';
import { AdminTabProps } from '@/types/admin';
import { formatDate } from '@/utils/format';
import Modal from '@/components/common/Modal';

export default function PostsTab({ onToast }: AdminTabProps) {
    const router = useRouter();
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(false);
    const [postSearch, setPostSearch] = useState('');
    const [showDeletePostModal, setShowDeletePostModal] = useState(false);
    const [postToDelete, setPostToDelete] = useState<Post | null>(null);

    useEffect(() => { loadPosts(); }, []);

    const loadPosts = async () => {
        const snap = await getDocs(query(collection(db, 'posts'), orderBy('createdAt', 'desc')));
        setPosts(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[]);
    };

    const handleTogglePin = async (post: Post) => {
        const pinnedPosts = posts.filter((p) => p.isPinned);
        if (!post.isPinned && pinnedPosts.length >= 3) {
            onToast({ message: '고정 게시글은 최대 3개까지 가능합니다.', type: 'error' });
            return;
        }
        await updateDoc(doc(db, 'posts', post.id), { isPinned: !post.isPinned });
        onToast({ message: post.isPinned ? '고정 해제되었습니다.' : '고정되었습니다.', type: 'success' });
        loadPosts();
    };

    const handleDeletePost = async () => {
        if (!postToDelete) return;
        setLoading(true);
        try {
            await deleteDoc(doc(db, 'posts', postToDelete.id));
            onToast({ message: '게시글이 삭제되었습니다.', type: 'success' });
            setShowDeletePostModal(false);
            setPostToDelete(null);
            loadPosts();
        } catch {
            onToast({ message: '삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // ✅ 댓글 수 일괄 업데이트 함수
    const handleUpdateCommentCount = async () => {
        if (!confirm('모든 게시글의 댓글 수를 업데이트합니다. 실행할까요?')) return;
        setLoading(true);
        try {
            const postsSnap = await getDocs(collection(db, 'posts'));
            for (const postDoc of postsSnap.docs) {
                const commentsSnap = await getDocs(
                    query(collection(db, 'comments'), where('postId', '==', postDoc.id))
                );
                await updateDoc(postDoc.ref, { commentCount: commentsSnap.size });
            }
            onToast({ message: '댓글 수가 업데이트되었습니다.', type: 'success' });
            loadPosts();
        } catch {
            onToast({ message: '업데이트에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const filteredPosts = posts.filter(
        (p) => p.title.includes(postSearch) || p.authorNickname.includes(postSearch)
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-bold flex-1">
                    게시글 관리 ({filteredPosts.length}개)
                </h2>
                <button
                    onClick={handleUpdateCommentCount}
                    className="btn-secondary text-xs px-3 py-2"
                >
                    댓글 수 일괄 업데이트
                </button>
            </div>

            <input
                type="text"
                value={postSearch}
                onChange={(e) => setPostSearch(e.target.value)}
                placeholder="🔍 제목 또는 작성자 검색"
                className="input-field mb-4 text-sm"
            />

            {/* 모바일 카드 */}
            <div className="block sm:hidden space-y-3">
                {filteredPosts.map((post) => (
                    <div key={post.id} className="card p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0 flex-1">
                                <p className="font-semibold text-sm truncate">{post.title}</p>
                                <p className="text-xs text-gray-400 mt-0.5">
                                    {post.authorNickname} · {post.category}
                                </p>
                            </div>
                            {post.isPinned && (
                                <span className="badge badge-warning shrink-0 ml-2">📌 고정</span>
                            )}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            조회 {post.views} · 좋아요 {post.likes}
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => router.push(`/posts/${post.id}`)}
                                className="flex-1 text-xs bg-gray-100 text-gray-600 px-3 py-2 rounded-lg">
                                보기
                            </button>
                            <button
                                onClick={() => handleTogglePin(post)}
                                className="flex-1 text-xs bg-amber-50 text-amber-600 px-3 py-2 rounded-lg">
                                {post.isPinned ? '고정 해제' : '고정'}
                            </button>
                            <button
                                onClick={() => { setPostToDelete(post); setShowDeletePostModal(true); }}
                                className="flex-1 text-xs bg-red-50 text-red-500 px-3 py-2 rounded-lg">
                                삭제
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left rounded-l-xl">제목</th>
                            <th className="px-4 py-3 text-left">작성자</th>
                            <th className="px-4 py-3 text-left">카테고리</th>
                            <th className="px-4 py-3 text-center">조회</th>
                            <th className="px-4 py-3 text-center">좋아요</th>
                            <th className="px-4 py-3 text-center">고정</th>
                            <th className="px-4 py-3 text-center rounded-r-xl">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredPosts.map((post) => (
                            <tr key={post.id} className="hover:bg-gray-50">
                                <td className="px-4 py-3 max-w-[200px] truncate text-xs font-medium">
                                    {post.title}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-500">{post.authorNickname}</td>
                                <td className="px-4 py-3 text-xs">{post.category}</td>
                                <td className="px-4 py-3 text-center text-xs">{post.views}</td>
                                <td className="px-4 py-3 text-center text-xs">{post.likes}</td>
                                <td className="px-4 py-3 text-center">
                                    {post.isPinned && <span className="badge badge-warning">📌</span>}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <div className="flex justify-center gap-2">
                                        <button
                                            onClick={() => router.push(`/posts/${post.id}`)}
                                            className="text-xs text-indigo-500 hover:underline">
                                            보기
                                        </button>
                                        <button
                                            onClick={() => handleTogglePin(post)}
                                            className="text-xs text-amber-600 hover:underline">
                                            {post.isPinned ? '고정해제' : '고정'}
                                        </button>
                                        <button
                                            onClick={() => { setPostToDelete(post); setShowDeletePostModal(true); }}
                                            className="text-xs text-red-500 hover:underline">
                                            삭제
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <Modal
                isOpen={showDeletePostModal}
                onClose={() => { setShowDeletePostModal(false); setPostToDelete(null); }}
                title="게시글 삭제"
                confirmText={loading ? '삭제 중...' : '삭제'}
                onConfirm={handleDeletePost}
                confirmClassName="bg-red-600 hover:bg-red-700"
            >
                <p className="text-sm text-gray-600">
                    <strong>{postToDelete?.title}</strong> 게시글을 삭제하시겠습니까?
                </p>
            </Modal>
        </div>
    );
}