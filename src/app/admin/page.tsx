'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs, doc, updateDoc, setDoc, deleteDoc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Post } from '@/types/post';
import { Category } from '@/types/category';
import { User } from '@/types/user';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

// 헬퍼 함수
const getTime = (date: Date | Timestamp): number => {
    return date instanceof Date ? date.getTime() : date.toDate().getTime();
};

// 날짜 포맷 헬퍼 함수
const formatDate = (date: Date | Timestamp | undefined): string => {
  if (!date) return '-';
  const dateObj = date instanceof Date ? date : date.toDate();
  return dateObj.toLocaleDateString('ko-KR');
};

export default function AdminPage() {
    const { user, loading: authLoading } = useAdminCheck();

    const [activeTab, setActiveTab] = useState<'users' | 'categories' | 'posts'>('users');
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [loading, setLoading] = useState(true);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // 새 관리자 추가
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [newAdminEmail, setNewAdminEmail] = useState('');

    // 카테고리 관리
    const [showCategoryModal, setShowCategoryModal] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');

    // 카테고리 삭제
    const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteAction, setDeleteAction] = useState<'move' | 'delete'>('move');

    useEffect(() => {
        if (user && user.isAdmin) {
            loadData();
        }
    }, [user, activeTab]);

    const loadData = async () => {
        setLoading(true);

        try {
            if (activeTab === 'users') {
                await loadUsers();
            } else if (activeTab === 'categories') {
                await loadCategories();
            } else if (activeTab === 'posts') {
                await loadPosts();
            }
        } catch (error) {
            console.error('데이터 로드 실패:', error);
            setToast({ message: '데이터를 불러오는데 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        const snapshot = await getDocs(collection(db, 'users'));
        const usersData = snapshot.docs.map((doc) => ({
            uid: doc.id,
            ...doc.data(),
        })) as User[];
        setUsers(usersData);
    };

    const loadCategories = async () => {
        const snapshot = await getDocs(collection(db, 'categories'));
        const categoriesData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Category[];

        // 고정 카테고리를 맨 앞으로, 그 다음은 가나다순
        categoriesData.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return a.name.localeCompare(b.name, 'ko');
        });

        setCategories(categoriesData);
    };

    const loadPosts = async () => {
        const q = query(collection(db, 'posts'));
        const snapshot = await getDocs(q);
        let postsData = snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
        })) as Post[];

        // 고정 게시글을 맨 위로
        postsData.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return getTime(b.createdAt) - getTime(a.createdAt);
        });

        setPosts(postsData);
    };
    // 관리자 추가
    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim()) {
            setToast({ message: '이메일을 입력해주세요.', type: 'error' });
            return;
        }

        try {
            // 이메일로 사용자 찾기
            const q = query(collection(db, 'users'), where('email', '==', newAdminEmail));
            const snapshot = await getDocs(q);

            if (snapshot.empty) {
                setToast({ message: '해당 이메일의 사용자를 찾을 수 없습니다.', type: 'error' });
                return;
            }

            const userDoc = snapshot.docs[0];
            await updateDoc(doc(db, 'users', userDoc.id), {
                isAdmin: true,
                updatedAt: new Date(),
            });

            setToast({ message: '관리자가 추가되었습니다.', type: 'success' });
            setNewAdminEmail('');
            setShowAddAdminModal(false);
            loadUsers();
        } catch (error) {
            console.error('관리자 추가 실패:', error);
            setToast({ message: '관리자 추가에 실패했습니다.', type: 'error' });
        }
    };

    // 관리자 제거
    const handleRemoveAdmin = async (userId: string, email: string) => {
        // 초기 관리자는 제거 불가
        const initialAdminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
        if (email === initialAdminEmail) {
            setToast({ message: '초기 관리자는 제거할 수 없습니다.', type: 'error' });
            return;
        }

        if (!confirm('정말 관리자 권한을 제거하시겠습니까?')) {
            return;
        }

        try {
            await updateDoc(doc(db, 'users', userId), {
                isAdmin: false,
                updatedAt: new Date(),
            });

            setToast({ message: '관리자 권한이 제거되었습니다.', type: 'success' });
            loadUsers();
        } catch (error) {
            console.error('관리자 제거 실패:', error);
            setToast({ message: '관리자 제거에 실패했습니다.', type: 'error' });
        }
    };

    // 카테고리 추가
    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            setToast({ message: '카테고리 이름을 입력해주세요.', type: 'error' });
            return;
        }

        try {
            const categoryId = newCategoryName.trim().toLowerCase().replace(/\s+/g, '');

            // 중복 확인
            const categoryDoc = await getDoc(doc(db, 'categories', categoryId));
            if (categoryDoc.exists()) {
                setToast({ message: '이미 존재하는 카테고리입니다.', type: 'error' });
                return;
            }

            await setDoc(doc(db, 'categories', categoryId), {
                id: categoryId,
                name: newCategoryName.trim(),
                isDefault: false,
                isPinned: false,
                postCount: 0,
                createdAt: new Date(),
            });

            setToast({ message: '카테고리가 추가되었습니다.', type: 'success' });
            setNewCategoryName('');
            setShowCategoryModal(false);
            loadCategories();
        } catch (error) {
            console.error('카테고리 추가 실패:', error);
            setToast({ message: '카테고리 추가에 실패했습니다.', type: 'error' });
        }
    };

    // 카테고리 고정/해제
    const handleTogglePinCategory = async (category: Category) => {
        // 현재 고정된 카테고리 개수 확인
        const pinnedCount = categories.filter((c) => c.isPinned).length;

        if (!category.isPinned && pinnedCount >= 3) {
            setToast({ message: '카테고리는 최대 3개까지 고정할 수 있습니다.', type: 'error' });
            return;
        }

        try {
            await updateDoc(doc(db, 'categories', category.id), {
                isPinned: !category.isPinned,
            });

            setToast({
                message: category.isPinned ? '고정이 해제되었습니다.' : '고정되었습니다.',
                type: 'success',
            });
            loadCategories();
        } catch (error) {
            console.error('카테고리 고정 실패:', error);
            setToast({ message: '작업에 실패했습니다.', type: 'error' });
        }
    };

    // 카테고리 삭제
    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;

        try {
            // 해당 카테고리의 게시글 처리
            const q = query(collection(db, 'posts'), where('category', '==', categoryToDelete.name));
            const snapshot = await getDocs(q);

            if (!snapshot.empty) {
                if (deleteAction === 'delete') {
                    // 게시글까지 모두 삭제
                    await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
                } else {
                    // "전체"로 이동
                    await Promise.all(
                        snapshot.docs.map((doc) =>
                            updateDoc(doc.ref, {
                                category: '전체',
                                updatedAt: new Date(),
                            })
                        )
                    );
                }
            }

            // 카테고리 삭제
            await deleteDoc(doc(db, 'categories', categoryToDelete.id));

            setToast({ message: '카테고리가 삭제되었습니다.', type: 'success' });
            setShowDeleteCategoryModal(false);
            setCategoryToDelete(null);
            loadCategories();
        } catch (error) {
            console.error('카테고리 삭제 실패:', error);
            setToast({ message: '카테고리 삭제에 실패했습니다.', type: 'error' });
        }
    };

    // 게시글 고정/해제
    const handleTogglePinPost = async (post: Post) => {
        const pinnedCount = posts.filter((p) => p.isPinned).length;

        if (!post.isPinned && pinnedCount >= 3) {
            setToast({ message: '게시글은 최대 3개까지 고정할 수 있습니다.', type: 'error' });
            return;
        }

        try {
            await updateDoc(doc(db, 'posts', post.id), {
                isPinned: !post.isPinned,
            });

            setToast({
                message: post.isPinned ? '고정이 해제되었습니다.' : '고정되었습니다.',
                type: 'success',
            });
            loadPosts();
        } catch (error) {
            console.error('게시글 고정 실패:', error);
            setToast({ message: '작업에 실패했습니다.', type: 'error' });
        }
    };

    if (authLoading || !user) {
        return <Loading message="로딩 중..." />;
    }

    return (
        <>
            <main className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-7xl mx-auto p-4">
                    <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>

                    {/* 탭 */}
                    <div className="flex gap-2 mb-6">
                        <button
                            onClick={() => setActiveTab('users')}
                            className={`px-6 py-3 rounded-lg transition-colors ${activeTab === 'users'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            사용자 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('categories')}
                            className={`px-6 py-3 rounded-lg transition-colors ${activeTab === 'categories'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            카테고리 관리
                        </button>
                        <button
                            onClick={() => setActiveTab('posts')}
                            className={`px-6 py-3 rounded-lg transition-colors ${activeTab === 'posts'
                                ? 'bg-primary-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100'
                                }`}
                        >
                            게시글 관리
                        </button>
                    </div>

                    {/* 컨텐츠 */}
                    {loading ? (
                        <Loading message="데이터 로드 중..." />
                    ) : (
                        <div className="card">
                            {/* 사용자 관리 */}
                            {activeTab === 'users' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold">
                                            전체 사용자 ({users.length}명)
                                        </h2>
                                        <button
                                            onClick={() => setShowAddAdminModal(true)}
                                            className="btn-primary"
                                        >
                                            관리자 추가
                                        </button>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left">이메일</th>
                                                    <th className="px-4 py-2 text-left">닉네임</th>
                                                    <th className="px-4 py-2 text-center">관리자</th>
                                                    <th className="px-4 py-2 text-center">가입일</th>
                                                    <th className="px-4 py-2 text-center">작업</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {users.map((u) => (
                                                    <tr key={u.uid} className="border-t">
                                                        <td className="px-4 py-2">{u.email}</td>
                                                        <td className="px-4 py-2">{u.nickname}</td>
                                                        <td className="px-4 py-2 text-center">
                                                            {u.isAdmin ? '✅' : '-'}
                                                        </td>
                                                        <td className="px-4 py-2 text-center text-sm text-gray-600">
                                                            {formatDate(u.createdAt)}
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            {u.isAdmin && u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                                <button
                                                                    onClick={() => handleRemoveAdmin(u.uid, u.email)}
                                                                    className="text-sm text-red-600 hover:underline"
                                                                >
                                                                    권한 제거
                                                                </button>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* 카테고리 관리 */}
                            {activeTab === 'categories' && (
                                <div>
                                    <div className="flex justify-between items-center mb-4">
                                        <h2 className="text-xl font-semibold">
                                            카테고리 목록 ({categories.length}개)
                                        </h2>
                                        <button
                                            onClick={() => setShowCategoryModal(true)}
                                            className="btn-primary"
                                        >
                                            카테고리 추가
                                        </button>
                                    </div>

                                    <div className="space-y-2">
                                        {categories.map((category) => (
                                            <div
                                                key={category.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <span className="font-medium">{category.name}</span>
                                                    {category.isDefault && (
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                                                            기본
                                                        </span>
                                                    )}
                                                    {category.isPinned && (
                                                        <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                                            📌 고정
                                                        </span>
                                                    )}
                                                    <span className="text-sm text-gray-600">
                                                        게시글 {category.postCount}개
                                                    </span>
                                                </div>

                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleTogglePinCategory(category)}
                                                        className="btn-secondary text-sm"
                                                    >
                                                        {category.isPinned ? '고정 해제' : '고정'}
                                                    </button>
                                                    {!category.isDefault && (
                                                        <button
                                                            onClick={() => {
                                                                setCategoryToDelete(category);
                                                                setShowDeleteCategoryModal(true);
                                                            }}
                                                            className="btn-secondary text-red-600 text-sm"
                                                        >
                                                            삭제
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* 게시글 관리 */}
                            {activeTab === 'posts' && (
                                <div>
                                    <h2 className="text-xl font-semibold mb-4">
                                        전체 게시글 ({posts.length}개)
                                    </h2>

                                    <div className="space-y-2">
                                        {posts.map((post) => (
                                            <div
                                                key={post.id}
                                                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                                            >
                                                <div className="flex-1">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className="font-medium">{post.title}</span>
                                                        {post.isPinned && (
                                                            <span className="text-xs bg-primary-100 text-primary-700 px-2 py-1 rounded">
                                                                📌 고정
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="text-sm text-gray-600 flex items-center gap-4">
                                                        <span>{post.category}</span>
                                                        <span>{post.authorNickname}</span>
                                                        <span>조회 {post.views}</span>
                                                        <span>좋아요 {post.likes}</span>
                                                    </div>
                                                </div>

                                                <button
                                                    onClick={() => handleTogglePinPost(post)}
                                                    className="btn-secondary text-sm"
                                                >
                                                    {post.isPinned ? '고정 해제' : '고정'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </main>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}

            {/* 관리자 추가 모달 */}
            <Modal
                isOpen={showAddAdminModal}
                onClose={() => setShowAddAdminModal(false)}
                title="관리자 추가"
                confirmText="추가"
                cancelText="취소"
                onConfirm={handleAddAdmin}
            >
                <div>
                    <label className="block text-sm font-medium mb-2">이메일</label>
                    <input
                        type="email"
                        value={newAdminEmail}
                        onChange={(e) => setNewAdminEmail(e.target.value)}
                        className="input-field"
                        placeholder="user@example.com"
                    />
                </div>
            </Modal>

            {/* 카테고리 추가 모달 */}
            <Modal
                isOpen={showCategoryModal}
                onClose={() => setShowCategoryModal(false)}
                title="카테고리 추가"
                confirmText="추가"
                cancelText="취소"
                onConfirm={handleAddCategory}
            >
                <div>
                    <label className="block text-sm font-medium mb-2">카테고리 이름</label>
                    <input
                        type="text"
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        className="input-field"
                        placeholder="카테고리 이름"
                        maxLength={20}
                    />
                </div>
            </Modal>

            {/* 카테고리 삭제 모달 */}
            <Modal
                isOpen={showDeleteCategoryModal}
                onClose={() => setShowDeleteCategoryModal(false)}
                title="카테고리 삭제"
                confirmText="삭제"
                cancelText="취소"
                onConfirm={handleDeleteCategory}
            >
                <div className="space-y-4">
                    <p className="text-gray-700">
                        <strong>{categoryToDelete?.name}</strong> 카테고리를 삭제하시겠습니까?
                    </p>
                    {categoryToDelete && categoryToDelete.postCount > 0 && (
                        <div>
                            <p className="text-sm text-gray-600 mb-2">
                                이 카테고리에 {categoryToDelete.postCount}개의 게시글이 있습니다.
                            </p>
                            <div className="space-y-2">
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="deleteAction"
                                        value="move"
                                        checked={deleteAction === 'move'}
                                        onChange={() => setDeleteAction('move')}
                                    />
                                    <span className="text-sm">게시글을 "전체"로 이동</span>
                                </label>
                                <label className="flex items-center gap-2">
                                    <input
                                        type="radio"
                                        name="deleteAction"
                                        value="delete"
                                        checked={deleteAction === 'delete'}
                                        onChange={() => setDeleteAction('delete')}
                                    />
                                    <span className="text-sm text-red-600">게시글까지 모두 삭제</span>
                                </label>
                            </div>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}