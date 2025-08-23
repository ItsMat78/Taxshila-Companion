
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
    console.log('[Notification Setup] Attempting to set up push notifications.');
    const supported = await isSupported();
    if (!supported) {
        console.log("[Notification Setup] Firebase Messaging is not supported in this browser.");
        return;
    }

    const messaging = getMessaging(firebaseApp);
    
    // --- Handle Foreground Messages ---
    onMessage(messaging, (payload) => {
        console.log('[Notification Setup] Message received in foreground.', payload);
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
        console.log(`[Notification Setup] Notification permission status: ${permission}`);

        if (permission === 'granted') {
            const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;
            if (!vapidKey) {
                console.error("[Notification Setup] VAPID key is missing. Ensure NEXT_PUBLIC_FIREBASE_VAPID_KEY is set in your environment.");
                return;
            }
             console.log("[Notification Setup] VAPID key found.");

             // Dynamically build the service worker URL with the config
            const firebaseConfig = firebaseApp.options;
            const encodedConfig = encodeURIComponent(JSON.stringify(firebaseConfig));
            const serviceWorkerUrl = `/firebase-messaging-sw.js?firebaseConfig=${encodedConfig}`;
            
            console.log(`[Notification Setup] Registering service worker at: ${serviceWorkerUrl}`);
            const registration = await navigator.serviceWorker.register(serviceWorkerUrl);
            console.log(`[Notification Setup] Service worker registered successfully. Scope: ${registration.scope}`);

            console.log("[Notification Setup] Requesting FCM token...");
            const currentToken = await getToken(messaging, { 
                vapidKey,
                serviceWorkerRegistration: registration, // Use the specific registration
            });

            if (currentToken) {
                console.log('[Notification Setup] FCM Token received:', currentToken);
                console.log(`[Notification Setup] Saving token for ${role} with firestoreId: ${firestoreId}`);
                if (role === 'admin') {
                    await saveAdminFCMToken(firestoreId, currentToken);
                } else {
                    await saveStudentFCMToken(firestoreId, currentToken);
                }
                console.log('[Notification Setup] Token saved successfully.');
            } else {
                console.log('[Notification Setup] No registration token available. Request permission to generate one.');
            }

        } else {
            console.log('[Notification Setup] Notification permission not granted.');
        }
    } catch (err) {
        console.error('[Notification Setup] An error occurred while retrieving token. ', err);
    }
}
