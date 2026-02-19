'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
    collection, query, where, orderBy, onSnapshot,
    updateDoc, doc, writeBatch, limit
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Notification } from '@/types/notification';
import { formatRelativeTime } from '@/utils/format';
import { FiBell } from 'react-icons/fi';
import { AiOutlineHeart } from 'react-icons/ai';
import { FiMessageCircle, FiCornerDownRight } from 'react-icons/fi';

export default function NotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showPanel, setShowPanel] = useState(false);
    const panelRef = useRef<HTMLDivElement>(null);

    const unreadCount = notifications.filter((n) => !n.isRead).length;

    // 실시간 알림 구독
    useEffect(() => {
        if (!user) return;

        const q = query(
            collection(db, 'notifications'),
            where('userId', '==', user.uid),
            orderBy('createdAt', 'desc'),
            limit(30)
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setNotifications(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Notification[]);
        });

        return () => unsubscribe();
    }, [user]);

    // 외부 클릭 시 패널 닫기
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
                setShowPanel(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    const handleOpen = () => {
        setShowPanel((prev) => !prev);
        // 패널 열 때 전부 읽음 처리
        if (!showPanel && unreadCount > 0) {
            markAllRead();
        }
    };

    const markAllRead = async () => {
        const unread = notifications.filter((n) => !n.isRead);
        if (unread.length === 0) return;
        const batch = writeBatch(db);
        unread.forEach((n) => {
            batch.update(doc(db, 'notifications', n.id), { isRead: true });
        });
        await batch.commit();
    };

    const handleNotifClick = async (notif: Notification) => {
        if (!notif.isRead) {
            await updateDoc(doc(db, 'notifications', notif.id), { isRead: true });
        }
        setShowPanel(false);
        router.push(`/posts/${notif.postId}`);
    };

    const getIcon = (type: Notification['type']) => {
        if (type === 'like') return <AiOutlineHeart size={14} className="text-red-500" />;
        if (type === 'reply') return <FiCornerDownRight size={14} className="text-indigo-500" />;
        return <FiMessageCircle size={14} className="text-emerald-500" />;
    };

    const getMessage = (notif: Notification) => {
        if (notif.type === 'like') return `${notif.fromNickname}님이 회원님의 게시글을 좋아합니다.`;
        if (notif.type === 'reply') return `${notif.fromNickname}님이 답글을 남겼습니다.`;
        return `${notif.fromNickname}님이 댓글을 남겼습니다.`;
    };

    if (!user) return null;

    return (
        <div ref={panelRef} className="relative">
            {/* 벨 아이콘 버튼 */}
            <button
                onClick={handleOpen}
                className="relative w-9 h-9 flex items-center justify-center rounded-xl
                   text-gray-500 hover:bg-gray-100 active:bg-gray-200 transition-all"
            >
                <FiBell size={20} strokeWidth={unreadCount > 0 ? 2.5 : 1.8} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white
                           text-[9px] font-bold rounded-full flex items-center justify-center
                           animate-pulse">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* 알림 패널 */}
            {showPanel && (
                <div className="absolute right-0 top-11 w-80 bg-white rounded-2xl shadow-2xl
                       border border-gray-100 z-50 overflow-hidden animate-scaleIn
                       max-h-[70vh] flex flex-col">
                    {/* 헤더 */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                        <span className="font-bold text-gray-900 text-sm">알림</span>
                        {unreadCount > 0 && (
                            <button onClick={markAllRead}
                                className="text-xs text-indigo-500 hover:underline font-medium">
                                모두 읽음
                            </button>
                        )}
                    </div>

                    {/* 알림 목록 */}
                    <div className="overflow-y-auto flex-1">
                        {notifications.length === 0 ? (
                            <div className="text-center py-10">
                                <p className="text-3xl mb-2">🔔</p>
                                <p className="text-sm text-gray-400">알림이 없습니다.</p>
                            </div>
                        ) : (
                            notifications.map((notif) => (
                                <button
                                    key={notif.id}
                                    onClick={() => handleNotifClick(notif)}
                                    className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors
                             flex items-start gap-3 border-b border-gray-50 last:border-b-0
                             ${!notif.isRead ? 'bg-indigo-50/50' : ''}`}
                                >
                                    {/* 타입 아이콘 */}
                                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                                        {getIcon(notif.type)}
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <p className="text-xs text-gray-700 leading-relaxed">
                                            {getMessage(notif)}
                                        </p>
                                        <p className="text-[11px] text-gray-400 truncate mt-0.5">
                                            {notif.postTitle}
                                        </p>
                                        {notif.commentContent && (
                                            <p className="text-[11px] text-gray-400 truncate mt-0.5 italic">
                                                "{notif.commentContent}"
                                            </p>
                                        )}
                                        <p className="text-[10px] text-gray-300 mt-1">
                                            {formatRelativeTime(
                                                (notif.createdAt as any)?.toDate?.() || new Date()
                                            )}
                                        </p>
                                    </div>

                                    {/* 미읽음 점 */}
                                    {!notif.isRead && (
                                        <div className="w-2 h-2 bg-indigo-500 rounded-full shrink-0 mt-1.5" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}