// public/firebase-messaging-sw.js

// Give the service worker access to the Firebase Messaging library.
// The library is imported using the `importScripts` function.
// Note: This file is not processed by the Next.js compiler, so it uses plain JavaScript.

console.log('SW: Service Worker script evaluating.');

try {
    // These must be loaded before Firebase is initialized.
    importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");
    console.log('SW: Firebase scripts imported successfully.');
} catch (e) {
    console.error('SW: Error importing Firebase scripts:', e);
}


// Parse the configuration passed as a query string
const urlParams = new URL(self.location).searchParams;
const firebaseConfig = Object.fromEntries(urlParams.entries());

console.log('SW: Firebase config parsed from URL:', firebaseConfig);

if (firebaseConfig && firebaseConfig.apiKey) {
    // Initialize the Firebase app in the service worker with the parsed config
    try {
        firebase.initializeApp(firebaseConfig);
        console.log('SW: Firebase app initialized successfully.');

        // Retrieve an instance of Firebase Messaging so that it can handle background messages.
        const messaging = firebase.messaging();
        console.log('SW: Firebase messaging initialized successfully.');
        
        messaging.onBackgroundMessage((payload) => {
            console.log('SW: Received background message ', payload);

            const notificationTitle = payload.notification?.title || 'New Notification';
            const notificationOptions = {
                body: payload.notification?.body || 'You have a new update.',
                icon: payload.notification?.icon || '/logo.png',
                data: {
                    url: payload.data?.url || '/' // Pass the URL to the click event
                }
            };

            self.registration.showNotification(notificationTitle, notificationOptions);
        });

    } catch (e) {
        console.error('SW: Error initializing Firebase in service worker:', e);
    }
} else {
    console.error('SW: Firebase config not found in service worker URL.');
}

self.addEventListener('install', (event) => {
    console.log('SW: Install event triggered.');
    // Force the waiting service worker to become the active service worker.
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('SW: Activate event triggered.');
    // Tell the active service worker to take control of the page immediately.
    event.waitUntil(self.clients.claim());
});

self.addEventListener('notificationclick', (event) => {
    console.log('SW: Notification click received.', event.notification);
    event.notification.close();

    const urlToOpen = event.notification.data?.url || '/';
    console.log('SW: Opening URL:', urlToOpen);

    event.waitUntil(
        self.clients.openWindow(urlToOpen)
    );
});
