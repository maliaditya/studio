
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
  updateUserProfile as localUpdateUserProfile
} from '@/lib/localAuth';

interface AuthContextType {
  currentUser: LocalUser | null;
  loading: boolean;
  register: (username: string, password:string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  exportData: () => void;
  updateUserProfile: (data: Partial<Omit<LocalUser, 'username'>>) => Promise<void>;
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

  const updateUserProfile = async (data: Partial<Omit<LocalUser, 'username'>>) => {
    if (currentUser?.username) {
        localUpdateUserProfile(currentUser.username, data);
        const updatedUser = getCurrentLocalUser();
        setCurrentUser(updatedUser);
        toast({ title: "Profile Updated", description: "Your height has been saved." });
    }
  };

  const exportData = () => {
    if (!currentUser?.username) return;

    try {
      const username = currentUser.username;
      const dataToExport = {
        exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
        allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
        workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
        workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
      };

      const jsonString = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `workout-tracker-backup-${username}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: "Your data has been downloaded.",
      });
    } catch (error) {
      console.error("Export failed:", error);
      toast({
        title: "Export Failed",
        description: "Could not export your data.",
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
    exportData,
    updateUserProfile,
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
