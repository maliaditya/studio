
"use client";

import type { User } from 'firebase/auth'; // Keep type for structure, but it will be null
import { createContext, useContext, type ReactNode } from 'react';
// import { auth, signInWithGoogle as firebaseSignInWithGoogle, signOut as firebaseSignOut } from '@/lib/firebase';
// import { useRouter } from 'next/navigation';
// import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  // const [currentUser, setCurrentUser] = useState<User | null>(null);
  // const [loading, setLoading] = useState(true);
  // const router = useRouter();
  // const { toast } = useToast();

  // useEffect(() => {
  //   // const unsubscribe = auth.onAuthStateChanged((user) => {
  //   //   setCurrentUser(user);
  //   //   setLoading(false);
  //   // });
  //   // return () => unsubscribe();
  //   setLoading(false); // Simulate loading finished
  //   setCurrentUser(null);
  // }, []);

  const signInWithGoogle = async () => {
    console.warn("Sign-in functionality has been removed.");
    // toast({ title: "Login Removed", description: "Login functionality is not available." });
  };

  const signOut = async () => {
    console.warn("Sign-out functionality has been removed.");
    // toast({ title: "Logout Removed", description: "Logout functionality is not available." });
  };

  const value = {
    currentUser: null,
    loading: false,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    // This basic context will now always be provided, but with null/false/no-op values
     return {
        currentUser: null,
        loading: false,
        signInWithGoogle: async () => { console.warn("Sign-in functionality has been removed."); },
        signOut: async () => { console.warn("Sign-out functionality has been removed."); },
     };
    // throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
