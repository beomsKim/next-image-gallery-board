'use client';

import { useState, useEffect } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { AdminTabProps } from '@/types/admin';

export default function FiltersTab({ onToast }: AdminTabProps) {
    const [badWords, setBadWords] = useState('');
    const [bannedNicknames, setBannedNicknames] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => { loadFilters(); }, []);

    const loadFilters = async () => {
        const [badWordsDoc, bannedDoc] = await Promise.all([
            getDoc(doc(db, 'settings', 'badWords')),
            getDoc(doc(db, 'settings', 'bannedNicknames')),
        ]);
        if (badWordsDoc.exists()) {
            setBadWords((badWordsDoc.data().words || []).join(', '));
        }
        if (bannedDoc.exists()) {
            setBannedNicknames((bannedDoc.data().nicknames || []).join(', '));
        }
    };

    const handleSaveBadWords = async () => {
        setLoading(true);
        try {
            const words = badWords.split(',').map((w) => w.trim()).filter(Boolean);
            await setDoc(doc(db, 'settings', 'badWords'), { words });
            onToast({ message: '비속어 필터가 저장되었습니다.', type: 'success' });
        } catch {
            onToast({ message: '저장에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    const handleSaveBannedNicknames = async () => {
        setLoading(true);
        try {
            const nicknames = bannedNicknames.split(',').map((n) => n.trim()).filter(Boolean);
            await setDoc(doc(db, 'settings', 'bannedNicknames'), { nicknames });
            onToast({ message: '금지 닉네임이 저장되었습니다.', type: 'success' });
        } catch {
            onToast({ message: '저장에 실패했습니다.', type: 'error' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-lg font-bold mb-1">비속어 필터</h2>
                <p className="text-xs text-gray-400 mb-3">쉼표(,)로 구분하여 입력하세요</p>
                <textarea
                    value={badWords}
                    onChange={(e) => setBadWords(e.target.value)}
                    rows={4}
                    placeholder="예: 욕설1, 욕설2, 욕설3"
                    className="input-field resize-none mb-3"
                />
                <button
                    onClick={handleSaveBadWords}
                    disabled={loading}
                    className="btn-primary text-sm"
                >
                    {loading ? '저장 중...' : '저장'}
                </button>
            </div>

            <hr className="border-gray-200" />

            <div>
                <h2 className="text-lg font-bold mb-1">금지 닉네임</h2>
                <p className="text-xs text-gray-400 mb-3">쉼표(,)로 구분하여 입력하세요</p>
                <textarea
                    value={bannedNicknames}
                    onChange={(e) => setBannedNicknames(e.target.value)}
                    rows={4}
                    placeholder="예: 관리자, admin, 운영자"
                    className="input-field resize-none mb-3"
                />
                <button
                    onClick={handleSaveBannedNicknames}
                    disabled={loading}
                    className="btn-primary text-sm"
                >
                    {loading ? '저장 중...' : '저장'}
                </button>
            </div>
        </div>
    );
}