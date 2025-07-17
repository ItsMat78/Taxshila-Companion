
import { initializeApp, getApp, getApps } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  getDocs, 
  getDoc, 
  doc, 
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit, 
  startAfter,
  getCountFromServer,
  runTransaction,
  increment
} from 'firebase/firestore';
import { getStorage, ref as storageRef, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { getAuth } from 'firebase/auth'; // Import getAuth
import { getMessaging } from 'firebase/messaging';

// Firebase configuration (using environment variables)
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const storage = getStorage(app);
const auth = getAuth(app); // Initialize and export auth

// Initialize Firebase Messaging
let messaging;
if (typeof window !== 'undefined') {
  try {
    messaging = getMessaging(app);
  } catch (error) {
    console.error("Firebase Messaging could not be initialized:", error);
  }
}


export { 
  app, 
  db,
  auth, // Export auth
  storage, 
  messaging,
  storageRef, 
  uploadBytesResumable, 
  getDownloadURL, 
  deleteObject, 
  collection,
  getDocs,
  getDoc,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  writeBatch,
  arrayUnion,
  arrayRemove,
  Timestamp,
  serverTimestamp,
  orderBy,
  limit, 
  startAfter,
  getCountFromServer,
  runTransaction,
  increment
};
