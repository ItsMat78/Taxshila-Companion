
// This file needs to be in the public directory.

// Use importScripts to load the Firebase SDK
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js');

self.addEventListener('fetch', () => {
    // This is a required event listener for a PWA service worker.
    // It can be a no-op if not caching anything.
});


// This function fetches the config and initializes Firebase
const initializeFirebase = async () => {
    try {
        const response = await fetch('/api/firebase-config');
        if (!response.ok) {
            throw new Error('Failed to fetch Firebase config.');
        }
        const firebaseConfig = await response.json();
        
        if (!firebase.apps.length) {
            firebase.initializeApp(firebaseConfig);
            console.log("[SW] Firebase app initialized successfully.");

            const messaging = firebase.messaging();
            console.log("[SW] Firebase Messaging initialized.");

            // Set up the background message handler
            messaging.onBackgroundMessage((payload) => {
                console.log('[firebase-messaging-sw.js] Received background message ', payload);
                const notificationTitle = payload.notification.title;
                const notificationOptions = {
                    body: payload.notification.body,
                    icon: payload.notification.icon || '/logo.png'
                };
                self.registration.showNotification(notificationTitle, notificationOptions);
            });

        } else {
            console.log("[SW] Firebase app already initialized.");
        }
    } catch (error) {
        console.error('[SW] Error during Firebase initialization:', error);
    }
};


// Call the initialization function when the service worker starts up
initializeFirebase();
