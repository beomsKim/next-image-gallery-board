'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import {
    FiHome, FiPlusSquare, FiUser, FiSettings,
    FiLogOut, FiMenu, FiX, FiImage
} from 'react-icons/fi';
import Modal from '@/components/common/Modal';

export default function Header() {
    const router = useRouter();
    const pathname = usePathname();
    const { user, signOut } = useAuth();
    const [showMenu, setShowMenu] = useState(false);
    const [showLogoutModal, setShowLogoutModal] = useState(false);
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 8);
        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // 메뉴 열리면 스크롤 방지
    useEffect(() => {
        document.body.style.overflow = showMenu ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [showMenu]);

    const handleSignOut = async () => {
        await signOut();
        router.push('/');
        setShowLogoutModal(false);
    };

    const isActive = (path: string) => pathname === path;

    return (
        <>
            {/* 데스크톱 헤더 */}
            <header className={`hidden md:block sticky top-0 z-40 transition-all duration-200
        ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100' : 'bg-white border-b border-gray-100'}`}>
                <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                    {/* 로고 */}
                    <Link href="/" className="flex items-center gap-2.5 group">
                        <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center
                           group-hover:bg-indigo-700 transition-colors">
                            <FiImage size={16} className="text-white" />
                        </div>
                        <span className="text-lg font-bold text-gray-900">갤러리</span>
                    </Link>

                    {/* 네비게이션 */}
                    <nav className="flex items-center gap-2">
                        {user ? (
                            <>
                                <Link href="/posts/new"
                                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white
                             rounded-xl text-sm font-semibold hover:bg-indigo-700
                             active:scale-95 transition-all">
                                    <FiPlusSquare size={16} />
                                    글쓰기
                                </Link>
                                <Link href="/mypage"
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                              transition-all ${isActive('/mypage')
                                            ? 'bg-indigo-50 text-indigo-600'
                                            : 'text-gray-600 hover:bg-gray-100'}`}>
                                    <FiUser size={16} />
                                    <span className="max-w-[80px] truncate">{user.nickname}</span>
                                </Link>
                                {user.isAdmin && (
                                    <Link href="/admin"
                                        className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                                transition-all ${isActive('/admin')
                                                ? 'bg-orange-50 text-orange-600'
                                                : 'text-gray-500 hover:bg-gray-100'}`}>
                                        <FiSettings size={16} />
                                        관리자
                                    </Link>
                                )}
                                <button onClick={() => setShowLogoutModal(true)}
                                    className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium
                             text-gray-500 hover:bg-gray-100 transition-all">
                                    <FiLogOut size={16} />
                                </button>
                            </>
                        ) : (
                            <>
                                <Link href="/login" className="btn-ghost text-sm">로그인</Link>
                                <Link href="/signup" className="btn-primary text-sm">시작하기</Link>
                            </>
                        )}
                    </nav>
                </div>
            </header>

            {/* 모바일 헤더 (상단) */}
            <header className={`md:hidden sticky top-0 z-40 transition-all duration-200
        ${scrolled ? 'bg-white/95 backdrop-blur-md shadow-sm' : 'bg-white'}`}>
                <div className="flex items-center justify-between px-4 h-14">
                    <Link href="/" className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center">
                            <FiImage size={14} className="text-white" />
                        </div>
                        <span className="font-bold text-gray-900">갤러리</span>
                    </Link>

                    <div className="flex items-center gap-1">
                        {user && (
                            <Link href="/posts/new"
                                className="w-9 h-9 flex items-center justify-center bg-indigo-600
                           rounded-xl text-white active:scale-95 transition-all">
                                <FiPlusSquare size={18} />
                            </Link>
                        )}
                        <button onClick={() => setShowMenu(true)}
                            className="w-9 h-9 flex items-center justify-center rounded-xl
                         text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-all">
                            <FiMenu size={20} />
                        </button>
                    </div>
                </div>
            </header>

            {/* 모바일 하단 네비게이션 */}
            {user && (
                <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40
                       bg-white/95 backdrop-blur-md border-t border-gray-100
                       pb-safe-area-inset-bottom">
                    <div className="flex items-center h-16 px-2">
                        {[
                            { href: '/', icon: FiHome, label: '홈' },
                            { href: '/posts/new', icon: FiPlusSquare, label: '글쓰기' },
                            { href: '/mypage', icon: FiUser, label: '마이페이지' },
                            ...(user.isAdmin ? [{ href: '/admin', icon: FiSettings, label: '관리자' }] : []),
                        ].map(({ href, icon: Icon, label }) => (
                            <Link key={href} href={href}
                                className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1
                           rounded-xl transition-all active:scale-95
                           ${isActive(href) ? 'text-indigo-600' : 'text-gray-400'}`}>
                                <Icon size={22} strokeWidth={isActive(href) ? 2.5 : 1.8} />
                                <span className={`text-[10px] font-medium ${isActive(href) ? 'text-indigo-600' : ''}`}>
                                    {label}
                                </span>
                                {isActive(href) && (
                                    <div className="absolute bottom-0 w-1 h-1 bg-indigo-600 rounded-full" />
                                )}
                            </Link>
                        ))}
                    </div>
                </nav>
            )}

            {/* 모바일 슬라이드 메뉴 */}
            {showMenu && (
                <>
                    <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm animate-fadeIn md:hidden"
                        onClick={() => setShowMenu(false)} />
                    <div className="fixed top-0 right-0 bottom-0 z-50 w-[280px] bg-white
                         shadow-2xl animate-slideIn md:hidden flex flex-col">
                        {/* 메뉴 헤더 */}
                        <div className="flex items-center justify-between px-5 h-14 border-b border-gray-100">
                            <span className="font-bold text-gray-900">메뉴</span>
                            <button onClick={() => setShowMenu(false)}
                                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100">
                                <FiX size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4">
                            {user ? (
                                <>
                                    {/* 유저 프로필 */}
                                    <div className="bg-indigo-50 rounded-2xl p-4 mb-4">
                                        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center mb-2">
                                            <span className="text-white font-bold text-sm">
                                                {user.nickname.charAt(0)}
                                            </span>
                                        </div>
                                        <p className="font-semibold text-gray-900 truncate">{user.nickname}</p>
                                        <p className="text-xs text-gray-500 truncate">{user.email}</p>
                                    </div>

                                    {/* 메뉴 아이템 */}
                                    {[
                                        { href: '/', icon: FiHome, label: '홈' },
                                        { href: '/posts/new', icon: FiPlusSquare, label: '글쓰기' },
                                        { href: '/mypage', icon: FiUser, label: '마이페이지' },
                                        ...(user.isAdmin ? [{ href: '/admin', icon: FiSettings, label: '관리자 페이지' }] : []),
                                    ].map(({ href, icon: Icon, label }) => (
                                        <Link key={href} href={href} onClick={() => setShowMenu(false)}
                                            className={`flex items-center gap-3 px-4 py-3.5 rounded-xl mb-1
                                 font-medium text-sm transition-all
                                 ${isActive(href) ? 'bg-indigo-600 text-white' : 'text-gray-700 hover:bg-gray-100'}`}>
                                            <Icon size={18} />
                                            {label}
                                        </Link>
                                    ))}
                                </>
                            ) : (
                                <div className="space-y-2">
                                    <Link href="/login" onClick={() => setShowMenu(false)}
                                        className="flex items-center justify-center w-full py-3.5 rounded-xl
                               border-2 border-gray-200 text-gray-700 font-semibold text-sm
                               hover:border-indigo-300 hover:text-indigo-600 transition-all">
                                        로그인
                                    </Link>
                                    <Link href="/signup" onClick={() => setShowMenu(false)}
                                        className="flex items-center justify-center w-full py-3.5 rounded-xl
                               bg-indigo-600 text-white font-semibold text-sm
                               hover:bg-indigo-700 transition-all">
                                        회원가입
                                    </Link>
                                </div>
                            )}
                        </div>

                        {user && (
                            <div className="p-4 border-t border-gray-100">
                                <button onClick={() => { setShowMenu(false); setShowLogoutModal(true); }}
                                    className="flex items-center gap-3 w-full px-4 py-3.5 rounded-xl
                             text-gray-500 hover:bg-gray-100 font-medium text-sm transition-all">
                                    <FiLogOut size={18} />
                                    로그아웃
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}

            <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)}
                title="로그아웃" confirmText="로그아웃" cancelText="취소" onConfirm={handleSignOut}>
                <p className="text-gray-600">정말 로그아웃하시겠습니까?</p>
            </Modal>
        </>
    );
}