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
    signInWithRedirect,
    getRedirectResult,
    sendEmailVerification,
    sendPasswordResetEmail,
    updateProfile,
    verifyBeforeUpdateEmail,
    deleteUser,
} from 'firebase/auth';
import {
    doc, setDoc, getDoc, updateDoc, deleteDoc,
    collection, query, where, getDocs,
} from 'firebase/firestore';
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
    deleteAccount: (reasons?: string[]) => Promise<void>;
    checkNicknameAvailability: (nickname: string) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) throw new Error('useAuth must be used within AuthProvider');
    return context;
};

const generateRandomNickname = (): string => {
    const adj = ['행복한', '즐거운', '신나는', '평화로운', '귀여운', '멋진', '활발한', '조용한', '밝은', '따뜻한'];
    const noun = ['고양이', '강아지', '토끼', '햄스터', '새', '나무', '꽃', '구름', '별', '달'];
    const num = Math.floor(1000 + Math.random() * 9000);
    return `${adj[Math.floor(Math.random() * adj.length)]}${noun[Math.floor(Math.random() * noun.length)]}${num}`;
};

const getErrorMessage = (code: string): string => {
    const messages: Record<string, string> = {
        'auth/email-already-in-use': '이미 사용 중인 이메일입니다.',
        'auth/weak-password': '비밀번호는 6자 이상이어야 합니다.',
        'auth/invalid-email': '올바른 이메일 형식이 아닙니다.',
        'auth/user-not-found': '존재하지 않는 계정입니다.',
        'auth/wrong-password': '비밀번호가 올바르지 않습니다.',
        'auth/invalid-credential': '이메일 또는 비밀번호가 올바르지 않습니다.',
        'auth/too-many-requests': '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        'auth/network-request-failed': '네트워크 연결을 확인해주세요.',
        'auth/requires-recent-login': '보안을 위해 다시 로그인해주세요.',
        'auth/popup-closed-by-user': '로그인이 취소되었습니다.',
    };
    return messages[code] || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // redirect 결과 처리
        getRedirectResult(auth).then(async (result) => {
            if (!result) return;
            const firebaseUser = result.user;
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (!userDoc.exists()) {
                const nickname = generateRandomNickname();
                const isAdmin = firebaseUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                    uid: firebaseUser.uid,
                    email: firebaseUser.email,
                    nickname,
                    isAdmin,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    likedPosts: [],
                    bookmarkedPosts: [],
                });
            }
        }).catch(console.error);

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            if (firebaseUser) {
                const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
                if (userDoc.exists()) {
                    const d = userDoc.data();
                    setUser({
                        uid: firebaseUser.uid,
                        email: firebaseUser.email!,
                        nickname: d.nickname,
                        isAdmin: d.isAdmin || false,
                        createdAt: d.createdAt,
                        updatedAt: d.updatedAt,
                        likedPosts: d.likedPosts || [],
                        bookmarkedPosts: d.bookmarkedPosts || [],
                    });
                }
            } else {
                setUser(null);
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const signUp = async (email: string, password: string) => {
        try {
            const { user: firebaseUser } = await createUserWithEmailAndPassword(auth, email, password);
            let nickname = generateRandomNickname();
            for (let i = 0; i < 10; i++) {
                const q = query(collection(db, 'users'), where('nickname', '==', nickname));
                const snap = await getDocs(q);
                if (snap.empty) break;
                nickname = generateRandomNickname();
            }
            const isAdmin = email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
            await setDoc(doc(db, 'users', firebaseUser.uid), {
                uid: firebaseUser.uid, email: firebaseUser.email, nickname, isAdmin,
                createdAt: new Date(), updatedAt: new Date(), likedPosts: [], bookmarkedPosts: [],
            });
            await updateProfile(firebaseUser, { displayName: nickname });
            await sendEmailVerification(firebaseUser);
        } catch (error: any) {
            throw new Error(getErrorMessage(error.code));
        }
    };

    const signIn = async (email: string, password: string) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error: any) {
            throw new Error(getErrorMessage(error.code));
        }
    };

    const signInWithGoogle = async () => {
        try {
            const provider = new GoogleAuthProvider();
            const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
            if (isMobile) {
                await signInWithRedirect(auth, provider);
                return;
            }
            const result = await signInWithPopup(auth, provider);
            const firebaseUser = result.user;
            const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
            if (!userDoc.exists()) {
                const nickname = generateRandomNickname();
                const isAdmin = firebaseUser.email === process.env.NEXT_PUBLIC_ADMIN_EMAIL;
                await setDoc(doc(db, 'users', firebaseUser.uid), {
                    uid: firebaseUser.uid, email: firebaseUser.email, nickname, isAdmin,
                    createdAt: new Date(), updatedAt: new Date(), likedPosts: [], bookmarkedPosts: [],
                });
            }
        } catch (error: any) {
            if (error.code === 'auth/popup-closed-by-user') return;
            throw new Error(getErrorMessage(error.code));
        }
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
        setUser(null);
    };

    const sendVerificationEmail = async () => {
        if (auth.currentUser) await sendEmailVerification(auth.currentUser);
    };

    const resetPassword = async (email: string) => {
        try {
            await sendPasswordResetEmail(auth, email);
        } catch (error: any) {
            throw new Error(getErrorMessage(error.code));
        }
    };

    const checkNicknameAvailability = async (nickname: string): Promise<boolean> => {
        const q = query(collection(db, 'users'), where('nickname', '==', nickname));
        const snap = await getDocs(q);
        return snap.empty;
    };

    const updateUserProfile = async (data: Partial<UserProfile>) => {
        if (!auth.currentUser || !user) throw new Error('로그인이 필요합니다.');
        try {
            const updates: any = { updatedAt: new Date() };

            if (data.nickname && data.nickname !== user.nickname) {
                updates.nickname = data.nickname;
                await updateProfile(auth.currentUser, { displayName: data.nickname });
            }

            if (data.email && data.email !== user.email) {
                await verifyBeforeUpdateEmail(auth.currentUser, data.email);
                throw new Error('새 이메일로 인증 링크를 발송했습니다. 이메일을 확인해주세요.|info');
            }

            await updateDoc(doc(db, 'users', user.uid), updates);
            setUser({ ...user, ...updates });
        } catch (error: any) {
            if (error.message?.includes('|info')) throw error;
            throw new Error(getErrorMessage(error.code));
        }
    };

    const deleteAccount = async (reasons?: string[]) => {
        if (!auth.currentUser || !user) throw new Error('로그인이 필요합니다.');
        try {
            const userId = user.uid;

            // 탈퇴 사유 저장
            if (reasons && reasons.length > 0) {
                await setDoc(doc(db, 'withdrawal_reasons', userId), {
                    userId,
                    email: user.email,
                    nickname: user.nickname,
                    reasons,
                    deletedAt: new Date(),
                });
            }

            // 게시글 작성자명 변경
            const postsQuery = query(collection(db, 'posts'), where('authorId', '==', userId));
            const postsSnap = await getDocs(postsQuery);
            if (!postsSnap.empty) {
                await Promise.all(
                    postsSnap.docs.map((postDoc) =>
                        updateDoc(postDoc.ref, { authorNickname: '탈퇴한 사용자' })
                    )
                );
            }

            await deleteDoc(doc(db, 'users', userId));
            await deleteUser(auth.currentUser);
            setUser(null);
        } catch (error: any) {
            throw new Error(getErrorMessage(error.code));
        }
    };

    return (
        <AuthContext.Provider value={{
            user, loading, signIn, signUp, signInWithGoogle, signOut,
            sendVerificationEmail, resetPassword, updateUserProfile,
            deleteAccount, checkNicknameAvailability,
        }}>
            {children}
        </AuthContext.Provider>
    );
};