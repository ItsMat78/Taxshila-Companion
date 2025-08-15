// This file MUST be in the /public folder

importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.15.0/firebase-messaging-compat.js");

// Load Firebase config from query parameters
const urlParams = new URLSearchParams(location.search);
const firebaseConfig = {
  apiKey: urlParams.get('apiKey'),
  authDomain: urlParams.get('authDomain'),
  projectId: urlParams.get('projectId'),
  storageBucket: urlParams.get('storageBucket'),
  messagingSenderId: urlParams.get('messagingSenderId'),
  appId: urlParams.get('appId'),
};

// Initialize Firebase
if (firebaseConfig.apiKey) {
    firebase.initializeApp(firebaseConfig);

    const messaging = firebase.messaging();

    // Handler for background messages
    messaging.onBackgroundMessage((payload) => {
        console.log('[firebase-messaging-sw.js] Received background message ', payload);

        // Customize the notification here
        // The payload here is expected to be the 'data' payload from the server
        const notificationTitle = payload.data.title;
        const notificationOptions = {
            body: payload.data.body,
            icon: payload.data.icon || '/logo.png',
            data: {
                url: payload.data.url // Pass the URL to the click event
            }
        };

        self.registration.showNotification(notificationTitle, notificationOptions);
    });

    // Handler for notification clicks
    self.addEventListener('notificationclick', (event) => {
        event.notification.close(); // Close the notification

        const urlToOpen = event.notification.data.url || '/';

        event.waitUntil(
            clients.matchAll({
                type: "window",
                includeUncontrolled: true
            }).then((clientList) => {
                // If a window for the app is already open, focus it
                for (let i = 0; i < clientList.length; i++) {
                    let client = clientList[i];
                    if (client.url === self.location.origin + urlToOpen && 'focus' in client) {
                        return client.focus();
                    }
                }
                // If no window is open, open a new one
                if (clients.openWindow) {
                    return clients.openWindow(urlToOpen);
                }
            })
        );
    });

} else {
    console.error("Firebase config not found in service worker. Notifications will not work.");
}
