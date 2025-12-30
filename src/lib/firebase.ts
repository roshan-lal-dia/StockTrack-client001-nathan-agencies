import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';

// Check if Firebase is properly configured
const envApiKey = import.meta.env.VITE_FIREBASE_API_KEY;
export const isFirebaseConfigValid = envApiKey && 
  envApiKey !== 'YOUR_API_KEY' && 
  !envApiKey.includes('YOUR_') &&
  envApiKey.length > 10;

// Firebase configuration from environment
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || ''
};

const app = initializeApp(config);
export const auth = getAuth(app);

// Initialize Firestore with persistent cache (works across multiple tabs)
export const db = initializeFirestore(app, {
  localCache: persistentLocalCache({
    tabManager: persistentMultipleTabManager()
  })
});