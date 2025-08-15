

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase';
import { saveStudentFCMToken, saveAdminFCMToken } from '@/services/student-service';

/**
 * Sets up push notifications for the current user.
 * Requests permission and saves the FCM token to Firestore.
 */
export async function setupPushNotifications(firestoreId: string, role: 'admin' | 'member'): Promise<void> {
    console.log("setupPushNotifications called for user:", firestoreId, "role:", role);

    const supported = await isSupported();
    if (!supported) {
        console.log("Firebase Messaging is not supported in this browser.");
        return;
    }
    console.log("Firebase Messaging is supported.");

    const messaging = getMessaging(firebaseApp);
    
    try {
        const permission = await Notification.requestPermission();
        console.log('Notification permission status:', permission);

        if (permission === 'granted') {
            console.log('Notification permission granted.');
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }
            console.log("Attempting to get FCM token with VAPID key:", vapidKey.substring(0, 10) + "...");
            
            const currentToken = await getToken(messaging, { vapidKey: vapidKey });
            if (currentToken) {
                console.log('FCM Token received successfully: ', currentToken);
                // Save the token based on the user's role
                if (role === 'admin') {
                    console.log("Saving token for admin...");
                    await saveAdminFCMToken(firestoreId, currentToken);
                } else {
                    console.log("Saving token for member...");
                    await saveStudentFCMToken(firestoreId, currentToken);
                }
                 console.log("Token saved successfully to Firestore.");
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }
        } else {
            console.log('Unable to get permission to notify.');
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
    }
}
