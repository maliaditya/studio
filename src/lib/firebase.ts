
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

// More prominent logging for debugging
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
console.log("==========================================================");
console.log("Attempting to initialize Firebase. Checking environment variables...");
console.log("NEXT_PUBLIC_FIREBASE_API_KEY (raw):", apiKey);

if (!apiKey) {
  console.error("ERROR: NEXT_PUBLIC_FIREBASE_API_KEY is UNDEFINED or not set in process.env.");
  console.error("Please ensure it is correctly set in your .env.local file (e.g., NEXT_PUBLIC_FIREBASE_API_KEY=\"YOUR_KEY_HERE\").");
  console.error("After creating or modifying .env.local, YOU MUST RESTART your Next.js development server.");
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

console.log("Firebase config object to be used for initialization:");
console.log("  apiKey:", firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0,5) + "..." : "UNDEFINED");
console.log("  authDomain:", firebaseConfig.authDomain ? firebaseConfig.authDomain.substring(0,10) + "..." : "UNDEFINED");
console.log("  projectId:", firebaseConfig.projectId ? firebaseConfig.projectId.substring(0,10) + "..." : "UNDEFINED");
console.log("==========================================================");

let app: FirebaseApp;

if (firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId) {
  if (!getApps().length) {
    try {
      app = initializeApp(firebaseConfig);
      console.log("Firebase app initialized successfully.");
    } catch (e) {
      console.error("ERROR during Firebase initializeApp:", e);
      console.error("This often means the provided config values in .env.local are incorrect or the Firebase project is not set up for this app.");
      // Fallback to prevent crash, but auth will not work
      app = initializeApp({ apiKey: "dummy-invalid-key", authDomain: "dummy.firebaseapp.com", projectId: "dummy" });
    }
  } else {
    app = getApps()[0];
    console.log("Firebase app already initialized. Using existing instance.");
  }
} else {
  console.error("CRITICAL ERROR: Firebase configuration is incomplete (apiKey, authDomain, or projectId is missing). Firebase app was NOT initialized with your settings.");
  console.error("Please check your .env.local file and ensure all NEXT_PUBLIC_FIREBASE_... variables are correctly set.");
  console.error("YOU MUST RESTART your Next.js development server after changes to .env.local.");
  // Fallback to prevent immediate crash, auth will not work
   if (!getApps().length) {
    app = initializeApp({ apiKey: "dummy-invalid-key-due-to-missing-config", authDomain: "dummy.firebaseapp.com", projectId: "dummy" });
    console.log("Initialized with DUMMY Firebase config as a fallback.");
  } else {
    app = getApps()[0];
  }
}

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("dummy-invalid-key")) {
    console.error("Cannot sign in with Google: Firebase not properly configured or using dummy fallback config.");
    toast({ title: "Configuration Error", description: "Firebase is not configured correctly. Please contact support.", variant: "destructive" });
    return null;
  }
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google: ", error);
    if (error instanceof Error && (error.message.includes("auth/invalid-api-key") || error.message.includes("auth/configuration-not-found"))) {
        console.error("Detailed sign-in error: Firebase configuration issue detected. Please check your .env.local file and ensure Firebase project is set up correctly for this web app's domain.");
    }
    // Avoid using toast here as AuthContext might not be ready if this is the first error
    return null;
  }
};

export const signOut = async () => {
  if (!firebaseConfig.apiKey || firebaseConfig.apiKey.startsWith("dummy-invalid-key")) {
    console.error("Cannot sign out: Firebase not properly configured or using dummy fallback config.");
    return;
  }
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error("Error signing out: ", error);
  }
};

// It's good practice to import toast where it's used, but for signInWithGoogle,
// if it fails very early, AuthContext and thus useToast might not be available.
// For now, we'll assume if signInWithGoogle is called, basic setup is attempted.
// A more robust solution for early config errors might involve a global error state.
import { toast } from '@/hooks/use-toast'; 

export default app;
