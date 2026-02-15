import { getFunctions, httpsCallable, connectFunctionsEmulator } from 'firebase/functions';
import app from './firebase';

const functions = getFunctions(app, 'asia-northeast3'); // 서울 리전

// 로컬 개발 시 에뮬레이터 연결 (선택사항)
// if (process.env.NODE_ENV === 'development') {
//   connectFunctionsEmulator(functions, 'localhost', 5001);
// }

export const adminCreateUserFn = httpsCallable(functions, 'adminCreateUser');
export const adminDeleteUserFn = httpsCallable(functions, 'adminDeleteUser');
export const deleteOwnAccountFn = httpsCallable(functions, 'deleteOwnAccount');