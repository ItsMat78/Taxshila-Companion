
import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from './firebase'; // Your main firebase app instance
import { saveStudentFCMToken } from '@/services/student-service'; // We'll create this function

// IMPORTANT: Replace this with your VAPID key from Firebase console
// Firebase Project settings > Cloud Messaging > Web Push certificates
const VAPID_KEY = "BLAPRl0mUm8t7H6QXbenonbltEVU51wxXfwQN8Aw0jCdPbBE8XIDS7u41wpfQAWb7NTsTjU8zp7nb6D8nO1Dt_c";

let messagingInstance = null;
try {
  messagingInstance = getMessaging(firebaseApp);
} catch (error) {
  console.error("Failed to initialize Firebase Messaging:", error);
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
    console.log('Service Worker registered with scope:', registration.scope);

    if (Notification.permission === 'granted') {
      console.log('Notification permission already granted.');
      const currentToken = await getFCMToken(registration);
      if (currentToken && studentFirestoreId) {
        await saveStudentFCMToken(studentFirestoreId, currentToken);
      }
      return currentToken;
    } else if (Notification.permission === 'denied') {
      console.warn('Notification permission was previously denied.');
      return null;
    } else {
      console.log('Requesting notification permission...');
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
        console.log('Notification permission granted.');
        const currentToken = await getFCMToken(registration);
        if (currentToken && studentFirestoreId) {
          await saveStudentFCMToken(studentFirestoreId, currentToken);
        }
        return currentToken;
      } else {
        console.warn('Notification permission denied.');
        return null;
      }
    }
  } catch (error) {
    console.error('Service Worker registration failed or permission error:', error);
    return null;
  }
};

const getFCMToken = async (registration: ServiceWorkerRegistration): Promise<string | null> => {
  if (!messagingInstance) return null;
  try {
    const currentToken = await getToken(messagingInstance, {
      vapidKey: VAPID_KEY,
      serviceWorkerRegistration: registration,
    });
    if (currentToken) {
      console.log('FCM Token:', currentToken);
      return currentToken;
    } else {
      console.warn('No registration token available. Request permission to generate one.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

// Handle foreground messages
if (messagingInstance) {
  onMessage(messagingInstance, (payload) => {
    console.log('Message received in foreground. ', payload);
    // Dispatch a custom event to be handled by the AppLayout
    if (payload.notification) {
      window.dispatchEvent(new CustomEvent('show-foreground-message', { 
        detail: { 
          title: payload.notification.title, 
          body: payload.notification.body 
        } 
      }));
    }
  });
}
