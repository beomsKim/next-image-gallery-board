'use client';

import { useState, useEffect } from 'react';
import {
    collection, query, getDocs, doc, updateDoc, setDoc,
    deleteDoc, getDoc, where, orderBy, Timestamp
} from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { db, storage } from '@/lib/firebase';
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

    // 모달
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showDeleteCategoryModal, setShowDeleteCategoryModal] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
    const [deleteAction, setDeleteAction] = useState<'move' | 'delete'>('move');

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
        setUsers(snap.docs.map((d) => ({ ...d.data() } as User)));
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
        } catch (e) {
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
        } catch (e) {
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

    return (
        <>
            <main className="min-h-screen bg-gray-50 py-8">
                <div className="max-w-6xl mx-auto p-4">
                    <h1 className="text-3xl font-bold mb-6">관리자 페이지</h1>

                    {/* 탭 */}
                    <div className="flex gap-2 mb-6 overflow-x-auto pb-1 scrollbar-hide">
                        {tabs.map((tab) => (
                            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                                className={`px-5 py-2.5 rounded-xl transition-colors whitespace-nowrap font-medium text-sm
                  ${activeTab === tab.id ? 'bg-primary-600 text-white shadow-sm' : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-200'}`}>
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="card">
                        {/* 사용자 관리 */}
                        {activeTab === 'users' && (
                            <div>
                                <div className="flex justify-between items-center mb-4">
                                    <h2 className="text-xl font-semibold">전체 사용자 ({users.length}명)</h2>
                                    <button onClick={() => setShowAddAdminModal(true)} className="btn-primary text-sm">
                                        관리자 추가
                                    </button>
                                </div>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-3 text-left">이메일</th>
                                                <th className="px-4 py-3 text-left">닉네임</th>
                                                <th className="px-4 py-3 text-center">관리자</th>
                                                <th className="px-4 py-3 text-center">가입일</th>
                                                <th className="px-4 py-3 text-center">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {users.map((u) => (
                                                <tr key={u.uid} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3 text-gray-700">{u.email}</td>
                                                    <td className="px-4 py-3">{u.nickname}</td>
                                                    <td className="px-4 py-3 text-center">{u.isAdmin ? '✅' : '-'}</td>
                                                    <td className="px-4 py-3 text-center text-gray-500">{formatDate(u.createdAt)}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        {u.isAdmin && u.email !== process.env.NEXT_PUBLIC_ADMIN_EMAIL && (
                                                            <button onClick={() => handleRemoveAdmin(u.uid, u.email)}
                                                                className="text-xs text-red-500 hover:underline">권한 제거</button>
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
                                <h2 className="text-xl font-semibold mb-4">카테고리 관리</h2>
                                <div className="flex gap-2 mb-6">
                                    <input type="text" value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                                        placeholder="새 카테고리 이름" className="input-field flex-1" />
                                    <button onClick={handleAddCategory} className="btn-primary shrink-0">추가</button>
                                </div>
                                <div className="space-y-2">
                                    {categories.map((cat) => (
                                        <div key={cat.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium">{cat.name}</span>
                                                {cat.isDefault && <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">기본</span>}
                                                {cat.isPinned && <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full">📌 고정</span>}
                                                <span className="text-xs text-gray-400">({cat.postCount}개)</span>
                                            </div>
                                            {!cat.isDefault && (
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleTogglePinCategory(cat)}
                                                        className="text-xs text-amber-600 hover:underline">
                                                        {cat.isPinned ? '고정 해제' : '고정'}
                                                    </button>
                                                    <button onClick={() => { setCategoryToDelete(cat); setShowDeleteCategoryModal(true); }}
                                                        className="text-xs text-red-500 hover:underline">삭제</button>
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
                                <h2 className="text-xl font-semibold mb-4">게시글 관리 ({posts.length}개)</h2>
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm">
                                        <thead className="bg-gray-50 text-gray-600">
                                            <tr>
                                                <th className="px-4 py-3 text-left">제목</th>
                                                <th className="px-4 py-3 text-left">카테고리</th>
                                                <th className="px-4 py-3 text-left">작성자</th>
                                                <th className="px-4 py-3 text-center">고정</th>
                                                <th className="px-4 py-3 text-center">작업</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {posts.map((post) => (
                                                <tr key={post.id} className="border-t hover:bg-gray-50">
                                                    <td className="px-4 py-3 max-w-[200px] truncate">{post.title}</td>
                                                    <td className="px-4 py-3">{post.category}</td>
                                                    <td className="px-4 py-3">{post.authorNickname}</td>
                                                    <td className="px-4 py-3 text-center">{post.isPinned ? '📌' : '-'}</td>
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
                                    <h2 className="text-xl font-semibold mb-2">🚫 비속어 관리</h2>
                                    <p className="text-sm text-gray-500 mb-4">게시글 제목·내용·카테고리에 포함 시 등록 차단</p>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newBadWord} onChange={(e) => setNewBadWord(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newBadWord.trim()) {
                                                    addFilterWord('badWords', newBadWord).then(() => { setNewBadWord(''); loadFilters(); });
                                                }
                                            }}
                                            placeholder="금지 단어 입력" className="input-field flex-1" />
                                        <button onClick={() => {
                                            if (!newBadWord.trim()) return;
                                            addFilterWord('badWords', newBadWord).then(() => { setNewBadWord(''); loadFilters(); });
                                        }} className="btn-primary shrink-0">추가</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {badWords.length === 0
                                            ? <p className="text-gray-400 text-sm">등록된 비속어가 없습니다.</p>
                                            : badWords.map((w) => (
                                                <span key={w} className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 text-red-700 rounded-full text-sm border border-red-200">
                                                    {w}
                                                    <button onClick={() => removeFilterWord('badWords', w).then(loadFilters)}
                                                        className="hover:bg-red-200 rounded-full w-4 h-4 flex items-center justify-center font-bold">×</button>
                                                </span>
                                            ))}
                                    </div>
                                </div>

                                <div className="border-t pt-6">
                                    <h2 className="text-xl font-semibold mb-2">🚷 금지 닉네임 관리</h2>
                                    <p className="text-sm text-gray-500 mb-4">해당 단어 포함 닉네임 사용 불가 (예: 운영자, 관리자, GM)</p>
                                    <div className="flex gap-2 mb-4">
                                        <input type="text" value={newForbiddenNickname} onChange={(e) => setNewForbiddenNickname(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === 'Enter' && newForbiddenNickname.trim()) {
                                                    addFilterWord('forbiddenNicknames', newForbiddenNickname).then(() => { setNewForbiddenNickname(''); loadFilters(); });
                                                }
                                            }}
                                            placeholder="금지 닉네임 단어 입력" className="input-field flex-1" />
                                        <button onClick={() => {
                                            if (!newForbiddenNickname.trim()) return;
                                            addFilterWord('forbiddenNicknames', newForbiddenNickname).then(() => { setNewForbiddenNickname(''); loadFilters(); });
                                        }} className="btn-primary shrink-0">추가</button>
                                    </div>
                                    <div className="flex flex-wrap gap-2 min-h-[40px]">
                                        {forbiddenNicknames.length === 0
                                            ? <p className="text-gray-400 text-sm">등록된 금지 닉네임이 없습니다.</p>
                                            : forbiddenNicknames.map((w) => (
                                                <span key={w} className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 text-orange-700 rounded-full text-sm border border-orange-200">
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
                                <h2 className="text-xl font-semibold mb-4">📋 탈퇴 사유 기록 ({withdrawalReasons.length}건)</h2>
                                {withdrawalReasons.length === 0 ? (
                                    <p className="text-gray-400 py-8 text-center">탈퇴 기록이 없습니다.</p>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-sm">
                                            <thead className="bg-gray-50 text-gray-600">
                                                <tr>
                                                    <th className="px-4 py-3 text-left">이메일</th>
                                                    <th className="px-4 py-3 text-left">닉네임</th>
                                                    <th className="px-4 py-3 text-left">탈퇴 사유</th>
                                                    <th className="px-4 py-3 text-center">탈퇴일</th>
                                                    <th className="px-4 py-3 text-center">삭제</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {withdrawalReasons.map((record) => (
                                                    <tr key={record.id} className="border-t hover:bg-gray-50">
                                                        <td className="px-4 py-3 text-gray-600">{record.email}</td>
                                                        <td className="px-4 py-3">{record.nickname}</td>
                                                        <td className="px-4 py-3">
                                                            <div className="flex flex-wrap gap-1">
                                                                {record.reasons?.map((r: string) => (
                                                                    <span key={r} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{r}</span>
                                                                ))}
                                                                {(!record.reasons || record.reasons.length === 0) && (
                                                                    <span className="text-gray-400 text-xs">미선택</span>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center text-gray-500">
                                                            {formatDate(record.deletedAt?.toDate ? record.deletedAt.toDate() : record.deletedAt)}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <button onClick={() => deleteWithdrawalRecord(record.id)}
                                                                className="text-xs text-red-500 hover:underline">삭제</button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
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

            {/* 카테고리 삭제 모달 */}
            <Modal isOpen={showDeleteCategoryModal} onClose={() => setShowDeleteCategoryModal(false)}
                title="카테고리 삭제" confirmText="삭제" cancelText="취소"
                onConfirm={handleDeleteCategory}
                confirmClassName="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                <div className="space-y-4">
                    <p className="text-gray-700">
                        <span className="font-bold">{categoryToDelete?.name}</span> 카테고리를 삭제합니다.
                    </p>
                    {categoryToDelete && categoryToDelete.postCount > 0 && (
                        <div className="space-y-2">
                            <p className="text-sm text-gray-600 font-medium">
                                이 카테고리에 게시글 {categoryToDelete.postCount}개가 있습니다.
                            </p>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="move" checked={deleteAction === 'move'}
                                    onChange={() => setDeleteAction('move')} />
                                <span className="text-sm">"전체" 카테고리로 이동</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="radio" value="delete" checked={deleteAction === 'delete'}
                                    onChange={() => setDeleteAction('delete')} />
                                <span className="text-sm text-red-600">게시글도 모두 삭제</span>
                            </label>
                        </div>
                    )}
                </div>
            </Modal>
        </>
    );
}