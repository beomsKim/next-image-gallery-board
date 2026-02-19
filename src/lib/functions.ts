import { getFunctions, httpsCallable } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'asia-northeast3');

export const adminCreateUserFn = httpsCallable(functions, 'adminCreateUser');
export const adminDeleteUserFn = httpsCallable(functions, 'adminDeleteUser');
export const deleteOwnAccountFn = httpsCallable(functions, 'deleteOwnAccount');
export const toggleLikeFn = httpsCallable(functions, 'toggleLike');
export const addCommentFn = httpsCallable(functions, 'addComment');
export const incrementViewFn = httpsCallable(functions, 'incrementView');
export const checkRateLimitFn = httpsCallable(functions, 'checkRateLimit');