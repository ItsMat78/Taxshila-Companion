
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from './firebase'; // Your main firebase app instance
import { saveStudentFCMToken } from '@/services/student-service'; 

// IMPORTANT: Replace this with your VAPID key from Firebase console
// Firebase Project settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "BLAPRl0mUm8t7H6QXbenonbltEVU51wxXfwQN8Aw0jCdPbBE8XIDS7u41wpfQAWb7NTsTjU8zp7nb6D8nO1Dt_c";

let messagingInstance = null;
try {
  if (typeof window !== 'undefined') { // Ensure this runs only in the browser
    messagingInstance = getMessaging(firebaseApp);
    console.log("Firebase Messaging initialized in client.");
  }
} catch (error) {
  console.error("Failed to initialize Firebase Messaging in client:", error);
}


export const initPushNotifications = async (studentFirestoreId: string | null | undefined): Promise<string | null> => {
  if (!messagingInstance) {
    console.warn("Firebase Messaging not initialized. Push notifications disabled.");
    return null;
  }

  if (!('serviceWorker' in navigator)) {
    console.warn('Service workers are not supported in this browser.');
    return null;
  }

  if (!('PushManager' in window)) {
    console.warn('Push messaging is not supported in this browser.');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.register('/sw.js');
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
  try {
    console.log("[FCM Client] Attempting to get FCM token with VAPID key:", VAPID_KEY ? "Present" : "MISSING!");
    const currentToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      console.log('[FCM Client] FCM Token obtained:', currentToken);
      if (studentFirestoreId) {
        await saveStudentFCMToken(studentFirestoreId, currentToken);
      } else {
        console.warn("[FCM Client] Student Firestore ID not available, token not saved to DB yet.");
      }
      return currentToken;
    } else {
      console.warn('[FCM Client] No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('[FCM Client] An error occurred while retrieving token: ', err);
    return null;
  }
};

// Handle foreground messages
if (messagingInstance) {
  onMessage(messagingInstance, (payload) => {
    console.log('[FCM Client] Message received in foreground: ', payload);
    // Dispatch a custom event to be handled by the AppLayout
    if (payload.notification) {
      window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.notification.title, 
          body: payload.notification.body,
          data: payload.data 
        } 
      }));
    } else {
      console.log('[FCM Client] Foreground message received without a notification payload. Data:', payload.data);
       // Fallback if no notification payload but data is present
      if (payload.data && payload.data.title && payload.data.body) {
         window.dispatchEvent(new CustomEvent('show-foreground-message', { 
          detail: { 
            title: payload.data.title, 
            body: payload.data.body,
            data: payload.data
          } 
        }));
      }
    }
  });
} else {
  console.warn("[FCM Client] Messaging instance not available for onMessage listener setup.");
}
