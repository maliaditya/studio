

"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser, WeightLog, Gender, UserDietPlan, FullSchedule, DatedWorkout, Activity, LoggedSet, WorkoutMode, AllWorkoutPlans, ExerciseDefinition, TopicGoal, ProductizationPlan, Release, ExerciseCategory, ActivityType, Offer, Resource, ResourceFolder, CanvasLayout, MindsetCard, PistonsCategoryData, SkillDomain, CoreSkill, Project, Company, Position, MicroSkill, PopupState, ResourcePoint, SkillArea, DailySchedule, PurposeData, Pattern, MetaRule, PistonsInitialState, PistonEntry, AutoSuggestionEntry, RuleDetailPopupState, TaskContextPopupState, PillarCardData, HabitEquation, PathNode, ContentViewPopupState, TodaysDietPopupState, HabitDetailPopupState, StrengthTrainingMode, Stopper, Strength, SubTask, MissedSlotReview, MindsetTechniquePopupState, StopperProgressPopupState, WorkoutSchedulingMode, UserSettings, Priority, BrainHack, PipState, ActiveFocusSession, SlotName, PillarPopupState, RepetitionData, DailyReviewLog, NodeType, PlaybackRequest, WorkoutExercise, DrawingCanvasPopupState, PdfViewerPopupState, FormalizationItem, AbandonmentLog } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
} from '@/lib/localAuth';
import { format, addDays, parseISO, subDays, startOfDay, isAfter, isBefore, isValid, eachDayOfInterval, min, max, startOfWeek, differenceInDays, getDay, startOfToday } from 'date-fns';
import { DEFAULT_EXERCISE_DEFINITIONS, INITIAL_PLANS, LEAD_GEN_DEFINITIONS, DEFAULT_MINDSET_CARDS, defaultMindsetCategories, DEFAULT_MIND_PROGRAMMING_DEFINITIONS } from '@/lib/constants';
import { getExercisesForDay } from '@/lib/workoutUtils';

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Library, MessageSquare, Code, ArrowRight, Upload, Play, Pause, Unlink, Edit3 } from 'lucide-react';
import { DndContext, useDraggable } from '@dnd-kit/core';
import type { DragEndEvent } from 'dnd-kit';
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
import { deleteAudio, clearAllData } from '@/lib/audioDB';
import { PillarPopup } from '@/components/PillarPopup';
import { BrainHacksCard } from '@/components/BrainHacksCard';


interface ResourcePopupProps {
  popupState: PopupState;
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
  floatingVideoPlaylist: string[];
  setFloatingVideoPlaylist: React.Dispatch<React.SetStateAction<string[]>>;
  pipState: PipState;
  setPipState: React.Dispatch<React.SetStateAction<PipState>>;
  isAudioPlaying: boolean;
  setIsAudioPlaying: React.Dispatch<React.SetStateAction<boolean>>;
  globalVolume: number;
  setGlobalVolume: React.Dispatch<React.SetStateAction<number>>;
  playbackRequest: PlaybackRequest | null;
  setPlaybackRequest: React.Dispatch<React.SetStateAction<PlaybackRequest | null>>;
  pdfViewerState: PdfViewerPopupState | null;
  setPdfViewerState: React.Dispatch<React.SetStateAction<PdfViewerPopupState | null>>;
  openPdfViewer: (resource: Resource) => void;
  handlePdfViewerPopupDragEnd: (event: DragEndEvent) => void;
  drawingCanvasState: DrawingCanvasPopupState | null;
  setDrawingCanvasState: React.Dispatch<React.SetStateAction<DrawingCanvasPopupState | null>>;
  openDrawingCanvas: (state: Omit<DrawingCanvasPopupState, 'isOpen' | 'position' | 'onSave'>) => void;
  handleDrawingCanvasPopupDragEnd: (event: DragEndEvent) => void;
  togglePinDrawing: (canvasId: string) => void;
  updateDrawingData: (canvasId: string, data: string) => void;
  clearAllLocalFiles: () => Promise<void>;
  isTodaysPredictionModalOpen: boolean;
  setIsTodaysPredictionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  syncWithGitHub: () => Promise<void>;
  
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
  setGender: React.Dispatch<React.SetStateAction<gender | null>>;
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
  scheduleTaskFromMindMap: (definitionId: string, activityType: ActivityType, slotName: string, duration?: number) => void;
  updateActivity: (updatedActivity: Activity) => void;
  findRootTask: (activity: Activity) => ExerciseDefinition | null;


  // Focus Session
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
  setBrandingLogs: React.Dispatch<React.SetStateAction<DatedWorkout[]>>;
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
  resources: Resource[];
  setResources: React.Dispatch<React.SetStateAction<Resource[]>>;
  resourceFolders: ResourceFolder[];
  setResourceFolders: React.Dispatch<React.SetStateAction<ResourceFolder[]>>;
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
  createResourceWithHierarchy: (parent: ExerciseDefinition | Resource, pointToConvert?: ResourcePoint, type?: Resource['type'], prebuiltResource?: Resource) => ExerciseDefinition | Resource | undefined;
  handleDeleteStopper: (habitId: string, stopperId: string) => void;
  handleDeleteStrength: (habitId: string, strengthId: string) => void;
  logStopperEncounter: (habitId: string, stopperId: string) => void;
  
  // Resource Popups (Original system, kept for resources page)
  openPopups: Map<string, PopupState>;
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
  handleOpenNestedPopup: (resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => void;

  // Meta Rule Popup
  ruleDetailPopup: RuleDetailPopupState | null;
  openRuleDetailPopup: (ruleId: string, event: React.MouseEvent) => void;
  closeRuleDetailPopup: () => void;
  handleRulePopupDragEnd: (event: DragEndEvent) => void;

  // Pillar Popup
  pillarPopupState: PillarPopupState | null;
  openPillarPopup: (pillarName: string, event?: React.MouseEvent) => void;
  closePillarPopup: () => void;
  handlePillarPopupDragEnd: (event: DragEndEvent) => void;
  
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
  openContentViewPopup: (contentId: string, resource: Resource, point: ResourcePoint, event?: React.MouseEvent) => void;
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
  globalElements: FormalizationItem[];
  allComponentsForSpec: FormalizationItem[];
  addGlobalElement: (text: string, x: number, y: number) => FormalizationItem | undefined;
  updateGlobalElement: (elementId: string, updates: Partial<FormalizationItem>) => void;
  deleteGlobalElement: (elementId: string) => void;
  handleAddNewResourceCard: (folderId: string | null, position: { x: number; y: number; }) => Resource | undefined;

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
  handleToggleMicroSkillRepetition: (coreSkillId: string, areaId: string, microSkillId: string, isReady: boolean) => void;

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
  abandonmentLogs: Record<string, AbandonmentLog[]>;
  setAbandonmentLogs: React.Dispatch<React.SetStateAction<Record<string, AbandonmentLog[]>>>;
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
  calculateTotalEstimate: (def: ExerciseDefinition) => number;
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
  selectedFormalizationSpecId: string | null;
  setSelectedFormalizationSpecId: React.Dispatch<React.SetStateAction<string | null>>;
  autoSuggestions: Record<string, AutoSuggestionEntry[]>;
  setAutoSuggestions: React.Dispatch<React.SetStateAction<Record<string, AutoSuggestionEntry[]>>>;
  recentItems: Array<(ExerciseDefinition | Project) & { type: string }>;
  addToRecents: (item: (ExerciseDefinition | Project) & { type: string }) => void;
  currentSlot: string;
  activeProjectIds: Set<string>;
  updateActivitySubtask: (activityId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteActivitySubtask: (activityId: string, subTaskId: string) => void;
  handleLinkHabit: (activityId: string, habitId: string, date: Date) => void;
  toggleRoutine: (activity: Activity, rule: RecurrenceRule | null) => void;
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

  // Top Priorities
  topPriorities: Priority[];
  setTopPriorities: React.Dispatch<React.SetStateAction<Priority[]>>;
  brainHacks: BrainHack[];
  setBrainHacks: React.Dispatch<React.SetStateAction<BrainHack[]>>;
  getDeepWorkLoggedMinutes: (def: ExerciseDefinition) => number;
  getUpskillLoggedMinutesRecursive: (def: ExerciseDefinition) => number;

  // Spaced Repetition
  spacedRepetitionData: Record<string, RepetitionData>;
  setSpacedRepetitionData: React.Dispatch<React.SetStateAction<Record<string, RepetitionData>>>;
  dailyReviewLogs: DailyReviewLog[];
  setDailyReviewLogs: React.Dispatch<React.SetStateAction<DailyReviewLog[]>>;
  handleCreateBrainHack: (linkedTaskId: string, taskType: 'deepwork' | 'upskill' | 'resource', resourceId?: string) => void;
  handleToggleDailyGoalCompletion: (resourceId: string) => void;
  
  // Brain Hack Popups
  openBrainHackPopups: Record<string, {x: number, y: number}>;
  setOpenBrainHackPopups: React.Dispatch<React.SetStateAction<Record<string, {x: number, y: number}>>>;
  openBrainHackPopup: (hackId: string, event: React.MouseEvent) => void;
  recalculateAndFixTaskTypes: () => void;
  openMindsetWidget: () => void;
  isMindsetModalOpen: boolean;
  setIsMindsetModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  toggleProjectBrandingStatus: (projectId: string) => void;
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType);

// Helper hook to get the previous value of a state or prop
const usePrevious = <T,>(value: T) => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

const id = (prefix = "id") => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDemoTokenModalOpen, setIsDemoTokenModalOpen] = useState(false);
  const [theme, setThemeState] = useState('ad-dark');
  const [floatingVideoUrl, setFloatingVideoUrl] = useState<string | null>(null);
  const [floatingVideoPlaylist, setFloatingVideoPlaylist] = useState<string[]>([]);
  const [pipState, setPipState] = useState<PipState>({
    isOpen: false,
    position: { x: 0, y: 0 },
    size: { width: 448, height: 252 },
  });
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const [globalVolume, setGlobalVolumeState] = useState(0.2);
  const [playbackRequest, setPlaybackRequest] = useState<PlaybackRequest | null>(null);
  const [pdfViewerState, setPdfViewerState] = useState<PdfViewerPopupState | null>(null);
  const [drawingCanvasState, setDrawingCanvasState] = useState<DrawingCanvasPopupState | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  const [localChangeCount, setLocalChangeCount] = useState(0);
  const [currentSlot, setCurrentSlot] = useState('');

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
    slotRules: {},
    widgetVisibility: {
      agenda: true,
      smartLogging: true,
      pistons: true,
      mindset: true,
      activityDistribution: true,
      favorites: true,
      topPriorities: true,
      goals: true,
      brainHacks: true,
      ruleEquations: true,
      visualizationTechniques: true,
      spacedRepetition: true,
    },
    allWidgetsVisible: true,
    agendaShowCurrentSlotOnly: false,
    spacedRepetitionSlot: 'Late Night',
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
  const [brandingLogs, setBrandingLogs] = useState<DatedWorkout[]>([]);
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
  const [resourceFolders, setResourceFolders] = useState<ResourceFolder[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(new Set());
  const [activeResourceTabIds, setActiveResourceTabIds] = useState<string[]>([]);
  const [selectedResourceFolderId, setSelectedResourceFolderId] = useState<string | null>(null);
  const [lastSelectedHabitFolder, setLastSelectedHabitFolder] = useState<string | null>(null);

  // Resource Popups (Original system, kept for resources page)
  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
  const [playingAudio, setPlayingAudio] = useState<{ id: string; isPlaying: boolean } | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Intention Popups
  const [intentionPopups, setIntentionPopups] = useState<Map<string, PopupState>>(new Map());
  
  // General Popups (New System)
  const [generalPopups, setGeneralPopups] = useState<Map<string, PopupState>>(new Map());

  // Meta Rule Popup
  const [ruleDetailPopup, setRuleDetailPopup] = useState<RuleDetailPopupState | null>(null);

  // Pillar Popup
  const [pillarPopupState, setPillarPopupState] = useState<PillarPopupState | null>(null);
  
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
  const [selectedFormalizationSpecId, setSelectedFormalizationSpecId] = useState<string | null>(null);
  
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
  const [abandonmentLogs, setAbandonmentLogs] = useState<Record<string, AbandonmentLog[]>>({});

  // Persisted task state
  const [selectedUpskillTask, setSelectedUpskillTask] = useState<ExerciseDefinition | null>(null);
  const [selectedDeepWorkTask, setSelectedDeepWorkTask] = useState<ExerciseDefinition | null>(null);
  const [selectedMicroSkill, setSelectedMicroSkill] = useState<MicroSkill | null>(null);

  // Auto Suggestion State
  const [autoSuggestions, setAutoSuggestions] = useState<Record<string, AutoSuggestionEntry[]>>({});

  // Recents State
  const [recentItems, setRecentItems] = useState<Array<(ExerciseDefinition | Project) & { type: string }>>([]);

  // Path Diagram Data
  const [pathNodes, setPathNodes] = useState<PathNode[]>([]);
  
  // Mindset Technique Popup
  const [linkedResistancePopup, setLinkedResistancePopup] = useState<MindsetTechniquePopupState | null>(null);

  // Stopper Progress Popup
  const [stopperProgressPopup, setStopperProgressPopup] = useState<StopperProgressPopupState | null>(null);

  // Top Priorities
  const [topPriorities, setTopPriorities] = useState<Priority[]>([]);
  const [brainHacks, setBrainHacks] = useState<BrainHack[]>([]);

  // Spaced Repetition
  const [spacedRepetitionData, setSpacedRepetitionData] = useState<Record<string, RepetitionData>>({});
  const [dailyReviewLogs, setDailyReviewLogs] = useState<DailyReviewLog[]>([]);
  
  // Brain Hack Popups
  const [openBrainHackPopups, setOpenBrainHackPopups] = useState<Record<string, {x: number, y: number}>>({});

  const [isMindsetModalOpen, setIsMindsetModalOpen] = useState(false);
  const [isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen] = useState(false);

  const togglePinDrawing = useCallback((canvasId: string) => {
    setDrawingCanvasState(prev => {
      if (!prev) return null;
      const newOpenCanvases = (prev.openCanvases || []).map(c => 
        c.id === canvasId ? { ...c, isPinned: !c.isPinned } : c
      );
      return { ...prev, openCanvases: newOpenCanvases };
    });
  }, []);

  const updateDrawingData = useCallback((canvasId: string, data: string) => {
    setDrawingCanvasState(prev => {
        if (!prev) return null;
        const newOpenCanvases = (prev.openCanvases || []).map(c => 
            c.id === canvasId ? { ...c, data: data } : c
        );
        return { ...prev, openCanvases: newOpenCanvases };
    });
    
    const canvasToUpdate = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);
    if(canvasToUpdate) {
        setResources(prevResources => prevResources.map(r => {
            if(r.id === canvasToUpdate.resourceId) {
                return {
                    ...r,
                    points: r.points?.map(p => p.id === canvasToUpdate.pointId ? {...p, drawing: data} : p)
                }
            }
            return r;
        }))
    }
  }, [drawingCanvasState, setResources]);

  const toggleProjectBrandingStatus = useCallback((projectId: string) => {
    setProjects(prevProjects =>
      prevProjects.map(p =>
        p.id === projectId ? { ...p, isReadyForBranding: !p.isReadyForBranding } : p
      )
    );
  }, [setProjects]);

  const prevUser = usePrevious(currentUser);
  
  const setTheme = useCallback((newTheme: string) => {
    setThemeState(newTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('lifeos_theme', newTheme);
    }
  }, []);

  const setGlobalVolume = useCallback((newVolume: number) => {
    setGlobalVolumeState(newVolume);
    if (typeof window !== 'undefined') {
        localStorage.setItem('lifeos_global_volume', String(newVolume));
    }
  }, []);

  const openPdfViewer = (resource: Resource) => {
    setPdfViewerState({
      isOpen: true,
      resource,
      position: { x: window.innerWidth - (settings.pdfViewerWidth || 1024) - 20, y: 80 },
      size: { width: settings.pdfViewerWidth || 1024 }
    });
  };

  const handlePdfViewerPopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (pdfViewerState && active.id === 'pdf-viewer-popup') {
      setPdfViewerState(prev => prev ? {
        ...prev,
        position: {
          x: prev.position.x + delta.x,
          y: prev.position.y + delta.y,
        },
      } : null);
    }
  };

  const openDrawingCanvas = useCallback((state: Omit<DrawingCanvasPopupState, 'isOpen' | 'position' | 'onSave'>) => {
    const canvasId = `${state.resourceId}-${state.pointId}`;
    setDrawingCanvasState(prev => {
        const newOpenCanvases = prev?.openCanvases ? [...prev.openCanvases] : [];
        const canvasIndex = newOpenCanvases.findIndex(c => c.id === canvasId);

        if (canvasIndex === -1) {
            newOpenCanvases.push({
                id: canvasId,
                resourceId: state.resourceId,
                pointId: state.pointId,
                name: state.name,
                initialDrawing: state.initialDrawing,
                isPinned: false
            });
        }
        
        return {
            isOpen: true,
            position: prev?.position || { x: window.innerWidth / 2, y: window.innerHeight / 2 },
            openCanvases: newOpenCanvases,
            activeCanvasId: canvasId,
        };
    });
  }, []);


  const handleDrawingCanvasPopupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    if (drawingCanvasState && active.id === 'drawing-canvas-popup') {
      setDrawingCanvasState(prev => prev ? {
        ...prev,
        position: {
          x: prev.position.x + delta.x,
          y: prev.y + delta.y,
        },
      } : null);
    }
  }, [drawingCanvasState]);

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
  
  const updateActivity = useCallback((updatedActivity: Activity) => {
    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      let found = false;
      for (const dateKey in newSchedule) {
        for (const slotName in newSchedule[dateKey]) {
          const activities = (newSchedule[dateKey][slotName as SlotName] as Activity[]) || [];
          const activityIndex = activities.findIndex(a => a.id === updatedActivity.id);
          if (activityIndex > -1) {
            const newActivities = [...activities];
            newActivities[activityIndex] = updatedActivity;
            newSchedule[dateKey][slotName as SlotName] = newActivities;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      return newSchedule;
    });
  }, [setSchedule]);

  const logSubTaskTime = useCallback((subTaskId: string, durationMinutes: number) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let definitionUpdated = false;

    const findAndUpdate = (defs: ExerciseDefinition[], setter: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>) => {
        const index = defs.findIndex(d => d.id === subTaskId);
        if (index > -1) {
            setter(prev => {
                const newDefs = [...prev];
                const newDef = {
                    ...newDefs[index],
                    loggedDuration: (newDefs[index].loggedDuration || 0) + durationMinutes,
                    last_logged_date: todayKey,
                };
                newDefs[index] = newDef;
                return newDefs;
            });
            definitionUpdated = true;
        }
    };
    
    findAndUpdate(deepWorkDefinitions, setDeepWorkDefinitions);
    if (!definitionUpdated) {
        findAndUpdate(upskillDefinitions, setUpskillDefinitions);
    }
  }, [deepWorkDefinitions, upskillDefinitions, setDeepWorkDefinitions, setUpskillDefinitions]);

  const handleLogLearning = useCallback((activity: Activity, duration: number) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
  
    const findAndUpdateDefinition = (
      definitions: ExerciseDefinition[], 
      setter: React.Dispatch<React.SetStateAction<ExerciseDefinition[]>>
    ) => {
      let definition: ExerciseDefinition | undefined;
      let definitionFound = false;

      if (activity.taskIds && activity.taskIds.length > 0) {
        const mainLogInstanceId = activity.taskIds[0];
        let mainDefId: string | undefined;

        const allLogs = activity.type === 'upskill' ? allUpskillLogs : allDeepWorkLogs;
        mainDefId = allLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId)?.definitionId;
        
        if (mainDefId) {
          definition = definitions.find(d => d.id === mainDefId);
        }
      }
      
      if (!definition) {
        const microSkill = Array.from(microSkillMap.values()).find(ms => ms.coreSkillName === activity.details || ms.microSkillName === activity.details);
        const category = microSkill ? microSkill.microSkillName : activity.details;
        definition = definitions.find(def => def.name === activity.details && def.category === category);
      }
      
      if (definition) {
        setter(prevDefs => prevDefs.map(def =>
          def.id === definition!.id ? {
            ...def,
            loggedDuration: (def.loggedDuration || 0) + duration,
            last_logged_date: todayKey,
          } : def
        ));
        definitionFound = true;
      }
      return definitionFound;
    };
  
    let updated = false;
    if (activity.type === 'upskill') {
      updated = findAndUpdateDefinition(upskillDefinitions, setUpskillDefinitions);
    } else if (activity.type === 'deepwork' || activity.type === 'branding') {
      updated = findAndUpdateDefinition(deepWorkDefinitions, setDeepWorkDefinitions);
    }
  
    if (!updated) {
        console.warn("Could not find a matching definition to log time against for activity:", activity.details);
        updateActivity({ ...activity, duration: (activity.duration || 0) + duration });
    }
    
    updateActivity({ ...activity, completed: true, completedAt: Date.now() });
  
  }, [upskillDefinitions, deepWorkDefinitions, setUpskillDefinitions, setDeepWorkDefinitions, microSkillMap, updateActivity, allUpskillLogs, allDeepWorkLogs]);
  
  const allDefinitionMap = useMemo(() => new Map([...deepWorkDefinitions, ...upskillDefinitions].map(def => [def.id, def])), [deepWorkDefinitions, upskillDefinitions]);

  const childToParentMap = useMemo(() => {
    const map = new Map<string, string[]>();
    allDefinitionMap.forEach(def => {
      const children = [
        ...(def.linkedDeepWorkIds || []), 
        ...(def.linkedUpskillIds || []),
        ...(def.linkedResourceIds || []),
      ];
      children.forEach(childId => {
        if (!map.has(childId)) map.set(childId, []);
        map.get(childId)!.push(def.id);
      });
    });
    return map;
  }, [allDefinitionMap]);

  const getDeepWorkNodeType = useCallback((def: ExerciseDefinition): string => {
    if (def.nodeType) return def.nodeType;
    const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0;
    const isChild = childToParentMap.has(def.id);
    
    if (isParent) {
        return isChild ? 'Objective' : 'Intention';
    }
    return isChild ? 'Action' : 'Standalone';
  }, [childToParentMap]);
  
  const getUpskillNodeType = useCallback((def: ExerciseDefinition): string => {
    if (def.nodeType) return def.nodeType;
    const isParent = (def.linkedUpskillIds?.length ?? 0) > 0;
    const isChild = childToParentMap.has(def.id);
    
    if (isParent) {
        return isChild ? 'Objective' : 'Curiosity';
    }
    return isChild ? 'Visualization' : 'Standalone';
  }, [childToParentMap]);

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
              if (activity.type === 'upskill' || activity.type === 'deepwork' || activity.type === 'branding') {
                  let definition: ExerciseDefinition | undefined;

                  if (activity.taskIds && activity.taskIds.length > 0) {
                      const mainLogInstanceId = activity.taskIds[0];
                      let mainDefId: string | undefined;
                      const allLogs = activity.type === 'upskill' ? allUpskillLogs : activity.type === 'branding' ? brandingLogs : allDeepWorkLogs;
                      mainDefId = allLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId)?.definitionId;
                      
                      if (mainDefId) {
                        definition = allDefs.get(mainDefId);
                      }
                  }
                  
                  if (!definition) {
                    const sourceDefs = activity.type === 'upskill' ? upskillDefinitions : deepWorkDefinitions;
                    const microSkill = Array.from(microSkillMap.values()).find(ms => ms.coreSkillName === activity.details || ms.microSkillName === activity.details);
                    const category = microSkill ? microSkill.microSkillName : activity.details;
                    definition = sourceDefs.find(def => def.name === activity.details && def.category === category);
                  }

                  if (definition) {
                    const leafNodes = getDescendantLeafNodes(definition.id, activity.type === 'upskill' ? 'upskill' : 'deepwork');
                    
                    if (leafNodes.length > 0) {
                        totalMinutes = leafNodes.reduce((sum, node) => {
                            if (node.last_logged_date === dateKey) {
                                return sum + (node.loggedDuration || 0);
                            }
                            return sum;
                        }, 0);
                    } else {
                        if (definition.last_logged_date === dateKey) {
                            totalMinutes = definition.loggedDuration || 0;
                        }
                    }
                    suffix = ' logged';
                  }

              } else if (activity.duration) {
                  totalMinutes = activity.duration;
                  suffix = ' logged';
              }
            } else {
              switch(activity.type) {
                case 'workout': totalMinutes = 90; break;
                case 'mindset': totalMinutes = 15; break;
                case 'upskill':
                case 'deepwork':
                case 'branding':
                  if (activity.taskIds && activity.taskIds.length > 0) {
                    const mainLogInstanceId = activity.taskIds[0];
                    let mainTaskDefId: string | undefined;
                    const allLogs = [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs];
                    mainTaskDefId = allLogs.flatMap(l => l.exercises).find(ex => ex.id === mainLogInstanceId)?.definitionId;

                    if (mainTaskDefId) {
                      const taskDef = allDefs.get(mainTaskDefId);
                      if (taskDef) {
                        totalMinutes = calculateTotalEstimate(taskDef);
                      } else {
                        totalMinutes = 120;
                      }
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
  }, [schedule, deepWorkDefinitions, upskillDefinitions, calculateTotalEstimate, allUpskillLogs, allDeepWorkLogs, brandingLogs, getDescendantLeafNodes, microSkillMap]);
  
  const permanentlyLoggedTaskIds = useMemo(() => {
    const loggedIds = new Set<string>();
    const allLogs = [...allDeepWorkLogs, ...allUpskillLogs, ...allMindProgrammingLogs];
    allLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          loggedIds.add(ex.definitionId);
        }
      });
    });
    return loggedIds;
  }, [allDeepWorkLogs, allUpskillLogs, allMindProgrammingLogs]);
  
  const handleToggleComplete = useCallback((slotName: string, activityId: string, isCompleted: boolean) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    setSchedule(prev => {
        const newSchedule = { ...prev };
        const daySchedule = { ...(newSchedule[todayKey] || {}) };
        const activities = Array.isArray(daySchedule[slotName]) ? [...(daySchedule[slotName] as Activity[])] : [];
        const activityIndex = activities.findIndex(act => act.id === activityId);

        if (activityIndex > -1) {
            activities[activityIndex] = { 
                ...activities[activityIndex], 
                completed: isCompleted,
                completedAt: isCompleted ? Date.now() : undefined,
             };
            daySchedule[slotName] = activities;
            newSchedule[todayKey] = daySchedule;
        }
        
        return newSchedule;
    });
  }, [setSchedule]);

  const onOpenFocusModal = useCallback((activity: Activity) => {
    const estDurationStr = activityDurations[activity.id];
    let minutes = 0;
    if (estDurationStr) {
      const hMatch = estDurationStr.match(/(\d+)h/);
      const mMatch = estDurationStr.match(/(\d+)m/);
      const h = hMatch ? parseInt(hMatch[1]) * 60 : 0;
      const m = mMatch ? parseInt(mMatch[1]) : 0;
      minutes = h + m;
      if (minutes === 0 && /^\d+$/.test(estDurationStr.trim())) {
          minutes = parseInt(estDurationStr.trim());
      }
    }
    if (isNaN(minutes) || minutes <= 0) minutes = 45;
  
    setFocusDuration(minutes);
    setFocusActivity(activity);
    setFocusSessionModalOpen(true);
    return true;
  }, [activityDurations]);
  
  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition): number => {
    const leafNodes = getDescendantLeafNodes(definition.id, 'deepwork');
    if (leafNodes.length > 0) {
        return leafNodes.reduce((total, node) => total + (node.loggedDuration || 0), 0);
    }
    return definition.loggedDuration || 0;
  }, [getDescendantLeafNodes]);

  const getUpskillLoggedMinutesRecursive = useCallback((definition: ExerciseDefinition): number => {
      const leafNodes = getDescendantLeafNodes(definition.id, 'upskill');
      if (leafNodes.length > 0) {
          return leafNodes.reduce((total, node) => total + (node.loggedDuration || 0), 0);
      }
      return definition.loggedDuration || 0;
  }, [getDescendantLeafNodes]);

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
        topPriorities,
        brainHacks,
        settings,
        spacedRepetitionData,
        dailyReviewLogs,
        abandonmentLogs,
      },
      ui: {
        pinnedFolderIds: Array.from(pinnedFolderIds), activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder,
        selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, selectedFormalizationSpecId, expandedItems,
        selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId,
        activeFocusSession, isAgendaDocked,
        recentItems,
        pipState,
      }
    };
  }, [
    weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, schedule, dailyPurposes, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals, deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, mindProgrammingDefinitions, allMindProgrammingLogs, resources, resourceFolders, canvasLayout, mindsetCards, pistons, skillDomains, coreSkills, projects, companies, positions, purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans, autoSuggestions, pathNodes, mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation, missedSlotReviews, topPriorities, brainHacks, settings, pinnedFolderIds, activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder, selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, selectedFormalizationSpecId, expandedItems, selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId, activeFocusSession, isAgendaDocked, recentItems, pipState, spacedRepetitionData, dailyReviewLogs, abandonmentLogs
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
        setLocalChangeCount(prev => prev + 1);
    }
  }, [isLoadingState, schedule, settings, dailyPurposes, topPriorities, brainHacks, activeFocusSession]);
  
  useEffect(() => {
    if (!isLoadingState && localChangeCount > 0) {
      const handler = setTimeout(() => {
        saveState();
        if (settings.autoPush && currentUser && localChangeCount >= settings.autoPushLimit) {
            pushDataToCloud();
        }
      }, 1000);

      return () => clearTimeout(handler);
    }
  }, [localChangeCount, isLoadingState, saveState, settings.autoPush, settings.autoPushLimit, currentUser]);

  useEffect(() => {
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
        if (localChangeCount > 0) {
            saveState();
        }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
        window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [saveState, localChangeCount]);


  const loadImportedData = useCallback((mainData: any, uiData: any) => {
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
    setBrandingLogs(mainData.brandingLogs || []);
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
    setTopPriorities(mainData.topPriorities || []);
    setBrainHacks(mainData.brainHacks || []);
    setSpacedRepetitionData(mainData.spacedRepetitionData || {});
    setDailyReviewLogs(mainData.dailyReviewLogs || []);
    setAbandonmentLogs(mainData.abandonmentLogs || {});
    
    // UI State
    setPinnedFolderIds(new Set(uiData.pinnedFolderIds || []));
    setActiveResourceTabIds(uiData.activeResourceTabIds || []);
    setSelectedResourceFolderId(uiData.selectedResourceFolderId || null);
    setLastSelectedHabitFolder(uiData.lastSelectedHabitFolder || null);
    setSelectedUpskillTask(uiData.selectedUpskillTask || null);
    setSelectedDeepWorkTask(uiData.selectedDeepWorkTask || null);
    setSelectedMicroSkill(uiData.selectedMicroSkill || null);
    setSelectedFormalizationSpecId(uiData.selectedFormalizationSpecId || null);
    setExpandedItems(uiData.expandedItems || []);
    setSelectedDomainId(uiData.selectedDomainId || null);
    setSelectedSkillId(uiData.selectedSkillId || null);
    setSelectedProjectId(uiData.selectedProjectId || null);
    setSelectedCompanyId(uiData.selectedCompanyId || null);
    setRecentItems(uiData.recentItems || []);
    setIsAgendaDocked(uiData.isAgendaDocked === undefined ? true : uiData.isAgendaDocked);
    setPipState(uiData.pipState || { isOpen: false, position: { x: 0, y: 0 }, size: { width: 448, height: 252 } });
    
    if (uiData.activeFocusSession) {
        const restoredSession: ActiveFocusSession = uiData.activeFocusSession;
        if (restoredSession.state === 'running' && restoredSession.startTime) {
            const timeElapsedSinceSave = (Date.now() - restoredSession.startTime) / 1000;
            const newSecondsLeft = Math.max(0, restoredSession.totalSeconds - timeElapsedSinceSave);
            restoredSession.secondsLeft = newSecondsLeft;
        }
        setActiveFocusSession(restoredSession);
    } else {
        setActiveFocusSession(null);
    }
    
    const defaultSettings: UserSettings = { 
        carryForward: true, autoPush: false, autoPushLimit: 100, 
        carryForwardEssentials: true, carryForwardNutrition: false,
        smartLogging: false, defaultHabitLinks: {}, routines: [],
        workoutScheduling: 'day-of-week',
        slotRules: {},
        widgetVisibility: { agenda: true, smartLogging: true, pistons: true, mindset: true, activityDistribution: true, favorites: true, topPriorities: true, goals: true, brainHacks: true, ruleEquations: true, visualizationTechniques: true, spacedRepetition: true },
        allWidgetsVisible: true,
        agendaShowCurrentSlotOnly: false,
        spacedRepetitionSlot: 'Late Night',
    };
    setSettings({ ...defaultSettings, ...(mainData.settings || {}) });


    setTimeout(() => setIsLoadingState(false), 100);
  }, []);
  
  const loadState = useCallback((username: string) => {
    const mainDataString = localStorage.getItem(`lifeos_data_${username}`);
    const uiDataString = localStorage.getItem(`lifeos_ui_state_${username}`);
    
    if (mainDataString) {
      try {
        const mainData = JSON.parse(mainDataString);
        const uiData = uiDataString ? JSON.parse(uiDataString) : {};
        loadImportedData(mainData, uiData);
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ title: "Load Error", description: "Could not load your saved data.", variant: "destructive" });
      }
    } else {
      setIsLoadingState(false);
    }
  }, [loadImportedData, toast]);

  const populatedSchedule = useMemo(() => {
    const newSchedule = JSON.parse(JSON.stringify(schedule));
  
    if (!settings.routines || settings.routines.length === 0) {
      return schedule;
    }
  
    const today = startOfDay(new Date());
    const scheduleDates = Object.keys(newSchedule).map(parseISO).filter(isValid);
    
    const earliestDateInSchedule = scheduleDates.length > 0 ? min(scheduleDates) : today;
    const latestDateInSchedule = scheduleDates.length > 0 ? max(scheduleDates) : today;
    
    const startDate = min([today, earliestDateInSchedule]);
    const endDate = addDays(max([today, latestDateInSchedule]), 30);
  
    const dateRange = eachDayOfInterval({ start: startDate, end: endDate });
  
    dateRange.forEach(date => {
      const dateKey = format(date, 'yyyy-MM-dd');
      const dayOfWeek = getDay(date);
      const daySchedule = newSchedule[dateKey] || {};
      const activitiesInDay = new Set(
        Object.values(daySchedule)
              .flat()
              .map((act: Activity) => `${act.details}_${act.type}_${act.slot}`)
      );
  
      settings.routines.forEach((routine: Activity) => {
          let shouldAdd = false;
          if (routine.routine?.type === 'daily') {
              shouldAdd = true;
          } else if (routine.routine?.type === 'weekly') {
              const routineCreationDate = routine.createdAt ? parseISO(routine.createdAt) : null;
              if (routineCreationDate && isValid(routineCreationDate)) {
                  if (getDay(routineCreationDate) === dayOfWeek) {
                      shouldAdd = true;
                  }
              } else {
                  shouldAdd = true; 
              }
          }

          if (shouldAdd) {
              const routineKey = `${routine.details}_${routine.type}_${routine.slot}`;
              if (!activitiesInDay.has(routineKey)) {
                  const slot = routine.slot as keyof DailySchedule;
                  if (!daySchedule[slot]) daySchedule[slot] = [];
                  (daySchedule[slot] as Activity[]).push({
                      ...routine,
                      id: `${routine.type}-${dateKey}-${Math.random()}`,
                      completed: false,
                      completedAt: undefined,
                      focusSessionInitialStartTime: undefined,
                      focusSessionStartTime: undefined,
                      focusSessionEndTime: undefined,
                      focusSessionPauses: [],
                  });
              }
          }
      });
      newSchedule[dateKey] = daySchedule;
    });
  
    return newSchedule;
  }, [schedule, settings.routines]);
  
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
        const allUserData = getAllUserData().main;
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
    const username = currentUser?.username;
    if (!username) {
        toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
        return;
    }

    if (username === 'demo') {
        setIsDemoTokenModalOpen(true);
        return;
    }

    toast({ title: "Syncing...", description: "Pushing your data to the cloud." });

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
        setLocalChangeCount(0);

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
    const effectiveUsername = usernameOverride || currentUser?.username;
    if (!effectiveUsername) {
      toast({ title: "Error", description: "You must be logged in to sync.", variant: "destructive" });
      return;
    }
  
    const isDemo = effectiveUsername === 'demo';
  
    if (!isDemo) {
      toast({ title: "Syncing...", description: "Fetching your latest data from the cloud." });
    }
  
    try {
      const response = await fetch(`/api/blob-sync?username=${effectiveUsername.toLowerCase()}`);
      
      if (!response.ok) {
        const errorResult = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
        throw new Error(errorResult.error || 'Failed to fetch data.');
      }
      
      const textData = await response.text();
      
      // If the local data is empty, we should load whatever is in the cloud.
      const localDataIsEmpty = coreSkills.length === 0 && projects.length === 0;

      if (!textData && !localDataIsEmpty) {
        toast({ title: "Empty Remote File", description: "The backup file on GitHub is empty. Your local data has not been overwritten.", variant: "default" });
        return;
      }
  
      if (textData) {
        const result = JSON.parse(textData);
        const data = result.data;
    
        if (data && data.main) {
          loadImportedData(data.main, data.ui || {});
          toast({ title: "Sync Successful", description: "Data pulled from cloud and loaded." });
        } else if (!localDataIsEmpty) {
          toast({ title: "No Data Found", description: result.message || "No data was found in the cloud for this user." });
        }
      } else if (localDataIsEmpty) {
         toast({ title: "No Data Found", description: "No local or remote data. Start by creating some items!" });
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
            const importedData = JSON.parse(text);
            
            const mainData = importedData.main || importedData;
            const uiData = importedData.ui || {};
            
            loadImportedData(mainData, uiData);
            
            toast({ title: "Import Successful!", description: "Your data has been loaded." });
  
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

  const scheduleTaskFromMindMap = (definitionId: string, activityType: ActivityType, slotName: string, duration = 0) => {
    let definition: ExerciseDefinition | undefined;
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    const sourceDefs = activityType === 'upskill' ? upskillDefinitions : deepWorkDefinitions;
    definition = sourceDefs.find(d => d.id === definitionId);

    if (!definition) {
        toast({ title: "Error", description: "Task definition not found.", variant: "destructive" });
        return;
    }

    const logSource = activityType === 'upskill' ? allUpskillLogs :
                      activityType === 'deepwork' ? allDeepWorkLogs :
                      brandingLogs;
    const logsUpdater = activityType === 'upskill' ? setAllUpskillLogs :
                        activityType === 'deepwork' ? setAllDeepWorkLogs :
                        setBrandingLogs;

    const logForDay = logSource.find(log => log.date === todayKey);
    const existingExercises = logForDay ? [...logForDay.exercises] : [];
    let exerciseInstance = existingExercises.find(ex => ex.definitionId === definitionId);

    if (!exerciseInstance) {
        exerciseInstance = {
            id: `${definition.id}-${Date.now()}-${Math.random()}`,
            definitionId: definition.id, name: definition.name, category: definition.category,
            loggedSets: [],
            targetSets: activityType === 'branding' ? 4 : 1,
            targetReps: activityType === 'branding' ? '4 stages' : '25',
            focusAreaIds: definition.focusAreaIds,
        };
        existingExercises.push(exerciseInstance);

        if (logForDay) {
            logsUpdater(prev => prev.map(log => log.date === todayKey ? { ...log, exercises: existingExercises } : log));
        } else {
            logsUpdater(prev => [...prev, { id: todayKey, date: todayKey, exercises: existingExercises }]);
        }
    }

    const newActivity: Activity = {
        id: `${activityType}-${Date.now()}-${Math.random()}`,
        type: activityType,
        details: definition.name,
        completed: false,
        taskIds: [exerciseInstance.id],
        slot: slotName,
        linkedEntityType: activityType === 'deepwork' ? 'intention' : 'curiosity',
        duration,
    };
    
    setSchedule(prev => {
        const newDaySchedule = { ...(prev[todayKey] || {}) };
        const activitiesInSlot = Array.isArray(newDaySchedule[slotName]) ? newDaySchedule[slotName] as Activity[] : [];
        newDaySchedule[slotName] = [...activitiesInSlot, newActivity as Activity];
        return { ...prev, [todayKey]: newDaySchedule };
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
  
    if (!workoutLog) {
      const { exercises } = getExercisesForDay(date, workoutMode, workoutPlans, exerciseDefinitions, workoutPlanRotation, settings.workoutScheduling, allWorkoutLogs);
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
      'day-of-week',
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
            if (res.id === updatedResource.id) {
                res = updatedResource;
            }
    
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
  
  const closeAllResourcePopups = useCallback(() => {
    setOpenPopups(new Map());
  }, []);
  
  const closeGeneralPopup = useCallback((resourceId: string) => {
    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        newPopups.delete(resourceId);
        return newPopups;
    });
  }, []);
  
  const openGeneralPopup = useCallback((resourceId: string, event: React.MouseEvent | null, parentPopupState?: PopupState, parentRect?: DOMRect) => {
    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return newPopups;
        
        const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
        const popupWidth = hasMarkdown ? 1280 : 768;
        
        let x, y, level, parentId, z;

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
            z = (parentPopupState.z || 80) + 1;
        } else if (event) { // Check if event is not null
            level = 0;
            parentId = undefined;
            const screenWidth = window.innerWidth;
            const screenHeight = window.innerHeight;
            x = event.clientX;
            y = event.clientY;
            z = 80;
        } else { // Fallback if no event (e.g., from search)
            level = 0;
            parentId = undefined;
            x = (window.innerWidth - popupWidth) / 2;
            y = (window.innerHeight - 600) / 2; // Assume a default height
            z = 80;
        }
        
        newPopups.set(resourceId, { 
            resourceId, level, x, y, parentId, width: popupWidth, z
        });
        return newPopups;
    });
  }, [resources]);

  const handleOpenNestedPopup = useCallback((resourceId: string, event: React.MouseEvent, parentPopupState?: PopupState) => {
    const parentRect = (event.currentTarget as HTMLElement).closest('[data-popup-id]')?.getBoundingClientRect();
    openGeneralPopup(resourceId, event, parentPopupState, parentRect);
  }, [openGeneralPopup]);

  const ResourcePopup: React.FC<ResourcePopupProps> = useCallback(({ popupState }) => {
    const resource = resources.find(r => r.id === popupState.resourceId);
    if (!resource) return null;
    return (
      <GeneralResourcePopup 
        popupState={popupState} 
        onClose={closeGeneralPopup}
        onUpdate={handleUpdateResource}
        onOpenNestedPopup={handleOpenNestedPopup}
      />
    )
  }, [resources, closeGeneralPopup, handleUpdateResource, handleOpenNestedPopup]);
  
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
                const newMicroSkill = { id: `ms_${Date.now()}`, name: name.trim(), isReadyForRepetition: false };
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
    let oldName = '';
    const updatedCoreSkills = coreSkills.map(s => {
        if (s.id === coreSkillId) {
            const updatedSkillAreas = s.skillAreas.map(area => {
                if (area.id === areaId) {
                    const microSkill = area.microSkills.find(ms => ms.id === microSkillId);
                    if (microSkill) {
                        oldName = microSkill.name;
                    }
                    return {
                        ...area,
                        microSkills: area.microSkills.map(ms =>
                            ms.id === microSkillId ? { ...ms, name } : ms
                        )
                    };
                }
                return area;
            });
            return { ...s, skillAreas: updatedSkillAreas };
        }
        return s;
    });

    setCoreSkills(updatedCoreSkills);

    if (oldName && oldName !== name) {
        const updateCategory = (defs: ExerciseDefinition[]) => 
            defs.map(def => def.category === oldName ? { ...def, category: name as ExerciseCategory } : def);
            
        setUpskillDefinitions(prev => updateCategory(prev));
        setDeepWorkDefinitions(prev => updateCategory(prev));
    }
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

const handleToggleMicroSkillRepetition = useCallback((coreSkillId: string, areaId: string, microSkillId: string, isReady: boolean) => {
  let updatedMicroSkill: MicroSkill | undefined;

  setCoreSkills(prevSkills => {
    const newSkills = prevSkills.map(skill => {
      if (skill.id === coreSkillId) {
        return {
          ...skill,
          skillAreas: skill.skillAreas.map(area => {
            if (area.id === areaId) {
              const newMicroSkills = area.microSkills.map(ms => {
                if (ms.id === microSkillId) {
                  updatedMicroSkill = { ...ms, isReadyForRepetition: isReady };
                  return updatedMicroSkill;
                }
                return ms;
              });
              return { ...area, microSkills: newMicroSkills };
            }
            return area;
          }),
        };
      }
      return skill;
    });
    return newSkills;
  });

  if (isReady && updatedMicroSkill) {
    const intentions = deepWorkDefinitions.filter(def => def.category === updatedMicroSkill!.name);
    const curiosities = upskillDefinitions.filter(def => def.category === updatedMicroSkill!.name);

    const allLeafNodes = [
      ...intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork')),
      ...curiosities.flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'))
    ];
    
    // setPermanentlyLoggedTaskIds is not defined in useAuth, so commenting out
    // setPermanentlyLoggedTaskIds(prev => {
    //     const newSet = new Set(prev);
    //     allLeafNodes.forEach(node => newSet.add(node.id));
    //     return newSet;
    // });
    
    toast({
        title: "Micro-skill Completed!",
        description: `All child tasks for "${updatedMicroSkill.name}" have been marked as complete.`,
    });
  }

}, [setCoreSkills, toast, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes]);
  
  const handleExpansionChange = useCallback((value: string[]) => {
    setExpandedItems(value);
  }, [setExpandedItems]);
  
  const openIntentionPopup = (intentionId: string) => {
    setIntentionPopups(prev => {
        const newPopups = new Map(prev);
        const popupsPerRow = 3;
        const xOffset = (newPopups.size % popupsPerRow) * 400 + 100;
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

  const openPillarPopup = (pillarName: string, event?: React.MouseEvent) => {
    let x = 50, y = 50; // Default position
    if (event) {
        x = event.clientX;
        y = event.clientY;
    }
    setPillarPopupState({
        pillarName,
        x,
        y,
        level: 0,
        z: 90
    });
};

  const closePillarPopup = () => {
    setPillarPopupState(null);
  };

  const handlePillarPopupDragEnd = (event: DragEndEvent) => {
      const { active, delta } = event;
      if (pillarPopupState && active.id === `pillar-popup-${pillarPopupState.pillarName}`) {
          setPillarPopupState(prev => prev ? { ...prev, x: prev.x + delta.x, y: prev.y + delta.y } : null);
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
        const CONTEXT_POPUP_HEIGHT = 400;
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
  
  const openContentViewPopup = useCallback((contentId: string, resource: Resource, point: ResourcePoint, event?: React.MouseEvent) => {
    setContentViewPopups(prev => {
        const newPopups = new Map(prev);
        const popupWidth = 896;
        
        let x = event ? event.clientX : (window.innerWidth - popupWidth) / 2;
        let y = event ? event.clientY : 100;

        if (x + popupWidth > window.innerWidth) {
            x = window.innerWidth - popupWidth - 20;
        }
        if (x < 20) {
            x = 20;
        }
        
        newPopups.set(contentId, {
            id: contentId,
            resource,
            point,
            x, y,
        });
        return newPopups;
    });
  }, []);
  
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
                taskIds: [sourceMeal]
              };
            }
            return act;
          });
          newSchedule[todayKey] = { ...daySchedule, [targetSlot]: activities };
      }
      
      if(updated) {
        toast({ title: "Meal Swapped!", description: `Updated your agenda with Meal from ${sourceDay}.` });
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
  
  const handleCreateBrainHack = (linkedTaskId: string, taskType: 'deepwork' | 'upskill' | 'resource', resourceId?: string) => {
    const newHack: BrainHack = {
      id: `hack_${Date.now()}`,
      text: "New Brain Hack",
      parentId: null,
      type: 'hack',
      linkedUpskillIds: taskType === 'upskill' ? [linkedTaskId] : [],
      linkedDeepWorkIds: taskType === 'deepwork' ? [linkedTaskId] : [],
    };

    setBrainHacks(prev => [...prev, newHack]);

    if (taskType === 'resource' && resourceId) {
      setResources(prev => prev.map(r => {
          if (r.id === resourceId) {
            const newPoint: ResourcePoint = {
              id: `point_${Date.now()}`,
              type: 'link',
              text: `brainhack://${newHack.id}`,
              displayText: newHack.text
            };
            return {
              ...r,
              points: [...(r.points || []), newPoint]
            };
          }
          return r;
      }));
    }
    
    toast({ title: 'New Brain Hack Created', description: 'A new hack was created and linked to the source.' });
  };
  
  const deleteResource = (resourceId: string) => {
    setResources(prev => prev.filter(r => r.id !== resourceId));
  
    const unlinkFromDefs = (definitions: ExerciseDefinition[]) => 
        definitions.map(def => ({
            ...def,
            linkedResourceIds: (def.linkedResourceIds || []).filter(id => id !== resourceId)
        }));
    
    setDeepWorkDefinitions(unlinkFromDefs);
    setUpskillDefinitions(unlinkFromDefs);
    
    deleteAudio(resourceId).catch(err => console.error("Failed to delete audio from DB:", err));
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
  
  const createResourceWithHierarchy = useCallback((parent: ExerciseDefinition | Resource, pointToConvert?: ResourcePoint, type: Resource['type'] = 'card', prebuiltResource?: Resource): ExerciseDefinition | Resource | undefined => {
    let newResource = prebuiltResource;
  
    if (!newResource) {
      let path: string[] = ["Skills & Project Resources"];
      let folderName: string | null = null;
  
      if ('category' in parent) {
        const microSkillName = parent.category;
        const microSkillInfo = Array.from(microSkillMap.values()).find(ms => ms.microSkillName === microSkillName);
        if (microSkillInfo) {
          const coreSkill = coreSkills.find(cs => cs.name === microSkillInfo.coreSkillName);
          if (coreSkill) {
            const domain = skillDomains.find(d => d.id === coreSkill.domainId);
            if (domain) path.push(domain.name);
            path.push(coreSkill.name);
            path.push(microSkillInfo.skillAreaName);
            path.push(microSkillName);
          }
        }
      } else {
        const parentFolder = resourceFolders.find(f => f.id === parent.folderId);
        if (parentFolder) {
            // Reconstruct path from parent folder
            let currentFolder: ResourceFolder | undefined = parentFolder;
            const tempPath: string[] = [];
            while(currentFolder) {
                tempPath.unshift(currentFolder.name);
                currentFolder = resourceFolders.find(f => f.id === currentFolder!.parentId);
            }
            path = tempPath;
        }
      }
      path.push(parent.name);
  
      let currentParentId: string | null = null;
      let updatedFolders = [...resourceFolders];
  
      for (const folderNamePart of path) {
        let folder = updatedFolders.find(f => f.name === folderNamePart && f.parentId === currentParentId);
        if (!folder) {
          folder = { id: `folder_${Date.now()}_${Math.random()}`, name: folderNamePart, parentId: currentParentId, icon: 'Folder' };
          updatedFolders.push(folder);
        }
        currentParentId = folder.id;
      }
      setResourceFolders(updatedFolders);
      
      newResource = {
        id: `res_${Date.now()}`,
        name: pointToConvert ? pointToConvert.text : 'New Card',
        folderId: currentParentId!,
        type: type,
        points: [],
        icon: 'Library',
        createdAt: new Date().toISOString(),
      };
    }
  
    setResources(prev => [...prev, newResource!]);
  
    let updatedParent;
    if (pointToConvert) {
      updatedParent = {
        ...parent,
        points: (parent.points || []).map(p => 
          p.id === pointToConvert.id 
            ? { ...p, type: 'card', text: newResource!.name, resourceId: newResource!.id } 
            : p
        ),
      };
    } else {
       updatedParent = {
          ...parent,
          linkedResourceIds: [...(parent.linkedResourceIds || []), newResource!.id]
      };
    }
  
    if ('category' in parent) {
      const isUpskill = upskillDefinitions.some(d => d.id === parent.id);
      const isMindProgramming = mindProgrammingDefinitions.some(d => d.id === parent.id);

      if (isUpskill) {
        setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent as ExerciseDefinition : def));
      } else if (isMindProgramming) {
        setMindProgrammingDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent as ExerciseDefinition : def));
      } else {
        setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent as ExerciseDefinition : def));
      }
    } else {
      setResources(prev => prev.map(res => res.id === parent.id ? updatedParent as Resource : res));
    }
  
    return updatedParent;
  }, [resourceFolders, setResourceFolders, setResources, setDeepWorkDefinitions, setUpskillDefinitions, coreSkills, skillDomains, microSkillMap, mindProgrammingDefinitions, setMindProgrammingDefinitions]);
  
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
      applicationProjectIds: [],
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
        if (productizationPlans && productizationPlans[project.name]) {
            activeIds.add(project.id);
            return;
        }

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
                const activities = newSchedule[dateKey][slotName as SlotName] as Activity[] | undefined;
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
                  const activities = newSchedule[dateKey][slotName as SlotName] as Activity[] | undefined;
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
    const dateKey = format(date, 'yyyy-MM-dd');
    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      if (!newSchedule[dateKey]) return prevSchedule;
  
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
      return newSchedule;
    });
  };
  
  const toggleRoutine = (activity: Activity, rule: RecurrenceRule | null) => {
    setSettings(prev => {
      const newRoutines = (prev.routines || []).filter(r => 
          !(r.details === activity.details && r.type === activity.type && r.slot === activity.slot)
      );
      if (rule) {
          newRoutines.push({
              ...activity,
              id: `routine_${activity.type}_${activity.details.replace(/\s/g, '')}`,
              completed: false,
              routine: rule,
              isRoutine: true,
              createdAt: new Date().toISOString()
          });
      }
      return {...prev, routines: newRoutines};
    });
  };
  
  const openLinkedResistancePopup = (techniqueId: string, event: React.MouseEvent) => {
    const popupWidth = 384;
    const popupHeight = 400;
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
  
  const handleStartFocusSession = (activity: Activity, duration: number) => {
    setIsAudioPlaying(true);
    const now = Date.now();
    setActiveFocusSession({
        activity,
        duration,
        secondsLeft: duration * 60,
        totalSeconds: duration * 60,
        startTime: now,
        subTaskStartTime: now,
        state: 'running',
    });
  };

  const updateTaskDuration = (taskId: string, duration: number) => {
      let found = false;
      const newUpskillDefs = upskillDefinitions.map(def => {
          if (def.id === taskId) {
              found = true;
              return { ...def, estimatedDuration: duration };
          }
          return def;
      });
      if(found) {
        setUpskillDefinitions(newUpskillDefs);
        return;
      }
      
      const newDeepWorkDefs = deepWorkDefinitions.map(def => {
          if (def.id === taskId) {
              return { ...def, estimatedDuration: duration };
          }
          return def;
      });
      setDeepWorkDefinitions(newDeepWorkDefs);
  };
  
  const openStopperProgressPopup = (stopper: Stopper, habitName: string) => {
      setStopperProgressPopup({ isOpen: true, stopper, habitName });
  };
  
  const openBrainHackPopup = useCallback((hackId: string, event: React.MouseEvent) => {
    setOpenBrainHackPopups(prev => {
        const newPopups = {...prev};
        if (newPopups[hackId]) {
            delete newPopups[hackId];
            return newPopups;
        }
        const targetElement = event.currentTarget as HTMLElement;
        const parentRect = targetElement ? targetElement.closest('.group')?.getBoundingClientRect() : null;

        const initialX = parentRect ? parentRect.right + 20 : event.clientX + 20;
        const initialY = parentRect ? parentRect.top : event.clientY;
        return { ...prev, [hackId]: { x: initialX, y: initialY } };
    });
  }, []);
  
  const recalculateAndFixTaskTypes = () => {
    setDeepWorkDefinitions(prev => [...prev]);
    setUpskillDefinitions(prev => [...prev]);
    toast({ title: "Success", description: "Task classifications have been recalculated." });
  };
  
  const openMindsetWidget = () => {
    setIsMindsetModalOpen(true);
  };

  const findRootTask = useCallback((activity: Activity): ExerciseDefinition | null => {
    const allDefs = new Map([...deepWorkDefinitions, ...upskillDefinitions].map(d => [d.id, d]));
    
    // First, find the definitionId of the current task instance
    let currentDefId: string | undefined;
    
    const taskInstanceId = activity.taskIds?.[0];
    if (taskInstanceId) {
        const allLogs = [...allUpskillLogs, ...allDeepWorkLogs, ...brandingLogs];
        const taskInstance = allLogs.flatMap(l => l.exercises).find(ex => ex.id === taskInstanceId);
        if (taskInstance) {
            currentDefId = taskInstance.definitionId;
        }
    }
  
    if (!currentDefId) return null;
  
    let currentId: string | undefined = currentDefId;
    let rootTask: ExerciseDefinition | undefined = allDefs.get(currentId);
  
    while (currentId) {
      const parentId = Array.from(allDefs.values()).find(parent => 
        (parent.linkedDeepWorkIds?.includes(currentId!)) ||
        (parent.linkedUpskillIds?.includes(currentId!))
      )?.id;
  
      if (parentId) {
        currentId = parentId;
        rootTask = allDefs.get(currentId);
      } else {
        currentId = undefined;
      }
    }
    return rootTask || null;
  }, [deepWorkDefinitions, upskillDefinitions, allUpskillLogs, allDeepWorkLogs, brandingLogs]);

  const handleToggleDailyGoalCompletion = (resourceId: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    setDailyReviewLogs(prev => {
        const todayLogIndex = prev.findIndex(log => log.date === todayKey);
        
        if (todayLogIndex > -1) {
            const newLogs = [...prev];
            const todayLog = { ...newLogs[todayLogIndex] };
            const isCompleted = todayLog.completedResourceIds.includes(resourceId);

            if (isCompleted) {
                todayLog.completedResourceIds = todayLog.completedResourceIds.filter(id => id !== resourceId);
            } else {
                todayLog.completedResourceIds = [...todayLog.completedResourceIds, resourceId];
            }
            newLogs[todayLogIndex] = todayLog;
            return newLogs;
        } else {
            return [...prev, { date: todayKey, completedResourceIds: [resourceId] }];
        }
    });
  };

  const clearAllLocalFiles = async () => {
    try {
        await clearAllData();
        
        // Reset the state of resources
        setResources(prev => prev.map(r => ({
            ...r,
            hasLocalAudio: false,
            audioFileName: undefined,
            hasLocalPdf: false,
            pdfFileName: undefined,
        })));

        toast({ title: 'Success', description: 'All local file data (audio, PDFs) has been cleared from your browser and app state.' });
    } catch (error) {
        console.error('Failed to clear IndexedDB:', error);
        toast({ title: 'Error', description: 'Could not clear local file storage. See console for details.', variant: 'destructive' });
    }
  };

  const globalElements = useMemo(() => {
    if (!resources) return [];
    return resources
      .flatMap(r => r.formalization?.elements || [])
      .filter(el => el.isGlobal);
  }, [resources]);

  const allComponentsForSpec = useMemo(() => {
    if (!selectedFormalizationSpecId) return [];
    const spec = coreSkills.find(s => s.id === selectedFormalizationSpecId);
    if (!spec) return [];
    
    const microSkillNames = new Set(spec.skillAreas.flatMap(sa => sa.microSkills.map(ms => ms.name)));

    return resources
      .filter(r => {
        const def = [...deepWorkDefinitions, ...upskillDefinitions].find(d => d.linkedResourceIds?.includes(r.id));
        return def && microSkillNames.has(def.category);
      })
      .flatMap(r => r.formalization?.components || []);
  }, [selectedFormalizationSpecId, coreSkills, resources, deepWorkDefinitions, upskillDefinitions]);
  
  const addGlobalElement = useCallback((text: string, x: number, y: number): FormalizationItem | undefined => {
    const newElement: FormalizationItem = {
      id: id('el'),
      text: text,
      isGlobal: true,
      properties: {},
    };
  
    setCanvasLayout(prev => {
        const newNode: CanvasNode = { id: newElement.id, x: x, y: y, width: 300, height: 150 };
        return {
            ...prev,
            nodes: [...prev.nodes, newNode]
        };
    });
  
    return newElement;
  }, [setCanvasLayout]);

  const updateGlobalElement = (elementId: string, updates: Partial<FormalizationItem>) => {
    // This function will need to find the element across all resources and update it.
    // For simplicity, we'll assume a separate state for global elements if they are truly global.
    // In this implementation, we will just toast a message.
    toast({ title: "UpdateGlobalElement", description: "This functionality needs a more robust implementation." });
  };
  
  const deleteGlobalElement = (elementId: string) => {
     setCanvasLayout(prev => ({
        ...prev,
        nodes: prev.nodes.filter(n => n.id !== elementId),
        edges: prev.edges.filter(e => e.source !== elementId && e.target !== elementId),
    }));
  };
  
  const handleAddNewResourceCard = (folderId: string | null, position: { x: number, y: number }): Resource | undefined => {
      // This is a simplified version. A real implementation might need more details.
      if (!folderId) {
          toast({ title: "Error", description: "A folder must be selected to add a resource.", variant: "destructive" });
          return undefined;
      }
      const newCard: Resource = {
          id: `res_card_${Date.now()}`,
          name: 'New Card',
          folderId: folderId,
          type: 'card',
          createdAt: new Date().toISOString(),
      };
      setResources(prev => [...prev, newCard]);
      return newCard;
  };

  const syncWithGitHub = async () => {
    const localDataIsLoaded = coreSkills.length > 0 || projects.length > 0;
    
    if (isLoadingState || (!localDataIsLoaded && localChangeCount === 0)) {
        toast({ title: "Please Wait", description: "Application data is still loading.", variant: "default" });
        return;
    }

    const token = settings.githubToken;
    const owner = settings.githubOwner;
    const repo = settings.githubRepo;
    const path = settings.githubPath;

    if (!token || !owner || !repo || !path) {
        toast({
            title: "GitHub Sync Not Configured",
            description: "Please configure your GitHub details in the settings.",
            variant: "destructive",
        });
        return;
    }

    try {
        toast({ title: "Syncing with GitHub..." });

        const remoteMetaResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            headers: { 'Authorization': `token ${token}` }
        });

        if (remoteMetaResponse.status === 404) {
            const allUserData = getAllUserData();
            const localDataString = JSON.stringify(allUserData, null, 2);
            await pushToGitHub(token, owner, repo, path, localDataString, "Initial backup");
            toast({ title: "Initial Push Successful", description: "Your data has been backed up to GitHub." });
            return;
        }

        if (remoteMetaResponse.ok) {
            const remoteMeta = await remoteMetaResponse.json();
            
            if (!localDataIsLoaded) {
                await pullFromGitHub(token, owner, repo, path, remoteMeta.sha);
            } else if (settings.lastSync && settings.lastSync.sha === remoteMeta.sha) {
                const localData = getAllUserData();
                const localDataString = JSON.stringify(localData, null, 2);
                await pushToGitHub(token, owner, repo, path, localDataString, "Update from LifeOS", remoteMeta.sha);
                toast({ title: "Push Successful", description: "Your local changes have been pushed to GitHub." });
            } else {
                await pullFromGitHub(token, owner, repo, path, remoteMeta.sha);
            }
        } else {
             throw new Error(`GitHub API error: ${remoteMetaResponse.statusText}`);
        }
    } catch (error) {
        console.error("GitHub Sync Error:", error);
        toast({
            title: "GitHub Sync Failed",
            description: error instanceof Error ? error.message : "An unknown error occurred.",
            variant: "destructive",
        });
    }
  };

  async function pushToGitHub(token: string, owner: string, repo: string, path: string, content: string, message: string, sha?: string) {
    if (!content || content === "{}") {
      toast({ title: "Sync Cancelled", description: "Cannot push empty data.", variant: "destructive" });
      return;
    }
    const pushResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            message,
            content: btoa(unescape(encodeURIComponent(content))),
            sha
        })
    });

    if (!pushResponse.ok) {
        const errorData = await pushResponse.json();
        throw new Error(errorData.message || 'Failed to push file to GitHub.');
    }
    
    const result = await pushResponse.json();
    setSettings(prev => ({...prev, lastSync: { sha: result.content.sha, timestamp: Date.now() }}));
    setLocalChangeCount(0);
  }

  async function pullFromGitHub(token: string, owner: string, repo: string, path: string, sha: string) {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
          headers: { 'Authorization': `token ${token}` }
      });
      if (!response.ok) {
          throw new Error('Could not pull data from GitHub.');
      }
      const data = await response.json();
      
      const content = atob(data.content);
      
      const localDataIsEmpty = coreSkills.length === 0 && projects.length === 0;

      if (!content && !localDataIsEmpty) {
        toast({ title: "Empty Remote File", description: "The backup file on GitHub is empty. Your local data has not been overwritten.", variant: "default" });
        return;
      }
  
      if (content) {
        const parsedData = JSON.parse(content);
        if (parsedData && parsedData.main) {
          loadImportedData(parsedData.main, parsedData.ui || {});
          setSettings(prev => ({...prev, lastSync: { sha: data.sha, timestamp: Date.now() }}));
          toast({ title: "Pull Successful", description: "Data has been imported from your GitHub backup." });
        } else {
          toast({ title: "Invalid Data", description: "The data from GitHub appears to be in an incorrect format.", variant: "destructive" });
        }
      } else if (localDataIsEmpty) {
         toast({ title: "No Data Found", description: "No local or remote data. Start by creating some items!" });
      }
  }

  useEffect(() => {
    const user = getCurrentLocalUser();
    if (user) {
      setCurrentUser(user);
      loadState(user.username);
    }
    setLoading(false);
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('lifeos_theme') || 'ad-dark' : 'ad-dark';
    setThemeState(savedTheme);

    const savedVolume = typeof window !== 'undefined' ? localStorage.getItem('lifeos_global_volume') : null;
    if (savedVolume !== null) {
        setGlobalVolumeState(parseFloat(savedVolume));
    }
  }, [loadState]);
  
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
    }, 60000);

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

  useEffect(() => {
    let timerId: NodeJS.Timeout | undefined;

    if (activeFocusSession?.state === 'running') {
      timerId = setInterval(() => {
        setActiveFocusSession(prev => {
          if (!prev || prev.state !== 'running') {
            clearInterval(timerId!);
            return prev;
          }
          if (prev.secondsLeft <= 1) {
            clearInterval(timerId!);
            return { ...prev, secondsLeft: 0, state: 'paused' };
          }
          return { ...prev, secondsLeft: prev.secondsLeft - 1 };
        });
      }, 1000);
    }

    return () => {
      if (timerId) {
        clearInterval(timerId);
      }
    };
  }, [activeFocusSession?.state, setActiveFocusSession]);

  useEffect(() => {
    if (isLoadingState || !currentUser) return;
  
    const allDates = Object.keys(schedule).map(parseISO).filter(isValid);
    if (allDates.length === 0) return;
  
    const latestDate = max(allDates);
    const today = startOfDay(new Date());
  
    const startOfThisWeek = startOfWeek(today, { weekStartsOn: 1 });
    const startOfLatestWeek = startOfWeek(latestDate, { weekStartsOn: 1 });
  
    if (isAfter(startOfThisWeek, startOfLatestWeek)) {
      const newSchedule = { ...schedule };
      let scheduleUpdated = false;
      const daysToCarryOver = eachDayOfInterval({ start: startOfThisWeek, end: addDays(startOfThisWeek, 6) });
  
      daysToCarryOver.forEach(day => {
        const dayKey = format(day, 'yyyy-MM-dd');
        const lastWeekDayKey = format(subDays(day, 7), 'yyyy-MM-dd');
        const lastWeekSchedule = schedule[lastWeekDayKey];
  
        if (lastWeekSchedule && !newSchedule[dayKey]) {
          const newDaySchedule: DailySchedule = {};
          Object.keys(lastWeekSchedule).forEach(key => {
            const slotName = key as SlotName;
            const activities = lastWeekSchedule[slotName] as Activity[] | undefined;
            if (Array.isArray(activities)) {
              newDaySchedule[slotName] = activities.map(act => ({
                ...act,
                id: `${act.type}-${dayKey}-${Math.random()}`,
                completed: false,
                completedAt: undefined,
                focusSessionInitialStartTime: undefined,
                focusSessionStartTime: undefined,
                focusSessionEndTime: undefined,
                focusSessionPauses: [],
              }));
            }
          });
          newSchedule[dayKey] = newDaySchedule;
          scheduleUpdated = true;
        }
      });
  
      if (scheduleUpdated) {
        setSchedule(newSchedule);
        toast({
          title: "New Week, New Plan!",
          description: "Your schedule from last week has been carried over.",
        });
      }
    }
  }, [isLoadingState, currentUser, schedule, setSchedule, toast]);
  
  useEffect(() => {
    if (playbackRequest) {
      openGeneralPopup(playbackRequest.resourceId, null); 
    }
  }, [playbackRequest, openGeneralPopup]);

  const value: AuthContextType = {
    currentUser, loading, register, signIn, signOut,
    pushDataToCloud, pullDataFromCloud, exportData, importData,
    localChangeCount,
    isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken,
    theme, setTheme,
    floatingVideoUrl, setFloatingVideoUrl,
    floatingVideoPlaylist, setFloatingVideoPlaylist,
    pipState, setPipState,
    isAudioPlaying, setIsAudioPlaying,
    globalVolume, setGlobalVolume,
    playbackRequest, setPlaybackRequest,
    pdfViewerState, setPdfViewerState, openPdfViewer, handlePdfViewerPopupDragEnd,
    drawingCanvasState, setDrawingCanvasState, openDrawingCanvas, handleDrawingCanvasPopupDragEnd,
    togglePinDrawing, updateDrawingData,
    clearAllLocalFiles,
    isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen,
    syncWithGitHub,
    settings, setSettings,
    weightLogs, setWeightLogs, goalWeight, setGoalWeight, height, setHeight, dateOfBirth, setDateOfBirth, gender, setGender, dietPlan, setDietPlan,
    schedule: populatedSchedule, setSchedule, dailyPurposes, setDailyPurposes, isAgendaDocked, setIsAgendaDocked, activityDurations,
    handleToggleComplete, handleLogLearning, logSubTaskTime, carryForwardTask, scheduleTaskFromMindMap, updateActivity,
    findRootTask,
    focusSessionModalOpen, setFocusSessionModalOpen, focusActivity, focusDuration, onOpenFocusModal, handleStartFocusSession,
    activeFocusSession, setActiveFocusSession,
    allUpskillLogs, setAllUpskillLogs, allDeepWorkLogs, setAllDeepWorkLogs, allWorkoutLogs, setAllWorkoutLogs, brandingLogs, setBrandingLogs, allLeadGenLogs, setAllLeadGenLogs,
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
    openPopups,
    closeAllResourcePopups,
    handlePopupDragEnd,
    ResourcePopup,
    intentionPopups, openIntentionPopup, closeIntentionPopup,
    generalPopups, openGeneralPopup, closeGeneralPopup,
    handleUpdateResource, handleOpenNestedPopup,
    ruleDetailPopup, openRuleDetailPopup, closeRuleDetailPopup, handleRulePopupDragEnd,
    pillarPopupState, openPillarPopup, closePillarPopup, handlePillarPopupDragEnd,
    habitDetailPopup, openHabitDetailPopup, closeHabitDetailPopup, handleHabitDetailPopupDragEnd,
    taskContextPopups, openTaskContextPopup, closeTaskContextPopup, handleTaskContextPopupDragEnd,
    contentViewPopups, openContentViewPopup, closeContentViewPopup, handleContentViewPopupDragEnd,
    todaysDietPopup, openTodaysDietPopup, closeTodaysDietPopup, handleTodaysDietPopupDragEnd, swapMealInSchedule,
    logWorkoutSet, updateWorkoutSet, deleteWorkoutSet, removeExerciseFromWorkout,
    swapWorkoutExercise,
    swapWorkoutForDay,
    canvasLayout, setCanvasLayout, globalElements, allComponentsForSpec,
    addGlobalElement, updateGlobalElement, deleteGlobalElement, handleAddNewResourceCard,
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
    handleToggleMicroSkillRepetition,
    companies, setCompanies,
    positions, setPositions,
    purposeData, setPurposeData,
    patterns, setPatterns,
    metaRules, setMetaRules,
    pillarEquations, setPillarEquations,
    skillAcquisitionPlans, setSkillAcquisitionPlans,
    abandonmentLogs, setAbandonmentLogs,
    addPillarCard, updatePillarCard, deletePillarCard,
    specializations, allEquations,
    pathNodes, setPathNodes,
    selectedUpskillTask, setSelectedUpskillTask,
    selectedDeepWorkTask, setSelectedDeepWorkTask,
    selectedMicroSkill, setSelectedMicroSkill,
    selectedFormalizationSpecId, setSelectedFormalizationSpecId,
    microSkillMap,
    permanentlyLoggedTaskIds,
    getDescendantLeafNodes,
    calculateTotalEstimate,
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
    toggleRoutine,
    missedSlotReviews, setMissedSlotReviews,
    linkedResistancePopup, setLinkedResistancePopup, openLinkedResistancePopup,
    stopperProgressPopup, openStopperProgressPopup, setStopperProgressPopup,
    topPriorities, setTopPriorities,
    brainHacks, setBrainHacks,
    getDeepWorkLoggedMinutes,
    getUpskillLoggedMinutesRecursive,
    spacedRepetitionData, setSpacedRepetitionData,
    dailyReviewLogs, setDailyReviewLogs,
    handleCreateBrainHack,
    handleToggleDailyGoalCompletion,
    openBrainHackPopups, setOpenBrainHackPopups, openBrainHackPopup,
    recalculateAndFixTaskTypes,
    openMindsetWidget,
    isMindsetModalOpen, setIsMindsetModalOpen,
    toggleProjectBrandingStatus,
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

const MEAL_NAMES: Record<'meal1' | 'meal2' | 'meal3' | 'supplements', string> = {
  meal1: "Meal 1",
  meal2: "Meal 2",
  meal3: "Meal 3",
  supplements: "Supplements",
};






    



