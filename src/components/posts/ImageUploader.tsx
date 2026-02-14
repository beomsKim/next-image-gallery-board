'use client';

import { useRef } from 'react';
import Image from 'next/image';
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, useSortable, rectSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { FiUpload, FiX } from 'react-icons/fi';
import { MdDragIndicator } from 'react-icons/md';
import { UploadedImage } from '@/hooks/useImageUpload';

interface ImageUploaderProps {
    images: UploadedImage[];
    onAddImages: (files: FileList) => void;
    onRemoveImage: (id: string) => void;
    onReorderImages: (startIndex: number, endIndex: number) => void;
    maxImages?: number;
}

function SortableImage({
    image, images, onRemove,
}: {
    image: UploadedImage;
    images: UploadedImage[];
    onRemove: () => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.id });

    return (
        <div ref={setNodeRef}
            style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
            className="relative aspect-square bg-gray-100 rounded-xl overflow-hidden group">
            <Image src={image.preview} alt="Preview" fill className="object-cover" />

            {/* 드래그 핸들 */}
            <div {...attributes} {...listeners}
                className="absolute top-1 left-1 bg-black bg-opacity-50 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity">
                <MdDragIndicator size={18} />
            </div>

            {/* 삭제 */}
            <button onClick={onRemove}
                className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 opacity-0 group-hover:opacity-100 transition-opacity">
                <FiX size={14} />
            </button>

            {/* 썸네일 표시 */}
            {images.indexOf(image) === 0 && (
                <div className="absolute bottom-1 left-1 bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full font-medium">
                    썸네일
                </div>
            )}
        </div>
    );
}

export default function ImageUploader({
    images, onAddImages, onRemoveImage, onReorderImages, maxImages = 5,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files?.length) {
            onAddImages(e.target.files);
            e.target.value = '';
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIdx = images.findIndex((i) => i.id === active.id);
            const newIdx = images.findIndex((i) => i.id === over.id);
            onReorderImages(oldIdx, newIdx);
        }
    };

    return (
        <div>
            <input ref={fileInputRef} type="file" accept="image/*" multiple
                onChange={handleFileChange} className="hidden" />
            <button type="button" onClick={() => fileInputRef.current?.click()}
                disabled={images.length >= maxImages}
                className="w-full btn-secondary flex items-center justify-center gap-2 py-3">
                <FiUpload size={18} />
                이미지 선택 ({images.length}/{maxImages})
            </button>
            <p className="text-xs text-gray-400 mt-2">
                최대 {maxImages}장 · 파일당 5MB 이하 · JPG/PNG/WebP · 드래그로 순서 변경 (첫 번째 = 썸네일)
            </p>

            {images.length > 0 && (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-4">
                            {images.map((img) => (
                                <SortableImage key={img.id} image={img} images={images} onRemove={() => onRemoveImage(img.id)} />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}