import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

// 관리자가 회원 생성
export const adminCreateUser = onCall(
    { region: "asia-northeast3" },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const callerDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
            throw new HttpsError("permission-denied", "관리자만 사용할 수 있습니다.");
        }

        const { email, password, nickname } = request.data;

        if (!email || !password || !nickname) {
            throw new HttpsError("invalid-argument", "모든 항목을 입력해주세요.");
        }
        if (password.length < 6) {
            throw new HttpsError("invalid-argument", "비밀번호는 6자 이상이어야 합니다.");
        }

        // 닉네임 중복 확인
        const nickSnap = await db.collection("users").where("nickname", "==", nickname).get();
        if (!nickSnap.empty) {
            throw new HttpsError("already-exists", "이미 사용 중인 닉네임입니다.");
        }

        // 이메일 중복 확인
        try {
            await auth.getUserByEmail(email);
            throw new HttpsError("already-exists", "이미 가입된 이메일입니다.");
        } catch (e: any) {
            if (e.code !== "auth/user-not-found") throw e;
        }

        // Firebase Auth 계정 생성
        const userRecord = await auth.createUser({ email, password });

        // Firestore 문서 생성
        await db.collection("users").doc(userRecord.uid).set({
            uid: userRecord.uid,
            email,
            nickname,
            isAdmin: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            likedPosts: [],
            bookmarkedPosts: [],
        });

        return { success: true, uid: userRecord.uid };
    }
);

// 관리자가 회원 강제 탈퇴
export const adminDeleteUser = onCall(
    { region: "asia-northeast3" },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const callerDoc = await db.collection("users").doc(request.auth.uid).get();
        if (!callerDoc.exists || !callerDoc.data()?.isAdmin) {
            throw new HttpsError("permission-denied", "관리자만 사용할 수 있습니다.");
        }

        const { userId, userEmail, userNickname } = request.data;

        if (!userId) {
            throw new HttpsError("invalid-argument", "userId가 필요합니다.");
        }

        const postsSnap = await db.collection("posts").where("authorId", "==", userId).get();
        const batch = db.batch();

        postsSnap.docs.forEach((postDoc) => {
            batch.update(postDoc.ref, { authorNickname: "탈퇴한 사용자" });
        });

        batch.set(db.collection("withdrawal_reasons").doc(userId), {
            userId,
            email: userEmail || "",
            nickname: userNickname || "",
            reasons: ["관리자에 의한 강제 탈퇴"],
            deletedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        batch.delete(db.collection("users").doc(userId));
        await batch.commit();

        try {
            await auth.deleteUser(userId);
        } catch (e: any) {
            if (e.code !== "auth/user-not-found") throw e;
        }

        return { success: true };
    }
);

// 회원 본인 탈퇴
export const deleteOwnAccount = onCall(
    { region: "asia-northeast3" },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const userId = request.auth.uid;
        const { reasons } = request.data;

        const postsSnap = await db.collection("posts").where("authorId", "==", userId).get();
        const batch = db.batch();

        postsSnap.docs.forEach((postDoc) => {
            batch.update(postDoc.ref, { authorNickname: "탈퇴한 사용자" });
        });

        const userDoc = await db.collection("users").doc(userId).get();
        const userData = userDoc.data();

        if (reasons && reasons.length > 0) {
            batch.set(db.collection("withdrawal_reasons").doc(userId), {
                userId,
                email: userData?.email || "",
                nickname: userData?.nickname || "",
                reasons,
                deletedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        batch.delete(db.collection("users").doc(userId));
        await batch.commit();

        await auth.deleteUser(userId);

        return { success: true };
    }
);