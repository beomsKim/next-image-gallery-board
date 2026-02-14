'use client';

import { useEffect, useState } from 'react';
import { FiCheckCircle, FiXCircle, FiInfo, FiX } from 'react-icons/fi';

interface ToastProps {
    message: string;
    type: 'success' | 'error' | 'info';
    onClose: () => void;
    duration?: number;
}

export default function Toast({ message, type, onClose, duration = 3000 }: ToastProps) {
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setVisible(false);
            setTimeout(onClose, 300);
        }, duration);
        return () => clearTimeout(timer);
    }, [duration, onClose]);

    const config = {
        success: { bg: 'bg-emerald-500', icon: <FiCheckCircle size={18} /> },
        error: { bg: 'bg-red-500', icon: <FiXCircle size={18} /> },
        info: { bg: 'bg-indigo-500', icon: <FiInfo size={18} /> },
    }[type];

    return (
        <div className={`fixed bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-50
                    flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-lg
                    text-white text-sm font-medium max-w-[90vw]
                    transition-all duration-300
                    ${config.bg}
                    ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
            {config.icon}
            <span className="flex-1">{message}</span>
            <button onClick={() => { setVisible(false); setTimeout(onClose, 300); }}
                className="opacity-70 hover:opacity-100 ml-1 transition-opacity shrink-0">
                <FiX size={16} />
            </button>
        </div>
    );
}