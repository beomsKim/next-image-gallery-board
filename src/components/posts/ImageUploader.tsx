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
    image,
    images,
    onRemove
}: {
    image: UploadedImage;
    images: UploadedImage[];
    onRemove: () => void
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: image.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="relative aspect-square bg-gray-100 rounded-lg overflow-hidden group"
        >
            {/* 이미지 */}
            <Image
                src={image.preview}
                alt="Preview"
                fill
                className="object-cover"
            />

            {/* 드래그 핸들 */}
            <div
                {...attributes}
                {...listeners}
                className="absolute top-2 left-2 bg-black bg-opacity-50 text-white p-1 rounded cursor-move opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <MdDragIndicator size={20} />
            </div>

            {/* 삭제 버튼 */}
            <button
                onClick={onRemove}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
            >
                <FiX size={16} />
            </button>

            {/* 첫 번째 이미지 표시 */}
            {images.indexOf(image) === 0 && (
                <div className="absolute bottom-2 left-2 bg-primary-600 text-white text-xs px-2 py-1 rounded">
                    썸네일
                </div>
            )}
        </div>
    );
}

export default function ImageUploader({
    images,
    onAddImages,
    onRemoveImage,
    onReorderImages,
    maxImages = 5,
}: ImageUploaderProps) {
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            onAddImages(e.target.files);
            e.target.value = '';
        }
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const oldIndex = images.findIndex((img) => img.id === active.id);
            const newIndex = images.findIndex((img) => img.id === over.id);
            onReorderImages(oldIndex, newIndex);
        }
    };

    return (
        <div>
            {/* 업로드 버튼 */}
            <div className="mb-4">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleFileChange}
                    className="hidden"
                />

                <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={images.length >= maxImages}
                    className="w-full btn-secondary flex items-center justify-center gap-2"
                >
                    <FiUpload size={20} />
                    이미지 선택 ({images.length}/{maxImages})
                </button>

                <p className="text-sm text-gray-500 mt-2">
                    • 최대 {maxImages}장까지 업로드 가능
                    <br />
                    • 파일당 최대 5MB
                    <br />
                    • JPG, PNG, WebP 형식 지원
                    <br />
                    • 드래그하여 순서 변경 가능 (첫 번째 이미지가 썸네일)
                </p>
            </div>

            {/* 이미지 미리보기 그리드 */}
            {images.length > 0 && (
                <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                    <SortableContext items={images.map((img) => img.id)} strategy={rectSortingStrategy}>
                        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {images.map((image) => (
                                <SortableImage
                                    key={image.id}
                                    image={image}
                                    images={images}
                                    onRemove={() => onRemoveImage(image.id)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}