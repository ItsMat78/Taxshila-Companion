
"use client";

import { getMessaging, getToken, deleteToken } from "firebase/messaging";
import { app as firebaseApp, db } from "./firebase";
import { doc, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from "firebase/firestore";

// This is the public VAPID key from your Firebase project settings
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

// localStorage key under which we remember the FCM token for a given user, so
// that we can revoke exactly that token on logout (instead of leaking it).
const fcmStorageKey = (firestoreId: string) => `fcmToken_${firestoreId}`;

/**
 * A device's FCM token must belong to exactly one account. Logout is supposed
 * to remove it from the outgoing account, but that can be skipped by a
 * force-quit, a crash, or a slow network racing the sign-out — so before
 * attaching this token to a (new) account, strip it from every other
 * student/admin doc that still has it. Self-healing: fixes any stale token
 * left behind by a past failure, not just the current login.
 */
async function evictFcmTokenFromOtherUsers(token: string, currentCollection: string, currentFirestoreId: string): Promise<void> {
  for (const collectionName of ['students', 'admins']) {
    const q = query(collection(db, collectionName), where("fcmTokens", "array-contains", token));
    const snapshot = await getDocs(q);
    for (const docSnap of snapshot.docs) {
      if (collectionName === currentCollection && docSnap.id === currentFirestoreId) continue;
      await updateDoc(docSnap.ref, { fcmTokens: arrayRemove(token) }).catch(error =>
        console.error(`Failed to evict stale FCM token from ${collectionName}/${docSnap.id}:`, error)
      );
    }
  }
}

export const setupPushNotifications = async (firestoreId: string, userRole: 'admin' | 'member'): Promise<void> => {
  if (typeof window === 'undefined' || !VAPID_KEY) {
    console.error("VAPID key not found or not in a browser environment.");
    return;
  }

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      const messaging = getMessaging(firebaseApp);

      const currentToken = await getToken(messaging, { vapidKey: VAPID_KEY });

      if (currentToken) {
        // Save the token to Firestore
        const collectionName = userRole === 'admin' ? 'admins' : 'students';
        const userDocRef = doc(db, collectionName, firestoreId);

        await evictFcmTokenFromOtherUsers(currentToken, collectionName, firestoreId);
        await updateDoc(userDocRef, {
          fcmTokens: arrayUnion(currentToken)
        });

        // Remember it locally so logout can revoke this exact token.
        localStorage.setItem(fcmStorageKey(firestoreId), currentToken);
      }
    }
  } catch (error) {
    console.error('An error occurred while setting up push notifications.', error);
  }
};

/**
 * Revokes this device's FCM token on logout: removes it from the user's
 * Firestore document and invalidates it on the FCM side so the previous user
 * stops receiving pushes on a shared device.
 */
export const removePushNotifications = async (firestoreId: string, userRole: 'admin' | 'member'): Promise<void> => {
  if (typeof window === 'undefined') return;

  const storageKey = fcmStorageKey(firestoreId);
  const token = localStorage.getItem(storageKey);
  if (!token) return;

  try {
    const collectionName = userRole === 'admin' ? 'admins' : 'students';
    const userDocRef = doc(db, collectionName, firestoreId);
    await updateDoc(userDocRef, {
      fcmTokens: arrayRemove(token)
    });
  } catch (error) {
    console.error('Failed to remove FCM token from Firestore on logout.', error);
  }

  try {
    const messaging = getMessaging(firebaseApp);
    await deleteToken(messaging);
  } catch (error) {
    // Non-fatal: the token may already be gone / SW unavailable.
    console.warn('Failed to delete FCM token from the messaging instance.', error);
  }

  localStorage.removeItem(storageKey);
};
