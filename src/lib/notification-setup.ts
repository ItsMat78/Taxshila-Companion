
// src/lib/notification-setup.ts
import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase';
import { saveStudentFCMToken, saveAdminFCMToken } from '@/services/student-service';

/**
 * Sets up push notifications for the current user.
 * Requests permission and saves the FCM token to Firestore.
 */
export async function setupPushNotifications(firestoreId: string, role: 'admin' | 'member'): Promise<void> {
    const supported = await isSupported();
    if (!supported) {
        console.log("Firebase Messaging is not supported in this browser.");
        return;
    }

    const messaging = getMessaging(firebaseApp);
    
    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }
            
            const firebaseConfig = firebaseApp.options;
            const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}&measurementId=${firebaseConfig.measurementId}`;

            navigator.serviceWorker.register(swUrl)
              .then(async (swRegistration) => {
                const currentToken = await getToken(messaging, { vapidKey: vapidKey, serviceWorkerRegistration: swRegistration });

                if (currentToken) {
                    if (role === 'admin') {
                        await saveAdminFCMToken(firestoreId, currentToken);
                    } else {
                        await saveStudentFCMToken(firestoreId, currentToken);
                    }
                }
              }).catch((err) => {
                console.error('Service Worker registration failed: ', err);
              });

        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
    }
}
