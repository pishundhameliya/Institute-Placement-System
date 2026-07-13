/***********************
 * Firebase Configuration
 * 
 * INSTRUCTIONS:
 * 1. Go to https://console.firebase.google.com
 * 2. Create a new project (or use existing)
 * 3. Go to Project Settings > General > Your apps > Web app
 * 4. Copy your config values below
 * 5. Enable Authentication > Email/Password in Firebase Console
 * 6. Enable Cloud Firestore (start in test mode)
 * 
 * NOTE: Firebase Storage is NOT required.
 *       Photos are stored as base64 directly in Firestore.
 ***********************/

const firebaseConfig = {
  apiKey: "AIzaSyDztWSaIUgp6wIg6Ngn4b6rjppl073mm70",
  authDomain: "institute-placement-syst-db3be.firebaseapp.com",
  databaseURL: "https://institute-placement-syst-db3be-default-rtdb.firebaseio.com",
  projectId: "institute-placement-syst-db3be",
  storageBucket: "institute-placement-syst-db3be.firebasestorage.app",
  messagingSenderId: "363705440102",
  appId: "1:363705440102:web:829148bbbef7ae92f6daa7",
  measurementId: "G-8E87H8CSKK"
};

// Initialize Firebase (App + Auth + Firestore only)
const firebaseApp = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Ensure session ends when browser closes
auth.setPersistence(firebase.auth.Auth.Persistence.SESSION);

// Enable offline persistence for Firestore
db.enablePersistence({ synchronizeTabs: true }).catch(err => {
  if (err.code === 'failed-precondition') {
    console.warn('Firestore persistence failed: Multiple tabs open');
  } else if (err.code === 'unimplemented') {
    console.warn('Firestore persistence not available in this browser');
  }
});

console.log('Firebase initialized successfully (Auth + Firestore)');
