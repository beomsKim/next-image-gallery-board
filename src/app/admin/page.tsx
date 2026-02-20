'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import Loading from '@/components/common/Loading';
import Toast from '@/components/common/Toast';
import { AdminTab, TabConfig, ToastMessage } from '@/types/admin';
import UsersTab from '@/components/admin/UsersTab';
import CategoriesTab from '@/components/admin/CategoriesTab';
import PostsTab from '@/components/admin/PostsTab';
import FiltersTab from '@/components/admin/FiltersTab';
import WithdrawalTab from '@/components/admin/WithdrawalTab';
import ReportsTab from '@/components/admin/ReportsTab';
import NoticesTab from '@/components/admin/NoticesTab';

const tabs: TabConfig[] = [
    { id: 'users', label: '👥 회원' },
    { id: 'categories', label: '📁 카테고리' },
    { id: 'posts', label: '📝 게시글' },
    { id: 'filters', label: '🔒 필터' },
    { id: 'withdrawal', label: '📊 탈퇴' },
    { id: 'reports', label: '🚨 신고' },
    { id: 'notices', label: '📢 공지' },
];

export default function AdminPage() {
    const { user, loading: authLoading } = useAuth();
    const router = useRouter();
    const [activeTab, setActiveTab] = useState<AdminTab>('users');
    const [toast, setToast] = useState<ToastMessage | null>(null);

    if (authLoading) return <Loading message="로딩 중..." />;

    if (!user || !user.isAdmin) {
        router.push('/');
        return null;
    }

    const handleToast = (t: ToastMessage) => setToast(t);

    return (
        <main className="min-h-screen bg-gray-50 pb-24 md:pb-8">
            <div className="max-w-7xl mx-auto px-4 py-6">
                <h1 className="text-2xl font-bold mb-6">⚙️ 관리자 페이지</h1>

                {/* 탭 네비게이션 - 가로 스크롤 */}
                <div className="mb-6 -mx-4 px-4 overflow-x-auto scrollbar-hide">
                    <div className="flex gap-2 min-w-max pb-2">
                        {tabs.map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={
                                    activeTab === tab.id
                                        ? 'tab-btn-active'
                                        : 'tab-btn-inactive'
                                }
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* 탭 컨텐츠 */}
                <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
                    {activeTab === 'users' && <UsersTab onToast={handleToast} />}
                    {activeTab === 'categories' && <CategoriesTab onToast={handleToast} />}
                    {activeTab === 'posts' && <PostsTab onToast={handleToast} />}
                    {activeTab === 'filters' && <FiltersTab onToast={handleToast} />}
                    {activeTab === 'withdrawal' && <WithdrawalTab onToast={handleToast} />}
                    {activeTab === 'reports' && <ReportsTab onToast={handleToast} />}
                    {activeTab === 'notices' && <NoticesTab onToast={handleToast} />}
                </div>
            </div>

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </main>
    );
}