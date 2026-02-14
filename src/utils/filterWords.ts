import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const getFilterWords = async (): Promise<{
    badWords: string[];
    forbiddenNicknames: string[];
}> => {
    try {
        const docRef = doc(db, 'settings', 'filters');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
            return {
                badWords: docSnap.data().badWords || [],
                forbiddenNicknames: docSnap.data().forbiddenNicknames || [],
            };
        }
        return {
            badWords: [],
            forbiddenNicknames: ['운영자', '관리자', '대표', 'GM', 'Admin', 'admin', 'ADMIN', '어드민'],
        };
    } catch {
        return { badWords: [], forbiddenNicknames: [] };
    }
};

export const containsBadWord = (text: string, badWords: string[]): boolean => {
    const lower = text.toLowerCase();
    return badWords.some((w) => lower.includes(w.toLowerCase()));
};

export const isForbiddenNickname = (nickname: string, forbiddenList: string[]): boolean => {
    const lower = nickname.toLowerCase();
    return forbiddenList.some((w) => lower.includes(w.toLowerCase()));
};

export const addFilterWord = async (
    type: 'badWords' | 'forbiddenNicknames',
    word: string
): Promise<void> => {
    const docRef = doc(db, 'settings', 'filters');
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        await updateDoc(docRef, { [type]: arrayUnion(word.trim()) });
    } else {
        await setDoc(docRef, {
            badWords: type === 'badWords' ? [word.trim()] : [],
            forbiddenNicknames: type === 'forbiddenNicknames' ? [word.trim()] : [],
        });
    }
};

export const removeFilterWord = async (
    type: 'badWords' | 'forbiddenNicknames',
    word: string
): Promise<void> => {
    const docRef = doc(db, 'settings', 'filters');
    await updateDoc(docRef, { [type]: arrayRemove(word) });
};