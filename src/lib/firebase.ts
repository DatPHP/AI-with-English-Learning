import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

/**
 * BẢO MẬT & DEPLOY:
 * File 'firebase-applet-config.json' đã bị chặn bởi .gitignore để bảo mật.
 * Khi deploy lên Vercel, bạn CẦN thiết lập các BIẾN MÔI TRƯỜNG (Environment Variables)
 * trong bảng điều khiển của Vercel với các tiền tố VITE_FIREBASE_...
 */

const firebaseConfig = {
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || "AIzaSyDmkHGQc8C06F2P5TXTLQT56BW-K7jEHXI",
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || "gen-lang-client-0971018792.firebaseapp.com",
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || "gen-lang-client-0971018792",
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || "gen-lang-client-0971018792.firebasestorage.app",
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "667236972362",
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || "1:667236972362:web:be64703893f0a28bb673b3",
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_DATABASE_ID || "ai-studio-4e8ed3d7-65b7-4ef3-b9ce-0c0041f92851"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const googleProvider = new GoogleAuthProvider();
