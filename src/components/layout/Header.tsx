'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { FiMenu, FiX, FiUser, FiLogOut, FiEdit } from 'react-icons/fi';
import Modal from '@/components/common/Modal';

export default function Header() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const [showMenu, setShowMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);

    const handleSignOut = async () => {
        try {
            await signOut();
            router.push('/');
        } catch (error) {
            console.error('로그아웃 실패:', error);
        } finally {
            setShowLogoutModal(false);
        }
    };

    return (
        <>
            <header className="bg-white shadow-sm sticky top-0 z-40">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    {/* 로고 */}
                    <Link href="/" className="text-xl font-bold text-primary-600">
                        Image Gallery
                    </Link>

                    {/* 데스크톱 메뉴 */}
                    <nav className="hidden md:flex items-center gap-4">
                        {/* 관리자 페이지 이동 */}
                        {user?.isAdmin === true ? (
                            <Link href="/admin" className="text-gray-700 hover:text-primary-600 transition-colors">
                                관리자 페이지
                            </Link>
                        ) : null}

                        <Link href="/" className="text-gray-700 hover:text-primary-600 transition-colors">
                            갤러리 <pre>
                            </pre>
                        </Link>

                        {user ? (
                            <>
                                <Link
                                    href="/posts/new"
                                    className="flex items-center gap-2 btn-primary"
                                >
                                    <FiEdit size={18} />
                                    글쓰기
                                </Link>
                                <Link
                                    href="/mypage"
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    <FiUser size={18} />
                                    {user.nickname}
                                </Link>
                                <button
                                    onClick={() => setShowLogoutModal(true)}
                                    className="flex items-center gap-2 text-gray-700 hover:text-primary-600 transition-colors"
                                >
                                    <FiLogOut size={18} />
                                    로그아웃
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="btn-secondary">
                                    로그인
                                </Link>
                                <Link href="/signup" className="btn-primary">
                                    회원가입
                                </Link>
                            </>
                        )}
                    </nav>

                    {/* 모바일 메뉴 버튼 */}
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="md:hidden text-gray-700"
                    >
                        {showMenu ? <FiX size={24} /> : <FiMenu size={24} />}
                    </button>
                </div>

                {/* 모바일 메뉴 */}
                {showMenu && (
                    <div className="md:hidden border-t bg-white">
                        <nav className="flex flex-col p-4 space-y-2">
                            <Link
                                href="/"
                                onClick={() => setShowMenu(false)}
                                className="py-2 text-gray-700 hover:text-primary-600"
                            >
                                갤러리
                            </Link>

                            {user ? (
                                <>
                                    <Link
                                        href="/posts/new"
                                        onClick={() => setShowMenu(false)}
                                        className="py-2 text-gray-700 hover:text-primary-600"
                                    >
                                        글쓰기
                                    </Link>
                                    <Link
                                        href="/mypage"
                                        onClick={() => setShowMenu(false)}
                                        className="py-2 text-gray-700 hover:text-primary-600"
                                    >
                                        마이페이지 ({user.nickname})
                                    </Link>
                                    <button
                                        onClick={() => {
                                            setShowMenu(false);
                                            setShowLogoutModal(true);
                                        }}
                                        className="py-2 text-left text-gray-700 hover:text-primary-600"
                                    >
                                        로그아웃
                                    </button>
                                </>
                            ) : (
                                <>
                                    <Link
                                        href="/login"
                                        onClick={() => setShowMenu(false)}
                                        className="py-2 text-gray-700 hover:text-primary-600"
                                    >
                                        로그인
                                    </Link>
                                    <Link
                                        href="/signup"
                                        onClick={() => setShowMenu(false)}
                                        className="py-2 text-gray-700 hover:text-primary-600"
                                    >
                                        회원가입
                                    </Link>
                                </>
                            )}
                        </nav>
                    </div>
                )}
            </header>

            {/* 로그아웃 확인 모달 */}
            <Modal
                isOpen={showLogoutModal}
                onClose={() => setShowLogoutModal(false)}
                title="로그아웃"
                confirmText="로그아웃"
                cancelText="취소"
                onConfirm={handleSignOut}
            >
                <p className="text-gray-700">정말 로그아웃하시겠습니까?</p>
            </Modal>
        </>
    );
}