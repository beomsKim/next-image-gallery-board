'use client';

import { useState, useEffect } from 'react';
import { collection, getDocs, query, orderBy, addDoc, deleteDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminTabProps } from '@/types/admin';
import { formatDate } from '@/utils/format';
import Modal from '@/components/common/Modal';

interface Notice {
    id: string;
    type: '공지' | '이벤트';
    title: string;
    content: string;
    isPinned: boolean;
    createdAt: any;
}

export default function NoticesTab({ onToast }: AdminTabProps) {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [showNoticeModal, setShowNoticeModal] = useState(false);
    const [noticeTitle, setNoticeTitle] = useState('');
    const [noticeContent, setNoticeContent] = useState('');
    const [noticeType, setNoticeType] = useState<'공지' | '이벤트'>('공지');
    const [noticeIsPinned, setNoticeIsPinned] = useState(false);

    useEffect(() => { loadNotices(); }, []);

    const loadNotices = async () => {
        const snap = await getDocs(query(collection(db, 'notices'), orderBy('createdAt', 'desc')));
        setNotices(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notice[]);
    };

    const handleAddNotice = async () => {
        if (!noticeTitle.trim() || !noticeContent.trim()) {
            onToast({ message: '제목과 내용을 입력해주세요.', type: 'error' });
            return;
        }
        await addDoc(collection(db, 'notices'), {
            type: noticeType,
            title: noticeTitle.trim(),
            content: noticeContent.trim(),
            isPinned: noticeIsPinned,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
        onToast({ message: '등록되었습니다.', type: 'success' });
        setNoticeTitle('');
        setNoticeContent('');
        setNoticeIsPinned(false);
        setShowNoticeModal(false);
        loadNotices();
    };

    const handleDeleteNotice = async (id: string) => {
        if (!confirm('삭제하시겠습니까?')) return;
        await deleteDoc(doc(db, 'notices', id));
        onToast({ message: '삭제되었습니다.', type: 'success' });
        loadNotices();
    };

    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">공지/이벤트 관리</h2>
                <button onClick={() => setShowNoticeModal(true)} className="btn-primary text-sm">
                    + 등록
                </button>
            </div>

            <div className="space-y-2">
                {notices.map((n) => (
                    <div key={n.id} className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                        <span
                            className={`text-xs px-2 py-0.5 rounded-full font-bold shrink-0
                ${n.type === '공지' ? 'bg-indigo-100 text-indigo-700' : 'bg-rose-100 text-rose-700'}`}
                        >
                            {n.type}
                        </span>
                        {n.isPinned && <span className="badge badge-warning shrink-0">📌 배너</span>}
                        <p className="flex-1 font-medium text-sm truncate">{n.title}</p>
                        <button
                            onClick={() => handleDeleteNotice(n.id)}
                            className="text-xs text-red-400 hover:underline shrink-0"
                        >
                            삭제
                        </button>
                    </div>
                ))}
            </div>

            {notices.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-4xl mb-3">📢</p>
                    <p className="text-gray-400 text-sm">등록된 공지가 없습니다.</p>
                </div>
            )}

            <Modal
                isOpen={showNoticeModal}
                onClose={() => {
                    setShowNoticeModal(false);
                    setNoticeTitle('');
                    setNoticeContent('');
                    setNoticeIsPinned(false);
                }}
                title="공지/이벤트 등록"
                confirmText="등록"
                cancelText="취소"
                onConfirm={handleAddNotice}
            >
                <div className="space-y-3">
                    <div className="flex gap-2">
                        {(['공지', '이벤트'] as const).map((t) => (
                            <button
                                key={t}
                                onClick={() => setNoticeType(t)}
                                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-all
                                        ${noticeType === t
                                        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                                        : 'border-gray-200 text-gray-500'}`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <label className="flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all border-gray-200 hover:border-indigo-300">
                        <input
                            type="checkbox"
                            checked={noticeIsPinned}
                            onChange={(e) => setNoticeIsPinned(e.target.checked)}
                            className="accent-indigo-600 w-4 h-4"
                        />
                        <div>
                            <p className="text-sm font-medium">메인 배너에 표시</p>
                            <p className="text-xs text-gray-400">고정 설정 시 메인 페이지 상단에 노출됩니다</p>
                        </div>
                    </label>

                    <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="제목"
                        className="input-field"
                    />
                    <textarea
                        value={noticeContent}
                        onChange={(e) => setNoticeContent(e.target.value)}
                        placeholder="내용"
                        rows={5}
                        className="input-field resize-none"
                    />
                </div>
            </Modal>
        </div>
    );
}