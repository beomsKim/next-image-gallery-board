'use client';

import { useEffect, useState } from 'react';
import Image from 'next/image';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
    const [current, setCurrent] = useState(initialIndex);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') setCurrent((p) => Math.max(0, p - 1));
            if (e.key === 'ArrowRight') setCurrent((p) => Math.min(images.length - 1, p + 1));
        };
        window.addEventListener('keydown', handler);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handler);
        };
    }, [images.length, onClose]);

    return (
        <div className="fixed inset-0 z-[100] bg-black/95 flex items-center justify-center animate-fadeIn">
            {/* 닫기 */}
            <button
                onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
                   bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
            >
                <FiX size={20} />
            </button>

            {/* 이미지 카운터 */}
            {images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white
                       text-xs px-3 py-1.5 rounded-full">
                    {current + 1} / {images.length}
                </div>
            )}

            {/* 이전 버튼 */}
            {current > 0 && (
                <button
                    onClick={() => setCurrent((p) => p - 1)}
                    className="absolute left-4 w-10 h-10 flex items-center justify-center
                     bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <FiChevronLeft size={22} />
                </button>
            )}

            {/* 이미지 */}
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-16">
                <div className="relative max-w-full max-h-full">
                    <Image
                        src={images[current]}
                        alt={`이미지 ${current + 1}`}
                        width={1200}
                        height={900}
                        className="object-contain max-h-[90vh] w-auto rounded-lg"
                        priority
                    />
                </div>
            </div>

            {/* 다음 버튼 */}
            {current < images.length - 1 && (
                <button
                    onClick={() => setCurrent((p) => p + 1)}
                    className="absolute right-4 w-10 h-10 flex items-center justify-center
                     bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors"
                >
                    <FiChevronRight size={22} />
                </button>
            )}

            {/* 하단 썸네일 (이미지 여러 장일 때) */}
            {images.length > 1 && (
                <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            className={`w-2 h-2 rounded-full transition-all
                ${i === current ? 'bg-white w-4' : 'bg-white/40'}`}
                        />
                    ))}
                </div>
            )}

            {/* 배경 클릭으로 닫기 */}
            <div className="absolute inset-0 -z-10" onClick={onClose} />
        </div>
    );
}