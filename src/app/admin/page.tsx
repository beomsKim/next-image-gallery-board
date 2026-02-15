'use client';

import { useState, useEffect } from 'react';
import {
    collection, query, getDocs, doc, updateDoc, setDoc,
    deleteDoc, getDoc, where, orderBy, Timestamp
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
import { adminCreateUserFn, adminDeleteUserFn } from '@/lib/functions';
import { useAdminCheck } from '@/hooks/useAdminCheck';
import { Post } from '@/types/post';
import { Category } from '@/types/category';
import { User } from '@/types/user';
import { addFilterWord, removeFilterWord, getFilterWords } from '@/utils/filterWords';
import { formatDate } from '@/utils/format';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import Modal from '@/components/common/Modal';

type AdminTab = 'users' | 'categories' | 'posts' | 'filters' | 'withdrawal';

const getTime = (date: Date | Timestamp): number =>
    date instanceof Date ? date.getTime() : date.toDate().getTime();

export default function AdminPage() {
    const { user, loading: authLoading } = useAdminCheck();

    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // 데이터
    const [users, setUsers] = useState<User[]>([]);
    const [categories, setCategories] = useState<Category[]>([]);
    const [posts, setPosts] = useState<Post[]>([]);
    const [badWords, setBadWords] = useState<string[]>([]);
    const [forbiddenNicknames, setForbiddenNicknames] = useState<string[]>([]);
    const [withdrawalReasons, setWithdrawalReasons] = useState<any[]>([]);

    // 입력값
    const [newAdminEmail, setNewAdminEmail] = useState('');
    const [newCategoryName, setNewCategoryName] = useState('');
    const [newBadWord, setNewBadWord] = useState('');
    const [newForbiddenNickname, setNewForbiddenNickname] = useState('');

    // 회원 가입 입력값
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserNickname, setNewUserNickname] = useState('');

    // 모달
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
    const [userToDelete, setUserToDelete] = useState<User | null>(null);
    const [deleteUserAction, setDeleteUserAction] = useState<'keep' | 'delete'>('keep');
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteAction, setDeleteAction] = useState<'move' | 'delete'>('move');

    // 유저 검색
    const [userSearch, setUserSearch] = useState('');

    // 게시글 검색
    const [postSearch, setPostSearch] = useState('');

    useEffect(() => {
        if (!authLoading && user?.isAdmin) loadData();
    }, [user, authLoading, activeTab]);

    const loadData = async () => {
        setLoading(true);
        try {
            if (activeTab === 'users') await loadUsers();
            else if (activeTab === 'categories') await loadCategories();
            else if (activeTab === 'posts') await loadPosts();
            else if (activeTab === 'filters') await loadFilters();
            else if (activeTab === 'withdrawal') await loadWithdrawalReasons();
        } finally {
            setLoading(false);
        }
    };

    const loadUsers = async () => {
        const snap = await getDocs(collection(db, 'users'));
        const data = snap.docs.map((d) => ({ ...d.data() } as User));
        data.sort((a, b) => getTime(b.createdAt) - getTime(a.createdAt));
        setUsers(data);
    };

    const loadCategories = async () => {
        const snap = await getDocs(query(collection(db, 'categories'), orderBy('name', 'asc')));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Category[];
        data.sort((a, b) => {
            if (a.isDefault && !b.isDefault) return -1;
            if (!a.isDefault && b.isDefault) return 1;
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return a.name.localeCompare(b.name, 'ko');
        });
        setCategories(data);
    };

    const loadPosts = async () => {
        const snap = await getDocs(collection(db, 'posts'));
        const data = snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Post[];
        data.sort((a, b) => {
            if (a.isPinned && !b.isPinned) return -1;
            if (!a.isPinned && b.isPinned) return 1;
            return getTime(b.createdAt) - getTime(a.createdAt);
        });
        setPosts(data);
    };

    const loadFilters = async () => {
        const { badWords, forbiddenNicknames } = await getFilterWords();
        setBadWords(badWords);
        setForbiddenNicknames(forbiddenNicknames);
    };

    const loadWithdrawalReasons = async () => {
        const snap = await getDocs(
            query(collection(db, 'withdrawal_reasons'), orderBy('deletedAt', 'desc'))
        );
        setWithdrawalReasons(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    };

    // 관리자 추가
    const handleAddAdmin = async () => {
        if (!newAdminEmail.trim()) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), where('email', '==', newAdminEmail.trim()));
            const snap = await getDocs(q);
            if (snap.empty) {
                setToast({ message: '해당 이메일의 사용자를 찾을 수 없습니다.', type: 'error' });
                return;
            }
            await updateDoc(snap.docs[0].ref, { isAdmin: true });
            setToast({ message: '관리자 권한이 추가되었습니다.', type: 'success' });
            setNewAdminEmail('');
            setShowAddAdminModal(false);
            loadUsers();
        } catch {
            setToast({ message: '관리자 추가에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleRemoveAdmin = async (uid: string, email: string) => {
        if (email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            setToast({ message: '초기 관리자 권한은 제거할 수 없습니다.', type: 'error' });
            return;
        }
        await updateDoc(doc(db, 'users', uid), { isAdmin: false });
        setToast({ message: '관리자 권한이 제거되었습니다.', type: 'success' });
        loadUsers();
    };

    const handleAddUser = async () => {
        if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserNickname.trim()) {
            setToast({ message: '모든 항목을 입력해주세요.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await adminCreateUserFn({
                email: newUserEmail.trim(),
                password: newUserPassword.trim(),
                nickname: newUserNickname.trim(),
            });
            setToast({ message: '회원이 생성되었습니다.', type: 'success' });
            setNewUserEmail('');
            setNewUserPassword('');
            setNewUserNickname('');
            setShowAddUserModal(false);
            loadUsers();
        } catch (err: any) {
            const msg: Record<string, string> = {
                'already-exists': '이미 사용 중인 닉네임 또는 이메일입니다.',
                'invalid-argument': '입력값을 확인해주세요.',
                'permission-denied': '관리자 권한이 필요합니다.',
                'unauthenticated': '로그인이 필요합니다.',
            };
            setToast({ message: msg[err.code] || err.message || '생성에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    // 회원 강제 탈퇴
    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        if (userToDelete.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            setToast({ message: '초기 관리자는 탈퇴시킬 수 없습니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await adminDeleteUserFn({
                userId: userToDelete.uid,
                userEmail: userToDelete.email,
                userNickname: userToDelete.nickname,
            });
            setToast({ message: '탈퇴 처리가 완료되었습니다.', type: 'success' });
            setShowDeleteUserModal(false);
            setUserToDelete(null);
            loadUsers();
        } catch (err: any) {
            setToast({ message: err.message || '탈퇴 처리에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) return;
        const id = newCategoryName.trim().toLowerCase().replace(/\s+/g, '-');
        const existing = await getDoc(doc(db, 'categories', id));
        if (existing.exists()) {
            setToast({ message: '이미 존재하는 카테고리입니다.', type: 'error' });
            return;
        }
        await setDoc(doc(db, 'categories', id), {
            name: newCategoryName.trim(), isDefault: false,
            isPinned: false, postCount: 0, createdAt: new Date(),
        });
        setToast({ message: '카테고리가 추가되었습니다.', type: 'success' });
        setNewCategoryName('');
        loadCategories();
    };

    const handleTogglePinCategory = async (cat: Category) => {
        const pinnedCount = categories.filter((c) => c.isPinned && !c.isDefault).length;
        if (!cat.isPinned && pinnedCount >= 3) {
            setToast({ message: '고정 카테고리는 최대 3개까지만 가능합니다.', type: 'error' });
            return;
        }
        await updateDoc(doc(db, 'categories', cat.id), { isPinned: !cat.isPinned });
        loadCategories();
    };

    const handleDeleteCategory = async () => {
        if (!categoryToDelete) return;
        setLoading(true);
        try {
            const q = query(collection(db, 'posts'), where('category', '==', categoryToDelete.name));
            const snap = await getDocs(q);
            if (!snap.empty) {
                if (deleteAction === 'delete') {
                    await Promise.all(snap.docs.map(async (postDoc) => {
                        const postData = postDoc.data();
                        if (postData.images?.length) {
                            await Promise.all(postData.images.map(async (url: string) => {
                                try { await deleteObject(ref(storage, url)); } catch { }
                            }));
                        }
                        await deleteDoc(postDoc.ref);
                    }));
                } else {
                    await Promise.all(snap.docs.map((d) =>
                        updateDoc(d.ref, { category: '전체', updatedAt: new Date() })
                    ));
                    const defaultRef = doc(db, 'categories', '전체');
                    const defaultDoc = await getDoc(defaultRef);
                    if (defaultDoc.exists()) {
                        await updateDoc(defaultRef, { postCount: defaultDoc.data().postCount + snap.size });
                    }
                }
            }
            await deleteDoc(doc(db, 'categories', categoryToDelete.id));
            setToast({ message: '카테고리가 삭제되었습니다.', type: 'success' });
            setShowDeleteCategoryModal(false);
            setCategoryToDelete(null);
            loadCategories();
        } catch {
            setToast({ message: '카테고리 삭제에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleTogglePinPost = async (post: Post) => {
        const pinnedCount = posts.filter((p) => p.isPinned).length;
        if (!post.isPinned && pinnedCount >= 3) {
            setToast({ message: '고정 게시글은 최대 3개까지만 가능합니다.', type: 'error' });
            return;
        }
        await updateDoc(doc(db, 'posts', post.id), { isPinned: !post.isPinned });
        loadPosts();
    };

    const handleDeletePost = async (post: Post) => {
        if (!confirm(`"${post.title}" 게시글을 삭제하시겠습니까?`)) return;
        try {
            if (post.images?.length) {
                await Promise.all(post.images.map(async (url) => {
                    try { await deleteObject(ref(storage, url)); } catch { }
                }));
            }
            await deleteDoc(doc(db, 'posts', post.id));
            setToast({ message: '게시글이 삭제되었습니다.', type: 'success' });
            loadPosts();
        } catch {
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        }
    };

    const deleteWithdrawalRecord = async (id: string) => {
        await deleteDoc(doc(db, 'withdrawal_reasons', id));
        setToast({ message: '기록이 삭제되었습니다.', type: 'success' });
        loadWithdrawalReasons();
    };

    if (authLoading) return <Loading message="로딩 중..." />;
    if (!user?.isAdmin) return null;

    const tabs: { id: AdminTab; label: string }[] = [
        { id: 'users', label: '👥 사용자' },
        { id: 'categories', label: '🏷 카테고리' },
        { id: 'posts', label: '📝 게시글' },
        { id: 'filters', label: '🚫 필터' },
        { id: 'withdrawal', label: '📋 탈퇴사유' },
    ];

    // 검색 필터
    const filteredUsers = users.filter((u) =>
        u.email.includes(userSearch) || u.nickname.includes(userSearch)
    );
    const filteredPosts = posts.filter((p) =>
        p.title.includes(postSearch) || p.authorNickname.includes(postSearch)
    );

    return (
        <>
            <main className="min-h-screen bg-slate-50 pb-8">
                <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6">
                    <h1 className="text-2xl font-bold mb-5">관리자 페이지</h1>

                    {/* 탭 */}
                    <div className="flex gap-1.5 mb-5 overflow-x-auto pb-1 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`px-4 py-2.5 rounded-xl transition-all whitespace-nowrap font-semibold text-sm shrink-0 active:scale-95
                  ${activeTab === tab.id
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white text-gray-600 hover:bg-gray-100 border border-gray-200'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">

                        {/* 사용자 관리 */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                    <h2 className="text-lg font-bold flex-1">사용자 ({users.length}명)</h2>
                                    <div className="flex gap-2">
                                        <button onClick={() => setShowAddAdminModal(true)}
                                            className="btn-secondary text-sm py-2 flex-1 sm:flex-none">
                                            관리자 추가
                                        </button>
                                        <button onClick={() => setShowAddUserModal(true)}
                                            className="btn-primary text-sm py-2 flex-1 sm:flex-none">
                                            + 회원 추가
                                        </button>
                                    </div>
                                </div>

                                {/* 검색 */}
                                <input type="text" value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
                                    placeholder="이메일 또는 닉네임 검색"
                                    className="input-field mb-4 text-sm" />

                                {/* 모바일: 카드형 / 데스크톱: 테이블 */}
                                <div className="block sm:hidden space-y-3">
                                    {filteredUsers.map((u) => (
                                        <div key={u.uid}
                                            className="border border-gray-100 rounded-2xl p-4 space-y-2">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <span className="font-semibold text-gray-900 text-sm">{u.nickname}</span>
                                                        {u.isAdmin && (
                                                            <span className="text-[10px] bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-bold">
                                                                관리자
                                                            </span>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-gray-400 truncate mt-0.5">{u.email}</p>
                                                    <p className="text-xs text-gray-300 mt-0.5">가입: {formatDate(u.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-1 border-t border-gray-50">
                                                {u.isAdmin && u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                    <button onClick={() => handleRemoveAdmin(u.uid, u.email)}
                                                        className="text-xs text-orange-500 bg-orange-50 px-3 py-1.5 rounded-lg hover:bg-orange-100 transition-colors font-medium">
                                                        관리자 해제
                                                    </button>
                                                )}
                                                {u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                    <button onClick={() => { setUserToDelete(u); setShowDeleteUserModal(true); }}
                                                        className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium">
                                                        강제 탈퇴
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 데스크톱: 테이블 */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-xs">
                                            <tr>
                                                <th className="px-4 py-3 text-left rounded-l-xl">이메일</th>
                                                <th className="px-4 py-3 text-left">닉네임</th>
                                                <th className="px-4 py-3 text-center">관리자</th>
                                                <th className="px-4 py-3 text-center">가입일</th>
                                                <th className="px-4 py-3 text-center rounded-r-xl">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredUsers.map((u) => (
                                                <tr key={u.uid} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-gray-600 text-xs max-w-[200px] truncate">{u.email}</td>
                                                    <td className="px-4 py-3 font-medium">{u.nickname}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {u.isAdmin
                                                            ? <span className="badge-primary">관리자</span>
                                                            : <span className="text-gray-300">-</span>}
                                                    </td>
                                                    <td className="px-4 py-3 text-center text-gray-400 text-xs">{formatDate(u.createdAt)}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-2">
                                                            {u.isAdmin && u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                                <button onClick={() => handleRemoveAdmin(u.uid, u.email)}
                                                                    className="text-xs text-orange-500 hover:underline">관리자 해제</button>
                                                            )}
                                                            {u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                                <button onClick={() => { setUserToDelete(u); setShowDeleteUserModal(true); }}
                                                                    className="text-xs text-red-500 hover:underline">강제 탈퇴</button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {filteredUsers.length === 0 && (
                                    <p className="text-center text-gray-400 py-8 text-sm">검색 결과가 없습니다.</p>
                                )}
                            </div>
                        )}

                        {/* 카테고리 관리 */}
                        {activeTab === 'categories' && (
                            <div>
                                <h2 className="text-lg font-bold mb-4">카테고리 관리</h2>
                                <div className="flex gap-2 mb-5">
                                    <input type="text" value={newCategoryName}
                                        onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                        placeholder="새 카테고리 이름" className="input-field flex-1 text-sm" />
                                    <button onClick={handleAddCategory} className="btn-primary shrink-0 text-sm">추가</button>
                                </div>
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <div key={cat.id}
                                            className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl gap-2">
                                            <div className="flex items-center gap-2 flex-wrap min-w-0">
                                                <span className="font-semibold text-sm">{cat.name}</span>
                                                {cat.isDefault && <span className="badge badge-primary">기본</span>}
                                                {cat.isPinned && <span className="badge badge-warning">📌 고정</span>}
                                                <span className="text-xs text-gray-400">({cat.postCount}개)</span>
                                            </div>
                                            {!cat.isDefault && (
                                                <div className="flex gap-2 shrink-0">
                                                    <button onClick={() => handleTogglePinCategory(cat)}
                                                        className="text-xs text-amber-600 bg-amber-50 px-2.5 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium">
                                                        {cat.isPinned ? '고정 해제' : '고정'}
                                                    </button>
                                                    <button onClick={() => { setCategoryToDelete(cat); setShowDeleteCategoryModal(true); }}
                                                        className="text-xs text-red-500 bg-red-50 px-2.5 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium">
                                                        삭제
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 게시글 관리 */}
                        {activeTab === 'posts' && (
                            <div>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                                    <h2 className="text-lg font-bold flex-1">
                                        게시글 관리 ({filteredPosts.length}개)
                                    </h2>
                                </div>

                                {/* 게시글 검색 */}
                                <input
                                    type="text"
                                    value={postSearch}
                                    onChange={(e) => setPostSearch(e.target.value)}
                                    placeholder="🔍 제목 또는 작성자 검색"
                                    className="input-field mb-4 text-sm"
                                />

                                {/* 모바일: 카드형 */}
                                <div className="block sm:hidden space-y-3">
                                    {filteredPosts.map((post) => (
                                        <div key={post.id} className="border border-gray-100 rounded-2xl p-4">
                                            <div className="flex items-start gap-2 mb-3">
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                                                        {post.isPinned && <span className="badge badge-warning text-[10px]">📌 고정</span>}
                                                        <span className="badge badge-primary text-[10px]">{post.category}</span>
                                                    </div>
                                                    <p className="font-semibold text-sm truncate">{post.title}</p>
                                                    <p className="text-xs text-gray-400 mt-0.5">{post.authorNickname}</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2 pt-2 border-t border-gray-50">
                                                <button onClick={() => handleTogglePinPost(post)}
                                                    className="text-xs text-amber-600 bg-amber-50 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors font-medium flex-1 text-center">
                                                    {post.isPinned ? '고정 해제' : '📌 고정'}
                                                </button>
                                                <button onClick={() => handleDeletePost(post)}
                                                    className="text-xs text-red-500 bg-red-50 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium flex-1 text-center">
                                                    삭제
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* 데스크톱: 테이블 */}
                                <div className="hidden sm:block overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-500 text-xs">
                                            <tr>
                                                <th className="px-4 py-3 text-left rounded-l-xl">제목</th>
                                                <th className="px-4 py-3 text-left">카테고리</th>
                                                <th className="px-4 py-3 text-left">작성자</th>
                                                <th className="px-4 py-3 text-center">고정</th>
                                                <th className="px-4 py-3 text-center rounded-r-xl">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-50">
                                            {filteredPosts.map((post) => (
                                                <tr key={post.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 max-w-[200px] truncate font-medium text-xs">{post.title}</td>
                                                    <td className="px-4 py-3 text-xs">{post.category}</td>
                                                    <td className="px-4 py-3 text-xs text-gray-500">{post.authorNickname}</td>
                                                    <td className="px-4 py-3 text-center text-sm">{post.isPinned ? '📌' : '-'}</td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex justify-center gap-3">
                                                            <button onClick={() => handleTogglePinPost(post)}
                                                                className="text-xs text-amber-600 hover:underline">
                                                                {post.isPinned ? '고정 해제' : '고정'}
                                                            </button>
                                                            <button onClick={() => handleDeletePost(post)}
                                                                className="text-xs text-red-500 hover:underline">삭제</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* 필터 관리 */}
                        {activeTab === 'filters' && (
                            <div className="space-y-8">
                                <div>
                                    <h2 className="text-lg font-bold mb-1">🚫 비속어 관리</h2>
                                    <p className="text-xs text-gray-400 mb-4">게시글 제목·내용에 포함 시 등록 차단</p>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newBadWord}
                                            onChange={(e) => setNewBadWord(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newBadWord.trim()) {
                                                    addFilterWord('badWords', newBadWord).then(() => { setNewBadWord(''); loadFilters(); });
                                                }
                                            }}
                                            placeholder="금지 단어 입력" className="input-field flex-1 text-sm" />
                                        <button onClick={() => {
                                            if (!newBadWord.trim()) return;
                                            addFilterWord('badWords', newBadWord).then(() => { setNewBadWord(''); loadFilters(); });
                                        }} className="btn-primary shrink-0 text-sm">추가</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {badWords.length === 0
                                            ? <p className="text-gray-400 text-sm">등록된 비속어가 없습니다.</p>
                                            : badWords.map((w) => (
                                                <span key={w} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-xl text-xs border border-red-100 font-medium">
                                                    {w}
                                                    <button onClick={() => removeFilterWord('badWords', w).then(loadFilters)}
                                                        className="hover:bg-red-200 rounded-full w-4 h-4 flex items-center justify-center font-bold">×</button>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h2 className="text-lg font-bold mb-1">🚷 금지 닉네임 관리</h2>
                                    <p className="text-xs text-gray-400 mb-4">해당 단어 포함 닉네임 사용 불가</p>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newForbiddenNickname}
                                            onChange={(e) => setNewForbiddenNickname(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newForbiddenNickname.trim()) {
                                                    addFilterWord('forbiddenNicknames', newForbiddenNickname).then(() => { setNewForbiddenNickname(''); loadFilters(); });
                                                }
                                            }}
                                            placeholder="금지 닉네임 단어 입력" className="input-field flex-1 text-sm" />
                                        <button onClick={() => {
                                            if (!newForbiddenNickname.trim()) return;
                                            addFilterWord('forbiddenNicknames', newForbiddenNickname).then(() => { setNewForbiddenNickname(''); loadFilters(); });
                                        }} className="btn-primary shrink-0 text-sm">추가</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {forbiddenNicknames.length === 0
                                            ? <p className="text-gray-400 text-sm">등록된 금지 닉네임이 없습니다.</p>
                                            : forbiddenNicknames.map((w) => (
                                                <span key={w} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-xl text-xs border border-orange-100 font-medium">
                                                    {w}
                                                    <button onClick={() => removeFilterWord('forbiddenNicknames', w).then(loadFilters)}
                                                        className="hover:bg-orange-200 rounded-full w-4 h-4 flex items-center justify-center font-bold">×</button>
                                                </span>
                                            ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* 탈퇴 사유 */}
                        {activeTab === 'withdrawal' && (
                            <div>
                                <h2 className="text-lg font-bold mb-4">📋 탈퇴 기록 ({withdrawalReasons.length}건)</h2>
                                {withdrawalReasons.length === 0 ? (
                                    <div className="text-center py-12">
                                        <p className="text-4xl mb-3">📋</p>
                                        <p className="text-gray-400 text-sm">탈퇴 기록이 없습니다.</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* 모바일: 카드형 */}
                                        <div className="block sm:hidden space-y-3">
                                            {withdrawalReasons.map((record) => (
                                                <div key={record.id} className="border border-gray-100 rounded-2xl p-4">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <div className="min-w-0">
                                                            <p className="font-semibold text-sm">{record.nickname}</p>
                                                            <p className="text-xs text-gray-400 truncate">{record.email}</p>
                                                            <p className="text-xs text-gray-300 mt-0.5">
                                                                {formatDate(record.deletedAt?.toDate ? record.deletedAt.toDate() : record.deletedAt)}
                                                            </p>
                                                        </div>
                                                        <button onClick={() => deleteWithdrawalRecord(record.id)}
                                                            className="text-xs text-red-400 shrink-0 ml-2">삭제</button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-1">
                                                        {record.reasons?.map((r: string) => (
                                                            <span key={r} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{r}</span>
                                                        ))}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* 데스크톱: 테이블 */}
                                        <div className="hidden sm:block overflow-x-auto">
                                            <table className="w-full text-sm">
                                                <thead className="bg-gray-50 text-gray-500 text-xs">
                                                    <tr>
                                                        <th className="px-4 py-3 text-left rounded-l-xl">이메일</th>
                                                        <th className="px-4 py-3 text-left">닉네임</th>
                                                        <th className="px-4 py-3 text-left">탈퇴 사유</th>
                                                        <th className="px-4 py-3 text-center">탈퇴일</th>
                                                        <th className="px-4 py-3 text-center rounded-r-xl">삭제</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-50">
                                                    {withdrawalReasons.map((record) => (
                                                        <tr key={record.id} className="hover:bg-gray-50">
                                                            <td className="px-4 py-3 text-gray-500 text-xs max-w-[160px] truncate">{record.email}</td>
                                                            <td className="px-4 py-3 font-medium text-xs">{record.nickname}</td>
                                                            <td className="px-4 py-3">
                                                                <div className="flex flex-wrap gap-1">
                                                                    {record.reasons?.map((r: string) => (
                                                                        <span key={r} className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{r}</span>
                                                                    ))}
                                                                </div>
                                                            </td>
                                                            <td className="px-4 py-3 text-center text-gray-400 text-xs">
                                                                {formatDate(record.deletedAt?.toDate ? record.deletedAt.toDate() : record.deletedAt)}
                                                            </td>
                                                            <td className="px-4 py-3 text-center">
                                                                <button onClick={() => deleteWithdrawalRecord(record.id)}
                                                                    className="text-xs text-red-400 hover:underline">삭제</button>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
            {loading && <Loading message="처리 중..." />}

            {/* 관리자 추가 모달 */}
            <Modal isOpen={showAddAdminModal} onClose={() => setShowAddAdminModal(false)}
                title="관리자 추가" confirmText="추가" cancelText="취소" onConfirm={handleAddAdmin}>
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">이메일</label>
                    <input type="email" value={newAdminEmail} onChange={(e) => setNewAdminEmail(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddAdmin()}
                        placeholder="관리자로 추가할 이메일" className="input-field" />
                </div>
            </Modal>

            {/* 회원 추가 모달 */}
            <Modal isOpen={showAddUserModal} onClose={() => setShowAddUserModal(false)}
                title="회원 추가" confirmText="생성" cancelText="취소" onConfirm={handleAddUser}>
                <div className="space-y-3">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">이메일 <span className="text-red-500">*</span></label>
                        <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
                            placeholder="이메일 입력" className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">비밀번호 <span className="text-red-500">*</span></label>
                        <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                            placeholder="6자 이상" className="input-field" />
                    </div>
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">닉네임 <span className="text-red-500">*</span></label>
                        <input type="text" value={newUserNickname} onChange={(e) => setNewUserNickname(e.target.value)}
                            placeholder="닉네임 입력" className="input-field" />
                    </div>
                    <p className="text-xs text-gray-400 bg-gray-50 rounded-xl p-3">
                        💡 생성된 계정으로 바로 로그인 가능합니다.
                    </p>
                </div>
            </Modal>

            {/* 회원 강제 탈퇴 모달 */}
            <Modal isOpen={showDeleteUserModal} onClose={() => setShowDeleteUserModal(false)}
                title="회원 강제 탈퇴" confirmText="탈퇴 처리" cancelText="취소" onConfirm={handleDeleteUser}
                confirmClassName="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold">
                <div className="space-y-4">
                    {userToDelete && (
                        <div className="bg-gray-50 rounded-2xl p-4">
                            <p className="font-bold text-gray-900">{userToDelete.nickname}</p>
                            <p className="text-sm text-gray-500 mt-0.5">{userToDelete.email}</p>
                        </div>
                    )}

                    {/* 선택 UI 없이 고정 안내만 표시 */}
                    <div className="bg-indigo-50 rounded-2xl p-4">
                        <p className="text-sm font-semibold text-indigo-800 mb-1">📝 게시글 처리 안내</p>
                        <p className="text-sm text-indigo-700">
                            해당 회원의 게시글은 삭제되지 않으며,<br />
                            작성자명이 <strong>"탈퇴한 사용자"</strong>로 변경됩니다.
                        </p>
                    </div>

                    <p className="text-xs text-amber-600 bg-amber-50 rounded-xl p-3">
                        ⚠️ Firebase Auth 계정은 Console에서 별도 삭제가 필요합니다.
                    </p>
                </div>
            </Modal>

            {/* 카테고리 삭제 모달 */}
            <Modal isOpen={showDeleteCategoryModal} onClose={() => setShowDeleteCategoryModal(false)}
                title="카테고리 삭제" confirmText="삭제" cancelText="취소"
                onConfirm={handleDeleteCategory}
                confirmClassName="px-4 py-2.5 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors font-semibold">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        <span className="font-bold">{categoryToDelete?.name}</span> 카테고리를 삭제합니다.
                    </p>
                    {categoryToDelete && (categoryToDelete.postCount ?? 0) > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-500">게시글 {categoryToDelete.postCount}개 처리:</p>
                            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 border-gray-200">
                                <input type="radio" value="move" checked={deleteAction === 'move'}
                                    onChange={() => setDeleteAction('move')} className="accent-indigo-600" />
                                <span className="text-sm">"전체" 카테고리로 이동</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer p-3 rounded-xl border-2 border-gray-200">
                                <input type="radio" value="delete" checked={deleteAction === 'delete'}
                                    onChange={() => setDeleteAction('delete')} className="accent-red-500" />
                                <span className="text-sm text-red-600">게시글도 모두 삭제</span>
                            </label>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}