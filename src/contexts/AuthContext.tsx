
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

    // Workout
    localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(data.exerciseDefinitions || []));
    localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(data.workoutPlans || {}));
    localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(data.allWorkoutLogs || []));
    localStorage.setItem(`workoutMode_${username}`, data.workoutMode || 'two-muscle');

    // Upskill
    localStorage.setItem(`upskill_definitions_${username}`, JSON.stringify(data.upskillDefinitions || []));
    localStorage.setItem(`upskill_logs_${username}`, JSON.stringify(data.upskillLogs || []));
    localStorage.setItem(`upskill_topic_goals_${username}`, JSON.stringify(data.upskillTopicGoals || {}));

    // Deep Work
    localStorage.setItem(`deepWorkDefinitions_${username}`, JSON.stringify(data.deepWorkDefinitions || []));
    localStorage.setItem(`deepWorkLogs_${username}`, JSON.stringify(data.deepWorkLogs || []));
    localStorage.setItem(`deepwork_manual_deletes_${username}`, JSON.stringify(data.deepworkManualDeletes || []));

    // Personal Branding
    localStorage.setItem(`branding_tasks_${username}`, JSON.stringify(data.brandingTasks || []));
    localStorage.setItem(`branding_logs_${username}`, JSON.stringify(data.brandingLogs || []));
    
    // Homepage Schedule
    localStorage.setItem(`lifeos_schedule_${username}`, JSON.stringify(data.schedule || '{}'));

    // Health
    localStorage.setItem(`dietPlan_${username}`, JSON.stringify(data.dietPlan || []));
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

    let demoOverrideToken: string | null = null;
    if (currentUser.username === 'demo') {
        demoOverrideToken = window.prompt(
            "You are updating the read-only 'demo' account.\nPlease provide the override token to proceed.\n(Check your .env file for DEMO_ACCOUNT_UPDATE_TOKEN)"
        );
        if (demoOverrideToken === null || demoOverrideToken.trim() === '') {
            toast({ title: "Update Cancelled", description: "No override token was provided.", variant: "default" });
            return;
        }
    }
    
    try {
        toast({ title: "Syncing...", description: "Pushing your local data to the cloud." });
        const username = currentUser.username;
        
        const allUserData = {
            // Workout
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            
            // Upskill
            upskillDefinitions: JSON.parse(localStorage.getItem(`upskill_definitions_${username}`) || '[]'),
            upskillLogs: JSON.parse(localStorage.getItem(`upskill_logs_${username}`) || '[]'),
            upskillTopicGoals: JSON.parse(localStorage.getItem(`upskill_topic_goals_${username}`) || '{}'),
            
            // Deep Work
            deepWorkDefinitions: JSON.parse(localStorage.getItem(`deepwork_definitions_${username}`) || '[]'),
            deepWorkLogs: JSON.parse(localStorage.getItem(`deepwork_logs_${username}`) || '[]'),
            deepworkManualDeletes: JSON.parse(localStorage.getItem(`deepwork_manual_deletes_${username}`) || '[]'),

            // Personal Branding
            brandingTasks: JSON.parse(localStorage.getItem(`branding_tasks_${username}`) || '[]'),
            brandingLogs: JSON.parse(localStorage.getItem(`branding_logs_${username}`) || '[]'),
            
            // Homepage Schedule
            schedule: JSON.parse(localStorage.getItem(`lifeos_schedule_${username}`) || '{}'),

            // Health
            dietPlan: JSON.parse(localStorage.getItem(`dietPlan_${username}`) || '[]'),
            weightLogs: JSON.parse(localStorage.getItem(`weightLogs_${username}`) || '[]'),
            goalWeight: localStorage.getItem(`goalWeight_${username}`) || null,
            height: localStorage.getItem(`height_${username}`) || null,
            dateOfBirth: localStorage.getItem(`dateOfBirth_${username}`) || null,
            gender: localStorage.getItem(`gender_${username}`) || null,
        };
        
        const requestBody: { username: string; data: typeof allUserData; demo_override_token?: string } = {
            username,
            data: allUserData,
        };

        if (currentUser.username === 'demo') {
            requestBody.demo_override_token = demoOverrideToken ?? undefined;
        }

        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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
            return;
        }

        loadDataIntoLocalStorage(data, username);

        if (!isDemo) {
          toast({
            title: "Sync Successful",
            description: "Data pulled from the cloud. The app will now reload.",
          });
          setTimeout(() => {
              window.location.reload();
          }, 1500);
        }

    } catch (error) {
        console.error("Pull from cloud failed:", error);
        if (!isDemo) {
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
            // Workout
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            
            // Upskill
            upskillDefinitions: JSON.parse(localStorage.getItem(`upskill_definitions_${username}`) || '[]'),
            upskillLogs: JSON.parse(localStorage.getItem(`upskill_logs_${username}`) || '[]'),
            upskillTopicGoals: JSON.parse(localStorage.getItem(`upskill_topic_goals_${username}`) || '{}'),
            
            // Deep Work
            deepWorkDefinitions: JSON.parse(localStorage.getItem(`deepwork_definitions_${username}`) || '[]'),
            deepWorkLogs: JSON.parse(localStorage.getItem(`deepwork_logs_${username}`) || '[]'),
            deepworkManualDeletes: JSON.parse(localStorage.getItem(`deepwork_manual_deletes_${username}`) || '[]'),

            // Personal Branding
            brandingTasks: JSON.parse(localStorage.getItem(`branding_tasks_${username}`) || '[]'),
            brandingLogs: JSON.parse(localStorage.getItem(`branding_logs_${username}`) || '[]'),
            
            // Homepage Schedule
            schedule: JSON.parse(localStorage.getItem(`lifeos_schedule_${username}`) || '{}'),

            // Health
            dietPlan: JSON.parse(localStorage.getItem(`dietPlan_${username}`) || '[]'),
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
        link.download = `lifeos_backup_${username}_${new Date().toISOString().split('T')[0]}.json`;
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

                       const requiredKeys = [
                          'exerciseDefinitions', 'workoutPlans', 'allWorkoutLogs', 'workoutMode',
                          'upskillDefinitions', 'upskillLogs', 'upskillTopicGoals',
                          'deepWorkDefinitions', 'deepWorkLogs',
                          'brandingTasks', 'brandingLogs',
                          'schedule', 'dietPlan', 'weightLogs'
                      ];

                      const missingKeys = requiredKeys.filter(key => data[key] === undefined);

                      if (missingKeys.length > 0) {
                          throw new Error(`Invalid backup file. Missing keys: ${missingKeys.join(', ')}.`);
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
