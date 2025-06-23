
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
import pako from 'pako';

interface AuthContextType {
  currentUser: LocalUser | null;
  loading: boolean;
  register: (username: string, password:string) => Promise<void>;
  signIn: (username: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  pushDataToCloud: () => void;
  pullDataFromCloud: () => void;
  exportData: () => void;
  importData: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper to safely convert a Uint8Array to a Base64 string
function uint8ArrayToBase64(uint8array: Uint8Array): string {
    let binary = '';
    const len = uint8array.byteLength;
    for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(uint8array[i]);
    }
    return window.btoa(binary);
}

// Helper to safely convert a Base64 string to a Uint8Array
function base64ToUint8Array(base64: string): Uint8Array {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binary_string.charCodeAt(i);
    }
    return bytes;
}

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
    toast({ title: "Compressing & Syncing...", description: "Pushing your local data to the cloud." });

    try {
        const username = currentUser.username;
        // Split data into three logical chunks
        const settingsData = {
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
        };
        const libraryData = {
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
        };
        const logsData = {
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
        };

        const compressAndEncode = (data: object) => {
            const jsonString = JSON.stringify(data);
            const compressed = pako.deflate(jsonString);
            return uint8ArrayToBase64(compressed);
        };
        
        const compressedSettingsData = compressAndEncode(settingsData);
        const compressedLibraryData = compressAndEncode(libraryData);
        const compressedLogsData = compressAndEncode(logsData);
        
        const pushItem = async (item: 'settings' | 'library' | 'logs', data: string) => {
            const response = await fetch('/api/edge-config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, data, item }),
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || `Failed to push ${item} data.`);
            }
            return result;
        }

        await Promise.all([
            pushItem('settings', compressedSettingsData),
            pushItem('library', compressedLibraryData),
            pushItem('logs', compressedLogsData),
        ]);

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
      toast({ title: "Syncing & Decompressing...", description: "Fetching your latest data from the cloud." });

      try {
          const username = currentUser.username;
          
          const pullAndDecompress = async (item: 'settings' | 'library' | 'logs') => {
             const response = await fetch(`/api/edge-config?username=${username}&item=${item}`);
             const result = await response.json();
             if (!response.ok) throw new Error(result.error || `Failed to fetch ${item} data.`);
             
             const data = result.data;
             if (data === null || data === undefined) return null;

             if (typeof data === 'string') {
                 const compressedBytes = base64ToUint8Array(data);
                 const decompressedString = pako.inflate(compressedBytes, { to: 'string' });
                 return JSON.parse(decompressedString);
             }
             return null; // Don't process uncompressed/old data formats
          }

          const [settingsData, libraryData, logsData] = await Promise.all([
              pullAndDecompress('settings'),
              pullAndDecompress('library'),
              pullAndDecompress('logs'),
          ]);
          
          if (!settingsData && !libraryData && !logsData) {
              toast({ title: "No Cloud Data", description: "No data found in the cloud for your user." });
              return;
          }

          if (settingsData) {
              localStorage.setItem(`workoutMode_${username}`, settingsData.workoutMode || 'two-muscle');
              localStorage.setItem(`weightLogs_${username}`, JSON.stringify(settingsData.weightLogs || []));
              if (settingsData.goalWeight) {
                  localStorage.setItem(`goalWeight_${username}`, settingsData.goalWeight.toString());
              } else {
                  localStorage.removeItem(`goalWeight_${username}`);
              }
          }
          if (libraryData) {
              localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(libraryData.exerciseDefinitions || []));
              localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(libraryData.workoutPlans || {}));
          }
          if (logsData) {
              localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(logsData.allWorkoutLogs || []));
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

  const exportData = () => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to export data.", variant: "destructive" });
        return;
    }
    try {
        const username = currentUser.username;
        const dataToExport = {
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
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
                          data.exerciseDefinitions === undefined ||
                          data.allWorkoutLogs === undefined ||
                          data.workoutMode === undefined ||
                          data.workoutPlans === undefined ||
                          data.weightLogs === undefined
                      ) {
                          throw new Error("Invalid backup file format.");
                      }

                      localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(data.exerciseDefinitions || []));
                      localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(data.allWorkoutLogs || []));
                      localStorage.setItem(`workoutMode_${username}`, data.workoutMode || 'two-muscle');
                      localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(data.workoutPlans || {}));
                      localStorage.setItem(`weightLogs_${username}`, JSON.stringify(data.weightLogs || []));

                      if (data.goalWeight) {
                          localStorage.setItem(`goalWeight_${username}`, data.goalWeight.toString());
                      } else {
                          localStorage.removeItem(`goalWeight_${username}`);
                      }

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
