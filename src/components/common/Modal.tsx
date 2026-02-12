import { ReactNode } from 'react';

// interface ModalProps {
//     isOpen: boolean;
//     onClose: () => void;
//     title?: string;
//     children: ReactNode;
//     confirmText?: string;
//     cancelText?: string;
//     onConfirm?: () => void;
// }

// export default function Modal({
//     isOpen,
//     onClose,
//     title,
//     children,
//     confirmText = '확인',
//     cancelText = '취소',
//     onConfirm,
// }: ModalProps) {
//     if (!isOpen) return null;

//     return (
//         <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
//             <div className="bg-white rounded-lg max-w-md w-full animate-fadeIn">
//                 {/* 헤더 */}
//                 {title && (
//                     <div className="px-6 py-4 border-b border-gray-200">
//                         <h3 className="text-lg font-semibold">{title}</h3>
//                     </div>
//                 )}

//                 {/* 내용 */}
//                 <div className="px-6 py-4">
//                     {children}
//                 </div>

//                 {/* 버튼 */}
//                 <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-2">
//                     <button
//                         onClick={onClose}
//                         className="btn-secondary"
//                     >
//                         {cancelText}
//                     </button>
//                     {onConfirm && (
//                         <button
//                             onClick={onConfirm}
//                             className="btn-primary"
//                         >
//                             {confirmText}
//                         </button>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
    confirmText?: string;
    cancelText?: string;  // optional
    onConfirm?: () => void;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    children,
    confirmText = '확인',
    cancelText,
    onConfirm,
}: ModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black bg-opacity-50" onClick={onClose} />
            <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
                <h3 className="text-xl font-bold mb-4">{title}</h3>
                <div className="mb-6">{children}</div>
                <div className="flex gap-3 justify-end">
                    {/* ✅ cancelText 있을 때만 취소 버튼 표시 */}
                    {cancelText && (
                        <button onClick={onClose} className="btn-secondary">
                            {cancelText}
                        </button>
                    )}
                    <button onClick={onConfirm || onClose} className="btn-primary">
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}