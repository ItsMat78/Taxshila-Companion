// src/lib/notification-setup.ts

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
        console.log("NS: Requesting notification permission...");
        const permission = await Notification.requestPermission();
        console.log(`NS: Notification permission status: ${permission}`);

        if (permission === 'granted') {
            console.log('NS: Notification permission granted.');
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("NS: VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }
            
            console.log(`NS: Attempting to get FCM token with VAPID key: ${vapidKey.substring(0,10)}...`);
            
            const swUrl = `/firebase-messaging-sw.js?apiKey=${process.env.NEXT_PUBLIC_FIREBASE_API_KEY}&authDomain=${process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN}&projectId=${process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID}&storageBucket=${process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET}&messagingSenderId=${process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID}&appId=${process.env.NEXT_PUBLIC_FIREBASE_APP_ID}&measurementId=${process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID}`;

            navigator.serviceWorker.register(swUrl)
              .then(async (swRegistration) => {
                console.log('NS: Service worker registered successfully:', swRegistration.scope);
                const currentToken = await getToken(messaging, { vapidKey: vapidKey, serviceWorkerRegistration: swRegistration });

                if (currentToken) {
                    console.log(`NS: FCM token retrieved: ${currentToken}`);
                    if (role === 'admin') {
                        console.log("NS: Saving token for admin...");
                        await saveAdminFCMToken(firestoreId, currentToken);
                    } else {
                        console.log("NS: Saving token for member...");
                        await saveStudentFCMToken(firestoreId, currentToken);
                    }
                    console.log("NS: Token saved successfully.");
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
