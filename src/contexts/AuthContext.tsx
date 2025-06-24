
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
  pullDataFromCloud: (usernameOverride?: string) => Promise<void>;
  exportData: () => void;
  importData: () => void;
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

  const loadDataIntoLocalStorage = (data: any, username: string) => {
    if (!data) return;

    localStorage.setItem(`dietPlan_${username}`, JSON.stringify(data.dietPlan || []));
    localStorage.setItem(`workoutMode_${username}`, data.workoutMode || 'two-muscle');
    localStorage.setItem(`weightLogs_${username}`, JSON.stringify(data.weightLogs || []));
    if (data.goalWeight) {
        localStorage.setItem(`goalWeight_${username}`, data.goalWeight.toString());
    } else {
        localStorage.removeItem(`goalWeight_${username}`);
    }
    if (data.height) {
        localStorage.setItem(`height_${username}`, data.height.toString());
    } else {
        localStorage.removeItem(`height_${username}`);
    }
    if (data.dateOfBirth) {
        localStorage.setItem(`dateOfBirth_${username}`, data.dateOfBirth);
    } else {
        localStorage.removeItem(`dateOfBirth_${username}`);
    }
    if (data.gender) {
        localStorage.setItem(`gender_${username}`, data.gender);
    } else {
        localStorage.removeItem(`gender_${username}`);
    }
    localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(data.exerciseDefinitions || []));
    localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(data.workoutPlans || {}));
    localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(data.allWorkoutLogs || []));
  };
  
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

      if (user.username === 'demo') {
        // For demo user, automatically pull data silently and then redirect.
        await pullDataFromCloud(user.username);
        router.push('/');
      } else {
        router.push('/');
        toast({ title: "Success", description: message });
      }
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
        
        const allUserData = {
            dietPlan: JSON.parse(localStorage.getItem(`dietPlan_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
            height: localStorage.getItem(`height_${username}`) || null,
            dateOfBirth: localStorage.getItem(`dateOfBirth_${username}`) || null,
            gender: localStorage.getItem(`gender_${username}`) || null,
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
        };

        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, data: allUserData }),
        });
        
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || `Failed to push data.`);
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

  const pullDataFromCloud = async (usernameOverride?: string) => {
    const username = usernameOverride || currentUser?.username;
    if (!username) {
        toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
        return;
    }

    const isDemo = username === 'demo';
    
    // Only show toast for non-demo users
    if (!isDemo) {
      toast({ 
        title: "Syncing...", 
        description: "Fetching your latest data from the cloud." 
      });
    }

    try {
        const response = await fetch(`/api/blob-sync?username=${username}`);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Failed to fetch data.`);
        }
        
        const data = result.data;
        
        if (data === null || data === undefined) {
            if (!isDemo) {
              toast({ title: "No Cloud Data", description: "No data was found in the cloud for this user." });
            }
            // For demo user, if no data found, it will just proceed to an empty page, which is fine.
            return;
        }

        loadDataIntoLocalStorage(data, username);

        if (!isDemo) {
          toast({
            title: "Sync Successful",
            description: "Data pulled from the cloud. The app will now reload.",
          });
          // Reload for non-demo users to ensure all components refresh with new data.
          setTimeout(() => {
              window.location.reload();
          }, 1500);
        }
        // For demo users, we don't toast or reload. The `signIn` function handles redirection.

    } catch (error) {
        console.error("Pull from cloud failed:", error);
        if (!isDemo) { // Only show error for non-demo sync
          toast({
            title: "Sync Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
          });
        }
    }
  };

  const exportData = () => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to export data.", variant: "destructive" });
        return;
    }
    try {
        const username = currentUser.username;
        const dataToExport = {
            dietPlan: JSON.parse(localStorage.getItem(`dietPlan_${username}`) || '[]'),
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
            height: localStorage.getItem(`height_${username}`) || null,
            dateOfBirth: localStorage.getItem(`dateOfBirth_${username}`) || null,
            gender: localStorage.getItem(`gender_${username}`) || null,
        };

        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
            JSON.stringify(dataToExport, null, 2)
        )}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `workout_tracker_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
        toast({ title: "Export Successful", description: "Your data has been downloaded." });
    } catch (error) {
        console.error("Export failed:", error);
        toast({ title: "Export Failed", description: "Could not export your data.", variant: "destructive" });
    }
  };

  const importData = () => {
      if (!currentUser?.username) {
          toast({ title: "Error", description: "You must be logged in to import data.", variant: "destructive" });
          return;
      }
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (event) => {
          const file = (event.target as HTMLInputElement).files?.[0];
          if (file) {
              const reader = new FileReader();
              reader.onload = (e) => {
                  try {
                      const text = e.target?.result;
                      if (typeof text !== 'string') {
                          throw new Error("File content is not readable.");
                      }
                      const data = JSON.parse(text);
                      const username = currentUser.username;

                      if (
                          data.dietPlan === undefined ||
                          data.exerciseDefinitions === undefined ||
                          data.allWorkoutLogs === undefined ||
                          data.workoutMode === undefined ||
                          data.workoutPlans === undefined ||
                          data.weightLogs === undefined ||
                          data.height === undefined ||
                          data.dateOfBirth === undefined
                      ) {
                          throw new Error("Invalid backup file format. Some required fields are missing.");
                      }

                      loadDataIntoLocalStorage(data, username);

                      toast({ title: "Import Successful", description: "Your data has been imported. The app will now reload." });
                      setTimeout(() => window.location.reload(), 1500);

                  } catch (error) {
                      console.error("Import failed:", error);
                      const message = error instanceof Error ? error.message : "An unknown error occurred during import.";
                      toast({ title: "Import Failed", description: message, variant: "destructive" });
                  }
              };
              reader.readAsText(file);
          }
      };
      input.click();
  };
  
  const value = {
    currentUser,
    loading,
    register,
    signIn,
    signOut,
    pushDataToCloud,
    pullDataFromCloud,
    exportData,
    importData,
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
