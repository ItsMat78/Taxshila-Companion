
"use client";

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from './firebase'; 
import { saveStudentFCMToken, saveAdminFCMToken } from '@/services/student-service';
import type { UserRole } from '@/types/auth';

const VAPID_KEY = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

export const setupPushNotifications = async (firestoreId: string, userRole: UserRole) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.warn('[Push Setup] Push messaging is not supported in this environment.');
    return;
  }
  
  if (!VAPID_KEY) {
    console.error("[Push Setup] VAPID key is missing. Push notifications cannot be initialized.");
    return;
  }

  try {
    const messaging = getMessaging(firebaseApp);
    
    // Register the service worker
    const registration = await navigator.serviceWorker.register('/firebase-push-worker.js');
    console.log('[Push Setup] Service worker registered successfully.');

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      console.warn('[Push Setup] Notification permission denied.');
      return;
    }
    
    console.log('[Push Setup] Notification permission granted. Requesting token...');
    const currentToken = await getToken(messaging, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      console.log('[Push Setup] Token received:', currentToken);
      // Save the token to the appropriate collection based on user role
      if (userRole === 'member') {
        await saveStudentFCMToken(firestoreId, currentToken);
      } else if (userRole === 'admin') {
        await saveAdminFCMToken(firestoreId, currentToken);
      }
      console.log('[Push Setup] Token saved to database.');
    } else {
      console.warn('[Push Setup] No registration token available. Request permission to generate one.');
    }

    // Handle foreground messages
    onMessage(messaging, (payload) => {
      console.log('[Push Setup] Message received in foreground:', payload);
      const notificationTitle = payload.notification?.title || "New Notification";
      const notificationBody = payload.notification?.body || "You have a new message.";
      
      window.dispatchEvent(new CustomEvent('show-foreground-message', {
        detail: {
          title: notificationTitle,
          body: notificationBody,
          data: payload.data
        }
      }));
    });

  } catch (error) {
    console.error('[Push Setup] An error occurred during push notification setup:', error);
  }
};
