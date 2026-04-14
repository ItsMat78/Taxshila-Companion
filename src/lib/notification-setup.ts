
"use client";

import { getMessaging, getToken } from "firebase/messaging";
import { app as firebaseApp, db } from "./firebase";
import { doc, updateDoc, arrayUnion } from "firebase/firestore";

// This is the public VAPID key from your Firebase project settings
const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

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

        await updateDoc(userDocRef, {
          fcmTokens: arrayUnion(currentToken)
        });
      }
    }
  } catch (error) {
    console.error('An error occurred while setting up push notifications.', error);
  }
};
