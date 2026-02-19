import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import { onDocumentCreated } from "firebase-functions/v2/firestore";

admin.initializeApp();

const db = admin.firestore();
const auth = admin.auth();

const fnOptions = {
    region: "asia-northeast3",
    cors: true,  //  이게 핵심
};

// 관리자가 회원 생성
export const adminCreateUser = onCall(fnOptions, async (request) => {
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
});

// 관리자가 회원 강제 탈퇴
export const adminDeleteUser = onCall(fnOptions, async (request) => {
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
});

// 회원 본인 탈퇴
export const deleteOwnAccount = onCall(fnOptions, async (request) => {
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
});

// 좋아요 시 알림 생성 (Firestore 트리거)
export const onLikeNotification = onDocumentCreated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        // 이 트리거는 게시글 생성에만 반응 - 좋아요는 아래 HTTP 함수 사용
        return null;
    }
);

// 좋아요 처리 + 알림 생성 (클라이언트에서 호출)
export const toggleLike = onCall(fnOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { postId } = request.data;
    const userId = request.auth.uid;

    const postRef = db.collection("posts").doc(postId);
    const userRef = db.collection("users").doc(userId);

    const [postDoc, userDoc] = await Promise.all([
        postRef.get(),
        userRef.get(),
    ]);

    if (!postDoc.exists) {
        throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
    }

    const postData = postDoc.data()!;
    const userData = userDoc.data()!;
    const likedPosts: string[] = userData.likedPosts || [];
    const alreadyLiked = likedPosts.includes(postId);

    const batch = db.batch();

    if (alreadyLiked) {
        // 좋아요 취소
        batch.update(userRef, {
            likedPosts: admin.firestore.FieldValue.arrayRemove(postId),
        });
        batch.update(postRef, {
            likes: admin.firestore.FieldValue.increment(-1),
        });
    } else {
        // 좋아요 추가
        batch.update(userRef, {
            likedPosts: admin.firestore.FieldValue.arrayUnion(postId),
        });
        batch.update(postRef, {
            likes: admin.firestore.FieldValue.increment(1),
        });

        // 본인 게시글이 아닌 경우에만 알림 생성
        if (postData.authorId !== userId) {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                userId: postData.authorId,
                fromUserId: userId,
                fromNickname: userData.nickname,
                type: "like",
                postId,
                postTitle: postData.title,
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }
    }

    await batch.commit();
    return { liked: !alreadyLiked };
});

// 댓글 작성 + 알림 생성
export const addComment = onCall(fnOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const { postId, content, parentId, replyToNickname } = request.data;
    const userId = request.auth.uid;

    // 1. 입력값 검증
    if (!postId || typeof postId !== "string") {
        throw new HttpsError("invalid-argument", "postId가 필요합니다.");
    }
    if (!content?.trim()) {
        throw new HttpsError("invalid-argument", "댓글 내용을 입력해주세요.");
    }
    if (content.length > 300) {
        throw new HttpsError("invalid-argument", "댓글은 300자 이하로 입력해주세요.");
    }

    try {
        // 2. Rate Limiting - Timestamp 비교
        const oneMinuteAgo = admin.firestore.Timestamp.fromDate(
            new Date(Date.now() - 60 * 1000)
        );
        const recentComments = await db
            .collection("comments")
            .where("authorId", "==", userId)
            .where("createdAt", ">=", oneMinuteAgo)
            .get();

        if (recentComments.size >= 5) {
            throw new HttpsError(
                "resource-exhausted",
                "너무 많은 댓글을 작성했습니다. 잠시 후 다시 시도해주세요."
            );
        }

        // 3. 유저/포스트 문서 확인
        const [userDoc, postDoc] = await Promise.all([
            db.collection("users").doc(userId).get(),
            db.collection("posts").doc(postId).get(),
        ]);

        if (!userDoc.exists) {
            throw new HttpsError("not-found", "사용자 정보를 찾을 수 없습니다.");
        }
        if (!postDoc.exists) {
            throw new HttpsError("not-found", "게시글을 찾을 수 없습니다.");
        }

        const userData = userDoc.data()!;
        const postData = postDoc.data()!;

        const batch = db.batch();
        const commentRef = db.collection("comments").doc();

        batch.set(commentRef, {
            postId,
            authorId: userId,
            authorNickname: userData.nickname,
            content: content.trim(),
            parentId: parentId || null,
            replyToNickname: replyToNickname || null,
            likes: 0,
            likedBy: [],
            isDeleted: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // 4. 알림 생성 - 게시글 작성자에게 (본인 제외)
        if (postData.authorId && postData.authorId !== userId) {
            const notifRef = db.collection("notifications").doc();
            batch.set(notifRef, {
                userId: postData.authorId,
                fromUserId: userId,
                fromNickname: userData.nickname,
                type: parentId ? "reply" : "comment",
                postId,
                postTitle: postData.title || "",
                commentContent: content.trim().slice(0, 50),
                isRead: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        }

        // 5. 답글인 경우 원댓글 작성자에게도 알림
        if (parentId) {
            try {
                const parentDoc = await db.collection("comments").doc(parentId).get();
                if (parentDoc.exists) {
                    const parentData = parentDoc.data()!;
                    if (
                        parentData.authorId &&
                        parentData.authorId !== userId &&
                        parentData.authorId !== postData.authorId
                    ) {
                        const notifRef2 = db.collection("notifications").doc();
                        batch.set(notifRef2, {
                            userId: parentData.authorId,
                            fromUserId: userId,
                            fromNickname: userData.nickname,
                            type: "reply",
                            postId,
                            postTitle: postData.title || "",
                            commentContent: content.trim().slice(0, 50),
                            isRead: false,
                            createdAt: admin.firestore.FieldValue.serverTimestamp(),
                        });
                    }
                }
            } catch {
                // 원댓글 알림 실패해도 댓글 작성은 계속 진행
            }
        }
        batch.update(db.collection('posts').doc(postId), {
            commentCount: admin.firestore.FieldValue.increment(1),
        });

        await batch.commit();
        return { success: true, commentId: commentRef.id };

    } catch (error: any) {
        // 이미 HttpsError면 그대로 throw
        if (error instanceof HttpsError) throw error;
        // 그 외 예상치 못한 오류
        console.error("addComment error:", error);
        throw new HttpsError("internal", error.message || "댓글 작성에 실패했습니다.");
    }
});

// 게시글 조회수 중복 방지 (서버 기반)
export const incrementView = onCall(fnOptions, async (request) => {
    const { postId } = request.data;
    const userId = request.auth?.uid || null;

    // 조회 기록 확인 (userId 또는 세션 기반)
    const viewKey = userId ? `${postId}_${userId}` : null;

    if (viewKey) {
        const viewRef = db.collection("post_views").doc(viewKey);
        const viewDoc = await viewRef.get();

        if (viewDoc.exists) {
            const lastViewed = viewDoc.data()!.lastViewed.toDate();
            const hourAgo = new Date(Date.now() - 60 * 60 * 1000); // 1시간
            if (lastViewed > hourAgo) {
                return { counted: false }; // 1시간 내 재조회 무시
            }
        }

        // 조회 기록 업데이트
        await viewRef.set({
            postId,
            userId,
            lastViewed: admin.firestore.FieldValue.serverTimestamp(),
        });
    }

    // 조회수 증가
    await db.collection("posts").doc(postId).update({
        views: admin.firestore.FieldValue.increment(1),
    });

    return { counted: true };
});

// Rate Limiting - 게시글 작성 (1분에 3개 제한)
export const checkRateLimit = onCall(fnOptions, async (request) => {
    if (!request.auth) {
        throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
    }

    const userId = request.auth.uid;
    const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

    const recentPosts = await db
        .collection("posts")
        .where("authorId", "==", userId)
        .where("createdAt", ">=", oneMinuteAgo)
        .get();

    if (recentPosts.size >= 3) {
        throw new HttpsError(
            "resource-exhausted",
            "너무 많은 게시글을 작성했습니다. 잠시 후 다시 시도해주세요."
        );
    }

    return { allowed: true };
});