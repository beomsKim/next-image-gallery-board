import { doc, getDoc, updateDoc, setDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// 설정 가져오기
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

        // 기본값
        return {
            badWords: [],
            forbiddenNicknames: ['운영자', '관리자', '대표', 'GM', 'Admin', 'admin', 'ADMIN'],
        };
    } catch (error) {
        console.error('필터 단어 로드 실패:', error);
        return { badWords: [], forbiddenNicknames: [] };
    }
};

// 비속어 검사
export const containsBadWord = (text: string, badWords: string[]): boolean => {
    const lowerText = text.toLowerCase();
    return badWords.some((word) => lowerText.includes(word.toLowerCase()));
};

// 금지 닉네임 검사
export const isForbiddenNickname = (
    nickname: string,
    forbiddenList: string[]
): boolean => {
    const lowerNickname = nickname.toLowerCase();
    return forbiddenList.some((word) =>
        lowerNickname.includes(word.toLowerCase())
    );
};

// 단어 추가
export const addFilterWord = async (
    type: 'badWords' | 'forbiddenNicknames',
    word: string
): Promise<void> => {
    const docRef = doc(db, 'settings', 'filters');
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
        await updateDoc(docRef, {
            [type]: arrayUnion(word.trim()),
        });
    } else {
        await setDoc(docRef, {
            badWords: type === 'badWords' ? [word.trim()] : [],
            forbiddenNicknames: type === 'forbiddenNicknames' ? [word.trim()] : [],
        });
    }
};

// 단어 삭제
export const removeFilterWord = async (
    type: 'badWords' | 'forbiddenNicknames',
    word: string
): Promise<void> => {
    const docRef = doc(db, 'settings', 'filters');
    await updateDoc(docRef, {
        [type]: arrayRemove(word),
    });
};