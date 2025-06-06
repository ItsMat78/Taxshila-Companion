
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from './firebase'; // Your main firebase app instance
import { saveStudentFCMToken } from '@/services/student-service'; 

// ==========================================================================================
// !!! IMPORTANT: REPLACE THIS VAPID_KEY WITH YOUR ACTUAL FIREBASE PROJECT'S VAPID KEY !!!
// Find this in: Firebase Project settings > Cloud Messaging > Web Push certificates (Key pair)
// ==========================================================================================
const VAPID_KEY = "BLAPRl0mUm8t7H6QXbenonbltEVU51wxXfwQN8Aw0jCdPbBE8XIDS7u41wpfQAWb7NTsTjU8zp7nb6D8nO1Dt_c"; // REPLACE THIS!

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

  if (!('PushManager' in window)) {
    console.warn('[FCM Client] Push messaging is not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js'); // Ensure sw.js is in public folder
    console.log('[FCM Client] Service Worker registered with scope:', registration.scope);

    if (Notification.permission === 'granted') {
      console.log('[FCM Client] Notification permission already granted.');
      const currentToken = await getFCMToken(registration, studentFirestoreId);
      return currentToken;
    } else if (Notification.permission === 'denied') {
      console.warn('[FCM Client] Notification permission was previously denied.');
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
  if (!VAPID_KEY || VAPID_KEY === "YOUR_VAPID_KEY_HERE" || VAPID_KEY.includes("REPLACE THIS")) {
    console.error("[FCM Client] VAPID_KEY is not set or is still a placeholder. Please update it in firebase-messaging-client.ts.");
    alert("Push notification setup error: VAPID Key missing. Contact support if this persists."); // User-facing alert for this critical error
    return null;
  }
  try {
    console.log("[FCM Client] Attempting to get FCM token with VAPID key set.");
    const currentToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      console.log('[FCM Client] FCM Token obtained:', currentToken);
      if (studentFirestoreId) {
        console.log('[FCM Client] Saving token for studentFirestoreId:', studentFirestoreId);
        await saveStudentFCMToken(studentFirestoreId, currentToken);
      } else {
        console.warn("[FCM Client] Student Firestore ID not available, token not saved to DB yet. This is okay if it's a new user registration flow.");
      }
      return currentToken;
    } else {
      console.warn('[FCM Client] No registration token available. Request permission to generate one.');
      // This can happen if Notification.requestPermission() was denied or dismissed.
      return null;
    }
  } catch (err) {
    console.error('[FCM Client] An error occurred while retrieving token: ', err);
    // Log the error type for more specific debugging
    if (err instanceof Error) {
        console.error('[FCM Client] Error name:', err.name, 'Error message:', err.message);
    }
    // Common errors:
    // - "DOMException: Failed to execute 'subscribe' on 'PushManager': Subscription failed - no active Service Worker" (sw.js issue)
    // - "FirebaseError: Messaging: We are unable to register the default service worker. (messaging/failed-serviceworker-registration)." (sw.js issue or path)
    // - "FirebaseError: Messaging: Missing App configuration value: \"apiKey\" (messaging/missing-app-config-values)." (firebase config in sw.js)
    // - Issues with VAPID key or project setup.
    return null;
  }
};

// Handle foreground messages
if (messagingInstance) {
  onMessage(messagingInstance, (payload) => {
    console.log('[FCM Client] Message received in foreground: ', payload);
    // Dispatch a custom event to be handled by the AppLayout
    if (payload.notification) { // Standard FCM notification payload
      window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.notification.title, 
          body: payload.notification.body,
          data: payload.data // Include data payload if present
        } 
      }));
    } else if (payload.data && payload.data.title && payload.data.body) { // Data-only message with title/body in data
       window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.data.title, 
          body: payload.data.body,
          data: payload.data
        } 
      }));
    } else {
      console.log('[FCM Client] Foreground message received without a displayable notification/data payload. Data:', payload.data);
    }
  });
} else {
  console.warn("[FCM Client] Messaging instance not available for onMessage listener setup.");
}
