
"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser, WeightLog, Gender, UserDietPlan, FullSchedule, DatedWorkout, Activity, LoggedSet, WorkoutMode, AllWorkoutPlans, ExerciseDefinition, TopicGoal, DeepWorkTopicMetadata, ProductizationPlan, Release, ExerciseCategory, ActivityType, Offer, Resource, ResourceFolder, CanvasLayout, MindsetCard } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
} from '@/lib/localAuth';
import { format, addDays, parseISO, subDays } from 'date-fns';
import { DEFAULT_EXERCISE_DEFINITIONS, INITIAL_PLANS, LEAD_GEN_DEFINITIONS, DEFAULT_MINDSET_CARDS } from '@/lib/constants';
import { getExercisesForDay } from '@/lib/workoutUtils';


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
  floatingVideoUrl: string | null;
  setFloatingVideoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isAudioPlaying: boolean;
  setIsAudioPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  
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
  handleToggleComplete: (dateKey: string, slotName: string, activityId: string) => void;
  handleLogLearning: (dateKey: string, activity: Activity, progress: number, duration: number) => void;
  carryForwardTask: (activity: Activity, targetSlot: string) => void;
  scheduleTaskFromMindMap: (definitionId: string, activityType: ActivityType, slotName: string) => void;

  // Global Logs State
  allUpskillLogs: DatedWorkout[];
  setAllUpskillLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  allDeepWorkLogs: DatedWorkout[];
  setAllDeepWorkLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  allWorkoutLogs: DatedWorkout[];
  setAllWorkoutLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  brandingLogs: DatedWorkout[];
  setAllBrandingLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  allLeadGenLogs: DatedWorkout[];
  setAllLeadGenLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  
  // Data Definitions & Plans
  workoutMode: WorkoutMode;
  setWorkoutMode: React.Dispatch<React.SetStateAction<WorkoutMode>>;
  workoutPlans: AllWorkoutPlans;
  setWorkoutPlans: React.Dispatch<React.SetStateAction<AllWorkoutPlans>>;
  exerciseDefinitions: ExerciseDefinition[];
  setExerciseDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  
  upskillDefinitions: ExerciseDefinition[];
  setUpskillDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  topicGoals: Record<string, TopicGoal>;
  setTopicGoals: React.Dispatch<React.SetStateAction<Record<string, TopicGoal>>>;

  deepWorkDefinitions: ExerciseDefinition[];
  setDeepWorkDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  deepWorkTopicMetadata: Record<string, DeepWorkTopicMetadata>;
  setDeepWorkTopicMetadata: React.Dispatch<React.SetStateAction<Record<string, DeepWorkTopicMetadata>>>;
  
  leadGenDefinitions: ExerciseDefinition[];
  setLeadGenDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  
  productizationPlans: Record<string, ProductizationPlan>;
  setProductizationPlans: React.Dispatch<React.SetStateAction<Record<string, ProductizationPlan>>>;
  offerizationPlans: Record<string, ProductizationPlan>;
  setOfferizationPlans: React.Dispatch<React.SetStateAction<Record<string, ProductizationPlan>>>;
  addFeatureToRelease: (release: Release, topic: string, featureName: string, type: 'product' | 'service') => void;
  updateTopic: (oldTopicName: string, newTopicName: string, newClassification: 'product' | 'service') => void;
  deleteTopic: (topic: string) => void;
  copyOffer: (topic: string, offerId: string) => void;

  // Resources
  resourceFolders: ResourceFolder[];
  setResourceFolders: React.Dispatch<React.SetStateAction<ResourceFolder[]>>;
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;

  // Workout Log Handlers
  logWorkoutSet: (date: Date, exerciseId: string, reps: number, weight: number) => void;
  updateWorkoutSet: (date: Date, exerciseId: string, setId: string, reps: number, weight: number) => void;
  deleteWorkoutSet: (date: Date, exerciseId: string, setId: string) => void;
  removeExerciseFromWorkout: (date: Date, exerciseId: string) => void;
  swapWorkoutExercise: (date: Date, oldExerciseId: string, newExerciseDefinition: ExerciseDefinition) => void;
  
  // Canvas
  canvasLayout: CanvasLayout;
  setCanvasLayout: React.Dispatch<React.SetStateAction<CanvasLayout>>;

  // Mindset
  mindsetCards: MindsetCard[];
  setMindsetCards: React.Dispatch<React.SetStateAction<MindsetCard[]>>;
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
  const [floatingVideoUrl, setFloatingVideoUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const prevUser = usePrevious(currentUser);

  // Health State
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [dietPlan, setDietPlan] = useState<UserDietPlan>([]);

  // Schedule & Logs
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [isAgendaDocked, setIsAgendaDocked] = useState(true);
  const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
  const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [brandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);
  const [allLeadGenLogs, setAllLeadGenLogs] = useState<DatedWorkout[]>([]);
  const [activityDurations, setActivityDurations] = useState<Record<string, string>>({});
  
  // Data Definitions & Plans
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>(DEFAULT_EXERCISE_DEFINITIONS);
  const [upskillDefinitions, setUpskillDefinitions] = useState<ExerciseDefinition[]>([]);
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});
  const [deepWorkDefinitions, setDeepWorkDefinitions] = useState<ExerciseDefinition[]>([]);
  const [deepWorkTopicMetadata, setDeepWorkTopicMetadata] = useState<Record<string, DeepWorkTopicMetadata>>({});
  const [leadGenDefinitions, setLeadGenDefinitions] = useState<ExerciseDefinition[]>(LEAD_GEN_DEFINITIONS);
  const [productizationPlans, setProductizationPlans] = useState<Record<string, ProductizationPlan>>({});
  const [offerizationPlans, setOfferizationPlans] = useState<Record<string, ProductizationPlan>>({});

  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceFolders, setResourceFolders] = useState<ResourceFolder[]>([]);

  // Canvas State
  const [canvasLayout, setCanvasLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  // Mindset State
  const [mindsetCards, setMindsetCards] = useState<MindsetCard[]>(DEFAULT_MINDSET_CARDS);


  useEffect(() => {
    const user = getCurrentLocalUser();
    setCurrentUser(user);
    setLoading(false);
    
    const savedTheme = localStorage.getItem('lifeos_theme') || 'default';
    setTheme(savedTheme);
  }, []);

  // This effect shows a toast ONLY when a user logs out.
  useEffect(() => {
    // Defer the toast until after the current render cycle to avoid state update conflicts.
    if (prevUser && !currentUser) {
      setTimeout(() => {
        toast({ title: "Logged Out", description: "You have been successfully logged out." });
      }, 0);
    }
  }, [currentUser, prevUser, toast]);

  // Effect to load all user-specific data when currentUser changes
  useEffect(() => {
    if (currentUser?.username) {
      const username = currentUser.username;
      const loadItem = (key: string, isJson: boolean = true) => localStorage.getItem(key);
      
      // Health Data
      try { const d = loadItem(`weightLogs_${username}`); setWeightLogs(d ? JSON.parse(d) : []); } catch (e) { setWeightLogs([]); }
      try { const d = loadItem(`dietPlan_${username}`); setDietPlan(d ? JSON.parse(d) : []); } catch (e) { setDietPlan([]); }
      const storedGoal = loadItem(`goalWeight_${username}`, false); if (storedGoal) setGoalWeight(parseFloat(storedGoal)); else setGoalWeight(null);
      const storedHeight = loadItem(`height_${username}`, false); if (storedHeight) setHeight(parseFloat(storedHeight)); else setHeight(null);
      const storedDob = loadItem(`dateOfBirth_${username}`, false); if (storedDob) setDateOfBirth(storedDob); else setDateOfBirth(null);
      const storedGender = loadItem(`gender_${username}`, false); if (storedGender === 'male' || storedGender === 'female') setGender(storedGender as Gender); else setGender(null);

      // Schedule & Logs
      try { const d = localStorage.getItem(`lifeos_schedule_${username}`); setSchedule(d ? JSON.parse(d) : {}); } catch (e) { setSchedule({}); }
      try { const d = localStorage.getItem(`upskill_logs_${username}`); setAllUpskillLogs(d ? JSON.parse(d) : []); } catch (e) { setAllUpskillLogs([]); }
      try { const d = localStorage.getItem(`deepwork_logs_${username}`); setAllDeepWorkLogs(d ? JSON.parse(d) : []); } catch (e) { setAllDeepWorkLogs([]); }
      try { const d = localStorage.getItem(`allWorkoutLogs_${username}`); setAllWorkoutLogs(d ? JSON.parse(d) : []); } catch (e) { setAllWorkoutLogs([]); }
      try { const d = localStorage.getItem(`branding_logs_${username}`); setAllBrandingLogs(d ? JSON.parse(d) : []); } catch (e) { setAllBrandingLogs([]); }
      try { const d = localStorage.getItem(`leadgen_logs_${username}`); setAllLeadGenLogs(d ? JSON.parse(d) : []); } catch (e) { setAllLeadGenLogs([]); }
      
      // Definitions, Plans, and Goals
      const storedMode = loadItem(`workoutMode_${username}`, false);
      if (storedMode === 'one-muscle' || storedMode === 'two-muscle') setWorkoutMode(storedMode as WorkoutMode); else setWorkoutMode('two-muscle');
      try { const d = loadItem(`workoutPlans_${username}`); setWorkoutPlans(d ? JSON.parse(d) : INITIAL_PLANS); } catch (e) { setWorkoutPlans(INITIAL_PLANS); }
      try { const d = loadItem(`exerciseDefinitions_${username}`); setExerciseDefinitions(d ? JSON.parse(d) : DEFAULT_EXERCISE_DEFINITIONS); } catch (e) { setExerciseDefinitions(DEFAULT_EXERCISE_DEFINITIONS); }
      try { const d = loadItem(`upskill_definitions_${username}`); setUpskillDefinitions(d ? JSON.parse(d) : []); } catch (e) { setUpskillDefinitions([]); }
      try { const d = loadItem(`upskill_topic_goals_${username}`); setTopicGoals(d ? JSON.parse(d) : {}); } catch (e) { setTopicGoals({}); }
      try { const d = loadItem(`deepwork_definitions_${username}`); setDeepWorkDefinitions(d ? JSON.parse(d) : []); } catch (e) { setDeepWorkDefinitions([]); }
      try { const d = loadItem(`deepwork_topic_metadata_${username}`); setDeepWorkTopicMetadata(d ? JSON.parse(d) : {}); } catch (e) { setDeepWorkTopicMetadata({}); }
      try { const d = loadItem(`leadgen_definitions_${username}`); setLeadGenDefinitions(d ? JSON.parse(d) : LEAD_GEN_DEFINITIONS); } catch (e) { setLeadGenDefinitions(LEAD_GEN_DEFINITIONS); }
      try { const d = loadItem(`productization_plans_${username}`); setProductizationPlans(d ? JSON.parse(d) : {}); } catch (e) { setProductizationPlans({}); }
      try { const d = loadItem(`offerization_plans_${username}`); setOfferizationPlans(d ? JSON.parse(d) : {}); } catch (e) { setOfferizationPlans({}); }

      // Resources Data Migration
      const storedCategories = localStorage.getItem(`resourceCategories_${username}`);
      const storedSubcategories = localStorage.getItem(`resourceSubcategories_${username}`);
      const storedFolders = localStorage.getItem(`resourceFolders_${username}`);

      if (storedFolders) {
        setResourceFolders(JSON.parse(storedFolders));
      } else if (storedCategories) {
        const categories = JSON.parse(storedCategories);
        const subcategories = storedSubcategories ? JSON.parse(storedSubcategories) : [];
        const migratedFolders: ResourceFolder[] = [];
        categories.forEach((cat: any) => {
          migratedFolders.push({ id: cat.id, name: cat.name, parentId: null, icon: cat.icon });
        });
        subcategories.forEach((sub: any) => {
          migratedFolders.push({ id: sub.id, name: sub.name, parentId: sub.categoryId });
        });
        setResourceFolders(migratedFolders);
      } else {
        setResourceFolders([]);
      }

      const storedResources = localStorage.getItem(`resources_${username}`);
      if (storedResources) {
          let resourcesData = JSON.parse(storedResources);
          if (resourcesData.length > 0 && resourcesData[0].categoryId) {
              resourcesData = resourcesData.map((res: any) => ({
                  id: res.id,
                  name: res.name,
                  link: res.link,
                  description: res.description,
                  folderId: res.subcategoryId || res.categoryId,
              }));
          }
          setResources(resourcesData);
      } else {
          setResources([]);
      }
      
      // Canvas Data
      try { const d = localStorage.getItem(`canvas_layout_${username}`); setCanvasLayout(d ? JSON.parse(d) : { nodes: [], edges: [] }); } catch (e) { setCanvasLayout({ nodes: [], edges: [] }); }

      // Mindset Data
      try { const d = localStorage.getItem(`mindset_cards_${username}`); setMindsetCards(d ? JSON.parse(d) : DEFAULT_MINDSET_CARDS); } catch (e) { setMindsetCards(DEFAULT_MINDSET_CARDS); }


    } else {
      // Clear all data on logout
      setWeightLogs([]); setGoalWeight(null); setHeight(null); setDateOfBirth(null); setGender(null); setDietPlan([]);
      setSchedule({});
      setAllUpskillLogs([]); setAllDeepWorkLogs([]); setAllWorkoutLogs([]); setAllBrandingLogs([]); setAllLeadGenLogs([]);
      setWorkoutMode('two-muscle'); setWorkoutPlans(INITIAL_PLANS); setExerciseDefinitions(DEFAULT_EXERCISE_DEFINITIONS);
      setUpskillDefinitions([]); setTopicGoals({});
      setDeepWorkDefinitions([]); setDeepWorkTopicMetadata({});
      setLeadGenDefinitions(LEAD_GEN_DEFINITIONS);
      setProductizationPlans({});
      setOfferizationPlans({});
      setResources([]); setResourceFolders([]);
      setCanvasLayout({ nodes: [], edges: [] });
      setMindsetCards(DEFAULT_MINDSET_CARDS);
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
      localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(allWorkoutLogs));
      localStorage.setItem(`branding_logs_${username}`, JSON.stringify(brandingLogs));
      localStorage.setItem(`leadgen_logs_${username}`, JSON.stringify(allLeadGenLogs));

      // Definitions, Plans, and Goals
      localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(exerciseDefinitions));
      localStorage.setItem(`workoutMode_${username}`, workoutMode);
      localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(workoutPlans));
      localStorage.setItem(`upskill_definitions_${username}`, JSON.stringify(upskillDefinitions));
      localStorage.setItem(`upskill_topic_goals_${username}`, JSON.stringify(topicGoals));
      localStorage.setItem(`deepwork_definitions_${username}`, JSON.stringify(deepWorkDefinitions));
      localStorage.setItem(`deepwork_topic_metadata_${username}`, JSON.stringify(deepWorkTopicMetadata));
      localStorage.setItem(`leadgen_definitions_${username}`, JSON.stringify(leadGenDefinitions));
      localStorage.setItem(`productization_plans_${username}`, JSON.stringify(productizationPlans));
      localStorage.setItem(`offerization_plans_${username}`, JSON.stringify(offerizationPlans));

      // Resources
      localStorage.setItem(`resources_${username}`, JSON.stringify(resources));
      localStorage.setItem(`resourceFolders_${username}`, JSON.stringify(resourceFolders));
      
      // Canvas
      localStorage.setItem(`canvas_layout_${username}`, JSON.stringify(canvasLayout));

      // Mindset
      localStorage.setItem(`mindset_cards_${username}`, JSON.stringify(mindsetCards));


      // Clean up old resource keys after migration
      localStorage.removeItem(`resourceCategories_${username}`);
      localStorage.removeItem(`resourceSubcategories_${username}`);
    }
  }, [
    weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, 
    schedule, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs,
    exerciseDefinitions, workoutMode, workoutPlans, upskillDefinitions, topicGoals, deepWorkDefinitions, deepWorkTopicMetadata, leadGenDefinitions,
    productizationPlans, offerizationPlans,
    resources, resourceFolders,
    canvasLayout,
    mindsetCards,
    currentUser, loading
  ]);


  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('theme-default', 'theme-matrix', 'theme-ad-dark');
    
    if (theme === 'matrix') {
      root.classList.add('theme-matrix');
    } else if (theme === 'ad-dark') {
        root.classList.add('theme-ad-dark');
    } else {
      root.classList.add('theme-default');
    }
    
    localStorage.setItem('lifeos_theme', theme);
  }, [theme]);

  const [isScheduleLoaded, setIsScheduleLoaded] = useState(false);
  useEffect(() => {
    if (currentUser?.username) {
        setIsScheduleLoaded(true);
    }
  }, [currentUser]);

  // Carry forward tasks logic
  useEffect(() => {
    if (!currentUser || !isScheduleLoaded) return;
    
    const settingsKey = `lifeos_settings_${currentUser.username}`;
    const storedSettings = localStorage.getItem(settingsKey);
    const settings = storedSettings ? JSON.parse(storedSettings) : { carryForward: false };
    if (!settings.carryForward) return;

    const today = new Date();
    const todayDateKey = format(today, 'yyyy-MM-dd');
    const yesterday = addDays(today, -1);
    const yesterdayKey = format(yesterday, 'yyyy-MM-dd');

    const lastCarryForwardKey = `lifeos_last_carry_forward_${currentUser.username}`;
    const lastCarryForwardDate = localStorage.getItem(lastCarryForwardKey);
    if (lastCarryForwardDate === todayDateKey) return;

    const todaysActivities = schedule[todayDateKey];
    const hasTodaysActivities = todaysActivities && Object.keys(todaysActivities).length > 0 && Object.values(todaysActivities).some(slot => slot.length > 0);
    if (hasTodaysActivities) {
        localStorage.setItem(lastCarryForwardKey, todayDateKey);
        return;
    }

    const yesterdaysSchedule = schedule[yesterdayKey];
    if (!yesterdaysSchedule || Object.keys(yesterdaysSchedule).length === 0) {
        localStorage.setItem(lastCarryForwardKey, todayDateKey);
        return;
    }

    const newTodaySchedule: DailySchedule = {};
    let carriedOver = false;

    Object.entries(yesterdaysSchedule).forEach(([slotName, activities]) => {
      const incompleteActivities = (activities || []).filter(activity => activity && !activity.completed);
      
      if (incompleteActivities.length > 0) {
        newTodaySchedule[slotName] = incompleteActivities.map(activity => {
          let newDetails = '';

          switch (activity.type) {
            case 'workout': {
              const { description } = getExercisesForDay(today, workoutMode, workoutPlans, exerciseDefinitions);
              newDetails = description.split(' for ')[1] || "Workout";
              break;
            }
            case 'upskill':
              newDetails = 'Learning Session';
              break;
            case 'deepwork':
              newDetails = 'Deep Work Session';
              break;
            case 'planning':
              newDetails = 'Planning Session';
              break;
            case 'tracking':
              newDetails = 'Tracking Session';
              break;
            case 'branding':
              newDetails = 'Branding Session';
              break;
            case 'lead-generation':
              newDetails = 'Lead Generation Session';
              break;
            default:
              newDetails = activity.details; // Fallback
          }

          return {
            ...activity,
            id: `${activity.type}-${Date.now()}-${Math.random()}`,
            completed: false,
            details: newDetails,
            taskIds: [], // Reset linked tasks
          };
        });
        carriedOver = true;
      }
    });

    if (carriedOver) {
      setSchedule(prev => ({ ...prev, [todayDateKey]: newTodaySchedule }));
      toast({ title: "Tasks Carried Over", description: "Yesterday's incomplete tasks have been moved to today." });
    }

    localStorage.setItem(lastCarryForwardKey, todayDateKey);
  }, [currentUser, isScheduleLoaded, schedule, setSchedule, toast, workoutMode, workoutPlans, exerciseDefinitions]);

  const loadDataIntoLocalStorage = (data: any, username: string) => {
    if (!data) return;

    setExerciseDefinitions(data.exerciseDefinitions || DEFAULT_EXERCISE_DEFINITIONS);
    setWorkoutPlans(data.workoutPlans || INITIAL_PLANS);
    setAllWorkoutLogs(data.allWorkoutLogs || []);
    setWorkoutMode(data.workoutMode || 'two-muscle');
    
    setUpskillDefinitions(data.upskillDefinitions || []);
    setAllUpskillLogs(data.upskillLogs || []);
    setTopicGoals(data.upskillTopicGoals || {});
    
    setDeepWorkDefinitions(data.deepWorkDefinitions || []);
    setAllDeepWorkLogs(data.deepWorkLogs || []);
    setDeepWorkTopicMetadata(data.deepWorkTopicMetadata || {});
    
    setAllBrandingLogs(data.brandingLogs || []);

    setLeadGenDefinitions(data.leadGenDefinitions || LEAD_GEN_DEFINITIONS);
    setAllLeadGenLogs(data.allLeadGenLogs || []);
    
    setProductizationPlans(data.productizationPlans || {});
    setOfferizationPlans(data.offerizationPlans || {});

    setSchedule(data.schedule || {});

    setDietPlan(data.dietPlan || []);
    setWeightLogs(data.weightLogs || []);
    setGoalWeight(data.goalWeight ? parseFloat(data.goalWeight) : null);
    setHeight(data.height ? parseFloat(data.height) : null);
    setDateOfBirth(data.dateOfBirth || null);
    setGender(data.gender || null);
    
    // Resource Migration Logic
    if (data.resourceFolders) {
        setResourceFolders(data.resourceFolders);
    } else if (data.resourceCategories) {
        const migratedFolders: ResourceFolder[] = [];
        data.resourceCategories.forEach((cat: any) => {
            migratedFolders.push({ id: cat.id, name: cat.name, parentId: null, icon: cat.icon });
        });
        (data.resourceSubcategories || []).forEach((sub: any) => {
            migratedFolders.push({ id: sub.id, name: sub.name, parentId: sub.categoryId });
        });
        setResourceFolders(migratedFolders);
    } else {
        setResourceFolders([]);
    }

    let resourcesData = data.resources || [];
    if (resourcesData.length > 0 && resourcesData[0].categoryId) {
        resourcesData = resourcesData.map((res: any) => ({
            id: res.id, name: res.name, link: res.link, description: res.description,
            folderId: res.subcategoryId || res.categoryId,
        }));
    }
    setResources(resourcesData);

    setCanvasLayout(data.canvasLayout || { nodes: [], edges: [] });
    setMindsetCards(data.mindsetCards || DEFAULT_MINDSET_CARDS);
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
    setLoading(false);
  };

  const getAllUserData = () => {
    return {
      exerciseDefinitions, workoutPlans, allWorkoutLogs, workoutMode,
      upskillDefinitions, upskillLogs: allUpskillLogs, upskillTopicGoals: topicGoals,
      deepWorkDefinitions, deepWorkLogs: allDeepWorkLogs, deepWorkTopicMetadata,
      brandingLogs,
      leadGenDefinitions, allLeadGenLogs,
      productizationPlans,
      offerizationPlans,
      schedule,
      dietPlan, weightLogs, goalWeight, height, dateOfBirth, gender,
      resources, resourceFolders,
      canvasLayout,
      mindsetCards,
    };
  }

  const pushDemoDataWithToken = async (token: string) => {
    const username = 'demo';
    if (!token || token.trim() === '') {
        toast({ title: "Update Cancelled", description: "No override token was provided.", variant: "default" });
        return;
    }
    
    toast({ title: "Syncing...", description: "Pushing demo data to the cloud." });
    try {
        const allUserData = getAllUserData();
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
        const allUserData = getAllUserData();
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
        const dataToExport = getAllUserData();

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
                          'brandingLogs',
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

  const handleToggleComplete = (dateKey: string, slotName: string, activityId: string) => {
    setSchedule(prev => {
      const daySchedule = { ...(prev[dateKey] || {}) };
      const activities = daySchedule[slotName] || [];
      if (activities.length > 0) {
        daySchedule[slotName] = activities.map(act => 
          act.id === activityId ? { ...act, completed: !act.completed } : act
        );
      }
      return { ...prev, [dateKey]: daySchedule };
    });
  };
  
  const handleLogLearning = (dateKey: string, activity: Activity, progress: number, duration: number) => {
    const isUpskill = activity.type === 'upskill';
    const logsUpdater = isUpskill ? setAllUpskillLogs : setAllDeepWorkLogs;

    let updateSucceeded = false;

    logsUpdater(prevLogs => {
      const logIndex = prevLogs.findIndex(log => log.date === dateKey);
      if (logIndex === -1) {
        return prevLogs;
      }

      const exerciseId = activity.taskIds?.[0];
      if (!exerciseId) {
        return prevLogs;
      }
      
      const newSet: LoggedSet = {
        id: `${Date.now()}-${Math.random()}`,
        reps: isUpskill ? duration : 1, // Store duration in reps for upskill, 1 for deepwork
        weight: isUpskill ? progress : duration, // Store progress in weight for upskill, duration for deepwork
        timestamp: Date.now(),
      };

      const newLogs = [...prevLogs];
      const exerciseIndex = newLogs[logIndex].exercises.findIndex(ex => ex.id === exerciseId);

      if (exerciseIndex > -1) {
        updateSucceeded = true;
        const updatedExercises = [...newLogs[logIndex].exercises];
        updatedExercises[exerciseIndex] = {
          ...updatedExercises[exerciseIndex],
          loggedSets: [...updatedExercises[exerciseIndex].loggedSets, newSet]
        };
        newLogs[logIndex] = {
          ...newLogs[logIndex],
          exercises: updatedExercises
        };
        return newLogs;
      }
      
      return prevLogs;
    });
    
    if (updateSucceeded) {
      handleToggleComplete(dateKey, activity.slot, activity.id);
      toast({ title: "Progress Logged", description: "Your session has been saved." });
    } else {
      const sourceLogs = isUpskill ? allUpskillLogs : allDeepWorkLogs;
      const logForToday = sourceLogs.find(log => log.date === dateKey);
      if (!logForToday) {
        toast({ title: "Error", description: `Could not find a session for ${dateKey}. Please add a task on the main page first.`, variant: "destructive" });
      } else if (!activity.taskIds?.[0]) {
        toast({ title: "Error", description: "No specific task linked to this agenda item.", variant: "destructive" });
      } else {
        toast({ title: "Error", description: "Could not find the specific task to log against.", variant: "destructive" });
      }
    }
  };

  const carryForwardTask = (activity: Activity, targetSlot: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    const activitiesInSlot = schedule[todayKey]?.[targetSlot] || [];
    if (activitiesInSlot.length >= 2) {
      toast({
          title: "Slot Full",
          description: "Cannot add more than two activities to a single time slot.",
          variant: "destructive"
      });
      return;
    }

    const newActivity: Omit<Activity, 'slot'> = {
        ...activity,
        id: `${activity.type}-${Date.now()}-${Math.random()}`,
        completed: false,
    };
    
    setSchedule(prev => {
        const newTodaySchedule = { ...(prev[todayKey] || {}) };
        const currentActivities = newTodaySchedule[targetSlot] || [];
        newTodaySchedule[targetSlot] = [...currentActivities, newActivity as Activity];
        return { ...prev, [todayKey]: newTodaySchedule };
    });
    
    toast({
        title: "Task Carried Forward",
        description: `"${newActivity.details}" has been added to today's ${targetSlot} slot.`
    });
  };

  const scheduleTaskFromMindMap = (definitionId: string, activityType: ActivityType, slotName: string) => {
    let definition: ExerciseDefinition | undefined;
    let logsUpdater: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
    let logSource: DatedWorkout[];

    switch (activityType) {
        case 'upskill':
            definition = upskillDefinitions.find(d => d.id === definitionId);
            logsUpdater = setAllUpskillLogs;
            logSource = allUpskillLogs;
            break;
        case 'deepwork':
            definition = deepWorkDefinitions.find(d => d.id === definitionId);
            logsUpdater = setAllDeepWorkLogs;
            logSource = allDeepWorkLogs;
            break;
        case 'branding':
            definition = deepWorkDefinitions.find(d => d.id === definitionId);
            logsUpdater = setAllBrandingLogs;
            logSource = brandingLogs;
            break;
        default:
            toast({ title: "Error", description: "Invalid activity type for scheduling.", variant: "destructive" });
            return;
    }

    if (!definition) {
        toast({ title: "Error", description: "Task definition not found.", variant: "destructive" });
        return;
    }

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let todaysLog = logSource.find(log => log.date === todayKey);
    let exerciseInstance: WorkoutExercise | undefined;

    if (!todaysLog) {
        todaysLog = { id: todayKey, date: todayKey, exercises: [] };
    }

    exerciseInstance = todaysLog.exercises.find(ex => ex.definitionId === definitionId);

    if (!exerciseInstance) {
        exerciseInstance = {
            id: `${definition.id}-${Date.now()}-${Math.random()}`,
            definitionId: definition.id,
            name: definition.name,
            category: definition.category,
            loggedSets: [],
            targetSets: activityType === 'branding' ? 4 : 1,
            targetReps: activityType === 'branding' ? '4 stages' : '25',
            focusAreaIds: definition.focusAreaIds,
        };
        todaysLog.exercises.push(exerciseInstance);
    }
    
    logsUpdater(prevLogs => {
        const existingLogIndex = prevLogs.findIndex(log => log.date === todayKey);
        if (existingLogIndex > -1) {
            const newLogs = [...prevLogs];
            newLogs[existingLogIndex] = todaysLog!;
            return newLogs;
        }
        return [...prevLogs, todaysLog!];
    });

    const newActivity: Omit<Activity, 'slot'> = {
        id: `${activityType}-${Date.now()}-${Math.random()}`,
        type: activityType,
        details: definition.name,
        completed: false,
        taskIds: [exerciseInstance.id],
    };
    
    setSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[todayKey] || {}) };
        const activitiesInSlot = daySchedule[slotName] || [];

        if (activitiesInSlot.length >= 2) {
            toast({ title: "Slot Full", description: "Cannot add more than two activities per slot.", variant: "destructive" });
            return prev;
        }

        daySchedule[slotName] = [...activitiesInSlot, newActivity as Activity];
        newSchedule[todayKey] = daySchedule;
        return newSchedule;
    });

    toast({ title: "Task Scheduled", description: `"${definition.name}" has been added to your ${slotName} slot.` });
  };
  
  const addFeatureToRelease = (release: Release, topic: string, featureName: string, type: 'product' | 'service') => {
    if (!featureName.trim()) {
        toast({ title: "Error", description: "Feature name cannot be empty.", variant: "destructive" });
        return;
    }

    const newFeatureDef: ExerciseDefinition = {
        id: `def_${Date.now()}_${Math.random()}`,
        name: featureName.trim(),
        category: topic as ExerciseCategory,
    };

    // Add the new definition to the main list of deep work tasks.
    setDeepWorkDefinitions(prev => [...prev, newFeatureDef]);

    // Choose the correct state updater based on whether it's a product or service.
    const plansUpdater = type === 'product' ? setProductizationPlans : setOfferizationPlans;

    // Update the plans immutably.
    plansUpdater(prevPlans => {
        // 1. Create a shallow copy of the plans object.
        const newPlans = { ...prevPlans };
        
        // 2. Get the specific plan for the topic, or create a new one if it doesn't exist.
        const oldPlan = newPlans[topic] || { releases: [] };
        
        // 3. Create a new array of releases, updating the one that matches.
        const updatedReleases = (oldPlan.releases || []).map(r => {
            if (r.id === release.id) {
                // 4. If this is the correct release, return a new object for it with the new focus area ID.
                return {
                    ...r,
                    focusAreaIds: [...(r.focusAreaIds || []), newFeatureDef.id]
                };
            }
            // Return other releases unchanged.
            return r;
        });
        
        // 5. Create a new plan object for the topic with the updated releases.
        newPlans[topic] = {
            ...oldPlan,
            releases: updatedReleases
        };

        // 6. Return the new top-level plans object.
        return newPlans;
    });

    toast({ title: "Feature Added", description: `"${newFeatureDef.name}" was added to the "${release.name}" release.` });
  };
  
  const updateWorkoutInLog = (dateKey: string, updatedWorkout: DatedWorkout) => {
    setAllWorkoutLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === dateKey);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const logWorkoutSet = (date: Date, exerciseId: string, reps: number, weight: number) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateWorkoutInLog(dateKey, { ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Logged!", description: `Logged ${reps} reps at ${weight} kg/lb.`});
    }
  };

  const updateWorkoutSet = (date: Date, exerciseId: string, setId: string, reps: number, weight: number) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )};
        }
        return ex;
      });
      updateWorkoutInLog(dateKey, { ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Updated", description: "The set has been updated."});
    }
  };

  const deleteWorkoutSet = (date: Date, exerciseId: string, setId: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateWorkoutInLog(dateKey, { ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Set Deleted", description: "The set has been removed." });
    }
  };
  
  const removeExerciseFromWorkout = (date: Date, exerciseId: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      const exerciseName = existingWorkout.exercises.find(ex => ex.id === exerciseId)?.name;
      if (updatedExercises.length === 0) { 
        setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      } else {
        updateWorkoutInLog(dateKey, { ...existingWorkout, exercises: updatedExercises });
      }
      toast({ title: "Success", description: `"${exerciseName || ''}" removed from workout.` });
    }
  };
  
  const swapWorkoutExercise = (date: Date, oldExerciseId: string, newExerciseDefinition: ExerciseDefinition) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const workoutLog = allWorkoutLogs.find(log => log.id === dateKey);

    if (!workoutLog) {
      toast({ title: "Error", description: "Could not find workout log for the selected date.", variant: "destructive" });
      return;
    }

    const exerciseIndex = workoutLog.exercises.findIndex(ex => ex.id === oldExerciseId);
    if (exerciseIndex === -1) {
      toast({ title: "Error", description: "Could not find the exercise to replace.", variant: "destructive" });
      return;
    }

    const oldExerciseName = workoutLog.exercises[exerciseIndex].name;

    const newWorkoutExercise: WorkoutExercise = {
      id: `${newExerciseDefinition.id}-${Date.now()}_${Math.random()}`,
      definitionId: newExerciseDefinition.id,
      name: newExerciseDefinition.name,
      category: newExerciseDefinition.category,
      loggedSets: [],
      targetSets: 3,
      targetReps: "8-12",
    };

    const updatedExercises = [...workoutLog.exercises];
    updatedExercises[exerciseIndex] = newWorkoutExercise;

    const updatedWorkout = { ...workoutLog, exercises: updatedExercises };

    setAllWorkoutLogs(prevLogs => prevLogs.map(log => log.id === dateKey ? updatedWorkout : log));

    toast({ title: "Exercise Swapped!", description: `Replaced "${oldExerciseName}" with "${newWorkoutExercise.name}".` });
  };
  
  const updateTopic = (oldTopicName: string, newTopicName: string, newClassification: 'product' | 'service') => {
    const oldClassification = deepWorkTopicMetadata[oldTopicName]?.classification;
    const classificationDidChange = oldClassification && oldClassification !== newClassification;

    // Update definitions and logs
    setDeepWorkDefinitions(prev => prev.map(def => def.category === oldTopicName ? { ...def, category: newTopicName as ExerciseCategory } : def));
    setAllDeepWorkLogs(prev => prev.map(log => ({ ...log, exercises: log.exercises.map(ex => ex.category === oldTopicName ? { ...ex, category: newTopicName as ExerciseCategory } : ex) })));

    // Update metadata
    setDeepWorkTopicMetadata(prev => {
        const newMeta = { ...prev };
        const topicData = newMeta[oldTopicName] || { classification: oldClassification };
        delete newMeta[oldTopicName];
        newMeta[newTopicName] = { ...topicData, classification: newClassification };
        return newMeta;
    });

    // Handle plans
    if (classificationDidChange) {
        if (oldClassification === 'product') {
            const planToMove = productizationPlans[oldTopicName];
            setProductizationPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[oldTopicName];
                return newPlans;
            });
            if(planToMove) setOfferizationPlans(prev => ({ ...prev, [newTopicName]: planToMove }));
        } else { // service -> product
            const planToMove = offerizationPlans[oldTopicName];
            setOfferizationPlans(prev => {
                const newPlans = { ...prev };
                delete newPlans[oldTopicName];
                return newPlans;
            });
            if(planToMove) setProductizationPlans(prev => ({ ...prev, [newTopicName]: planToMove }));
        }
    } else {
        const renameKey = (obj: any, oldKey: string, newKey: string) => {
            const newObj = {...obj};
            if (oldKey in newObj) {
                newObj[newKey] = newObj[oldKey];
                delete newObj[oldKey];
            }
            return newObj;
        }

        if (newClassification === 'product') {
            setProductizationPlans(prev => renameKey(prev, oldTopicName, newTopicName));
        } else {
            setOfferizationPlans(prev => renameKey(prev, oldTopicName, newTopicName));
        }
    }

    toast({ title: "Topic Updated", description: `"${oldTopicName}" has been updated to "${newTopicName}".`});
  };

  const deleteTopic = (topicToDelete: string) => {
    const focusAreaIdsToDelete = deepWorkDefinitions
        .filter(def => def.category === topicToDelete)
        .map(def => def.id);

    setDeepWorkDefinitions(prev => prev.filter(def => def.category !== topicToDelete));
    
    setDeepWorkTopicMetadata(prev => {
        const newMeta = { ...prev };
        delete newMeta[topicToDelete];
        return newMeta;
    });

    setProductizationPlans(prev => {
        const newPlans = { ...prev };
        delete newPlans[topicToDelete];
        return newPlans;
    });
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        delete newPlans[topicToDelete];
        return newPlans;
    });

    setAllDeepWorkLogs(prevLogs =>
        prevLogs.map(log => ({
            ...log,
            exercises: log.exercises.filter(ex => !focusAreaIdsToDelete.includes(ex.definitionId))
        })).filter(log => log.exercises.length > 0)
    );
    
    toast({
        title: "Topic Deleted",
        description: `The topic "${topicToDelete}" and all its associated data have been deleted.`,
        variant: "destructive"
    });
  };

  const copyOffer = (topic: string, offerId: string) => {
    setOfferizationPlans(prev => {
        const newPlans = { ...prev };
        const currentPlan = newPlans[topic];
        if (!currentPlan || !currentPlan.offers) return prev;

        const offerToCopy = currentPlan.offers.find(o => o.id === offerId);
        if (!offerToCopy) return prev;

        const newOffer: Offer = {
            ...offerToCopy,
            id: `offer_${Date.now()}_${Math.random()}`,
            name: `${offerToCopy.name} (Copy)`
        };

        const offerIndex = currentPlan.offers.findIndex(o => o.id === offerId);
        const updatedOffers = [...currentPlan.offers];
        updatedOffers.splice(offerIndex + 1, 0, newOffer);

        newPlans[topic] = { ...currentPlan, offers: updatedOffers };
        return newPlans;
    });
    toast({ title: "Offer Copied", description: `A copy of "${offerToCopy.name}" has been created.` });
  };

  const value: AuthContextType = {
    currentUser, loading, register, signIn, signOut,
    pushDataToCloud, pullDataFromCloud, exportData, importData,
    isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken,
    theme, setTheme,
    floatingVideoUrl, setFloatingVideoUrl,
    isAudioPlaying, setIsAudioPlaying,
    weightLogs, setWeightLogs, goalWeight, setGoalWeight, height, setHeight, dateOfBirth, setDateOfBirth, gender, setGender, dietPlan, setDietPlan,
    schedule, setSchedule, isAgendaDocked, setIsAgendaDocked, activityDurations, setActivityDurations,
    handleToggleComplete, handleLogLearning, carryForwardTask, scheduleTaskFromMindMap,
    allUpskillLogs, setAllUpskillLogs, allDeepWorkLogs, setAllDeepWorkLogs, allWorkoutLogs, setAllWorkoutLogs, brandingLogs, setAllBrandingLogs, allLeadGenLogs, setAllLeadGenLogs,
    workoutMode, setWorkoutMode, workoutPlans, setWorkoutPlans, exerciseDefinitions, setExerciseDefinitions,
    upskillDefinitions, setUpskillDefinitions, topicGoals, setTopicGoals,
    deepWorkDefinitions, setDeepWorkDefinitions, deepWorkTopicMetadata, setDeepWorkTopicMetadata,
    leadGenDefinitions, setLeadGenDefinitions,
    productizationPlans, setProductizationPlans,
    offerizationPlans, setOfferizationPlans,
    addFeatureToRelease,
    updateTopic,
    deleteTopic,
    copyOffer,
    resourceFolders, setResourceFolders,
    resources, setResources,
    logWorkoutSet, updateWorkoutSet, deleteWorkoutSet, removeExerciseFromWorkout,
    swapWorkoutExercise,
    canvasLayout, setCanvasLayout,
    mindsetCards, setMindsetCards,
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
