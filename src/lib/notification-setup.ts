// src/lib/notification-setup.ts
import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { app as firebaseApp } from '@/lib/firebase';
import { saveStudentFCMToken, saveAdminFCMToken } from '@/services/student-service';
import { toast } from '@/hooks/use-toast';

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
    
    // --- Handle Foreground Messages ---
    onMessage(messaging, (payload) => {
        console.log('Message received in foreground.', payload);
        // Correctly access title and body from the `data` property
        toast({
            title: payload.data?.title,
            description: payload.data?.body,
        });
        
        // Dispatch a custom event that other components can listen to
        // For example, to refresh a list of notifications
        window.dispatchEvent(new CustomEvent('new-foreground-notification'));
    });
    
    try {
        const permission = await Notification.requestPermission();

        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }

             // Dynamically build the service worker URL with the config
            const firebaseConfig = firebaseApp.options;
            const encodedConfig = encodeURIComponent(JSON.stringify(firebaseConfig));
            const serviceWorkerUrl = `/firebase-messaging-sw.js?firebaseConfig=${encodedConfig}`;
            
            const registration = await navigator.serviceWorker.register(serviceWorkerUrl);

            const currentToken = await getToken(messaging, { 
                vapidKey,
                serviceWorkerRegistration: registration, // Use the specific registration
            });

            if (currentToken) {
                console.log('FCM Token received:', currentToken);
                if (role === 'admin') {
                    await saveAdminFCMToken(firestoreId, currentToken);
                } else {
                    await saveStudentFCMToken(firestoreId, currentToken);
                }
            } else {
                console.log('No registration token available. Request permission to generate one.');
            }

        } else {
            console.log('Notification permission not granted.');
        }
    } catch (err) {
        console.error('An error occurred while retrieving token. ', err);
    }
}
