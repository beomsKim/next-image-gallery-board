'use client';

import { useEffect } from 'react';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
    cancelText?: string;
    onConfirm?: () => void;
    confirmClassName?: string;
}

export default function Modal({
    isOpen, onClose, title, children,
    confirmText = '확인', cancelText, onConfirm, confirmClassName,
}: ModalProps) {
    // ESC 키 닫기
    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, onClose]);

    // 스크롤 방지
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => { document.body.style.overflow = ''; };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            {/* 배경 */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-fadeIn"
                onClick={onClose} />

            {/* 모달 본체 - 모바일: 하단 시트, 데스크톱: 중앙 */}
            <div className="relative w-full sm:max-w-md bg-white
                     rounded-t-3xl sm:rounded-3xl shadow-2xl
                     animate-slideUp sm:animate-scaleIn
                     max-h-[90vh] overflow-y-auto">
                {/* 모바일 드래그 핸들 */}
                <div className="sm:hidden flex justify-center pt-3 pb-1">
                    <div className="w-10 h-1 bg-gray-200 rounded-full" />
                </div>

                <div className="px-6 pt-4 pb-6 sm:p-6">
                    <h3 className="text-lg font-bold text-gray-900 mb-4">{title}</h3>
                    <div className="mb-6 text-gray-600">{children}</div>

                    <div className={`flex gap-3 ${cancelText ? 'justify-end' : 'justify-stretch'}`}>
                        {cancelText && (
                            <button onClick={onClose} className="btn-secondary flex-1 sm:flex-none">
                                {cancelText}
                            </button>
                        )}
                        <button onClick={onConfirm || onClose}
                            className={confirmClassName || `btn-primary ${!cancelText ? 'w-full' : 'flex-1 sm:flex-none'}`}>
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}