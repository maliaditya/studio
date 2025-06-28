"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser, WeightLog, Gender, UserDietPlan, FullSchedule, DatedWorkout, Activity, LoggedSet } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
} from '@/lib/localAuth';
import { format } from 'date-fns';


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
  isDemoTokenModalOpen: boolean;
  setIsDemoTokenModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pushDemoDataWithToken: (token: string) => Promise<void>;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  
  // Shared health state
  weightLogs: WeightLog[];
  setWeightLogs: React.Dispatch<React.SetStateAction<WeightLog[]>>;
  goalWeight: number | null;
  setGoalWeight: React.Dispatch<React.SetStateAction<number | null>>;
  height: number | null;
  setHeight: React.Dispatch<React.SetStateAction<number | null>>;
  dateOfBirth: string | null;
  setDateOfBirth: React.Dispatch<React.SetStateAction<string | null>>;
  gender: Gender | null;
  setGender: React.Dispatch<React.SetStateAction<Gender | null>>;
  dietPlan: UserDietPlan;
  setDietPlan: React.Dispatch<React.SetStateAction<UserDietPlan>>;

  // Global Schedule & Agenda State
  schedule: FullSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<FullSchedule>>;
  isAgendaDocked: boolean;
  setIsAgendaDocked: React.Dispatch<React.SetStateAction<boolean>>;
  activityDurations: Record<string, string>;
  setActivityDurations: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  handleToggleComplete: (slotName: string, activityId: string) => void;
  handleLogLearning: (activity: Activity, progress: number, duration: number) => void;
  carryForwardTask: (activity: Activity, targetSlot: string) => void;

  // Global Logs State
  allUpskillLogs: DatedWorkout[];
  setAllUpskillLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  allDeepWorkLogs: DatedWorkout[];
  setAllDeepWorkLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper hook to get the previous value of a state or prop
const usePrevious = <T,>(value: T) => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoTokenModalOpen, setIsDemoTokenModalOpen] = useState(false);
  const [theme, setTheme] = useState('default');
  const router = useRouter();
  const { toast } = useToast();

  const prevUser = usePrevious(currentUser);

  // Shared Health State
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [dietPlan, setDietPlan] = useState<UserDietPlan>([]);

  // Global Schedule & Logs
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [isAgendaDocked, setIsAgendaDocked] = useState(true); // Default to docked
  const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
  const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
  const [activityDurations, setActivityDurations] = useState<Record<string, string>>({});


  useEffect(() => {
    const user = getCurrentLocalUser();
    setCurrentUser(user);
    setLoading(false);
    
    const savedTheme = localStorage.getItem('lifeos_theme') || 'default';
    setTheme(savedTheme);
  }, []);

  // This effect shows a toast ONLY when a user logs out.
  useEffect(() => {
    if (prevUser && !currentUser) {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
    }
  }, [currentUser, prevUser, toast]);

  // Effect to load all user-specific data when currentUser changes
  useEffect(() => {
    if (currentUser?.username) {
      const username = currentUser.username;
      const loadItem = (key: string, isJson: boolean = true) => localStorage.getItem(key);
      
      // Health Data
      const weightLogsKey = `weightLogs_${username}`;
      const goalWeightKey = `goalWeight_${username}`;
      const heightKey = `height_${username}`;
      const dobKey = `dateOfBirth_${username}`;
      const genderKey = `gender_${username}`;
      const dietPlanKey = `dietPlan_${username}`;
      
      try { const d = loadItem(weightLogsKey); setWeightLogs(d ? JSON.parse(d) : []); } catch (e) { setWeightLogs([]); }
      try { const d = loadItem(dietPlanKey); setDietPlan(d ? JSON.parse(d) : []); } catch (e) { setDietPlan([]); }
      const storedGoal = loadItem(goalWeightKey, false); if (storedGoal) setGoalWeight(parseFloat(storedGoal)); else setGoalWeight(null);
      const storedHeight = loadItem(heightKey, false); if (storedHeight) setHeight(parseFloat(storedHeight)); else setHeight(null);
      const storedDob = loadItem(dobKey, false); if (storedDob) setDateOfBirth(storedDob); else setDateOfBirth(null);
      const storedGender = loadItem(genderKey, false); if (storedGender === 'male' || storedGender === 'female') setGender(storedGender as Gender); else setGender(null);

      // Schedule & Logs
      const scheduleKey = `lifeos_schedule_${username}`;
      const upskillLogsKey = `upskill_logs_${username}`;
      const deepworkLogsKey = `deepwork_logs_${username}`;

      try { const d = localStorage.getItem(scheduleKey); setSchedule(d ? JSON.parse(d) : {}); } catch (e) { setSchedule({}); }
      try { const d = localStorage.getItem(upskillLogsKey); setAllUpskillLogs(d ? JSON.parse(d) : []); } catch (e) { setAllUpskillLogs([]); }
      try { const d = localStorage.getItem(deepworkLogsKey); setAllDeepWorkLogs(d ? JSON.parse(d) : []); } catch (e) { setAllDeepWorkLogs([]); }

    } else {
      // Clear all data on logout
      setWeightLogs([]);
      setGoalWeight(null);
      setHeight(null);
      setDateOfBirth(null);
      setGender(null);
      setDietPlan([]);
      setSchedule({});
      setAllUpskillLogs([]);
      setAllDeepWorkLogs([]);
    }
  }, [currentUser]);

  // Effect to save all data to localStorage whenever it changes
  useEffect(() => {
    if (currentUser?.username && !loading) {
      const username = currentUser.username;
      // Health
      localStorage.setItem(`weightLogs_${username}`, JSON.stringify(weightLogs));
      localStorage.setItem(`dietPlan_${username}`, JSON.stringify(dietPlan));
      if (goalWeight !== null) localStorage.setItem(`goalWeight_${username}`, goalWeight.toString()); else localStorage.removeItem(`goalWeight_${username}`);
      if (height !== null) localStorage.setItem(`height_${username}`, height.toString()); else localStorage.removeItem(`height_${username}`);
      if (dateOfBirth) localStorage.setItem(`dateOfBirth_${username}`, dateOfBirth); else localStorage.removeItem(`dateOfBirth_${username}`);
      if (gender) localStorage.setItem(`gender_${username}`, gender); else localStorage.removeItem(`gender_${username}`);
      
      // Schedule & Logs
      localStorage.setItem(`lifeos_schedule_${username}`, JSON.stringify(schedule));
      localStorage.setItem(`upskill_logs_${username}`, JSON.stringify(allUpskillLogs));
      localStorage.setItem(`deepwork_logs_${username}`, JSON.stringify(allDeepWorkLogs));
    }
  }, [weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, schedule, allUpskillLogs, allDeepWorkLogs, currentUser, loading]);


  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-default', 'theme-matrix');
    
    if (theme === 'matrix') {
      root.classList.add('theme-matrix');
    } else {
      root.classList.add('theme-default');
    }
    
    localStorage.setItem('lifeos_theme', theme);
  }, [theme]);

  const loadDataIntoLocalStorage = (data: any, username: string) => {
    if (!data) return;

    // This function now primarily sets context state, which then saves to localStorage
    // Workout
    localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(data.exerciseDefinitions || []));
    localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(data.workoutPlans || {}));
    localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(data.allWorkoutLogs || []));
    localStorage.setItem(`workoutMode_${username}`, data.workoutMode || 'two-muscle');

    // Upskill
    localStorage.setItem(`upskill_definitions_${username}`, JSON.stringify(data.upskillDefinitions || []));
    setAllUpskillLogs(data.upskillLogs || []);
    localStorage.setItem(`upskill_topic_goals_${username}`, JSON.stringify(data.upskillTopicGoals || {}));
    
    // Deep Work
    localStorage.setItem(`deepwork_definitions_${username}`, JSON.stringify(data.deepWorkDefinitions || []));
    setAllDeepWorkLogs(data.deepWorkLogs || []);
    localStorage.setItem(`deepwork_manual_deletes_${username}`, JSON.stringify(data.deepworkManualDeletes || []));
    
    // Personal Branding
    localStorage.setItem(`branding_tasks_${username}`, JSON.stringify(data.brandingTasks || []));
    localStorage.setItem(`branding_logs_${username}`, JSON.stringify(data.brandingLogs || []));
    
    // Homepage Schedule
    setSchedule(data.schedule || {});

    // Health
    setDietPlan(data.dietPlan || []);
    setWeightLogs(data.weightLogs || []);
    setGoalWeight(data.goalWeight ? parseFloat(data.goalWeight) : null);
    setHeight(data.height ? parseFloat(data.height) : null);
    setDateOfBirth(data.dateOfBirth || null);
    setGender(data.gender || null);
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
    // REMOVED: toast({ title: "Logged Out", description: "You have been successfully logged out." });
    setLoading(false);
  };

  const pushDemoDataWithToken = async (token: string) => {
    const username = 'demo';
    if (!token || token.trim() === '') {
        toast({ title: "Update Cancelled", description: "No override token was provided.", variant: "default" });
        return;
    }
    
    toast({ title: "Syncing...", description: "Pushing demo data to the cloud." });
    try {
      const allUserData = {
        exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
        workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
        allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
        workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
        upskillDefinitions: JSON.parse(localStorage.getItem(`upskill_definitions_${username}`) || '[]'),
        upskillLogs: allUpskillLogs,
        upskillTopicGoals: JSON.parse(localStorage.getItem(`upskill_topic_goals_${username}`) || '{}'),
        deepWorkDefinitions: JSON.parse(localStorage.getItem(`deepwork_definitions_${username}`) || '[]'),
        deepWorkLogs: allDeepWorkLogs,
        deepworkManualDeletes: JSON.parse(localStorage.getItem(`deepwork_manual_deletes_${username}`) || '[]'),
        brandingTasks: JSON.parse(localStorage.getItem(`branding_tasks_${username}`) || '[]'),
        brandingLogs: JSON.parse(localStorage.getItem(`branding_logs_${username}`) || '[]'),
        schedule: schedule,
        dietPlan: dietPlan,
        weightLogs: weightLogs,
        goalWeight: goalWeight,
        height: height,
        dateOfBirth: dateOfBirth,
        gender: gender,
    };
        const requestBody = { username, data: allUserData, demo_override_token: token };
        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to push data.');
        }
        toast({ title: "Success", description: "Demo data has been saved to the cloud." });
    } catch (error) {
        console.error("Push to cloud for demo user failed:", error);
        toast({
            title: "Sync Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    }
  };


  const pushDataToCloud = async () => {
    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
        return;
    }

    const username = currentUser.username;

    if (username === 'demo') {
        setIsDemoTokenModalOpen(true);
        return;
    }
    
    toast({ title: "Syncing...", description: "Pushing your local data to the cloud." });
    try {
        const allUserData = {
            exerciseDefinitions: JSON.parse(localStorage.getItem(`exerciseDefinitions_${username}`) || '[]'),
            workoutPlans: JSON.parse(localStorage.getItem(`workoutPlans_${username}`) || '{}'),
            allWorkoutLogs: JSON.parse(localStorage.getItem(`allWorkoutLogs_${username}`) || '[]'),
            workoutMode: localStorage.getItem(`workoutMode_${username}`) || 'two-muscle',
            upskillDefinitions: JSON.parse(localStorage.getItem(`upskill_definitions_${username}`) || '[]'),
            upskillLogs: allUpskillLogs,
            upskillTopicGoals: JSON.parse(localStorage.getItem(`upskill_topic_goals_${username}`) || '{}'),
            deepWorkDefinitions: JSON.parse(localStorage.getItem(`deepwork_definitions_${username}`) || '[]'),
            deepWorkLogs: allDeepWorkLogs,
            deepworkManualDeletes: JSON.parse(localStorage.getItem(`deepwork_manual_deletes_${username}`) || '[]'),
            brandingTasks: JSON.parse(localStorage.getItem(`branding_tasks_${username}`) || '[]'),
            brandingLogs: JSON.parse(localStorage.getItem(`branding_logs_${username}`) || '[]'),
            schedule: schedule,
            dietPlan: dietPlan,
            weightLogs: weightLogs,
            goalWeight: goalWeight,
            height: height,
            dateOfBirth: dateOfBirth,
            gender: gender,
        };
        const requestBody = { username, data: allUserData };
        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody),
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
            upskillLogs: allUpskillLogs,
            upskillTopicGoals: JSON.parse(localStorage.getItem(`upskill_topic_goals_${username}`) || '{}'),
            
            // Deep Work
            deepWorkDefinitions: JSON.parse(localStorage.getItem(`deepwork_definitions_${username}`) || '[]'),
            deepWorkLogs: allDeepWorkLogs,
            deepworkManualDeletes: JSON.parse(localStorage.getItem(`deepwork_manual_deletes_${username}`) || '[]'),

            // Personal Branding
            brandingTasks: JSON.parse(localStorage.getItem(`branding_tasks_${username}`) || '[]'),
            brandingLogs: JSON.parse(localStorage.getItem(`branding_logs_${username}`) || '[]'),
            
            // Homepage Schedule
            schedule: schedule,

            // Health
            dietPlan: dietPlan,
            weightLogs: weightLogs,
            goalWeight: goalWeight,
            height: height,
            dateOfBirth: dateOfBirth,
            gender: gender,
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

  const handleToggleComplete = (slotName: string, activityId: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    setSchedule(prev => {
      const todaySchedule = { ...(prev[todayKey] || {}) };
      const activities = todaySchedule[slotName] || [];
      if (activities.length > 0) {
        todaySchedule[slotName] = activities.map(act => 
          act.id === activityId ? { ...act, completed: !act.completed } : act
        );
      }
      return { ...prev, [todayKey]: todaySchedule };
    });
  };
  
  const handleLogLearning = (activity: Activity, progress: number, duration: number) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const isUpskill = activity.type === 'upskill';
    const logsUpdater = isUpskill ? setAllUpskillLogs : setAllDeepWorkLogs;

    logsUpdater(prevLogs => {
      let newLogs = [...prevLogs];
      const logIndex = newLogs.findIndex(log => log.date === todayKey);

      if (logIndex === -1) {
        toast({ title: "Error", description: "Could not find a session for today. Please add a task on the main page first.", variant: "destructive" });
        return prevLogs;
      }

      const exerciseId = activity.taskIds?.[0];
      if (!exerciseId) {
        toast({ title: "Error", description: "No specific task linked to this agenda item.", variant: "destructive" });
        return prevLogs;
      }
      
      const newSet: LoggedSet = {
        id: Date.now().toString(),
        reps: isUpskill ? duration : 1, // Store duration in reps for upskill, 1 for deepwork
        weight: isUpskill ? progress : duration, // Store progress in weight for upskill, duration for deepwork
        timestamp: Date.now(),
      };

      const exerciseIndex = newLogs[logIndex].exercises.findIndex(ex => ex.id === exerciseId);

      if (exerciseIndex > -1) {
        const updatedExercises = [...newLogs[logIndex].exercises];
        updatedExercises[exerciseIndex] = {
          ...updatedExercises[exerciseIndex],
          loggedSets: [...updatedExercises[exerciseIndex].loggedSets, newSet]
        };
        newLogs[logIndex] = {
          ...newLogs[logIndex],
          exercises: updatedExercises
        };
        toast({ title: "Progress Logged", description: "Your session has been saved." });
      } else {
        toast({ title: "Error", description: "Could not find the specific task to log against.", variant: "destructive" });
        return prevLogs;
      }
      
      return newLogs;
    });

    // Also mark the activity as complete in the schedule
    setSchedule(prev => {
        const todaySchedule = { ...(prev[todayKey] || {}) };
        const slotActivities = todaySchedule[activity.slot] || [];
        todaySchedule[activity.slot] = slotActivities.map(act => 
            act.id === activity.id ? { ...act, completed: true } : act
        );
        return { ...prev, [todayKey]: todaySchedule };
    });
  };

  const carryForwardTask = (activity: Activity, targetSlot: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    setSchedule(prev => {
        const newTodaySchedule = { ...(prev[todayKey] || {}) };
        const activitiesInSlot = newTodaySchedule[targetSlot] || [];
        
        if (activitiesInSlot.length >= 2) {
            toast({
                title: "Slot Full",
                description: "Cannot add more than two activities to a single time slot.",
                variant: "destructive"
            });
            return prev; // Return previous state without changes
        }

        const newActivity: Activity = {
            ...activity,
            id: `${activity.type}-${Date.now()}-${Math.random()}`,
            completed: false,
        };

        newTodaySchedule[targetSlot] = [...activitiesInSlot, newActivity];
        
        toast({
            title: "Task Carried Forward",
            description: `"${newActivity.details}" has been added to today's ${targetSlot} slot.`
        });
        
        return { ...prev, [todayKey]: newTodaySchedule };
    });
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
    isDemoTokenModalOpen,
    setIsDemoTokenModalOpen,
    pushDemoDataWithToken,
    theme,
    setTheme,
    // Health State
    weightLogs,
    setWeightLogs,
    goalWeight,
    setGoalWeight,
    height,
    setHeight,
    dateOfBirth,
    setDateOfBirth,
    gender,
    setGender,
    dietPlan,
    setDietPlan,
    // Global Schedule & Logs
    schedule,
    setSchedule,
    isAgendaDocked,
    setIsAgendaDocked,
    activityDurations,
    setActivityDurations,
    handleToggleComplete,
    handleLogLearning,
    carryForwardTask,
    allUpskillLogs,
    setAllUpskillLogs,
    allDeepWorkLogs,
    setAllDeepWorkLogs,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
