'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, query, orderBy, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { adminCreateUserFn, adminDeleteUserFn } from '@/lib/functions';
import { User } from '@/types/user';
import { AdminTabProps } from '@/types/admin';
import { formatDate } from '@/utils/format';
import Modal from '@/components/common/Modal';

export default function UsersTab({ onToast }: AdminTabProps) {
    const router = useRouter();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(false);
    const [userSearch, setUserSearch] = useState('');

    // 모달
    const [showAddUserModal, setShowAddUserModal] = useState(false);
    const [showAddAdminModal, setShowAddAdminModal] = useState(false);
    const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);

    // 입력값
    const [newUserEmail, setNewUserEmail] = useState('');
    const [newUserPassword, setNewUserPassword] = useState('');
    const [newUserNickname, setNewUserNickname] = useState('');
    const [adminEmail, setAdminEmail] = useState('');
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        const snap = await getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc')));
        // setUsers(
        //     snap.docs.map((d) => ({
        //         id: d.id, ...d.data()
        //     })) as unknown as User[]
        // );
        setUsers(snap.docs.map((d) => {
            const data = d.data();
            return {
                ...data,
                uid: d.id,
            } as User;
        }));
    };

    const handleAddUser = async () => {
        if (!newUserEmail.trim() || !newUserPassword.trim() || !newUserNickname.trim()) {
            onToast({ message: '모든 항목을 입력해주세요.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await adminCreateUserFn({
                email: newUserEmail.trim(),
                password: newUserPassword.trim(),
                nickname: newUserNickname.trim(),
            });
            onToast({ message: '회원이 생성되었습니다.', type: 'success' });
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
            };
            onToast({ message: msg[err.code] || err.message || '생성에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleAddAdmin = async () => {
        if (!adminEmail.trim()) {
            onToast({ message: '이메일을 입력해주세요.', type: 'error' });
            return;
        }
        const user = users.find((u) => u.email === adminEmail.trim());
        if (!user) {
            onToast({ message: '해당 이메일의 회원이 없습니다.', type: 'error' });
            return;
        }
        if (user.isAdmin) {
            onToast({ message: '이미 관리자입니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await updateDoc(doc(db, 'users', user.uid), { isAdmin: true });
            onToast({ message: '관리자 권한이 추가되었습니다.', type: 'success' });
            setAdminEmail('');
            setShowAddAdminModal(false);
            loadUsers();
        } catch {
            onToast({ message: '권한 추가에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!userToDelete) return;
        if (userToDelete.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL) {
            onToast({ message: '초기 관리자는 탈퇴시킬 수 없습니다.', type: 'error' });
            return;
        }
        setLoading(true);
        try {
            await adminDeleteUserFn({
                userId: userToDelete.uid,
                userEmail: userToDelete.email,
                userNickname: userToDelete.nickname,
            });
            onToast({ message: '탈퇴 처리가 완료되었습니다.', type: 'success' });
            setShowDeleteUserModal(false);
            setUserToDelete(null);
            loadUsers();
        } catch (err: any) {
            onToast({ message: err.message || '탈퇴 처리에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = users.filter(
        (u) => u.email.includes(userSearch) || u.nickname.includes(userSearch)
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
                <h2 className="text-lg font-bold flex-1">회원 관리 ({filteredUsers.length}명)</h2>
                <div className="flex gap-2">
                    <button onClick={() => setShowAddUserModal(true)} className="btn-primary text-sm">
                        + 회원 추가
                    </button>
                    <button onClick={() => setShowAddAdminModal(true)} className="btn-secondary text-sm">
                        관리자 추가
                    </button>
                </div>
            </div>

            <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="이메일 또는 닉네임 검색"
                className="input-field mb-4 text-sm"
            />

            {/* 모바일 카드 */}
            <div className="block sm:hidden space-y-3">
                {filteredUsers.map((user) => (
                    <div key={user.uid} className="card p-4">
                        <div className="flex justify-between items-start mb-2">
                            <div className="min-w-0">
                                <p className="font-semibold text-sm truncate">{user.nickname}</p>
                                <p className="text-xs text-gray-400 truncate">{user.email}</p>
                            </div>
                            {user.isAdmin && <span className="badge badge-warning shrink-0 ml-2">관리자</span>}
                        </div>
                        <p className="text-xs text-gray-400 mb-3">
                            가입: {formatDate(user.createdAt instanceof Date ? user.createdAt : user.createdAt?.toDate?.())}
                        </p>
                        <button
                            onClick={() => { setUserToDelete(user); setShowDeleteUserModal(true); }}
                            className="w-full text-xs bg-red-50 text-red-500 px-3 py-2 rounded-lg font-medium">
                            강제 탈퇴
                        </button>
                    </div>
                ))}
            </div>

            {/* 데스크톱 테이블 */}
            <div className="hidden sm:block overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left rounded-l-xl">닉네임</th>
                            <th className="px-4 py-3 text-left">이메일</th>
                            <th className="px-4 py-3 text-center">관리자</th>
                            <th className="px-4 py-3 text-left">가입일</th>
                            <th className="px-4 py-3 text-center rounded-r-xl">작업</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {filteredUsers.map((user) => (
                            <tr key={user.uid} className="hover:bg-gray-50">
                                <td className="px-4 py-3 font-medium">{user.nickname}</td>
                                <td className="px-4 py-3 text-xs text-gray-500">{user.email}</td>
                                <td className="px-4 py-3 text-center">
                                    {user.isAdmin && <span className="badge badge-warning">관리자</span>}
                                </td>
                                <td className="px-4 py-3 text-xs text-gray-400">
                                    {formatDate(user.createdAt instanceof Date ? user.createdAt : user.createdAt?.toDate?.())}
                                </td>
                                <td className="px-4 py-3 text-center">
                                    <button
                                        onClick={() => { setUserToDelete(user); setShowDeleteUserModal(true); }}
                                        className="text-xs text-red-500 hover:underline">
                                        강제 탈퇴
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* 회원 추가 모달 */}
            <Modal
                isOpen={showAddUserModal}
                onClose={() => { setShowAddUserModal(false); setNewUserEmail(''); setNewUserPassword(''); setNewUserNickname(''); }}
                title="회원 직접 추가"
                confirmText={loading ? '생성 중...' : '생성'}
                onConfirm={handleAddUser}
            >
                <div className="space-y-3">
                    <input type="email" value={newUserEmail} onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="이메일" className="input-field" />
                    <input type="password" value={newUserPassword} onChange={(e) => setNewUserPassword(e.target.value)}
                        placeholder="비밀번호 (6자 이상)" className="input-field" />
                    <input type="text" value={newUserNickname} onChange={(e) => setNewUserNickname(e.target.value)}
                        placeholder="닉네임" className="input-field" />
                </div>
            </Modal>

            {/* 관리자 추가 모달 */}
            <Modal
                isOpen={showAddAdminModal}
                onClose={() => { setShowAddAdminModal(false); setAdminEmail(''); }}
                title="관리자 권한 추가"
                confirmText={loading ? '처리 중...' : '추가'}
                onConfirm={handleAddAdmin}
            >
                <input type="email" value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="회원 이메일" className="input-field" />
            </Modal>

            {/* 강제 탈퇴 모달 */}
            <Modal
                isOpen={showDeleteUserModal}
                onClose={() => { setShowDeleteUserModal(false); setUserToDelete(null); }}
                title="회원 강제 탈퇴"
                confirmText={loading ? '처리 중...' : '탈퇴시키기'}
                onConfirm={handleDeleteUser}
                confirmClassName="bg-red-600 hover:bg-red-700"
            >
                <p className="text-sm text-gray-600">
                    <strong>{userToDelete?.nickname}</strong> ({userToDelete?.email}) 님을 강제 탈퇴시키시겠습니까?
                </p>
                <p className="text-xs text-red-500 mt-2">
                    작성한 게시글은 "탈퇴한 사용자"로 표시됩니다.
                </p>
            </Modal>
        </div>
    );
}