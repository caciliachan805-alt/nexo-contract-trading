import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { initializeFirestore } from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Detect environment variable parameters across SSR (process.env) and Client (import.meta.env)
const envApiKey = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_API_KEY) || 
                  (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_API_KEY) || 
                  (import.meta.env?.VITE_FIREBASE_API_KEY);

const envAuthDomain = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) || 
                     (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_AUTH_DOMAIN) || 
                     (import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN);

const envProjectId = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_PROJECT_ID) || 
                    (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_PROJECT_ID) || 
                    (import.meta.env?.VITE_FIREBASE_PROJECT_ID);

const envStorageBucket = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET) || 
                        (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_STORAGE_BUCKET) || 
                        (import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET);

const envMessagingSenderId = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID) || 
                            (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_MESSAGING_SENDER_ID) || 
                            (import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID);

const envAppId = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_APP_ID) || 
                (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_APP_ID) || 
                (import.meta.env?.VITE_FIREBASE_APP_ID);

const envDatabaseId = (typeof process !== 'undefined' && process.env?.NEXT_PUBLIC_FIREBASE_FIRESTORE_DATABASE_ID) || 
                      (typeof process !== 'undefined' && process.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID) || 
                      (import.meta.env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID);

const activeConfig = {
  apiKey: envApiKey || firebaseConfig.apiKey,
  authDomain: envAuthDomain || firebaseConfig.authDomain,
  projectId: envProjectId || firebaseConfig.projectId,
  storageBucket: envStorageBucket || firebaseConfig.storageBucket,
  messagingSenderId: envMessagingSenderId || firebaseConfig.messagingSenderId,
  appId: envAppId || firebaseConfig.appId,
};

const activeDatabaseId = envDatabaseId || firebaseConfig.firestoreDatabaseId;

const app = initializeApp(activeConfig);

// Initialize Firestore with properties that help in AI Studio iFrame environments.
console.log('[Firestore] Initializing with Database ID:', activeDatabaseId);
export const db = initializeFirestore(app, {
  experimentalForceLongPolling: true,
}, activeDatabaseId); 
export const auth = getAuth(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.email');
googleProvider.addScope('https://www.googleapis.com/auth/userinfo.profile');
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    throw error;
  }
};
