

"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser, WeightLog, Gender, UserDietPlan, FullSchedule, DatedWorkout, Activity, LoggedSet, WorkoutMode, AllWorkoutPlans, ExerciseDefinition, TopicGoal, ProductizationPlan, Release, ExerciseCategory, ActivityType, Offer, Resource, ResourceFolder, CanvasLayout, MindsetCard, PistonsCategoryData, SkillDomain, CoreSkill, Project, Company, Position, MicroSkill, PopupState, ResourcePoint, SkillArea, DailySchedule, PurposeData, Pattern, MetaRule, PistonsInitialState, PistonEntry, AutoSuggestionEntry, RuleDetailPopupState, TaskContextPopupState, PillarCardData, HabitEquation, PathNode, ContentViewPopupState, TodaysDietPopupState, HabitDetailPopupState, StrengthTrainingMode, Stopper, Strength, SubTask, MissedSlotReview, MindsetTechniquePopupState, StopperProgressPopupState, WorkoutSchedulingMode } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
} from '@/lib/localAuth';
import { format, addDays, parseISO, subDays, startOfToday, isAfter, isBefore, isValid } from 'date-fns';
import { DEFAULT_EXERCISE_DEFINITIONS, INITIAL_PLANS, LEAD_GEN_DEFINITIONS, DEFAULT_MINDSET_CARDS, defaultMindsetCategories, DEFAULT_MIND_PROGRAMMING_DEFINITIONS } from '@/lib/constants';
import { getExercisesForDay } from '@/lib/workoutUtils';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Library, MessageSquare, Code, ArrowRight, Upload, Play, Pause, Unlink, Edit3 } from 'lucide-react';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from '@dnd-kit/core';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { ScrollArea } from './ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { PlusCircle, Link as LinkIcon } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { GeneralResourcePopup } from '@/components/GeneralResourcePopup';
import { ContentViewPopup } from '@/components/ContentViewPopup';
import { TodaysDietPopup } from '@/components/TodaysDietPopup';
import { HabitDetailPopup } from '@/components/HabitDetailPopup';


interface ResourcePopupProps {
  popupState: PopupState;
}

interface UserSettings {
  carryForward: boolean;
  autoPush: boolean;
  autoPushLimit: number;
  carryForwardEssentials: boolean;
  carryForwardNutrition: boolean;
  smartLogging: boolean;
  defaultHabitLinks: Record<ActivityType, string | null>;
  routines?: Activity[];
  workoutScheduling?: WorkoutSchedulingMode;
}

interface ActiveFocusSession {
  activity: Activity;
  duration: number; // in minutes
  secondsLeft: number;
  totalSeconds: number;
  startTime: number; // Timestamp of when the session (or current work segment) started
  state: 'running' | 'paused' | 'idle';
  subTaskStartTime?: number | null;
}


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
  localChangeCount: number;
  settings: UserSettings;
  setSettings: React.Dispatch<React.SetStateAction<UserSettings>>;
  isDemoTokenModalOpen: boolean;
  setIsDemoTokenModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pushDemoDataWithToken: (token: string) => Promise<void>;
  theme: string;
  setTheme: React.Dispatch<React.SetStateAction<string>>;
  floatingVideoUrl: string | null;
  setFloatingVideoUrl: React.Dispatch<React.SetStateAction<string | null>>;
  isAudioPlaying: boolean;
  setIsAudioPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  globalVolume: number;
  setGlobalVolume: React.Dispatch<React.SetStateAction<number>>;
  
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
  dailyPurposes: Record<string, string>;
  setDailyPurposes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isAgendaDocked: boolean;
  setIsAgendaDocked: React.Dispatch<React.SetStateAction<boolean>>;
  activityDurations: Record<string, string>;
  handleToggleComplete: (slotName: string, activityId: string, isCompleted: boolean) => void;
  handleLogLearning: (activity: Activity, duration: number) => void;
  logSubTaskTime: (subTaskId: string, durationMinutes: number) => void;
  carryForwardTask: (activity: Activity, targetSlot: string) => void;
  scheduleTaskFromMindMap: (definitionId: string, activityType: ActivityType, slotName: string, duration: number) => void;
  updateActivity: (updatedActivity: Activity) => void;

  // Focus Timer
  focusSessionModalOpen: boolean;
  setFocusSessionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  focusActivity: Activity | null;
  focusDuration: number;
  onOpenFocusModal: (activity: Activity) => boolean;
  handleStartFocusSession: (activity: Activity, duration: number) => void;
  activeFocusSession: ActiveFocusSession | null;
  setActiveFocusSession: React.Dispatch<React.SetStateAction<ActiveFocusSession | null>>;

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
  allMindProgrammingLogs: DatedWorkout[];
  setAllMindProgrammingLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
  
  // Data Definitions & Plans
  workoutMode: WorkoutMode;
  setWorkoutMode: React.Dispatch<React.SetStateAction<WorkoutMode>>;
  strengthTrainingMode: StrengthTrainingMode;
  setStrengthTrainingMode: React.Dispatch<React.SetStateAction<StrengthTrainingMode>>;
  workoutPlanRotation: boolean;
  setWorkoutPlanRotation: React.Dispatch<React.SetStateAction<boolean>>;
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
  getDeepWorkNodeType: (def: ExerciseDefinition) => string;
  getUpskillNodeType: (def: ExerciseDefinition) => string;
  updateTaskDuration: (taskId: string, duration: number) => void;
  
  leadGenDefinitions: ExerciseDefinition[];
  setLeadGenDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  
  productizationPlans: Record<string, ProductizationPlan>;
  setProductizationPlans: React.Dispatch<React.SetStateAction<Record<string, ProductizationPlan>>>;
  offerizationPlans: Record<string, ProductizationPlan>;
  setOfferizationPlans: React.Dispatch<React.SetStateAction<Record<string, ProductizationPlan>>>;
  addFeatureToRelease: (release: Release, topic: string, featureName: string, type: 'product' | 'service') => void;
  
  copyOffer: (topic: string, offerId: string) => void;

  mindProgrammingDefinitions: ExerciseDefinition[];
  setMindProgrammingDefinitions: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>;
  mindProgrammingCategories: ExerciseCategory[];
  setMindProgrammingCategories: React.Dispatch<React.SetStateAction<ExerciseCategory[]>>;
  mindProgrammingMode: WorkoutMode;
  setMindProgrammingMode: React.Dispatch<React.SetStateAction<WorkoutMode>>;
  mindProgrammingPlans: AllWorkoutPlans;
  setMindProgrammingPlans: React.Dispatch<React.SetStateAction<AllWorkoutPlans>>;
  mindProgrammingPlanRotation: boolean;
  setMindProgrammingPlanRotation: React.Dispatch<React.SetStateAction<boolean>>;

  // Resources
  resourceFolders: ResourceFolder[];
  setResourceFolders: React.Dispatch<React.SetStateAction<ResourceFolder[]>>;
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  deleteResource: (resourceId: string) => void;
  pinnedFolderIds: Set<string>;
  setPinnedFolderIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  activeResourceTabIds: string[];
  setActiveResourceTabIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedResourceFolderId: string | null;
  setSelectedResourceFolderId: React.Dispatch<React.SetStateAction<string | null>>;
  habitCards: Resource[];
  mechanismCards: Resource[];
  createHabitFromThought: (thought: PistonEntry, habitName: string, folderId: string) => void;
  lastSelectedHabitFolder: string | null;
  setLastSelectedHabitFolder: React.Dispatch<React.SetStateAction<string | null>>;
  createResourceWithHierarchy: (parent: ExerciseDefinition | Resource, pointToConvert?: ResourcePoint, type?: Resource['type']) => ExerciseDefinition | Resource | undefined;
  handleDeleteStopper: (habitId: string, stopperId: string) => void;
  handleDeleteStrength: (habitId: string, strengthId: string) => void;
  logStopperEncounter: (habitId: string, stopperId: string) => void;
  
  // Resource Popups (Original system, kept for resources page)
  openPopups: Map<string, PopupState>;
  handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState, parentRect?: DOMRect) => void;
  closeAllResourcePopups: () => void;
  handlePopupDragEnd: (event: DragEndEvent) => void;
  ResourcePopup: React.FC<ResourcePopupProps>;

  // Intention Popups
  intentionPopups: Map<string, PopupState>;
  openIntentionPopup: (intentionId: string) => void;
  closeIntentionPopup: (intentionId: string) => void;
  
  // General Popups (New System)
  generalPopups: Map<string, PopupState>;
  openGeneralPopup: (resourceId: string, event: React.MouseEvent | null, parentPopupState?: PopupState, parentRect?: DOMRect) => void;
  closeGeneralPopup: (resourceId: string) => void;
  handleUpdateResource: (resource: Resource) => void;

  // Meta Rule Popup
  ruleDetailPopup: RuleDetailPopupState | null;
  openRuleDetailPopup: (ruleId: string, event: React.MouseEvent) => void;
  closeRuleDetailPopup: () => void;
  handleRulePopupDragEnd: (event: DragEndEvent) => void;

  // Habit Detail Popup
  habitDetailPopup: HabitDetailPopupState | null;
  openHabitDetailPopup: (habitId: string, event: React.MouseEvent) => void;
  closeHabitDetailPopup: () => void;
  handleHabitDetailPopupDragEnd: (event: DragEndEvent) => void;

  // Task Context Popup
  taskContextPopups: Map<string, TaskContextPopupState>;
  openTaskContextPopup: (activityId: string, timerRect?: DOMRect, parentPopupState?: TaskContextPopupState) => void;
  closeTaskContextPopup: (taskId: string) => void;
  handleTaskContextPopupDragEnd: (event: DragEndEvent) => void;
  
  // Content Viewer Popup
  contentViewPopups: Map<string, ContentViewPopupState>;
  openContentViewPopup: (contentId: string, resource: Resource, point: ResourcePoint, event: React.MouseEvent) => void;
  closeContentViewPopup: (contentId: string) => void;
  handleContentViewPopupDragEnd: (event: DragEndEvent) => void;

  // Today's Diet Popup
  todaysDietPopup: TodaysDietPopupState | null;
  openTodaysDietPopup: (event: React.MouseEvent) => void;
  closeTodaysDietPopup: () => void;
  handleTodaysDietPopupDragEnd: (event: DragEndEvent) => void;
  swapMealInSchedule: (targetSlot: string, targetActivityId: string, sourceDay: string, sourceMeal: 'meal1' | 'meal2' | 'meal3') => void;

  // Workout Log Handlers
  logWorkoutSet: (date: Date, exerciseId: string, reps: number, weight: number) => void;
  updateWorkoutSet: (date: Date, exerciseId: string, setId: string, reps: number, weight: number) => void;
  deleteWorkoutSet: (date: Date, exerciseId: string, setId: string) => void;
  removeExerciseFromWorkout: (date: Date, exerciseId: string) => void;
  swapWorkoutExercise: (date: Date, oldExerciseId: string, newExerciseDefinition: ExerciseDefinition) => void;
  swapWorkoutForDay: (date: Date, newCategories: ExerciseCategory[]) => void;
  
  // Canvas
  canvasLayout: CanvasLayout;
  setCanvasLayout: React.Dispatch<React.SetStateAction<CanvasLayout>>;

  // Mindset
  mindsetCards: MindsetCard[];
  setMindsetCards: React.Dispatch<React.SetStateAction<MindsetCard[]>>;
  
  // Pistons
  isPistonsHeadOpen: boolean;
  setIsPistonsHeadOpen: React.Dispatch<React.SetStateAction<boolean>>;
  pistons: PistonsCategoryData;
  setPistons: React.Dispatch<React.SetStateAction<PistonsCategoryData>>;
  pistonsInitialState: PistonsInitialState | null;
  openPistonsFor: (initialState: PistonsInitialState) => void;
  deleteDesire: (desireId: string) => void;
  
  // Skill Page
  skillDomains: SkillDomain[];
  setSkillDomains: React.Dispatch<React.SetStateAction<SkillDomain[]>>;
  coreSkills: CoreSkill[];
  setCoreSkills: React.Dispatch<React.SetStateAction<CoreSkill[]>>;
  projects: Project[];
  setProjects: React.Dispatch<React.SetStateAction<Project[]>>;
  handleUpdateSkillArea: (skillId: string, areaId: string, name: string, purpose: string) => void;
  handleDeleteSkillArea: (skillId: string, areaId: string) => void;
  handleAddMicroSkill: (coreSkillId: string, areaId: string, name: string) => void;
  handleUpdateMicroSkill: (coreSkillId: string, areaId: string, microSkillId: string, name: string) => void;
  handleDeleteMicroSkill: (coreSkillId: string, areaId: string, microSkillId: string) => void;

  // Professional Experience
  companies: Company[];
  setCompanies: React.Dispatch<React.SetStateAction<Company[]>>;
  positions: Position[];
  setPositions: React.Dispatch<React.SetStateAction<Position[]>>;
  
  // Purpose & Patterns Data
  purposeData: PurposeData;
  setPurposeData: React.Dispatch<React.SetStateAction<PurposeData>>;
  patterns: Pattern[];
  setPatterns: React.Dispatch<React.SetStateAction<Pattern[]>>;
  metaRules: MetaRule[];
  setMetaRules: React.Dispatch<React.SetStateAction<MetaRule[]>>;
  pillarEquations: Record<string, HabitEquation[]>;
  setPillarEquations: React.Dispatch<React.SetStateAction<Record<string, HabitEquation[]>>>;
  skillAcquisitionPlans: SkillAcquisitionPlan[];
  setSkillAcquisitionPlans: React.Dispatch<React.SetStateAction<SkillAcquisitionPlan[]>>;
  addPillarCard: () => void;
  updatePillarCard: (updatedCard: PillarCardData) => void;
  deletePillarCard: (cardId: string) => void;
  specializations: CoreSkill[];
  allEquations: HabitEquation[];

  // Path Diagram Data
  pathNodes: PathNode[];
  setPathNodes: React.Dispatch<React.SetStateAction<PathNode[]>>;


  // New global map
  microSkillMap: Map<string, { coreSkillName: string; skillAreaName: string; microSkillName: string }>;
  permanentlyLoggedTaskIds: Set<string>;
  getDescendantLeafNodes: (startNodeId: string, type: 'deepwork' | 'upskill') => ExerciseDefinition[];


  // New state for selected subtopic/focus area
  selectedUpskillTask: ExerciseDefinition | null;
  setSelectedUpskillTask: React.Dispatch<React.SetStateAction<ExerciseDefinition | null>>;
  selectedDeepWorkTask: ExerciseDefinition | null;
  setSelectedDeepWorkTask: React.Dispatch<React.SetStateAction<ExerciseDefinition | null>>;
  selectedMicroSkill: MicroSkill | null;
  setSelectedMicroSkill: React.Dispatch<React.SetStateAction<MicroSkill | null>>;


  // Sidebar persistence
  expandedItems: string[];
  setExpandedItems: React.Dispatch<React.SetStateAction<string[]>>;
  handleExpansionChange: (value: string[]) => void;
  selectedDomainId: string | null;
  setSelectedDomainId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedSkillId: string | null;
  setSelectedSkillId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedProjectId: string | null;
  setSelectedProjectId: React.Dispatch<React.SetStateAction<string | null>>;
  selectedCompanyId: string | null;
  setSelectedCompanyId: React.Dispatch<React.SetStateAction<string | null>>;

  // Auto Suggestion
  autoSuggestions: Record<string, AutoSuggestionEntry[]>;
  setAutoSuggestions: React.Dispatch<React.SetStateAction<Record<string, AutoSuggestionEntry[]>>>;
  
  // Recents
  recentItems: Array<(ExerciseDefinition | Project) & { type: string }>;
  addToRecents: (item: (ExerciseDefinition | Project) & { type: string }) => void;

  currentSlot: string;
  activeProjectIds: Set<string>;

  updateActivitySubtask: (activityId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteActivitySubtask: (activityId: string, subTaskId: string) => void;
  handleLinkHabit: (activityId: string, habitId: string, date: Date) => void;
  missedSlotReviews: Record<string, MissedSlotReview>;
  setMissedSlotReviews: React.Dispatch<React.SetStateAction<Record<string, MissedSlotReview>>>;
  
  // Mindset Technique Popup
  linkedResistancePopup: MindsetTechniquePopupState | null;
  setLinkedResistancePopup: React.Dispatch<React.SetStateAction<MindsetTechniquePopupState | null>>;
  openLinkedResistancePopup: (techniqueId: string, event: React.MouseEvent) => void;
  
  // Stopper Progress Popup
  stopperProgressPopup: StopperProgressPopupState | null;
  openStopperProgressPopup: (stopper: Stopper, habitName: string) => void;
  setStopperProgressPopup: React.Dispatch<React.SetStateAction<StopperProgressPopupState | null>>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoTokenModalOpen, setIsDemoTokenModalOpen] = useState(false);
  const [theme, setThemeState] = useState('ad-dark');
  const [floatingVideoUrl, setFloatingVideoUrl] = useState<string | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [globalVolume, setGlobalVolume] = useState(0.2);
  const router = useRouter();
  const { toast } = useToast();
  const [localChangeCount, setLocalChangeCount] = useState(0);
  const [currentSlot, setCurrentSlot] = useState('');

  const prevUser = usePrevious(currentUser);
  
  const [isLoadingState, setIsLoadingState] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({ 
    carryForward: true,
    autoPush: false,
    autoPushLimit: 100,
    carryForwardEssentials: true,
    carryForwardNutrition: false,
    smartLogging: false,
    defaultHabitLinks: {},
    routines: [],
    workoutScheduling: 'day-of-week',
  });

  // Health State
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);
  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [dietPlan, setDietPlan] = useState<UserDietPlan>([]);
  
  // Schedule & Logs
  const [schedule, setSchedule] = useState<FullSchedule>({});
  const [dailyPurposes, setDailyPurposes] = useState<Record<string, string>>({});
  const [isAgendaDocked, setIsAgendaDocked] = useState(true);
  const [allUpskillLogs, setAllUpskillLogs] = useState<DatedWorkout[]>([]);
  const [allDeepWorkLogs, setAllDeepWorkLogs] = useState<DatedWorkout[]>([]);
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [brandingLogs, setAllBrandingLogs] = useState<DatedWorkout[]>([]);
  const [allLeadGenLogs, setAllLeadGenLogs] = useState<DatedWorkout[]>([]);
  
  // Data Definitions & Plans
  const [workoutMode, setWorkoutMode] = useState<WorkoutMode>('two-muscle');
  const [strengthTrainingMode, setStrengthTrainingMode] = useState<StrengthTrainingMode>('resistance');
  const [workoutPlanRotation, setWorkoutPlanRotation] = useState(true);
  const [workoutPlans, setWorkoutPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>(DEFAULT_EXERCISE_DEFINITIONS);
  const [upskillDefinitions, setUpskillDefinitions] = useState<ExerciseDefinition[]>([]);
  const [topicGoals, setTopicGoals] = useState<Record<string, TopicGoal>>({});
  const [deepWorkDefinitions, setDeepWorkDefinitions] = useState<ExerciseDefinition[]>([]);
  const [leadGenDefinitions, setLeadGenDefinitions] = useState<ExerciseDefinition[]>(LEAD_GEN_DEFINITIONS);
  const [mindProgrammingDefinitions, setMindProgrammingDefinitions] = useState<ExerciseDefinition[]>(DEFAULT_MIND_PROGRAMMING_DEFINITIONS);
  const [allMindProgrammingLogs, setAllMindProgrammingLogs] = useState<DatedWorkout[]>([]);
  const [mindProgrammingCategories, setMindProgrammingCategories] = useState<ExerciseCategory[]>(defaultMindsetCategories);
  const [mindProgrammingMode, setMindProgrammingMode] = useState<WorkoutMode>('two-muscle');
  const [mindProgrammingPlans, setMindProgrammingPlans] = useState<AllWorkoutPlans>(INITIAL_PLANS);
  const [mindProgrammingPlanRotation, setMindProgrammingPlanRotation] = useState<boolean>(true);
  const [productizationPlans, setProductizationPlans] = useState<Record<string, ProductizationPlan>>({});
  const [offerizationPlans, setOfferizationPlans] = useState<Record<string, ProductizationPlan>>({});

  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceFolders, setResourceFolders] = useState<ResourceFolder[]>([]);
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(new Set());
  const [activeResourceTabIds, setActiveResourceTabIds] = useState<string[]>([]);
  const [selectedResourceFolderId, setSelectedResourceFolderId] = useState<string | null>(null);
  const [lastSelectedHabitFolder, setLastSelectedHabitFolder] = useState<string | null>(null);

  // Resource Popups (Original system, kept for resources page)
  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Intention Popups
  const [intentionPopups, setIntentionPopups] = useState<Map<string, PopupState>>(new Map());
  
  // General Popups (New System)
  const [generalPopups, setGeneralPopups] = useState<Map<string, PopupState>>(new Map());

  // Meta Rule Popup
  const [ruleDetailPopup, setRuleDetailPopup] = useState<RuleDetailPopupState | null>(null);

  // Habit Detail Popup
  const [habitDetailPopup, setHabitDetailPopup] = useState<HabitDetailPopupState | null>(null);

  // Task Context Popup
  const [taskContextPopups, setTaskContextPopups] = useState<Map<string, TaskContextPopupState>>(new Map());
  
  // Content Viewer Popup
  const [contentViewPopups, setContentViewPopups] = useState<Map<string, ContentViewPopupState>>(new Map());

  // Today's Diet Popup
  const [todaysDietPopup, setTodaysDietPopup] = useState<TodaysDietPopupState | null>(null);
  
  // End-of-slot review state
  const [missedSlotReviews, setMissedSlotReviews] = useState<Record<string, MissedSlotReview>>({});

  // Sidebar State
  const [expandedItems, setExpandedItems] = useState<string[]>([]);
  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null);
  
  // Focus Session
  const [focusSessionModalOpen, setFocusSessionModalOpen] = useState(false);
  const [focusActivity, setFocusActivity] = useState<Activity | null>(null);
  const [focusDuration, setFocusDuration] = useState(45);
  const [activeFocusSession, setActiveFocusSession] = useState<ActiveFocusSession | null>(null);

  // Canvas State
  const [canvasLayout, setCanvasLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  // Mindset State
  const [mindsetCards, setMindsetCards] = useState<MindsetCard[]>([]);
  
  // Pistons State
  const [isPistonsHeadOpen, setIsPistonsHeadOpen] = useState(false);
  const [pistons, setPistons] = useState<PistonsCategoryData>({});
  const [pistonsInitialState, setPistonsInitialState] = useState<PistonsInitialState | null>(null);
  
  // Skill Page State
  const [skillDomains, setSkillDomains] = useState<SkillDomain[]>([]);
  const [coreSkills, setCoreSkills] = useState<CoreSkill[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);

  // Professional Experience
  const [companies, setCompanies] = useState<Company[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  
  // Purpose & Patterns Data
  const [purposeData, setPurposeData] = useState<PurposeData>({ statement: '', specializationPurposes: {}, pillarCards: [] });
  const [patterns, setPatterns] = useState<Pattern[]>([]);
  const [metaRules, setMetaRules] = useState<MetaRule[]>([]);
  const [pillarEquations, setPillarEquations] = useState<Record<string, HabitEquation[]>>({});
  const [skillAcquisitionPlans, setSkillAcquisitionPlans] = useState<SkillAcquisitionPlan[]>([]);

  // Persisted task state
  const [selectedUpskillTask, setSelectedUpskillTask] = useState<ExerciseDefinition | null>(null);
  const [selectedDeepWorkTask, setSelectedDeepWorkTask] = useState<ExerciseDefinition | null>(null);
  const [selectedMicroSkill, setSelectedMicroSkill] = useState<MicroSkill | null>(null);

  // Auto Suggestion State
  const [autoSuggestions, setAutoSuggestions] = useState<Record<string, AutoSuggestionEntry[]>>({});

  // Recents State
  const [recentItems, setRecentItems] = useState<Array<(ExerciseDefinition | Project) & { type: string }>>([]);

  // Path Diagram State
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  
  // Mindset Technique Popup
  const [linkedResistancePopup, setLinkedResistancePopup] = useState<MindsetTechniquePopupState | null>(null);

  // Stopper Progress Popup
  const [stopperProgressPopup, setStopperProgressPopup] = useState<StopperProgressPopupState | null>(null);

  const openStopperProgressPopup = (stopper: Stopper, habitName: string) => {
    setStopperProgressPopup({
        isOpen: true,
        stopper: stopper,
        habitName: habitName,
    });
  };

  const setTheme = (newTheme: string) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifeos_theme', newTheme);
      document.body.classList.remove('theme-default', 'theme-matrix', 'theme-ad-dark');
      document.body.classList.add(`theme-${newTheme}`);
    }
  };

  const handleStartFocusSession = useCallback((activity: Activity, duration: number) => {
    const dateKey = format(new Date(), 'yyyy-MM-dd');
    const fullActivityFromState = (schedule[dateKey]?.[activity.slot] as Activity[] | undefined)?.find(a => a.id === activity.id);

    const activityToStart = fullActivityFromState || activity;
    
    const updatedActivity: Activity = {
        ...activityToStart,
        focusSessionInitialStartTime: Date.now(),
        focusSessionStartTime: Date.now(),
        focusSessionEndTime: undefined,
        focusSessionPauses: [],
        focusSessionInitialDuration: duration,
    };
    
    updateActivity(updatedActivity); // Persist start time immediately

    setActiveFocusSession({
        activity: updatedActivity,
        duration: duration,
        secondsLeft: duration * 60,
        totalSeconds: duration * 60,
        startTime: Date.now(),
        state: 'running',
    });
    setFocusSessionModalOpen(false);
  }, [schedule]);
  
  const updateActivity = (updatedActivity: Activity) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        let found = false;
        for (const dateKey in newSchedule) {
            for (const slotName in newSchedule[dateKey]) {
                const activities = newSchedule[dateKey][slotName] as Activity[] | undefined;
                if (Array.isArray(activities)) {
                    const activityIndex = activities.findIndex(a => a.id === updatedActivity.id);
                    if (activityIndex > -1) {
                        activities[activityIndex] = updatedActivity;
                        found = true;
                        break;
                    }
                }
            }
            if (found) break;
        }
        return newSchedule;
    });
  };

  useEffect(() => {
    const timerInterval = setInterval(() => {
      if (activeFocusSession && activeFocusSession.state === 'running') {
        const now = Date.now();
        const elapsed = (now - activeFocusSession.startTime) / 1000;
        const newSecondsLeft = Math.max(0, activeFocusSession.totalSeconds - elapsed);
        setActiveFocusSession(prev => prev ? { ...prev, secondsLeft: newSecondsLeft } : null);
      }
    }, 1000);
    return () => clearInterval(timerInterval);
  }, [activeFocusSession]);

  const logSubTaskTime = useCallback((subTaskId: string, durationMinutes: number) => {
    if (!subTaskId || durationMinutes <= 0) return;

    const isUpskill = upskillDefinitions.some(d => d.id === subTaskId);
    const updater = isUpskill ? setUpskillDefinitions : setDeepWorkDefinitions;

    updater(prevDefs => 
        prevDefs.map(def => 
            def.id === subTaskId 
                ? { ...def, loggedDuration: (def.loggedDuration || 0) + durationMinutes }
                : def
        )
    );

    const definition = (isUpskill ? upskillDefinitions : deepWorkDefinitions).find(d => d.id === subTaskId);
    toast({ title: "Sub-task Logged", description: `Logged ${durationMinutes} minutes for "${definition?.name}".` });
  }, [upskillDefinitions, deepWorkDefinitions, setUpskillDefinitions, setDeepWorkDefinitions, toast]);
  
  const calculateTotalEstimate = useCallback((def: ExerciseDefinition): number => {
    let total = 0;
    const visited = new Set<string>();
    const allDefsMap = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(d => [d.id, d]));

    function recurse(currentDef: ExerciseDefinition) {
        if (!currentDef || visited.has(currentDef.id)) return;
        visited.add(currentDef.id);

        const deepWorkChildren = currentDef.linkedDeepWorkIds || [];
        const upskillChildren = currentDef.linkedUpskillIds || [];
        const hasChildren = deepWorkChildren.length > 0 || upskillChildren.length > 0;

        if (hasChildren) {
            deepWorkChildren.forEach(childId => {
                const childDef = allDefsMap.get(childId);
                if (childDef) recurse(childDef);
            });
            upskillChildren.forEach(childId => {
                const childDef = allDefsMap.get(childId);
                if (childDef) recurse(childDef);
            });
        } else {
            total += currentDef.estimatedDuration || 0;
        }
    }

    recurse(def);
    return total;
  }, [deepWorkDefinitions, upskillDefinitions]);
  
  const getDescendantLeafNodes = useCallback((startNodeId: string, type: 'deepwork' | 'upskill'): ExerciseDefinition[] => {
    const definitions = type === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
    const linkKey = type === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
    
    const leafNodes: ExerciseDefinition[] = [];
    const queue: string[] = [startNodeId];
    const visited = new Set<string>();

    while (queue.length > 0) {
        const currentId = queue.shift()!;
        if (visited.has(currentId)) continue;
        visited.add(currentId);
        
        const node = definitions.find(d => d.id === currentId);
        if (!node) continue;

        const children = node[linkKey] || [];
        if (children.length === 0) {
            leafNodes.push(node);
        } else {
            children.forEach(childId => {
                if (!visited.has(childId)) {
                    queue.push(childId);
                }
            });
        }
    }
    return leafNodes;
  }, [deepWorkDefinitions, upskillDefinitions]);

  const activityDurations = useMemo(() => {
    const newDurations: Record<string, string> = {};
    if (!schedule) return newDurations;
  
    const allDefs = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def]));
  
    for (const dateKey in schedule) {
      const daySchedule = schedule[dateKey];
      if (!daySchedule) continue;
  
      for (const slotName in daySchedule) {
        const activities = (daySchedule as any)[slotName] || [];
        if (Array.isArray(activities)) {
          for (const activity of activities) {
            if (!activity || !activity.id) continue;
  
            let totalMinutes = 0;
            let suffix = '';
            
            if (activity.completed) {
                const mainDefId = activity.taskIds?.[0]?.split('-')[0];
                const mainDef = mainDefId ? allDefs.get(mainDefId) : null;
                
                if (mainDef && ((mainDef.linkedDeepWorkIds?.length ?? 0) > 0 || (mainDef.linkedUpskillIds?.length ?? 0) > 0)) {
                     const leafNodes = getDescendantLeafNodes(mainDef.id, activity.type as 'deepwork' | 'upskill');
                     totalMinutes = leafNodes.reduce((sum, node) => sum + (node.loggedDuration || 0), 0);
                     suffix = ' logged';
                } else if (activity.duration) {
                    totalMinutes = activity.duration;
                    suffix = ' logged';
                } else if (activity.type === 'workout') {
                    const log = allWorkoutLogs.find(l => l.date === dateKey);
                    if (log) {
                        const workoutExercise = log.exercises.find(ex => activity.taskIds?.some(tid => tid === ex.id));
                        if(workoutExercise) {
                           totalMinutes = workoutExercise.loggedSets.reduce((sum, set) => sum + (set.reps || 0), 0);
                        }
                    }
                    suffix = ' logged';
                } else {
                    let logs, durationField;
                    if (activity.type === 'upskill') { logs = allUpskillLogs; durationField = 'reps'; } 
                    else if (activity.type === 'deepwork') { logs = allDeepWorkLogs; durationField = 'weight'; }
                    
                    if (logs && durationField) {
                        const loggedDuration = (logs.find(log => log.date === dateKey)
                          ?.exercises.filter(ex => activity.taskIds?.includes(ex.id))
                          .reduce((sum, ex) => sum + ex.loggedSets.reduce((setSum, set) => setSum + (set[durationField as 'reps'|'weight'] || 0), 0), 0) || 0);
                        if (loggedDuration > 0) {
                            totalMinutes = loggedDuration;
                            suffix = ' logged';
                        }
                    }
                }
            } else {
              // For non-completed tasks, calculate estimated duration
              switch(activity.type) {
                case 'workout': totalMinutes = 90; break;
                case 'mindset': totalMinutes = 15; break;
                case 'upskill':
                case 'deepwork':
                case 'branding':
                  if (activity.taskIds && activity.taskIds.length > 0) {
                    const mainTaskDefId = activity.taskIds[0].split('-')[0];
                    const taskDef = allDefs.get(mainTaskDefId);
                    if (taskDef) {
                      totalMinutes = calculateTotalEstimate(taskDef);
                    } else {
                      totalMinutes = 120;
                    }
                  } else {
                    totalMinutes = 120;
                  }
                  break;
                case 'planning':
                case 'tracking':
                  totalMinutes = 30; break;
                case 'lead-generation': totalMinutes = 45; break;
                case 'essentials':
                case 'interrupt':
                case 'distraction':
                   totalMinutes = activity.duration || 0; break;
                default: totalMinutes = 0;
              }
            }

            if (totalMinutes > 0) {
              const h = Math.floor(totalMinutes / 60);
              const m = Math.round(totalMinutes % 60);
              newDurations[activity.id] = ((`${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`).trim() || '0m') + suffix;
            }
          }
        }
      }
    }
    return newDurations;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, deepWorkDefinitions, upskillDefinitions, calculateTotalEstimate, getDescendantLeafNodes, strengthTrainingMode]);
  
  const getDeepWorkNodeType = useCallback((def: ExerciseDefinition): string => {
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0;
    const isChild = deepWorkDefinitions.some(parent => (parent.linkedDeepWorkIds || []).includes(def.id));
    
    if (isParent) {
        return isChild ? 'Objective' : 'Intention';
    }
    return isChild ? 'Action' : 'Standalone';
  }, [deepWorkDefinitions]);

  const getUpskillNodeType = useCallback((def: ExerciseDefinition): string => {
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0;
    const isChild = upskillDefinitions.some(parent => (parent.linkedUpskillIds || []).includes(def.id));
  
    if(isParent) {
      return isChild ? 'Objective' : 'Curiosity';
    }
    return isChild ? 'Visualization' : 'Standalone';
  }, [upskillDefinitions]);

  const updateTaskDuration = (taskId: string, duration: number) => {
    const updater = (definitions: ExerciseDefinition[]) => 
      definitions.map(d => d.id === taskId ? { ...d, estimatedDuration: duration } : d);
      
    setDeepWorkDefinitions(prev => updater(prev));
    setUpskillDefinitions(prev => updater(prev));
    
    toast({ title: 'Duration Updated', description: `Estimated duration has been set to ${duration} minutes.`});
  };
  
  const permanentlyLoggedTaskIds = useMemo(() => {
    const loggedIds = new Set<string>();
    const processLogs = (logs: DatedWorkout[]) => {
      (logs || []).forEach(log => {
        (log.exercises || []).forEach(ex => {
          if ((ex.loggedSets?.length ?? 0) > 0) {
            loggedIds.add(ex.definitionId);
          }
        });
      });
    };
    processLogs(allDeepWorkLogs);
    processLogs(allUpskillLogs);
    return loggedIds;
  }, [allDeepWorkLogs, allUpskillLogs]);

  const markObjectiveActivityAsComplete = useCallback((definitionId: string) => {
    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      let activityUpdated = false;
      
      for (const dateKey in newSchedule) {
        const daySchedule = newSchedule[dateKey];
        for (const slotName in daySchedule) {
          const activities = daySchedule[slotName] as Activity[] | undefined;
          if (Array.isArray(activities)) {
            const activityIndex = activities.findIndex(act => act.taskIds?.some(tid => tid.startsWith(definitionId)));
            if (activityIndex > -1 && !activities[activityIndex].completed) {
              const updatedActivity = { ...activities[activityIndex], completed: true };
              (newSchedule[dateKey][slotName] as Activity[])[activityIndex] = updatedActivity;
              activityUpdated = true;
              break; 
            }
          }
        }
        if (activityUpdated) break;
      }
      return newSchedule;
    });
  }, [setSchedule]);
  
  const onOpenFocusModal = useCallback((activity: Activity): boolean => {
    // If it has sub-tasks, handle it like an objective
    if (activity.subTasks && activity.subTasks.length > 0) {
      if (activity.subTasks.every(st => st.completed)) {
        updateActivity({ ...activity, completed: true });
        return false;
      }
      handleStartFocusSession(activity, 25); // Default duration, will adjust for sub-tasks
      return true;
    }
  
    // Existing logic for deep work / upskill
    const mainDefId = activity.taskIds?.[0]?.split('-')[0];
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const def = mainDefId ? allDefs.find(d => d.id === mainDefId) : null;
  
    if (def) {
      const nodeType = activity.type === 'upskill' ? getUpskillNodeType(def) : getDeepWorkNodeType(def);
      const isParentNode = ['Intention', 'Curiosity', 'Objective'].includes(nodeType);
      
      if (isParentNode) {
        const allLeafNodes = getDescendantLeafNodes(def.id, activity.type as 'deepwork' | 'upskill');
        const allChildrenCompleted = allLeafNodes.length > 0 && allLeafNodes.every(node => (node.loggedDuration || 0) > 0);
  
        if (allChildrenCompleted) {
          markObjectiveActivityAsComplete(def.id);
          return false;
        }
        
        const firstPendingNode = allLeafNodes.find(node => !(node.loggedDuration && node.loggedDuration > 0));
        if (firstPendingNode) {
          handleStartFocusSession(activity, firstPendingNode.estimatedDuration || 25);
        } else {
          handleStartFocusSession(activity, 25); // Fallback
        }
        return true;
      }
    }
    
    // For simple tasks without linked definitions or sub-tasks
    const estDuration = activityDurations[activity.id];
    let minutes = estDuration ? parseInt(estDuration.replace(/[a-zA-Z\s]/g, '')) || 0 : 45;
    if (isNaN(minutes) || minutes <= 0) minutes = 45;
  
    setFocusDuration(minutes);
    setFocusActivity(activity);
    setFocusSessionModalOpen(true);
    return true;
  }, [deepWorkDefinitions, upskillDefinitions, getUpskillNodeType, getDeepWorkNodeType, getDescendantLeafNodes, activityDurations, markObjectiveActivityAsComplete, setFocusDuration, setFocusActivity, setFocusSessionModalOpen, handleStartFocusSession, updateActivity]);

  const handleLogLearning = useCallback((activity: Activity, duration: number) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];

    const updateActivityInSchedule = (updatedActivityProps: Partial<Activity>) => {
        setSchedule(prev => {
            const newSchedule = { ...prev };
            for (const dateKey in newSchedule) {
                if (newSchedule[dateKey]) {
                    for (const slotName in newSchedule[dateKey]) {
                        const activities = newSchedule[dateKey][slotName] as Activity[] | undefined;
                        if (Array.isArray(activities)) {
                            const activityIndex = activities.findIndex(a => a.id === activity.id);
                            if (activityIndex > -1) {
                                const updatedActivities = [...activities];
                                updatedActivities[activityIndex] = { ...activities[activityIndex], ...updatedActivityProps };
                                newSchedule[dateKey] = { ...newSchedule[dateKey], [slotName]: updatedActivities };
                                return newSchedule; 
                            }
                        }
                    }
                }
            }
            return newSchedule;
        });
    };

    const taskDef = allDefs.find(def => activity.taskIds?.some(tid => tid.startsWith(def.id)));
    if (taskDef) {
        const nodeType = activity.type === 'upskill' ? getUpskillNodeType(taskDef) : getDeepWorkNodeType(taskDef);
        const isParentNode = ['Intention', 'Curiosity', 'Objective'].includes(nodeType);
        if (isParentNode) {
            updateActivityInSchedule({ completed: true });
            return;
        }
    }

    if (activity.type !== 'upskill' && activity.type !== 'deepwork') {
        updateActivityInSchedule({ completed: true, duration });
        toast({ title: "Session Logged", description: `Logged ${duration} minutes for "${activity.details}".` });
        return;
    }
      
    const exerciseInstanceId = activity.taskIds?.[0];
    if (!exerciseInstanceId) {
        updateActivityInSchedule({ completed: true, duration });
        return;
    }

    const definition = allDefs.find(def => exerciseInstanceId.startsWith(def.id));
    if (!definition) {
        updateActivityInSchedule({ completed: true, duration });
        return;
    }

    logSubTaskTime(definition.id, duration);
    updateActivityInSchedule({ completed: true, duration });
    
  }, [deepWorkDefinitions, upskillDefinitions, logSubTaskTime, toast, getDeepWorkNodeType, getUpskillNodeType, setSchedule]);
  
  const getAllUserData = useCallback(() => {
    return {
      main: {
        weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan,
        schedule, dailyPurposes, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs,
        workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals,
        deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, mindProgrammingDefinitions, allMindProgrammingLogs,
        resources, resourceFolders,
        canvasLayout, mindsetCards, pistons, skillDomains, coreSkills, projects, companies, positions,
        purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans,
        autoSuggestions,
        pathNodes,
        mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation,
        missedSlotReviews,
      },
      ui: {
        pinnedFolderIds: Array.from(pinnedFolderIds), activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder,
        selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, expandedItems,
        selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId,
        activeFocusSession, isAgendaDocked,
        recentItems,
      }
    };
  }, [
    weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, schedule, dailyPurposes, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals, deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, mindProgrammingDefinitions, allMindProgrammingLogs, resources, resourceFolders, canvasLayout, mindsetCards, pistons, skillDomains, coreSkills, projects, companies, positions, purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans, autoSuggestions, pathNodes, mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation, missedSlotReviews, pinnedFolderIds, activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder, selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, expandedItems, selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId, activeFocusSession, isAgendaDocked, recentItems
  ]);

  const saveState = useCallback(() => {
    if (currentUser?.username) {
        const allData = getAllUserData();
        localStorage.setItem(`lifeos_data_${currentUser.username}`, JSON.stringify(allData.main));
        localStorage.setItem(`lifeos_ui_state_${currentUser.username}`, JSON.stringify(allData.ui));
    }
  }, [currentUser, getAllUserData]);

  useEffect(() => {
    if (!isLoadingState) {
        const handler = setTimeout(() => {
            saveState();
            setLocalChangeCount(0); // Reset after saving
        }, 1000); // Debounce save operations

        return () => {
            clearTimeout(handler);
        };
    }
  }, [localChangeCount, saveState, isLoadingState]);

  useEffect(() => {
    if (!isLoadingState) {
        setLocalChangeCount(c => c + 1);
    }
  }, [
    isLoadingState, weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, schedule, dailyPurposes, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals, deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, mindProgrammingDefinitions, allMindProgrammingLogs, resources, resourceFolders, canvasLayout, mindsetCards, pistons, skillDomains, coreSkills, projects, companies, positions, purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans, autoSuggestions, pathNodes, mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation, missedSlotReviews, pinnedFolderIds, activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder, selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, expandedItems, selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId, activeFocusSession, isAgendaDocked, recentItems
  ]);

  const loadState = (username: string) => {
    setIsLoadingState(true);
    const mainDataString = localStorage.getItem(`lifeos_data_${username}`);
    const uiStateString = localStorage.getItem(`lifeos_ui_state_${username}`);
    
    const mainData = mainDataString ? JSON.parse(mainDataString) : {};
    const uiState = uiStateString ? JSON.parse(uiStateString) : {};
    
    // Set Main Data
    loadImportedData(mainData, uiState);
    
    // Wait for state to apply before allowing saves
    setTimeout(() => setIsLoadingState(false), 100);
  };

  const isScheduleLoaded = useMemo(() => Object.keys(schedule).length > 0 || !loading, [schedule, loading]);

  useEffect(() => {
    if (!currentUser?.username || isLoadingState) return;

    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const yesterdaysDate = subDays(new Date(), 1);
    const yesterdayStr = format(yesterdaysDate, 'yyyy-MM-dd');
    const yesterdaysSchedule = schedule[yesterdayStr];

    const todayIsEmpty = !schedule[todayStr] || Object.values(schedule[todayStr]).every(slot => (slot as Activity[]).length === 0);

    if (todayIsEmpty && yesterdaysSchedule) {
        const routineTasks = Object.values(yesterdaysSchedule).flat().filter(task => (task as Activity).isRoutine);
        
        if (routineTasks.length > 0) {
            const newDaySchedule: DailySchedule = {};
            routineTasks.forEach((task: Activity) => {
                const slot = task.slot as keyof DailySchedule;
                if (!newDaySchedule[slot]) {
                    newDaySchedule[slot] = [];
                }
                (newDaySchedule[slot] as Activity[]).push({
                    ...task,
                    id: `${task.type}-${Date.now()}-${Math.random()}`,
                    completed: false,
                });
            });

            if (Object.keys(newDaySchedule).length > 0) {
                setSchedule(prev => ({
                    ...prev,
                    [todayStr]: newDaySchedule,
                }));
            }
        }
    }
  }, [currentUser, isLoadingState, schedule]);
  
  const register = async (username: string, password: string) => {
    setLoading(true);
    const { success, message, user } = await localRegisterUser(username, password);
    if (success && user) {
      setCurrentUser(user);
      router.push('/my-plate');
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
      }
      router.push('/my-plate');
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
        const allUserData = getAllUserData().main; // Only push main data for demo
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

    if (currentUser.username === 'demo') {
        setIsDemoTokenModalOpen(true);
        return;
    }

    toast({ title: "Syncing...", description: "Pushing your data to the cloud." });

    try {
        const allUserData = getAllUserData();
        const requestBody = { username: currentUser.username, data: allUserData };
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
        setLocalChangeCount(0); // Reset change count on successful push

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

        localStorage.setItem(`lifeos_data_${username}`, JSON.stringify(data.main));
        localStorage.setItem(`lifeos_ui_state_${username}`, JSON.stringify(data.ui));
        
        toast({
          title: "Sync Successful",
          description: "Data pulled from the cloud. The app will now reload.",
        });
        setTimeout(() => {
            window.location.reload();
        }, 1500);

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
            const importedData = JSON.parse(text);
            
            // Handle both old and new backup formats
            const mainData = importedData.main || importedData;
            const uiData = importedData.ui || {};

            // Apply imported data to state immediately
            loadImportedData(mainData, uiData);
  
            toast({ title: "Import Successful", description: "Your data has been loaded into the application." });
  
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

  const loadImportedData = (mainData: any, uiData: any) => {
    setIsLoadingState(true);

    setWeightLogs(mainData.weightLogs || []);
    setGoalWeight(mainData.goalWeight || null);
    setHeight(mainData.height || null);
    setDateOfBirth(mainData.dateOfBirth || null);
    setGender(mainData.gender || null);
    setDietPlan(mainData.dietPlan || []);
    setSchedule(mainData.schedule || {});
    setDailyPurposes(mainData.dailyPurposes || {});
    setAllUpskillLogs(mainData.allUpskillLogs || mainData.upskillLogs || []);
    setAllDeepWorkLogs(mainData.allDeepWorkLogs || mainData.deepWorkLogs || []);
    setAllWorkoutLogs(mainData.allWorkoutLogs || mainData.workoutLogs || []);
    setAllBrandingLogs(mainData.brandingLogs || []);
    setAllLeadGenLogs(mainData.allLeadGenLogs || []);
    setAllMindProgrammingLogs(mainData.allMindProgrammingLogs || []);
    setWorkoutMode(mainData.workoutMode || 'two-muscle');
    setStrengthTrainingMode(mainData.strengthTrainingMode || 'resistance');
    setWorkoutPlanRotation(mainData.workoutPlanRotation === undefined ? true : mainData.workoutPlanRotation);
    setWorkoutPlans(mainData.workoutPlans || INITIAL_PLANS);
    setExerciseDefinitions(mainData.exerciseDefinitions || DEFAULT_EXERCISE_DEFINITIONS);
    setUpskillDefinitions(mainData.upskillDefinitions || []);
    setTopicGoals(mainData.topicGoals || mainData.upskillTopicGoals || {});
    setDeepWorkDefinitions(mainData.deepWorkDefinitions || []);
    setLeadGenDefinitions(mainData.leadGenDefinitions || LEAD_GEN_DEFINITIONS);
    setMindProgrammingDefinitions(mainData.mindProgrammingDefinitions || DEFAULT_MIND_PROGRAMMING_DEFINITIONS);
    setMindProgrammingCategories(mainData.mindProgrammingCategories || defaultMindsetCategories);
    setMindProgrammingMode(mainData.mindProgrammingMode || 'two-muscle');
    setMindProgrammingPlans(mainData.mindProgrammingPlans || INITIAL_PLANS);
    setMindProgrammingPlanRotation(mainData.mindProgrammingPlanRotation === undefined ? true : mainData.mindProgrammingPlanRotation);
    setProductizationPlans(mainData.productizationPlans || {});
    setOfferizationPlans(mainData.offerizationPlans || {});
    setResourceFolders(mainData.resourceFolders || []);
    setResources(mainData.resources || []);
    setCanvasLayout(mainData.canvasLayout || { nodes: [], edges: [] });
    setMindsetCards(mainData.mindsetCards || []);
    setPistons(mainData.pistons || {});
    setSkillDomains(mainData.skillDomains || []);
    setCoreSkills(mainData.coreSkills || []);
    setProjects(mainData.projects || []);
    setCompanies(mainData.companies || []);
    setPositions(mainData.positions || []);
    setPurposeData(mainData.purposeData || { statement: '', specializationPurposes: {}, pillarCards: [] });
    setPatterns(mainData.patterns || []);
    setMetaRules(mainData.metaRules || []);
    setPillarEquations(mainData.pillarEquations || {});
    setSkillAcquisitionPlans(mainData.skillAcquisitionPlans || []);
    setAutoSuggestions(mainData.autoSuggestions || {});
    setPathNodes(mainData.pathNodes || []);
    setMissedSlotReviews(mainData.missedSlotReviews || {});
    
    // UI State
    setPinnedFolderIds(new Set(uiData.pinnedFolderIds || []));
    setActiveResourceTabIds(uiData.activeResourceTabIds || []);
    setSelectedResourceFolderId(uiData.selectedResourceFolderId || null);
    setLastSelectedHabitFolder(uiData.lastSelectedHabitFolder || null);
    setSelectedUpskillTask(uiData.selectedUpskillTask || null);
    setSelectedDeepWorkTask(uiData.selectedDeepWorkTask || null);
    setSelectedMicroSkill(uiData.selectedMicroSkill || null);
    setExpandedItems(uiData.expandedItems || []);
    setSelectedDomainId(uiData.selectedDomainId || null);
    setSelectedSkillId(uiData.selectedSkillId || null);
    setSelectedProjectId(uiData.selectedProjectId || null);
    setSelectedCompanyId(uiData.selectedCompanyId || null);
    setRecentItems(uiData.recentItems || []);
    setIsAgendaDocked(uiData.isAgendaDocked === undefined ? true : uiData.isAgendaDocked);
    
    setTimeout(() => setIsLoadingState(false), 100);
  };


  const handleToggleComplete = (slotName: string, activityId: string, isCompleted: boolean) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    setSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[todayKey] || {}) };
        const activities = Array.isArray(daySchedule[slotName]) ? [...(daySchedule[slotName] as Activity[])] : [];
        const activityIndex = activities.findIndex(act => act.id === activityId);

        if (activityIndex > -1) {
            activities[activityIndex] = { ...activities[activityIndex], completed: isCompleted };
            daySchedule[slotName] = activities;
            newSchedule[todayKey] = daySchedule;
        }
        
        return newSchedule;
    });
  };

  const carryForwardTask = (activity: Activity, targetSlot: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    const activitiesInSlot = schedule[todayKey]?.[targetSlot] || [];
    if (Array.isArray(activitiesInSlot) && activitiesInSlot.length >= 2) {
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
        taskIds: activity.taskIds || []
    };
    
    setSchedule(prev => {
        const newTodaySchedule = { ...(prev[todayKey] || {}) };
        const currentActivities = Array.isArray(newTodaySchedule[targetSlot]) ? newTodaySchedule[targetSlot] as Activity[] : [];
        newTodaySchedule[targetSlot] = [...currentActivities, newActivity as Activity];
        return { ...prev, [todayKey]: newTodaySchedule };
    });
    
    toast({
        title: "Task Carried Forward",
        description: `"${newActivity.details}" has been added to today's ${targetSlot} slot.`
    });
  };

  const scheduleTaskFromMindMap = (definitionId: string, activityType: ActivityType, slotName: string, duration: number) => {
    let definition: ExerciseDefinition | undefined;
    let logsUpdater: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
    let logSource: DatedWorkout[];

    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const SLOT_CAPACITY_MINUTES = 240;

    const currentSlotActivities = schedule[todayKey]?.[slotName] || [];
    const currentSlotDuration = (Array.isArray(currentSlotActivities) ? currentSlotActivities : [])
        .filter(act => !act.completed)
        .reduce((sum, act) => {
            let activityDuration = 0;
            if (act.type === 'essentials' || act.type === 'interrupt') {
                activityDuration = act.duration || 0;
            } else {
                const estDurationStr = activityDurations[act.id];
                activityDuration = estDurationStr ? parseInt(estDurationStr.replace(/[a-zA-Z\s]/g, '')) || 0 : 0;
            }
            return sum + activityDuration;
        }, 0);
    
    if (currentSlotDuration + duration > SLOT_CAPACITY_MINUTES) {
        toast({
            title: "Slot Full",
            description: `Cannot add task. This would exceed the 4-hour limit for the '${slotName}' slot.`,
            variant: "destructive"
        });
        return;
    }
    
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
        const activitiesInSlot = Array.isArray(daySchedule[slotName]) ? daySchedule[slotName] as Activity[] : [];
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

    setDeepWorkDefinitions(prev => [...prev, newFeatureDef]);

    const plansUpdater = type === 'product' ? setProductizationPlans : setOfferizationPlans;

    plansUpdater(prevPlans => {
        const newPlans = { ...prevPlans };
        
        const oldPlan = newPlans[topic] || { releases: [] };
        
        const updatedReleases = (oldPlan.releases || []).map(r => {
            if (r.id === release.id) {
                return {
                    ...r,
                    focusAreaIds: [...(r.focusAreaIds || []), newFeatureDef.id]
                };
            }
            return r;
        });
        
        newPlans[topic] = {
            ...oldPlan,
            releases: updatedReleases
        };

        return newPlans;
    });

    toast({ title: "Feature Added", description: `"${newFeatureDef.name}" was added to the "${release.name}" release.` });
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
    let workoutLog = allWorkoutLogs.find(log => log.id === dateKey);
  
    // If the log for the day doesn't exist, create it.
    if (!workoutLog) {
      const { exercises } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling);
      const newLog = { id: dateKey, date: dateKey, exercises };
      setAllWorkoutLogs(prev => [...prev, newLog]);
      workoutLog = newLog;
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
  
  const swapWorkoutForDay = (date: Date, newCategories: ExerciseCategory[]) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const { exercises, description } = getExercisesForDay(
      date,
      workoutMode,
      workoutPlans,
      exerciseDefinitions,
      workoutPlanRotation,
      'day-of-week', // Force day-of-week for override
      allWorkoutLogs,
      undefined,
      newCategories
    );
    
    if (exercises.length === 0) {
      toast({ title: 'No Exercises', description: `No exercises found for ${newCategories.join(' & ')}.`, variant: 'destructive' });
      return;
    }

    const updatedLog: DatedWorkout = { id: dateKey, date: dateKey, exercises };

    setAllWorkoutLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === dateKey);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedLog;
        return newLogs;
      }
      return [...prevLogs, updatedLog];
    });

    toast({ title: "Workout Changed", description: `Switched to ${newCategories.join(' & ')} for today.` });
  };
  
  const openPistonsFor = (initialState: PistonsInitialState) => {
    setPistonsInitialState(initialState);
    setIsPistonsHeadOpen(true);
  };
  
  const deleteDesire = (desireId: string) => {
    setDeepWorkDefinitions(prev => prev.filter(def => def.id !== desireId));
  };

  const handleUpdateResource = (updatedResource: Resource) => {
    setResources(prev => {
        const oldResource = prev.find(r => r.id === updatedResource.id);
        const nameHasChanged = oldResource && oldResource.name !== updatedResource.name;
    
        return prev.map(res => {
            // Update the resource itself
            if (res.id === updatedResource.id) {
                res = updatedResource;
            }
    
            // Update any links pointing to it if the name changed
            if (nameHasChanged && res.points) {
                res = {
                    ...res,
                    points: res.points.map(p => {
                        if (p.type === 'card' && p.resourceId === updatedResource.id) {
                            return { ...p, text: updatedResource.name };
                        }
                        return p;
                    })
                };
            }
    
            return res;
        });
    });
  };
  
  const handleClosePopup = useCallback((resourceId: string) => {
    setOpenPopups(prev => {
      const newPopups = new Map(prev);
      const popupsToDelete = new Set<string>();
      function findChildren(parentId: string) {
        popupsToDelete.add(parentId);
        for (const [id, popup] of newPopups.entries()) {
          if (popup.parentId === parentId) findChildren(id);
        }
      }
      findChildren(resourceId);
      for (const id of popupsToDelete) {
        if (playingAudio?.id === id) setPlayingAudio(null);
        newPopups.delete(id);
      }
      return newPopups;
    });
  }, [playingAudio]);

  const handleOpenNestedPopup = useCallback((resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState, parentRect?: DOMRect) => {
    setOpenPopups(prev => {
        const newPopups = new Map(prev);
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return newPopups;
        
        const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
        const popupWidth = hasMarkdown ? 896 : 512;
    
        let x, y, level, parentId;
    
        if (parentPopupState && parentRect) {
            level = parentPopupState.level + 1;
            parentId = parentPopupState.resourceId;
            const screenWidth = window.innerWidth;
            if (parentRect.x + parentRect.width + popupWidth + 20 < screenWidth) {
                x = parentRect.x + parentRect.width + 20;
            } else {
                x = parentRect.x - popupWidth - 20;
            }
            y = parentRect.y;
        } else {
            level = 0;
            parentId = undefined;
            if (hasMarkdown) {
                x = window.innerWidth / 2 - popupWidth / 2;
                y = window.innerHeight / 2 - Math.min(window.innerHeight * 0.7, 700) / 2;
            } else {
                x = event.clientX;
                y = event.clientY;
            }
        }
        
        newPopups.set(resourceId, { 
            resourceId, level, x, y, parentId, width: popupWidth, z: 80 + level
        });
        return newPopups;
    });
  }, [resources]);
  
  const openGeneralPopup = useCallback((resourceId: string, event: React.MouseEvent | null, parentPopupState?: PopupState, parentRect?: DOMRect) => {
    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return newPopups;
        
        const popupWidth = 512;
        const popupHeight = 400; // Approximate height for centering
        let x, y, level, parentId;

        if (parentPopupState && parentRect) {
            level = parentPopupState.level + 1;
            parentId = parentPopupState.resourceId;
            const screenWidth = window.innerWidth;
            if (parentRect.x + parentRect.width + popupWidth + 20 < screenWidth) {
                x = parentRect.x + parentRect.width + 20;
            } else {
                x = parentRect.x - popupWidth - 20;
            }
            y = parentRect.y;
        } else {
            level = 0;
            parentId = undefined;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            x = event ? event.clientX : (screenWidth - popupWidth) / 2;
            y = event ? event.clientY : (screenHeight - popupHeight) / 2;
        }
        
        newPopups.set(resourceId, { 
            resourceId, level, x, y, parentId, width: popupWidth, z: 80 + level
        });
        return newPopups;
    });
  }, [resources]);


  const closeAllResourcePopups = useCallback(() => {
    setOpenPopups(new Map());
  }, []);
  
  const closeGeneralPopup = useCallback((resourceId: string) => {
    setGeneralPopups(prev => {
      const newPopups = new Map(prev);
      const popupsToDelete = new Set<string>();
      function findChildren(parentId: string) {
        popupsToDelete.add(parentId);
        for (const [id, popup] of newPopups.entries()) {
          if (popup.parentId === parentId) findChildren(id);
        }
      }
      findChildren(resourceId);
      for (const id of popupsToDelete) newPopups.delete(id);
      return newPopups;
    });
  }, []);

  const ResourcePopup: React.FC<ResourcePopupProps> = useCallback(({ popupState }) => {
    const resource = resources.find(r => r.id === popupState.resourceId);
    if (!resource) return null;
    return (
      <GeneralResourcePopup 
        popupState={popupState} 
        onClose={handleClosePopup}
        onUpdate={handleUpdateResource}
        onOpenNestedPopup={handleOpenNestedPopup}
      />
    )
  }, [resources, handleClosePopup, handleOpenNestedPopup]);
  
  const handlePopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const activeId = active.id as string;
    const { x, y } = delta;

    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        const popup = newPopups.get(activeId.replace('general-popup-', ''));
        if (popup) {
            newPopups.set(popup.resourceId, { ...popup, x: popup.x + x, y: popup.y + y });
        }
        return newPopups;
    });

    if (activeId.startsWith('intention-popup-')) {
        const intentionId = activeId.replace('intention-popup-', '');
        setIntentionPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(intentionId);
            if (popup) {
                newPopups.set(intentionId, { ...popup, x: popup.x + x, y: popup.y + y });
            }
            return newPopups;
        });
    }
  };

  const handleUpdateSkillArea = (skillId: string, areaId: string, name: string, purpose: string) => {
    setCoreSkills(prev => prev.map(s => {
        if (s.id === skillId) {
            return { ...s, skillAreas: s.skillAreas.map(a => a.id === areaId ? { ...a, name, purpose } : a) };
        }
        return s;
    }));
  };
  
  const handleDeleteSkillArea = (skillId: string, areaId: string) => {
     setCoreSkills(prev => prev.map(s => s.id === skillId ? { ...s, skillAreas: s.skillAreas.filter(a => a.id !== areaId) } : s));
  };
  
  const handleAddMicroSkill = (coreSkillId: string, areaId: string, name: string) => {
    if (!name.trim()) { toast({ title: 'Error', description: 'Micro-skill name cannot be empty.', variant: "destructive" }); return; }
    setCoreSkills(prev => prev.map(s => {
      if (s.id === coreSkillId) {
        return { ...s, skillAreas: s.skillAreas.map(area => {
            if (area.id === areaId) {
                const newMicroSkill = { id: `ms_${Date.now()}`, name: name.trim() };
                return { ...area, microSkills: [...area.microSkills, newMicroSkill] };
            }
            return area;
        }) };
      }
      return s;
    }));
    toast({ title: 'Micro-Skill Added' });
  };
  
  const handleUpdateMicroSkill = (coreSkillId: string, areaId: string, microSkillId: string, name: string) => {
    setCoreSkills(prev => prev.map(s => {
        if (s.id === coreSkillId) {
            return { ...s, skillAreas: s.skillAreas.map(area => {
                if (area.id === areaId) {
                    return { ...area, microSkills: area.microSkills.map(ms => ms.id === microSkillId ? {...ms, name} : ms) };
                }
                return area;
            }) };
        }
        return s;
    }));
  };
  
  const handleDeleteMicroSkill = (coreSkillId: string, areaId: string, microSkillId: string) => {
    let microSkillName = '';
    const updatedCoreSkills = coreSkills.map(s => {
        if (s.id === coreSkillId) {
            const updatedSkillAreas = s.skillAreas.map(area => {
                if (area.id === areaId) {
                    const microSkillToDelete = area.microSkills.find(ms => ms.id === microSkillId);
                    if (microSkillToDelete) {
                        microSkillName = microSkillToDelete.name;
                    }
                    return { ...area, microSkills: area.microSkills.filter(ms => ms.id !== microSkillId) };
                }
                return area;
            });
            return { ...s, skillAreas: updatedSkillAreas };
        }
        return s;
    });

    setCoreSkills(updatedCoreSkills);

    if (microSkillName) {
        setUpskillDefinitions(prev => prev.filter(def => def.category !== microSkillName));
        setDeepWorkDefinitions(prev => prev.filter(def => def.category !== microSkillName));
    }

    toast({ title: 'Micro-Skill Deleted', description: 'The micro-skill and all associated tasks have been removed.' });
};

  const handleExpansionChange = useCallback((value: string[]) => {
    setExpandedItems(value);
  }, [setExpandedItems]);
  
  const openIntentionPopup = (intentionId: string) => {
    setIntentionPopups(prev => {
        const newPopups = new Map(prev);
        const popupsPerRow = 3;
        const xOffset = (newPopups.size % popupsPerRow) * 400 + 100; // 400 = width + margin
        const yOffset = Math.floor(newPopups.size / popupsPerRow) * 400 + 100;

        newPopups.set(intentionId, { 
            resourceId: intentionId, 
            x: xOffset, 
            y: yOffset, 
            level: 0,
            z: 70 + newPopups.size
        });
        return newPopups;
    });
  };

  const closeIntentionPopup = (intentionId: string) => {
    setIntentionPopups(prev => {
        const newPopups = new Map(prev);
        newPopups.delete(intentionId);
        return newPopups;
    });
  };
  
  const openRuleDetailPopup = (ruleId: string, event: React.MouseEvent) => {
    const popupWidth = 600;
    const popupHeight = 500;
    
    let x, y;
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    const screenWidth = window.innerWidth;
    const screenHeight = window.innerHeight;
    
    if (targetRect.right + popupWidth < screenWidth) {
      x = targetRect.right + 10;
    } else {
      x = targetRect.left - popupWidth - 10;
    }
    
    y = targetRect.top;
    
    if (x < 10) x = 10;
    if (x + popupWidth > screenWidth - 10) x = screenWidth - popupWidth - 10;
    if (y < 10) y = 10;
    if (y + popupHeight > screenHeight - 10) y = screenHeight - popupHeight - 10;

    setRuleDetailPopup({ ruleId, x, y });
  };
  
  const closeRuleDetailPopup = () => {
    setRuleDetailPopup(null);
  };
  
  const handleRulePopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (ruleDetailPopup && active.id === `rule-popup-${ruleDetailPopup.ruleId}`) {
        setRuleDetailPopup(prev => prev ? {
            ...prev,
            x: prev.x + delta.x,
            y: prev.y + delta.y,
        } : null);
    }
  };

  const openHabitDetailPopup = (habitId: string, event: React.MouseEvent) => {
    const popupWidth = 600;
    const popupHeight = 500;
    const targetRect = (event.target as HTMLElement).getBoundingClientRect();
    const screenWidth = window.innerWidth;
    let x = targetRect.left;
    let y = targetRect.bottom + 10;

    if (x + popupWidth > screenWidth - 10) {
        x = screenWidth - popupWidth - 10;
    }
    if (y + popupHeight > window.innerHeight - 10) {
        y = targetRect.top - popupHeight - 10;
    }
    setHabitDetailPopup({ habitId, x, y, level: 0 });
  };

  const closeHabitDetailPopup = () => {
    setHabitDetailPopup(null);
  };

  const handleHabitDetailPopupDragEnd = (event: DragEndEvent) => {
    if (habitDetailPopup && event.active.id === `habit-detail-popup-${habitDetailPopup.habitId}`) {
        setHabitDetailPopup(prev => prev ? {
            ...prev,
            x: prev.x + event.delta.x,
            y: prev.y + event.delta.y,
        } : null);
    }
  };
  
  const openTaskContextPopup = (activityId: string, timerRect?: DOMRect, parentPopupState?: TaskContextPopupState) => {
    setTaskContextPopups(prev => {
        const newPopups = new Map(prev);
        const CONTEXT_POPUP_WIDTH = 600;
        const CONTEXT_POPUP_HEIGHT = 400; // Estimated height for centering
        const MARGIN = 16;
        let x = (window.innerWidth - CONTEXT_POPUP_WIDTH) / 2;
        let y = (window.innerHeight - CONTEXT_POPUP_HEIGHT) / 2;
        let level = 0;
        let parentId: string | undefined;

        if (parentPopupState) {
            level = parentPopupState.level + 1;
            parentId = parentPopupState.activityId;
            x = parentPopupState.x + 30;
            y = parentPopupState.y + 30;
        }
        
        newPopups.set(activityId, { activityId, x, y, level, parentId });
        return newPopups;
    });
  };

  const closeTaskContextPopup = (taskId: string) => {
    setTaskContextPopups(prev => {
        const newPopups = new Map(prev);
        const popupsToDelete = new Set<string>([taskId]);
        const queue = [taskId];
        
        while (queue.length > 0) {
            const currentId = queue.shift()!;
            for (const [id, popup] of newPopups.entries()) {
                if (popup.parentId === currentId) {
                    popupsToDelete.add(id);
                    queue.push(id);
                }
            }
        }
        
        for (const idToDelete of popupsToDelete) {
            newPopups.delete(idToDelete);
        }
        return newPopups;
    });
  };

  const handleTaskContextPopupDragEnd = (event: DragEndEvent) => {
    if (event.active.id.toString().startsWith('task-context-popup-')) {
        const taskId = event.active.id.toString().replace('task-context-popup-', '');
        setTaskContextPopups(prev => {
            const newPopups = new Map(prev);
            const popup = newPopups.get(taskId);
            if (popup) {
                newPopups.set(taskId, {
                    ...popup,
                    x: popup.x + event.delta.x,
                    y: popup.y + event.delta.y,
                });
            }
            return newPopups;
        });
    }
  };
  
  const openContentViewPopup = (contentId: string, resource: Resource, point: ResourcePoint, event: React.MouseEvent) => {
    setContentViewPopups(prev => {
        const newPopups = new Map(prev);
        const popupWidth = 896;
        const x = window.innerWidth / 2 - popupWidth / 2;
        const y = event.clientY;

        newPopups.set(contentId, {
            id: contentId,
            resource,
            point,
            x, y,
        });
        return newPopups;
    });
  };
  
  const closeContentViewPopup = (contentId: string) => {
    setContentViewPopups(prev => {
        const newPopups = new Map(prev);
        newPopups.delete(contentId);
        return newPopups;
    });
  };
  
  const handleContentViewPopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const contentId = active.id as string;
    setContentViewPopups(prev => {
        const newPopups = new Map(prev);
        const popup = newPopups.get(contentId);
        if (popup) {
            newPopups.set(contentId, {
                ...popup,
                x: popup.x + delta.x,
                y: popup.y + delta.y
            });
        }
        return newPopups;
    });
  };

  const openTodaysDietPopup = (event: React.MouseEvent) => {
    const popupWidth = 420;
    const popupHeight = 500;
    let x = event.clientX;
    let y = event.clientY;

    if (x + popupWidth > window.innerWidth) x = window.innerWidth - popupWidth - 20;
    if (y + popupHeight > window.innerHeight) y = window.innerHeight - 20;

    setTodaysDietPopup({ id: 'todays-diet', x, y, z: 80 });
  };
  const closeTodaysDietPopup = () => {
    setTodaysDietPopup(null);
  };
  const handleTodaysDietPopupDragEnd = (event: DragEndEvent) => {
    if (event.active.id === 'todays-diet-popup') {
      setTodaysDietPopup(prev => prev ? { ...prev, x: prev.x + event.delta.x, y: prev.y + event.delta.y } : null);
    }
  };
  
  const swapMealInSchedule = (targetSlot: string, targetActivityId: string, sourceDay: string, sourceMeal: 'meal1' | 'meal2' | 'meal3') => {
    const dayPlan = dietPlan.find(p => p.day === sourceDay);
    if (!dayPlan) return;
  
    const mealItems = dayPlan[sourceMeal];
    if (!Array.isArray(mealItems) || mealItems.length === 0) {
      toast({ title: "No Meal Data", description: "The selected meal is empty in your diet plan." });
      return;
    }
  
    const mealDetails = mealItems.map(item => `${item.quantity} ${item.content}`).join(', ');
  
    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      let updated = false;
      const todayKey = format(new Date(), 'yyyy-MM-dd');
      const daySchedule = newSchedule[todayKey];
      
      if (daySchedule && daySchedule[targetSlot]) {
          const activities = (daySchedule[targetSlot] as Activity[]).map(act => {
            if (act.id === targetActivityId) {
              updated = true;
              return {
                ...act,
                details: mealDetails,
                taskIds: [sourceMeal] // Store which meal it is
              };
            }
            return act;
          });
          newSchedule[todayKey] = { ...daySchedule, [targetSlot]: activities };
      }
      
      if(updated) {
        toast({ title: "Meal Swapped!", description: `Updated your agenda with ${MEAL_NAMES[sourceMeal]} from ${sourceDay}.` });
      }
      return newSchedule;
    });
  };

  const createHabitFromThought = (thought: PistonEntry, habitName: string, folderId: string) => {
    const newHabit: Resource = {
      id: `res_habit_${Date.now()}`,
      name: habitName,
      folderId: folderId,
      type: 'habit',
      trigger: { action: thought.text },
      createdAt: new Date().toISOString(),
    };
    setResources(prev => [...prev, newHabit]);
  };
  
  const addToRecents = useCallback((item: (ExerciseDefinition | Project) & { type: string }) => {
    setRecentItems(prev => {
        const newItems = prev.filter(i => i.id !== item.id);
        newItems.unshift(item);
        return newItems.slice(0, 6);
    });
  }, [setRecentItems]);

  const logStopperEncounter = (habitId: string, stopperId: string) => {
    setResources(prevResources => {
        return prevResources.map(resource => {
            if (resource.id === habitId && (resource.type === 'habit' || resource.type === 'mechanism')) {
                const now = Date.now();
                const updateStoppers = (stoppers: Stopper[] = []) =>
                    stoppers.map(stopper =>
                        stopper.id === stopperId
                            ? { ...stopper, timestamps: [...(stopper.timestamps || []), now] }
                            : stopper
                    );
                
                return {
                    ...resource,
                    urges: updateStoppers(resource.urges),
                    resistances: updateStoppers(resource.resistances),
                };
            }
            return resource;
        });
    });
  };
  
  const createResourceWithHierarchy = (parent: ExerciseDefinition | Resource, pointToConvert?: ResourcePoint, type: Resource['type'] = 'card'): ExerciseDefinition | Resource | undefined => {
    let path: string[];
    let newResourceName = pointToConvert ? pointToConvert.text : 'New Card';
  
    // Check if the parent is a mind programming technique
    if ('category' in parent && mindProgrammingCategories.includes(parent.category as ExerciseCategory)) {
        path = ["Mindset Techniques", parent.name];
    } else if ('category' in parent) { // Parent is a standard ExerciseDefinition
      const microSkill = Array.from(microSkillMap.entries()).find(([,v]) => v.microSkillName === parent.category);
      if (!microSkill) {
        toast({ title: "Error", description: "Could not find the skill hierarchy for this task.", variant: "destructive" });
        return undefined;
      }
      const microSkillInfo = microSkill[1];
      const { coreSkillName, skillAreaName } = microSkillInfo;
      const coreSkill = coreSkills.find(cs => cs.name === coreSkillName);
      if (!coreSkill) return undefined;
      const domain = skillDomains.find(d => d.id === coreSkill.domainId);
      if (!domain) return undefined;
      path = ["Skills & Project Resources", domain.name, coreSkill.name, skillAreaName, parent.name];
    } else { // Parent is a Resource
      const folderPath: string[] = [];
      let currentFolderId: string | null = parent.folderId;
      while(currentFolderId) {
        const folder = resourceFolders.find(f => f.id === currentFolderId);
        if (folder) {
          folderPath.unshift(folder.name);
          currentFolderId = folder.parentId;
        } else {
          currentFolderId = null;
        }
      }
      path = [...folderPath, parent.name];
    }

    let parentFolderId: string | null = null;
    let finalFolders = [...resourceFolders];
  
    path.forEach(folderName => {
      let folder = finalFolders.find(f => f.name === folderName && f.parentId === parentFolderId);
      if (!folder) {
        folder = {
          id: `folder_${Date.now()}_${Math.random()}`,
          name: folderName,
          parentId: parentFolderId,
        };
        finalFolders.push(folder);
      }
      parentFolderId = folder.id;
    });
  
    setResourceFolders(finalFolders);
  
    const newResource: Resource = {
      id: `res_card_${Date.now()}`,
      name: newResourceName,
      folderId: parentFolderId!,
      type: type,
      createdAt: new Date().toISOString(),
      points: []
    };
    
    setResources(prev => [...prev, newResource]);
  
    let updatedParent: ExerciseDefinition | Resource | undefined;
    
    const updateParent = (
      setDefs: React.Dispatch<React.SetStateAction<any[]>>,
      isPointConversion: boolean,
      isMindset: boolean = false
    ) => {
      setDefs(prev => prev.map(def => {
        if (def.id === parent.id) {
            const linkKey = isMindset ? 'linkedResourceIds' : 'linkedResourceIds'; // Future-proofing if mindsets link differently
            let updatedPoints = def.points || def.decompositionData || [];
            if (isPointConversion) {
                updatedPoints = updatedPoints.map((p: any) =>
                p.id === pointToConvert!.id
                    ? { id: `point_${Date.now()}`, type: 'card', text: newResource.name, resourceId: newResource.id }
                    : p
                );
            }
            updatedParent = { 
                ...def, 
                [linkKey]: [...(def[linkKey] || []), newResource.id],
                ...(isMindset ? { decompositionData: updatedPoints } : { points: updatedPoints })
            };
            return updatedParent;
        }
        return def;
      }));
    };

    if ('category' in parent) {
      if (mindProgrammingCategories.includes(parent.category as ExerciseCategory)) {
        updateParent(setMindProgrammingDefinitions, !!pointToConvert, true);
      } else if (upskillDefinitions.some(d => d.id === parent.id)) {
        updateParent(setUpskillDefinitions, !!pointToConvert);
      } else if (deepWorkDefinitions.some(d => d.id === parent.id)) {
        updateParent(setDeepWorkDefinitions, !!pointToConvert);
      }
    } else {
        updateParent(setResources, !!pointToConvert);
    }
  
    toast({ title: 'Resource Created', description: `A new resource card has been created and linked.` });
    
    return updatedParent;
  };
  
  const deleteResource = (resourceId: string) => {
    // Remove the resource itself
    setResources(prev => prev.filter(r => r.id !== resourceId));

    // Unlink from any parent tasks
    const unlinkFromDefs = (definitions: ExerciseDefinition[]) => 
        definitions.map(def => ({
            ...def,
            linkedResourceIds: (def.linkedResourceIds || []).filter(id => id !== resourceId)
        }));
    
    setDeepWorkDefinitions(unlinkFromDefs);
    setUpskillDefinitions(unlinkFromDefs);
  };
  
  const handleDeleteStopper = (habitId: string, stopperId: string) => {
    setResources(prev => prev.map(r => {
        if (r.id === habitId) {
            return { ...r, stoppers: (r.stoppers || []).filter(s => s.id !== stopperId) };
        }
        return r;
    }));
  };
  
  const handleDeleteStrength = (habitId: string, strengthId: string) => {
      setResources(prev => prev.map(r => {
          if (r.id === habitId) {
              return { ...r, strengths: (r.strengths || []).filter(s => s.id !== strengthId) };
          }
          return r;
      }));
  };
  
  const microSkillMap = useMemo(() => {
    const map = new Map<string, { coreSkillName: string; skillAreaName: string; microSkillName: string }>();
    coreSkills.forEach(coreSkill => {
        coreSkill.skillAreas.forEach(skillArea => {
            skillArea.microSkills.forEach(microSkill => {
                map.set(microSkill.id, {
                    coreSkillName: coreSkill.name,
                    skillAreaName: skillArea.name,
                    microSkillName: microSkill.name
                });
            });
        });
    });
    return map;
  }, [coreSkills]);
  
  const habitCards = useMemo(() => {
    return resources.filter(r => r.type === 'habit');
  }, [resources]);

  const mechanismCards = useMemo(() => {
      return resources.filter(r => r.type === 'mechanism');
  }, [resources]);
  
  const specializations = useMemo(() => {
      return coreSkills.filter(skill => skill.type === 'Specialization');
  }, [coreSkills]);

  const allEquations = useMemo(() => Object.values(pillarEquations).flat(), [pillarEquations]);

  const addPillarCard = () => {
    const newCard: PillarCardData = {
      id: `pillar_${Date.now()}`,
      principle: 'New Principle',
      practiceEquationIds: [],
      applicationSpecializationIds: [],
      outcome: 'Expected Outcome'
    };
    setPurposeData(prev => ({
        ...prev,
        pillarCards: [...(prev.pillarCards || []), newCard]
    }));
  };
  
  const updatePillarCard = (updatedCard: PillarCardData) => {
    setPurposeData(prev => ({
      ...prev,
      pillarCards: (prev.pillarCards || []).map(c => c.id === updatedCard.id ? updatedCard : c)
    }));
  };
  
  const deletePillarCard = (cardId: string) => {
    setPurposeData(prev => ({
      ...prev,
      pillarCards: (prev.pillarCards || []).filter(c => c.id !== cardId)
    }));
  };

  const activeProjectIds = useMemo(() => {
    const activeIds = new Set<string>();
    const today = startOfToday();

    (projects || []).forEach(project => {
        // Check productization plans
        if (productizationPlans && productizationPlans[project.name]) {
            activeIds.add(project.id);
            return;
        }

        // Check offerization plans
        const isOfferedAndActive = Object.values(offerizationPlans).some(plan => 
            plan.releases?.some(release => {
                if (release.name !== project.name) return false;
                try {
                    return isAfter(parseISO(release.launchDate), today) || format(parseISO(release.launchDate), 'yyyy-MM-dd') === format(today, 'yyyy-MM-dd');
                } catch { return false; }
            })
        );
        if (isOfferedAndActive) {
            activeIds.add(project.id);
        }
    });
    return activeIds;
  }, [projects, productizationPlans, offerizationPlans]);

  const updateActivitySubtask = (activityId: string, subTaskId: string, updates: Partial<SubTask>) => {
    setSchedule(prev => {
        const newSchedule = { ...prev };
        for (const dateKey in newSchedule) {
            for (const slotName in newSchedule[dateKey]) {
                const activities = newSchedule[dateKey][slotName] as Activity[] | undefined;
                if (Array.isArray(activities)) {
                    const activityIndex = activities.findIndex(a => a.id === activityId);
                    if (activityIndex > -1) {
                        const newSubTasks = (activities[activityIndex].subTasks || []).map(st =>
                            st.id === subTaskId ? { ...st, ...updates } : st
                        );
                        activities[activityIndex] = { ...activities[activityIndex], subTasks: newSubTasks };
                        break;
                    }
                }
            }
        }
        return newSchedule;
    });
  };
  
  const deleteActivitySubtask = (activityId: string, subTaskId: string) => {
      setSchedule(prev => {
          const newSchedule = { ...prev };
          for (const dateKey in newSchedule) {
              for (const slotName in newSchedule[dateKey]) {
                  const activities = newSchedule[dateKey][slotName] as Activity[] | undefined;
                  if (Array.isArray(activities)) {
                      const activityIndex = activities.findIndex(a => a.id === activityId);
                      if (activityIndex > -1) {
                          const newSubTasks = (activities[activityIndex].subTasks || []).filter(st => st.id !== subTaskId);
                          activities[activityIndex] = { ...activities[activityIndex], subTasks: newSubTasks };
                          break;
                      }
                  }
              }
          }
          return newSchedule;
      });
  };

  const handleLinkHabit = (activityId: string, habitId: string, date: Date) => {
    if (!date || !isValid(date)) {
        console.error("handleLinkHabit received an invalid date for activity:", activityId);
        return;
    }
    const dateKey = format(date, 'yyyy-MM-dd');
    setSchedule(prevSchedule => {
        const newSchedule = { ...prevSchedule };
        if (newSchedule[dateKey]) {
            const daySchedule = { ...newSchedule[dateKey] };
            let activityUpdated = false;
            Object.keys(daySchedule).forEach(slotName => {
                const activities = (daySchedule[slotName] as Activity[]) || [];
                const activityIndex = activities.findIndex(act => act.id === activityId);
                if (activityIndex > -1) {
                    const activityToUpdate = { ...activities[activityIndex] };
                    const currentHabits = activityToUpdate.habitEquationIds || [];
                    const isAlreadyLinked = currentHabits.includes(habitId);
                    activityToUpdate.habitEquationIds = isAlreadyLinked
                        ? currentHabits.filter(id => id !== habitId)
                        : [...currentHabits, habitId];
                    const updatedActivities = [...activities];
                    updatedActivities[activityIndex] = activityToUpdate;
                    daySchedule[slotName] = updatedActivities;
                    activityUpdated = true;
                }
            });
            if (activityUpdated) {
                newSchedule[dateKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  };
  
  const openLinkedResistancePopup = (techniqueId: string, event: React.MouseEvent) => {
    const popupWidth = 384; // w-96
    const popupHeight = 400; // Estimated height
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    let x = rect.right + 10;
    let y = rect.top;

    if (x + popupWidth > window.innerWidth) {
      x = rect.left - popupWidth - 10;
    }
    if (y + popupHeight > window.innerHeight) {
      y = window.innerHeight - popupHeight - 10;
    }
    
    setLinkedResistancePopup({
        techniqueId,
        x: Math.max(10, x),
        y: Math.max(10, y),
        level: 0,
        z: 100,
    });
  };

  const value: AuthContextType = {
    currentUser, loading, register, signIn, signOut,
    pushDataToCloud, pullDataFromCloud, exportData, importData,
    localChangeCount,
    isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken,
    theme, setTheme,
    floatingVideoUrl, setFloatingVideoUrl,
    isAudioPlaying, setIsAudioPlaying,
    globalVolume, setGlobalVolume,
    settings, setSettings,
    weightLogs, setWeightLogs, goalWeight, setGoalWeight, height, setHeight, dateOfBirth, setDateOfBirth, gender, setGender, dietPlan, setDietPlan,
    schedule, setSchedule, dailyPurposes, setDailyPurposes, isAgendaDocked, setIsAgendaDocked, activityDurations,
    handleToggleComplete, handleLogLearning, logSubTaskTime, carryForwardTask, scheduleTaskFromMindMap, updateActivity,
    focusSessionModalOpen, setFocusSessionModalOpen, focusActivity, focusDuration, onOpenFocusModal, handleStartFocusSession,
    activeFocusSession, setActiveFocusSession,
    allUpskillLogs, setAllUpskillLogs, allDeepWorkLogs, setAllDeepWorkLogs, allWorkoutLogs, setAllWorkoutLogs, brandingLogs, setAllBrandingLogs, allLeadGenLogs, setAllLeadGenLogs,
    workoutMode, setWorkoutMode, strengthTrainingMode, setStrengthTrainingMode, workoutPlanRotation, setWorkoutPlanRotation, workoutPlans, setWorkoutPlans, exerciseDefinitions, setExerciseDefinitions,
    upskillDefinitions, setUpskillDefinitions, topicGoals, setTopicGoals,
    deepWorkDefinitions, setDeepWorkDefinitions, getDeepWorkNodeType, getUpskillNodeType, updateTaskDuration,
    leadGenDefinitions, setLeadGenDefinitions,
    productizationPlans, setProductizationPlans, offerizationPlans, setOfferizationPlans,
    addFeatureToRelease,
    copyOffer,
    mindProgrammingDefinitions, setMindProgrammingDefinitions,
    mindProgrammingCategories, setMindProgrammingCategories,
    mindProgrammingMode, setMindProgrammingMode,
    mindProgrammingPlans, setMindProgrammingPlans,
    mindProgrammingPlanRotation, setMindProgrammingPlanRotation,
    allMindProgrammingLogs, setAllMindProgrammingLogs,
    resourceFolders, setResourceFolders,
    resources, setResources, deleteResource,
    pinnedFolderIds, setPinnedFolderIds,
    activeResourceTabIds, setActiveResourceTabIds,
    selectedResourceFolderId, setSelectedResourceFolderId,
    habitCards, mechanismCards,
    createHabitFromThought, lastSelectedHabitFolder, setLastSelectedHabitFolder,
    createResourceWithHierarchy,
    handleDeleteStopper, handleDeleteStrength,
    logStopperEncounter,
    openPopups, handleOpenNestedPopup, 
    closeAllResourcePopups,
    handlePopupDragEnd,
    ResourcePopup,
    intentionPopups, openIntentionPopup, closeIntentionPopup,
    generalPopups, openGeneralPopup, closeGeneralPopup,
    handleUpdateResource,
    ruleDetailPopup, openRuleDetailPopup, closeRuleDetailPopup, handleRulePopupDragEnd,
    habitDetailPopup, openHabitDetailPopup, closeHabitDetailPopup, handleHabitDetailPopupDragEnd,
    taskContextPopups, openTaskContextPopup, closeTaskContextPopup, handleTaskContextPopupDragEnd,
    contentViewPopups, openContentViewPopup, closeContentViewPopup, handleContentViewPopupDragEnd,
    todaysDietPopup, openTodaysDietPopup, closeTodaysDietPopup, handleTodaysDietPopupDragEnd, swapMealInSchedule,
    logWorkoutSet, updateWorkoutSet, deleteWorkoutSet, removeExerciseFromWorkout,
    swapWorkoutExercise,
    swapWorkoutForDay,
    canvasLayout, setCanvasLayout,
    mindsetCards, setMindsetCards,
    isPistonsHeadOpen, setIsPistonsHeadOpen,
    pistons, setPistons,
    pistonsInitialState, openPistonsFor,
    deleteDesire,
    skillDomains, setSkillDomains,
    coreSkills, setCoreSkills,
    projects, setProjects,
    handleUpdateSkillArea,
    handleDeleteSkillArea,
    handleAddMicroSkill,
    handleUpdateMicroSkill,
    handleDeleteMicroSkill,
    companies, setCompanies,
    positions, setPositions,
    purposeData, setPurposeData,
    patterns, setPatterns,
    metaRules, setMetaRules,
    pillarEquations, setPillarEquations,
    skillAcquisitionPlans, setSkillAcquisitionPlans,
    addPillarCard, updatePillarCard, deletePillarCard,
    specializations, allEquations,
    pathNodes, setPathNodes,
    selectedUpskillTask, setSelectedUpskillTask,
    selectedDeepWorkTask, setSelectedDeepWorkTask,
    selectedMicroSkill, setSelectedMicroSkill,
    microSkillMap,
    permanentlyLoggedTaskIds, getDescendantLeafNodes,
    expandedItems, setExpandedItems, handleExpansionChange,
    selectedDomainId, setSelectedDomainId,
    selectedSkillId, setSelectedSkillId,
    selectedProjectId, setSelectedProjectId,
    selectedCompanyId, setSelectedCompanyId,
    autoSuggestions, setAutoSuggestions,
    recentItems, addToRecents,
    currentSlot,
    activeProjectIds,
    updateActivitySubtask, deleteActivitySubtask,
    handleLinkHabit,
    missedSlotReviews, setMissedSlotReviews,
    linkedResistancePopup, setLinkedResistancePopup, openLinkedResistancePopup,
    stopperProgressPopup, openStopperProgressPopup, setStopperProgressPopup,
  };

  useEffect(() => {
    if (currentUser?.username) {
        const settingsKey = `lifeos_settings_${currentUser.username}`;
        const storedSettings = localStorage.getItem(settingsKey);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        }
        loadState(currentUser.username);
    }
  }, [currentUser]);

  useEffect(() => {
    const user = getCurrentLocalUser();
    setCurrentUser(user);
    setLoading(false);
    
    const savedTheme = localStorage.getItem('lifeos_theme') || 'ad-dark';
    setTheme(savedTheme);
  }, []);
  
   useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      const currentHour = now.getHours();
      if (currentHour >= 0 && currentHour < 4) setCurrentSlot('Late Night');
      else if (currentHour >= 4 && currentHour < 8) setCurrentSlot('Dawn');
      else if (currentHour >= 8 && currentHour < 12) setCurrentSlot('Morning');
      else if (currentHour >= 12 && currentHour < 16) setCurrentSlot('Afternoon');
      else if (currentHour >= 16 && currentHour < 20) setCurrentSlot('Evening');
      else setCurrentSlot('Night');
    }, 60000); // Update every minute

    // Initial call
    const now = new Date();
    const currentHour = now.getHours();
    if (currentHour >= 0 && currentHour < 4) setCurrentSlot('Late Night');
    else if (currentHour >= 4 && currentHour < 8) setCurrentSlot('Dawn');
    else if (currentHour >= 8 && currentHour < 12) setCurrentSlot('Morning');
    else if (currentHour >= 12 && currentHour < 16) setCurrentSlot('Afternoon');
    else if (currentHour >= 16 && currentHour < 20) setCurrentSlot('Evening');
    else setCurrentSlot('Night');

    return () => clearInterval(interval);
  }, []);

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
 
// Helper hook to get the previous value of a state or prop
const usePrevious = <T,>(value: T) => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const MEAL_NAMES: Record<'meal1' | 'meal2' | 'meal3' | 'supplements', string> = {
  meal1: "Meal 1",
  meal2: "Meal 2",
  meal3: "Meal 3",
  supplements: "Snacks & Supplements",
}
    



