import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
// @ts-ignore
import firebaseConfig from '../../firebase-applet-config.json';

// LƯU Ý BẢO MẬT: Khi đẩy lên GitHub/Vercel, file firebase-applet-config.json nên được đưa vào .gitignore.
// Bạn nên thay thế việc import này bằng cách sử dụng import.meta.env (biến môi trường VITE_)
// để ngăn chặn việc lộ thông tin cấu hình Firebase.

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
