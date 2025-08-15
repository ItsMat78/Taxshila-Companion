// src/lib/notification-setup.ts
console.log('NS: notification-setup.ts script loaded.');

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase';
import { saveStudentFCMToken, saveAdminFCMToken } from '@/services/student-service';

/**
 * Sets up push notifications for the current user.
 * Requests permission and saves the FCM token to Firestore.
 */
export async function setupPushNotifications(firestoreId: string, role: 'admin' | 'member'): Promise<void> {
    console.log(`NS: setupPushNotifications called for user: ${firestoreId} role: ${role}`);
    
    const supported = await isSupported();
    if (!supported) {
        console.log("NS: Firebase Messaging is not supported in this browser.");
        return;
    }
    console.log("NS: Firebase Messaging is supported.");

    const messaging = getMessaging(firebaseApp);
    
    try {
        console.log('NS: Requesting notification permission...');
        const permission = await Notification.requestPermission();
        console.log('NS: Notification permission status:', permission);

        if (permission === 'granted') {
            console.log('NS: Notification permission granted.');
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("NS: VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }
            console.log('NS: Attempting to get FCM token with VAPID key:', vapidKey.substring(0, 10) + '...');
            
            // The service worker needs the full config to initialize Firebase in the background.
            // We pass it as a query string.
            const firebaseConfig = firebaseApp.options;
            const swUrl = `/firebase-messaging-sw.js?apiKey=${firebaseConfig.apiKey}&authDomain=${firebaseConfig.authDomain}&projectId=${firebaseConfig.projectId}&storageBucket=${firebaseConfig.storageBucket}&messagingSenderId=${firebaseConfig.messagingSenderId}&appId=${firebaseConfig.appId}&measurementId=${firebaseConfig.measurementId}`;

            navigator.serviceWorker.register(swUrl)
              .then(async (swRegistration) => {
                console.log("NS: Service worker registered successfully:", swRegistration.scope);
                const currentToken = await getToken(messaging, { vapidKey: vapidKey, serviceWorkerRegistration: swRegistration });

                if (currentToken) {
                    console.log('NS: FCM Token generated:', currentToken);
                    if (role === 'admin') {
                        await saveAdminFCMToken(firestoreId, currentToken);
                        console.log('NS: Admin FCM token saved to Firestore.');
                    } else {
                        await saveStudentFCMToken(firestoreId, currentToken);
                        console.log('NS: Student FCM token saved to Firestore.');
                    }
                } else {
                    console.log('NS: No registration token available. Request permission to generate one.');
                }
              }).catch((err) => {
                console.error('NS: Service Worker registration failed: ', err);
              });

        } else {
            console.log('NS: Unable to get permission to notify.');
        }
    } catch (err) {
        console.error('NS: An error occurred while retrieving token. ', err);
    }
}
