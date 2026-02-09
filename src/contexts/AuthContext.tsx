'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
    User as FirebaseUser,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut as firebaseSignOut,
    GoogleAuthProvider,
    signInWithPopup,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    updateEmail,
    updatePassword,
    deleteUser,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { User, UserProfile } from '@/types/user';

interface AuthContextType {
    user: User | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signUp: (email: string, password: string) => Promise<void>;
    signInWithGoogle: () => Promise<void>;
    signOut: () => Promise<void>;
    sendVerificationEmail: () => Promise<void>;
    resetPassword: (email: string) => Promise<void>;
    updateUserProfile: (data: Partial<UserProfile>) => Promise<void>;
    deleteAccount: () => Promise<void>;
    checkNicknameAvailability: (nickname: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return context;
};

// 랜덤 닉네임 생성 함수
const generateRandomNickname = (): string => {
    const adjectives = [
        '행복한', '즐거운', '신나는', '평화로운', '귀여운',
        '멋진', '활발한', '조용한', '밝은', '따뜻한',
        '시원한', '부드러운', '강한', '빠른', '느긋한',
    ];
    
    const nouns = [
        '고양이', '강아지', '토끼', '햄스터', '새',
        '나무', '꽃', '구름', '별', '달',
        '바람', '파도', '산', '강', '호수',
    ];
    
    const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
    const randomNumber = Math.floor(1000 + Math.random() * 9000);
    
    return `${randomAdjective}${randomNoun}${randomNumber}`;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                // Firestore에서 사용자 정보 가져오기
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        nickname: userData.nickname,
                        isAdmin: userData.isAdmin || false,
                        createdAt: userData.createdAt?.toDate(),
                        updatedAt: userData.updatedAt?.toDate(),
                        likedPosts: userData.likedPosts || [],
                        bookmarkedPosts: userData.bookmarkedPosts || [],
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    // 회원가입
    const signUp = async (email: string, password: string) => {
        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            const user = userCredential.user;

            // 랜덤 닉네임 생성
            let nickname = generateRandomNickname();
            
            // 닉네임 중복 확인 (최대 10번 시도)
            let attempts = 0;
            while (attempts < 10) {
                const isAvailable = await checkNicknameAvailability(nickname);
                if (isAvailable) break;
                nickname = generateRandomNickname();
                attempts++;
            }

            // Firestore에 사용자 정보 저장
            const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            const isAdmin = email === adminEmail;

            await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                nickname: nickname,
                isAdmin: isAdmin,
                createdAt: new Date(),
                updatedAt: new Date(),
                likedPosts: [],
                bookmarkedPosts: [],
            });

            // 프로필 업데이트
            await updateProfile(user, { displayName: nickname });

            // 이메일 인증 발송
            await sendEmailVerification(user);
        } catch (error: any) {
            console.error('회원가입 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    // 로그인
    const signIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            console.error('로그인 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    // Google 로그인
    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const result = await signInWithPopup(auth, provider);
            const user = result.user;

            // Firestore에 사용자 정보가 없으면 생성
            const userDoc = await getDoc(doc(db, 'users', user.uid));
            
            if (!userDoc.exists()) {
                const nickname = generateRandomNickname();
                const adminEmail = process.env.NEXT_PUBLIC_ADMIN_EMAIL;
                const isAdmin = user.email === adminEmail;

                await setDoc(doc(db, 'users', user.uid), {
                uid: user.uid,
                email: user.email,
                nickname: nickname,
                isAdmin: isAdmin,
                createdAt: new Date(),
                updatedAt: new Date(),
                likedPosts: [],
                bookmarkedPosts: [],
                });
            }
        } catch (error: any) {
            console.error('Google 로그인 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    // 로그아웃
    const signOut = async () => {
        try {
            await firebaseSignOut(auth);
            setUser(null);
        } catch (error: any) {
            console.error('로그아웃 실패:', error);
            throw new Error('로그아웃에 실패했습니다.');
        }
    };

    // 이메일 인증 발송
    const sendVerificationEmail = async () => {
        try {
            if (auth.currentUser) {
                await sendEmailVerification(auth.currentUser);
            }
        } catch (error: any) {
            console.error('인증 메일 발송 실패:', error);
            throw new Error('인증 메일 발송에 실패했습니다.');
        }
    };

    // 비밀번호 재설정
    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            console.error('비밀번호 재설정 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    // 닉네임 중복 확인
    const checkNicknameAvailability = async (nickname: string): Promise<boolean> => {
        try {
            // 모든 사용자 문서에서 닉네임 검색
            // 실제로는 nicknames 컬렉션을 별도로 관리하는 것이 더 효율적
            // 여기서는 간단히 구현
            return true; // 실제 구현 필요
        } catch (error) {
            console.error('닉네임 확인 실패:', error);
            return false;
        }
    };

    // 사용자 정보 업데이트
    const updateUserProfile = async (data: Partial<UserProfile>) => {
        try {
            if (!auth.currentUser || !user) {
                throw new Error('로그인이 필요합니다.');
            }

            const updates: any = {
                updatedAt: new Date(),
            };

            // 닉네임 변경
            if (data.nickname && data.nickname !== user.nickname) {
                const isAvailable = await checkNicknameAvailability(data.nickname);
                if (!isAvailable) {
                throw new Error('이미 사용 중인 닉네임입니다.');
                }
                updates.nickname = data.nickname;
                await updateProfile(auth.currentUser, { displayName: data.nickname });
            }

            // 이메일 변경
            if (data.email && data.email !== user.email) {
                await updateEmail(auth.currentUser, data.email);
                updates.email = data.email;
                await sendEmailVerification(auth.currentUser);
            }

            // Firestore 업데이트
            await updateDoc(doc(db, 'users', user.uid), updates);

            // 로컬 상태 업데이트
            setUser({ ...user, ...updates });
        } catch (error: any) {
            console.error('프로필 업데이트 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    // 회원 탈퇴
    const deleteAccount = async () => {
        try {
            if (!auth.currentUser || !user) {
                throw new Error('로그인이 필요합니다.');
            }

            const userId = user.uid;

            // Firestore 사용자 문서 삭제
            await deleteDoc(doc(db, 'users', userId));

            // Firebase Auth 사용자 삭제
            await deleteUser(auth.currentUser);

            setUser(null);
        } catch (error: any) {
            console.error('회원 탈퇴 실패:', error);
            throw new Error(getErrorMessage(error.code));
        }
    };

    const value = {
        user,
        loading,
        signIn,
        signUp,
        signInWithGoogle,
        signOut,
        sendVerificationEmail,
        resetPassword,
        updateUserProfile,
        deleteAccount,
        checkNicknameAvailability,
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Firebase 에러 메시지 변환
const getErrorMessage = (code: string): string => {
    switch (code) {
        case 'auth/email-already-in-use':
        return '이미 사용 중인 이메일입니다.';
        case 'auth/weak-password':
        return '비밀번호는 6자 이상이어야 합니다.';
        case 'auth/invalid-email':
        return '올바른 이메일 형식이 아닙니다.';
        case 'auth/user-not-found':
        return '존재하지 않는 계정입니다.';
        case 'auth/wrong-password':
        return '비밀번호가 올바르지 않습니다.';
        case 'auth/too-many-requests':
        return '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.';
        case 'auth/network-request-failed':
        return '네트워크 연결을 확인해주세요.';
        case 'auth/requires-recent-login':
        return '보안을 위해 다시 로그인해주세요.';
        default:
        return '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
    }
};