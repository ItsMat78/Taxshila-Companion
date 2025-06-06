
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from './firebase'; // Your main firebase app instance
import { saveStudentFCMToken } from '@/services/student-service'; 

// ==========================================================================================
// !!! CRITICAL: REPLACE THIS VAPID_KEY WITH YOUR ACTUAL FIREBASE PROJECT'S VAPID KEY !!!
// Find this in: Firebase Project settings > Cloud Messaging > Web Push certificates (Key pair)
// YOUR APP WILL NOT RECEIVE PUSH NOTIFICATIONS WITHOUT THIS KEY BEING CORRECT.
// DO NOT LEAVE THIS AS A PLACEHOLDER.
// ==========================================================================================
export const VAPID_KEY_FROM_CLIENT_LIB = "BLAPRl0mUm8t7H6QXbenonbltEVU51wxXfwQN8Aw0jCdPbBE8XIDS7u41wpfQAWb7NTsTjU8zp7nb6D8nO1Dt_c"; // <<< --- !!! REPLACE THIS! !!! --- >>>
// Note: Renamed to VAPID_KEY_FROM_CLIENT_LIB to avoid confusion if another VAPID_KEY exists elsewhere

let messagingInstance = null;
try {
  if (typeof window !== 'undefined') { // Ensure this runs only in the browser
    messagingInstance = getMessaging(firebaseApp);
    console.log("[FCM Client] Firebase Messaging initialized.");
  }
} catch (error) {
  console.error("[FCM Client] Failed to initialize Firebase Messaging:", error);
}


export const initPushNotifications = async (studentFirestoreId: string | null | undefined): Promise<string | null> => {
  if (!messagingInstance) {
    console.warn("[FCM Client] Firebase Messaging not initialized. Push notifications disabled.");
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('[FCM Client] Service workers are not supported in this browser.');
    return null;
  }
  console.log('[FCM Client] Service worker is supported.');


  if (!('PushManager' in window)) {
    console.warn('[FCM Client] Push messaging is not supported in this browser.');
    return null;
  }
  console.log('[FCM Client] PushManager is supported.');

  try {
    const registration = await navigator.serviceWorker.register('/sw.js'); 
    console.log('[FCM Client] Service Worker registered with scope:', registration.scope);

    if (Notification.permission === 'granted') {
      console.log('[FCM Client] Notification permission already granted.');
      const currentToken = await getFCMToken(registration, studentFirestoreId);
      return currentToken;
    } else if (Notification.permission === 'denied') {
      console.warn('[FCM Client] Notification permission was previously denied. User must manually re-enable it in browser settings.');
      return null;
    } else {
      console.log('[FCM Client] Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('[FCM Client] Notification permission granted by user.');
        const currentToken = await getFCMToken(registration, studentFirestoreId);
        return currentToken;
      } else {
        console.warn('[FCM Client] Notification permission denied by user.');
        return null;
      }
    }
  } catch (error) {
    console.error('[FCM Client] Service Worker registration failed or permission error:', error);
    return null;
  }
};

const getFCMToken = async (registration: ServiceWorkerRegistration, studentFirestoreId: string | null | undefined): Promise<string | null> => {
  if (!messagingInstance) {
     console.warn("[FCM Client] Messaging instance not available for getFCMToken.");
     return null;
  }
  if (!VAPID_KEY_FROM_CLIENT_LIB || VAPID_KEY_FROM_CLIENT_LIB.includes("REPLACE THIS")) {
    console.error("[FCM Client] VAPID_KEY IS NOT SET OR IS STILL A PLACEHOLDER. PUSH NOTIFICATIONS WILL FAIL. Please update it in src/lib/firebase-messaging-client.ts.");
    return null;
  }
  console.log("[FCM Client] Attempting to get FCM token. VAPID_KEY is present (ensure it's correct):", VAPID_KEY_FROM_CLIENT_LIB ? 'Yes' : 'NO (THIS IS A PROBLEM)');

  try {
    const currentToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY_FROM_CLIENT_LIB,
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      console.log('[FCM Client] FCM Token obtained:', currentToken.substring(0,15) + "..."); // Log only prefix
      if (studentFirestoreId) {
        console.log('[FCM Client] Saving token for studentFirestoreId:', studentFirestoreId);
        await saveStudentFCMToken(studentFirestoreId, currentToken);
      } else {
        console.warn("[FCM Client] Student Firestore ID not available, token not saved to DB yet. This is okay if it's a new user registration flow or if the user is not a student (e.g., admin).");
      }
      return currentToken;
    } else {
      console.warn('[FCM Client] No registration token available. Request permission to generate one. This usually means permission was denied or dismissed.');
      return null;
    }
  } catch (err) {
    console.error('[FCM Client] An error occurred while retrieving token: ', err);
    if (err instanceof Error) {
        console.error('[FCM Client] Error name:', err.name, 'Error message:', err.message);
         if (err.message.includes("service worker") || err.message.includes("ServiceWorker") || err.message.includes("Registration failed")) {
            console.error("[FCM Client] Hint: This error often relates to issues with sw.js (not found, not in public root, or incorrect Firebase config within sw.js).");
        }
        if (err.message.includes("messaging/invalid-vapid-key")) {
            console.error("[FCM Client] Hint: The VAPID key is invalid. Ensure it matches the one from your Firebase project settings.");
        }
    }
    return null;
  }
};

if (messagingInstance) {
  onMessage(messagingInstance, (payload) => {
    console.log('[FCM Client] Message received in foreground: ', payload);
    if (payload.data && payload.data.title && payload.data.body) {
       window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.data.title, 
          body: payload.data.body,
          data: payload.data // Pass along the full data payload too
        } 
      }));
    } else if (payload.notification) { // Fallback for standard FCM notification field
      window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.notification.title, 
          body: payload.notification.body,
          data: payload.data
        } 
      }));
    } else {
      console.log('[FCM Client] Foreground message received without a displayable title/body in data or notification payload. Data:', payload.data);
    }
  });
} else {
  console.warn("[FCM Client] Messaging instance not available for onMessage listener setup.");
}
