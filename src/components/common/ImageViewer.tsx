'use client';

import { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { FiX, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

interface ImageViewerProps {
    images: string[];
    initialIndex?: number;
    onClose: () => void;
}

export default function ImageViewer({ images, initialIndex = 0, onClose }: ImageViewerProps) {
    const [current, setCurrent] = useState(initialIndex);

    const prev = useCallback(() => setCurrent((p) => Math.max(0, p - 1)), []);
    const next = useCallback(() => setCurrent((p) => Math.min(images.length - 1, p + 1)), [images.length]);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose();
            if (e.key === 'ArrowLeft') prev();
            if (e.key === 'ArrowRight') next();
        };
        window.addEventListener('keydown', handler);
        return () => {
            document.body.style.overflow = '';
            window.removeEventListener('keydown', handler);
        };
    }, [onClose, prev, next]);

    // 스와이프 지원
    const [touchStart, setTouchStart] = useState<number | null>(null);

    return (
        <div
            className="fixed inset-0 z-[100] bg-black/96 flex items-center justify-center animate-fadeIn"
            onTouchStart={(e) => setTouchStart(e.touches[0].clientX)}
            onTouchEnd={(e) => {
                if (touchStart === null) return;
                const diff = touchStart - e.changedTouches[0].clientX;
                if (Math.abs(diff) > 50) { diff > 0 ? next() : prev(); }
                setTouchStart(null);
            }}
        >
            {/* 닫기 */}
            <button onClick={onClose}
                className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center
                   bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                <FiX size={20} />
            </button>

            {/* 카운터 */}
            {images.length > 1 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-black/50 text-white
                       text-xs px-3 py-1.5 rounded-full font-medium">
                    {current + 1} / {images.length}
                </div>
            )}

            {/* 이전 */}
            {current > 0 && (
                <button onClick={prev}
                    className="absolute left-3 md:left-6 z-10 w-10 h-10 flex items-center justify-center
                     bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <FiChevronLeft size={22} />
                </button>
            )}

            {/* 이미지 */}
            <div className="relative w-full h-full flex items-center justify-center p-4 sm:p-16"
                onClick={onClose}>
                <div onClick={(e) => e.stopPropagation()} className="relative">
                    <Image src={images[current]} alt={`이미지 ${current + 1}`}
                        width={1200} height={900}
                        className="object-contain max-h-[90vh] w-auto max-w-full rounded-lg"
                        priority />
                </div>
            </div>

            {/* 다음 */}
            {current < images.length - 1 && (
                <button onClick={next}
                    className="absolute right-3 md:right-6 z-10 w-10 h-10 flex items-center justify-center
                     bg-white/10 hover:bg-white/20 rounded-full text-white transition-colors">
                    <FiChevronRight size={22} />
                </button>
            )}

            {/* 하단 점 인디케이터 */}
            {images.length > 1 && (
                <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-1.5">
                    {images.map((_, i) => (
                        <button key={i} onClick={() => setCurrent(i)}
                            className={`rounded-full transition-all ${i === current ? 'bg-white w-5 h-1.5' : 'bg-white/40 w-1.5 h-1.5'}`} />
                    ))}
                </div>
            )}
        </div>
    );
}