'use client';

import { useState, useEffect } from 'react';
import {
    collection, query, where, orderBy,
    onSnapshot, doc, updateDoc, deleteDoc,
    arrayUnion, arrayRemove, increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { Comment } from '@/types/comment';
import { addCommentFn } from '@/lib/functions';
import { formatRelativeTime } from '@/utils/format';
import { AiOutlineHeart, AiFillHeart } from 'react-icons/ai';
import { FiCornerDownRight, FiTrash2, FiMessageCircle } from 'react-icons/fi';
import Toast from '@/components/common/Toast';

interface CommentSectionProps {
    postId: string;
}

export default function CommentSection({ postId }: CommentSectionProps) {
    const { user } = useAuth();
    const [comments, setComments] = useState<Comment[]>([]);
    const [loading, setLoading] = useState(true);
    const [input, setInput] = useState('');
    const [replyTo, setReplyTo] = useState<{ id: string; nickname: string } | null>(null);
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // 실시간 댓글 구독
    useEffect(() => {
        const q = query(
            collection(db, 'comments'),
            where('postId', '==', postId),
            orderBy('createdAt', 'asc')
        );

        const unsubscribe = onSnapshot(q, (snap) => {
            setComments(snap.docs.map((d) => ({ id: d.id, ...d.data() })) as Comment[]);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [postId]);

    const handleSubmit = async () => {
        if (!user) { setToast({ message: '로그인이 필요합니다.', type: 'error' }); return; }
        if (!input.trim()) return;
        if (input.length > 300) { setToast({ message: '댓글은 300자 이하로 입력해주세요.', type: 'error' }); return; }

        setSubmitting(true);
        try {
            await addCommentFn({
                postId,
                content: input.trim(),
                parentId: replyTo?.id || null,
                replyToNickname: replyTo?.nickname || null,
            });
            setInput('');
            setReplyTo(null);
        } catch (err: any) {
            setToast({ message: err.message || '댓글 작성에 실패했습니다.', type: 'error' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleLike = async (comment: Comment) => {
        if (!user) { setToast({ message: '로그인이 필요합니다.', type: 'error' }); return; }
        const liked = comment.likedBy?.includes(user.uid);
        try {
            await updateDoc(doc(db, 'comments', comment.id), {
                likedBy: liked ? arrayRemove(user.uid) : arrayUnion(user.uid),
                likes: liked ? comment.likes - 1 : comment.likes + 1,
            });
        } catch { setToast({ message: '오류가 발생했습니다.', type: 'error' }); }
    };

    const handleDelete = async (comment: Comment) => {
        if (!confirm('댓글을 삭제하시겠습니까?')) return;
        try {
            const hasReplies = comments.some((c) => c.parentId === comment.id);
            if (hasReplies) {
                await updateDoc(doc(db, 'comments', comment.id), {
                    isDeleted: true,
                    content: '삭제된 댓글입니다.',
                });
            } else {
                await deleteDoc(doc(db, 'comments', comment.id));
                //  댓글 수 감소
                await updateDoc(doc(db, 'posts', postId), {
                    commentCount: increment(-1),
                });
            }
        } catch {
            setToast({ message: '삭제에 실패했습니다.', type: 'error' });
        }
    };

    // 최상위 댓글만 필터
    const topLevel = comments.filter((c) => !c.parentId);
    // 답글 가져오기
    const getReplies = (parentId: string) => comments.filter((c) => c.parentId === parentId);

    const totalCount = comments.filter((c) => !c.isDeleted).length;

    return (
        <div className="px-5 py-5 border-t border-gray-100">
            {/* 헤더 */}
            <div className="flex items-center gap-2 mb-5">
                <FiMessageCircle size={18} className="text-gray-500" />
                <h3 className="font-bold text-gray-900">댓글 {totalCount}개</h3>
            </div>

            {/* 입력창 */}
            <div className="mb-6">
                {replyTo && (
                    <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-indigo-50 rounded-xl text-sm">
                        <FiCornerDownRight size={14} className="text-indigo-500 shrink-0" />
                        <span className="text-indigo-700 font-medium truncate">@{replyTo.nickname}</span>
                        <span className="text-indigo-500 text-xs shrink-0">에게 답글</span>
                        <button
                            onClick={() => setReplyTo(null)}
                            className="ml-auto text-gray-400 hover:text-gray-600 shrink-0 w-5 h-5
                   flex items-center justify-center rounded-full hover:bg-gray-200">
                            ✕
                        </button>
                    </div>
                )}

                {/*  입력창 + 버튼 세로 배치로 변경 (삐뚤어짐 방지) */}
                <div className="border-2 border-gray-200 rounded-2xl overflow-hidden
                  focus-within:border-indigo-400 transition-colors">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit();
                            }
                        }}
                        placeholder={
                            user
                                ? (replyTo ? `@${replyTo.nickname}에게 답글 작성...` : '댓글을 입력하세요 (Shift+Enter 줄바꿈)')
                                : '로그인 후 댓글을 작성할 수 있습니다'
                        }
                        disabled={!user}
                        rows={2}
                        maxLength={300}
                        className="w-full px-4 pt-3 pb-1 text-sm focus:outline-none resize-none
                 disabled:bg-gray-50 disabled:text-gray-400 bg-white"
                    />
                    <div className="flex items-center justify-between px-3 pb-2">
                        <span className="text-[11px] text-gray-300">{input.length}/300</span>
                        <button
                            onClick={handleSubmit}
                            disabled={!user || !input.trim() || submitting}
                            className="px-4 py-1.5 bg-indigo-600 text-white text-xs font-bold rounded-xl
                   hover:bg-indigo-700 active:scale-95 transition-all
                   disabled:bg-gray-200 disabled:text-gray-400 disabled:cursor-not-allowed"
                        >
                            {submitting ? '등록 중...' : '등록'}
                        </button>
                    </div>
                </div>
            </div>

            {/* 댓글 목록 */}
            {loading ? (
                <div className="text-center py-8 text-gray-300 text-sm">불러오는 중...</div>
            ) : topLevel.length === 0 ? (
                <div className="text-center py-8 text-gray-300 text-sm">
                    <p className="text-2xl mb-2">💬</p>
                    첫 댓글을 남겨보세요!
                </div>
            ) : (
                <div className="space-y-4">
                    {topLevel.map((comment) => (
                        <div key={comment.id}>
                            <CommentItem
                                comment={comment}
                                currentUserId={user?.uid}
                                isAdmin={user?.isAdmin}
                                onLike={() => handleLike(comment)}
                                onDelete={() => handleDelete(comment)}
                                onReply={() => setReplyTo({ id: comment.id, nickname: comment.authorNickname })}
                            />

                            {/* 답글 */}
                            {getReplies(comment.id).map((reply) => (
                                <div key={reply.id} className="ml-8 mt-2">
                                    <CommentItem
                                        comment={reply}
                                        currentUserId={user?.uid}
                                        isAdmin={user?.isAdmin}
                                        isReply
                                        onLike={() => handleLike(reply)}
                                        onDelete={() => handleDelete(reply)}
                                        onReply={() => setReplyTo({ id: comment.id, nickname: reply.authorNickname })}
                                    />
                                </div>
                            ))}

                            {/* 답글 달기 버튼 */}
                            {!comment.isDeleted && user && (
                                <button
                                    onClick={() => setReplyTo({ id: comment.id, nickname: comment.authorNickname })}
                                    className="ml-2 mt-1 text-xs text-gray-400 hover:text-indigo-500 transition-colors flex items-center gap-1"
                                >
                                    <FiCornerDownRight size={11} /> 답글 달기
                                </button>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {toast && <Toast {...toast} onClose={() => setToast(null)} />}
        </div>
    );
}

// ─────────────────────────────
// 개별 댓글 아이템
// ─────────────────────────────
interface CommentItemProps {
    comment: Comment;
    currentUserId?: string;
    isAdmin?: boolean;
    isReply?: boolean;
    onLike: () => void;
    onDelete: () => void;
    onReply: () => void;
}

function CommentItem({ comment, currentUserId, isAdmin, isReply, onLike, onDelete }: CommentItemProps) {
    const liked = currentUserId ? comment.likedBy?.includes(currentUserId) : false;
    const canDelete = currentUserId && (currentUserId === comment.authorId || isAdmin);
    const createdAt = comment.createdAt instanceof Date
        ? comment.createdAt
        : (comment.createdAt as any)?.toDate?.() || new Date();

    if (comment.isDeleted) {
        return (
            <div className="flex gap-3 py-2">
                <div className="w-7 h-7 rounded-full bg-gray-100 shrink-0" />
                <p className="text-sm text-gray-300 italic pt-1">삭제된 댓글입니다.</p>
            </div>
        );
    }

    return (
        <div className="flex gap-3 group">
            {/* 아바타 */}
            <div className={`shrink-0 rounded-full bg-gradient-to-br from-indigo-400 to-purple-500
                      flex items-center justify-center text-white font-bold
                      ${isReply ? 'w-6 h-6 text-[10px]' : 'w-8 h-8 text-xs'}`}>
                {comment.authorNickname.charAt(0)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{comment.authorNickname}</span>
                    {comment.replyToNickname && (
                        <span className="text-xs text-indigo-500">@{comment.replyToNickname}</span>
                    )}
                    <span className="text-[11px] text-gray-300">{formatRelativeTime(createdAt)}</span>
                </div>

                <p className="text-sm text-gray-700 mt-0.5 leading-relaxed break-words">{comment.content}</p>

                {/* 하단 액션 */}
                <div className="flex items-center gap-3 mt-1">
                    <button
                        onClick={onLike}
                        className={`flex items-center gap-1 text-xs transition-colors
              ${liked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                    >
                        {liked ? <AiFillHeart size={13} /> : <AiOutlineHeart size={13} />}
                        {comment.likes > 0 && <span>{comment.likes}</span>}
                    </button>

                    {canDelete && (
                        <button onClick={onDelete}
                            className="text-xs text-gray-300 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100">
                            <FiTrash2 size={12} />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}