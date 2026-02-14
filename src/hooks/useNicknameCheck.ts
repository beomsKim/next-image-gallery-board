'use client';

import { useState, useEffect } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useNicknameCheck = (nickname: string, currentNickname?: string) => {
    const [isChecking, setIsChecking] = useState(false);
    const [isAvailable, setIsAvailable] = useState<boolean | null>(null);
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!nickname || nickname === currentNickname) {
            setIsAvailable(null);
            setMessage('');
            return;
        }
        if (nickname.length < 2 || nickname.length > 20) {
            setIsAvailable(false);
            setMessage('닉네임은 2자 이상 20자 이하여야 합니다.');
            return;
        }
        const timer = setTimeout(async () => {
            setIsChecking(true);
            try {
                const q = query(collection(db, 'users'), where('nickname', '==', nickname));
                const snap = await getDocs(q);
                setIsAvailable(snap.empty);
                setMessage(snap.empty ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.');
            } catch {
                setIsAvailable(false);
                setMessage('확인에 실패했습니다.');
            } finally {
                setIsChecking(false);
            }
        }, 500);
        return () => clearTimeout(timer);
    }, [nickname, currentNickname]);

    return { isChecking, isAvailable, message };
};