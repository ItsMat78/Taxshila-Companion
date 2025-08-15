
// Check if the script is running in a service worker context
if (typeof importScripts === 'function') {
  console.log('firebase-push-worker.js: Script running in service worker context.');
  
  // These imports are available in the service worker scope
  importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-app-compat.js");
  importScripts("https://www.gstatic.com/firebasejs/10.12.3/firebase-messaging-compat.js");

  console.log('firebase-push-worker.js: Firebase scripts imported.');

  // Initialize the Firebase app in the service worker
  // Pass the Firebase config object to the service worker.
  // Note: This is a simplified approach. In a production app, you might
  // want to fetch the config from a server endpoint.
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  };

  console.log('firebase-push-worker.js: Firebase config object constructed:', firebaseConfig.projectId);

  if (!firebaseConfig.projectId) {
    console.error('firebase-push-worker.js: Firebase Project ID is missing in the config.');
  } else {
    firebase.initializeApp(firebaseConfig);
    console.log('firebase-push-worker.js: Firebase app initialized.');
    
    // Retrieve an instance of Firebase Messaging so that it can handle background messages.
    const messaging = firebase.messaging();
    console.log('firebase-push-worker.js: Firebase Messaging instance retrieved.');
    
    messaging.onBackgroundMessage((payload) => {
      console.log(
        '[firebase-push-worker.js] Received background message ',
        payload
      );
      
      const notificationTitle = payload.notification.title;
      const notificationOptions = {
        body: payload.notification.body,
        icon: '/logo.png', // A default icon
      };

      self.registration.showNotification(notificationTitle, notificationOptions);
    });
  }
} else {
  console.log('firebase-push-worker.js: Script not in service worker context.');
}
