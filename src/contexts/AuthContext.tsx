
"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
} from '@/lib/localAuth';

interface AuthContextType {
  currentUser: LocalUser | null;
  loading: boolean;
  register: (username: string, password:string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  pushDataToCloud: () => void;
  pullDataFromCloud: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    const user = getCurrentLocalUser();
    setCurrentUser(user);
    setLoading(false);
  }, []);

  const register = async (username: string, password: string) => {
    setLoading(true);
    const { success, message, user } = await localRegisterUser(username, password);
    if (success && user) {
      setCurrentUser(user);
      router.push('/');
      toast({ title: "Success", description: message });
    } else {
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  const signIn = async (username: string, password: string) => {
    setLoading(true);
    const { success, message, user } = await localLoginUser(username, password);
    if (success && user) {
      setCurrentUser(user);
      router.push('/');
      toast({ title: "Success", description: message });
    } else {
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  const signOut = async () => {
    setLoading(true);
    await localLogoutUser();
    setCurrentUser(null);
    router.push('/login');
    toast({ title: "Logged Out", description: "You have been successfully logged out." });
    setLoading(false);
  };

  const pushDataToCloud = async () => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
        return;
    }
    toast({ title: "Syncing...", description: "Pushing your local data to the cloud." });

    try {
        const username = currentUser.username;
        const dataToPush = {
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
        };

        const response = await fetch('/api/edge-config', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, data: dataToPush }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to push data.');
        }

        toast({ title: "Success", description: "Your data has been saved to the cloud." });
    } catch (error) {
        console.error("Push to cloud failed:", error);
        toast({
          title: "Sync Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
    }
  };

  const pullDataFromCloud = async () => {
      if (!currentUser?.username) {
          toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
          return;
      }
      toast({ title: "Syncing...", description: "Fetching your latest data from the cloud." });

      try {
          const username = currentUser.username;
          const response = await fetch(`/api/edge-config?username=${username}`);
          const result = await response.json();

          if (!response.ok) {
              throw new Error(result.error || 'Failed to fetch data.');
          }

          if (result.data === null || result.data === undefined) {
              toast({ title: "No Cloud Data", description: "No data found in the cloud for your user." });
              return;
          }

          const cloudData = result.data;

          localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(cloudData.exerciseDefinitions || []));
          localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(cloudData.allWorkoutLogs || []));
          localStorage.setItem(`workoutMode_${username}`, cloudData.workoutMode || 'two-muscle');
          localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(cloudData.workoutPlans || {}));
          localStorage.setItem(`weightLogs_${username}`, JSON.stringify(cloudData.weightLogs || []));
          
          if (cloudData.goalWeight) {
              localStorage.setItem(`goalWeight_${username}`, cloudData.goalWeight.toString());
          } else {
              localStorage.removeItem(`goalWeight_${username}`);
          }

          toast({
            title: "Sync Successful",
            description: "Data pulled from the cloud. The app will now reload.",
          });

          setTimeout(() => {
              window.location.reload();
          }, 1500);

      } catch (error) {
          console.error("Pull from cloud failed:", error);
          toast({
            title: "Sync Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
          });
      }
  };
  
  const value = {
    currentUser,
    loading,
    register,
    signIn,
    signOut,
    pushDataToCloud,
    pullDataFromCloud,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
