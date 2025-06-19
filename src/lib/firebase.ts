
// import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
// import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
// import { toast } from '@/hooks/use-toast';

// console.log("==========================================================");
// console.log("Firebase Auth has been largely removed/disabled in src/lib/firebase.ts.");
// console.log("API key checks and Firebase app initialization are commented out.");
// console.log("==========================================================");

// const firebaseConfig = {
//   apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
//   authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
//   projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
//   storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
//   messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
//   appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
// };

// let app: FirebaseApp;

// if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
//   if (!getApps().length) {
//     try {
//       // app = initializeApp(firebaseConfig);
//       console.log("Firebase app initialization SKIPPED.");
//     } catch (e) {
//       console.error("ERROR during Firebase initializeApp (would have occurred):", e);
//       // app = initializeApp({ apiKey: "dummy-invalid-key", authDomain: "dummy.firebaseapp.com", projectId: "dummy" });
//     }
//   } else {
//     // app = getApps()[0];
//     console.log("Firebase app already initialized (would have used existing). Initialization SKIPPED.");
//   }
// } else {
//   console.error("CRITICAL ERROR: Firebase configuration is incomplete. Initialization SKIPPED.");
//   // if (!getApps().length) {
//     // app = initializeApp({ apiKey: "dummy-invalid-key-due-to-missing-config", authDomain: "dummy.firebaseapp.com", projectId: "dummy" });
//     // console.log("Initialized with DUMMY Firebase config as a fallback (would have).");
//   // } else {
//     // app = getApps()[0];
//   // }
// }

// export const auth = undefined; // getAuth(app);
// export const googleProvider = undefined; // new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  console.warn("Firebase Sign-In functionality has been removed.");
  // toast({ title: "Feature Disabled", description: "User login is currently not available.", variant: "default" });
  return null;
};

export const signOut = async () => {
  console.warn("Firebase Sign-Out functionality has been removed.");
  // toast({ title: "Feature Disabled", description: "User logout is currently not available.", variant: "default" });
};

// A dummy app export might be needed if other parts of your codebase expect it.
// For now, an empty object should suffice or it can be removed if nothing imports `app` directly.
const app = {};
export default app;
