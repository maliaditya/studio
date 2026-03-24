

"use client";

import React, { createContext, useContext, useState, useEffect, type ReactNode, useRef, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import type { LocalUser, WeightLog, Gender, UserDietPlan, FullSchedule, DatedWorkout, Activity, LoggedSet, WorkoutMode, AllWorkoutPlans, ExerciseDefinition, TopicGoal, ProductizationPlan, Release, ExerciseCategory, ActivityType, Offer, Resource, ResourceFolder, CanvasLayout, MindsetCard, MindsetPoint, PistonsCategoryData, SkillDomain, CoreSkill, Project, Company, Position, MicroSkill, PopupState, ResourcePoint, SkillArea, DailySchedule, PurposeData, Pattern, MetaRule, PistonsInitialState, PistonEntry, AutoSuggestionEntry, RuleDetailPopupState, TaskContextPopupState, PillarCardData, HabitEquation, PathNode, ContentViewPopupState, TodaysDietPopupState, HabitDetailPopupState, StrengthTrainingMode, Stopper, Strength, SubTask, MissedSlotReview, MindsetTechniquePopupState, StopperProgressPopupState, WorkoutSchedulingMode, UserSettings, Priority, BrainHack, PipState, ActiveFocusSession, SlotName, PillarPopupState, RepetitionData, DailyReviewLog, NodeType, PlaybackRequest, WorkoutExercise, DrawingCanvasPopupState, PdfViewerPopupState, FormalizationItem, AbandonmentLog, RecurrenceRule, KanbanBoard, KanbanList, KanbanCard, KanbanAttachment, KanbanComment, KanbanChecklistItem, SkillAcquisitionPlan, DailyJournalSession, MindsetSession, PdfViewerLaunchContext, Goal } from '@/types/workout';
import { 
  registerUser as localRegisterUser, 
  loginUser as localLoginUser, 
  logoutUser as localLogoutUser, 
  getCurrentLocalUser,
  getAccessToken,
  hasValidCachedDesktopEntitlement,
  isCurrentSessionOwner,
  persistDesktopEntitlementSnapshot,
  readCachedDesktopEntitlementSnapshot,
  refreshSessionHeartbeat,
  refreshSessionFromStoredToken,
} from '@/lib/localAuth';
import { format, addDays, addMonths, parseISO, subDays, isAfter, isBefore, isValid, eachDayOfInterval, min, max, startOfWeek, differenceInDays, getDay, getHours, startOfToday, isSameDay, getISODay, differenceInMonths } from 'date-fns';
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
import { Textarea } from './ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import { GeneralResourcePopup } from '@/components/GeneralResourcePopup';
import { TodaysDietPopup } from '@/components/TodaysDietPopup';
import { HabitDetailPopup } from '@/components/HabitDetailPopup';
import { deleteAudio, clearAllData, storeBackup, getBackup, deleteBackup, getAllExcalidrawFiles, getExcalidrawFile, storeExcalidrawFile, type ExcalidrawFileRecord, storeAudio, getAudioForResource, storePdf, getPdfForResource, getAllPdfKeys } from '@/lib/audioDB';
import { uploadPdfToSupabase, downloadPdfFromSupabase } from '@/lib/supabasePdfStorage';
import { normalizeAiSettings } from '@/lib/ai/config';
import { buildDefaultPointsForResourceType, createDefaultTextPoint } from '@/lib/resourceDefaults';
import { fetchAppConfig } from '@/lib/appConfigClient';
import { createEmptyDesktopAccessState, type DesktopAccessState, type DesktopPaymentProvider } from '@/lib/desktopAccess';

// Helper: convert ArrayBuffer to base64 in safe chunks to avoid "call stack size exceeded"
const arrayBufferToBase64 = (buffer: ArrayBuffer) => {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000; // 32KB per chunk
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
};
import { PillarPopup } from '@/components/PillarPopup';
import { BrainHacksCard } from '@/components/BrainHacksCard';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';


interface ResourcePopupProps {
  popupState: PopupState;
}

type GitHubSyncNotification = {
  mode: 'push' | 'pull';
  status: 'running' | 'success' | 'error';
  title: string;
  details: string;
  updatedAt: number;
};
type RemoteAheadDecision = 'pull' | 'force' | 'cancel';

const isDesktopRuntimeClient = () => typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);

const getCachedDesktopAccessState = (username: string): DesktopAccessState | null => {
  const snapshot = readCachedDesktopEntitlementSnapshot(username);
  if (!hasValidCachedDesktopEntitlement(snapshot)) {
    return null;
  }

  return {
    ...createEmptyDesktopAccessState(),
    hasAccess: true,
    status: 'active',
    grantedAt: snapshot?.purchaseDate ?? null,
    expiresAt: snapshot?.expiresAt ?? null,
    updatedAt: snapshot ? new Date(snapshot.updatedAt).toISOString() : null,
  };
};

const createDesktopAuthHeaders = (username: string): Record<string, string> => {
  const headers: Record<string, string> = { 'x-local-username': username };
  const accessToken = getAccessToken(username);
  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }
  return headers;
};

interface AuthContextType {
  currentUser: LocalUser | null;
  loading: boolean;
  register: (username: string, password:string, email: string) => Promise<void>;
  signIn: (username: string, password: string, opts?: { force?: boolean }) => Promise<{ success: boolean; message: string; code?: "SESSION_ACTIVE" }>;
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
  openPdfViewer: (resource: Resource, launchContext?: PdfViewerLaunchContext | null) => void;
  handlePdfViewerPopupDragEnd: (event: DragEndEvent) => void;
  drawingCanvasState: DrawingCanvasPopupState | null;
  setDrawingCanvasState: React.Dispatch<React.SetStateAction<DrawingCanvasPopupState | null>>;
  openDrawingCanvas: (state: Omit<DrawingCanvasPopupState, 'isOpen' | 'position' | 'onSave'> & { size?: 'normal' | 'compact' }) => void;
  openDrawingCanvasFromHeader: () => void;
  openCanvasResourceCard: () => void;
  handleDrawingCanvasPopupDragEnd: (event: DragEndEvent) => void;
  togglePinDrawing: (canvasId: string) => void;
  updateDrawingData: (canvasId: string, data: string, onSaveComplete: () => void) => void;
  clearAllLocalFiles: () => Promise<void>;
  isTodaysPredictionModalOpen: boolean;
  setIsTodaysPredictionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  syncWithGitHub: () => Promise<void>;
  downloadFromGitHub: () => Promise<void>;
  gitHubSyncNotification: GitHubSyncNotification | null;
  dismissGitHubSyncNotification: () => void;
  syncCanvasImagesToGitHub: () => Promise<void>;
  fetchCanvasImagesFromGitHub: (options?: { missingOnly?: boolean }) => Promise<void>;
  syncAudioFilesToGitHub: () => Promise<void>;
  fetchAudioFilesFromGitHub: () => Promise<void>;
  syncPdfFilesToGitHub: () => Promise<void>;
  fetchPdfFilesFromGitHub: () => Promise<void>;
  handleCreateTask: (activity: Activity, linkedActivityType: ActivityType, microSkillName: string, parentTaskId: string) => Promise<{ parentName: string, childName: string, childId: string } | null>;
  desktopAccess: DesktopAccessState;
  desktopAccessLoading: boolean;
  ensureCloudSession: () => Promise<{ success: boolean; message: string }>;
  refreshDesktopAccess: () => Promise<void>;
  startDesktopCheckout: (provider: DesktopPaymentProvider, planId?: string | null) => Promise<{ success: boolean; message: string; access: DesktopAccessState; sessionId?: string | null; checkoutUrl?: string | null; checkoutData?: Record<string, unknown> | null }>;
  confirmDesktopCheckout: (sessionId: string, provider?: DesktopPaymentProvider, paymentDetails?: { providerSessionId?: string; providerOrderId?: string; providerSignature?: string }) => Promise<{ success: boolean; message: string; access: DesktopAccessState }>;
  
  // App Data States
  schedule: FullSchedule;
  setSchedule: React.Dispatch<React.SetStateAction<FullSchedule>>;
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
  dailyPurposes: Record<string, string>;
  setDailyPurposes: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  isAgendaDocked: boolean;
  setIsAgendaDocked: React.Dispatch<React.SetStateAction<boolean>>;
  activityDurations: Record<string, string>;
  expectedActivityDurations: Record<string, string>;
  handleToggleComplete: (slotName: string, activityId: string, isCompleted?: boolean) => void;
  onRemoveActivity: (slotName: string, activityId: string, date: Date) => void;
  carryForwardTask: (activity: Activity, targetSlot: string) => void;
  scheduleTaskFromMindMap: (definitionId: string, activityType: ActivityType, slotName: string, duration?: number, sourceActivityType?: ActivityType) => void;
  
  // Focus Session
  focusSessionModalOpen: boolean;
  setFocusSessionModalOpen: React.Dispatch<React.SetStateAction<boolean>>;
  focusActivity: Activity | null;
  setFocusActivity: React.Dispatch<React.SetStateAction<Activity | null>>;
  focusDuration: number;
  setFocusDuration: React.Dispatch<React.SetStateAction<number>>;
  onOpenFocusModal: (activity: Activity) => boolean;
  handleStartFocusSession: (activity: Activity, duration: number) => void;
  onLogDuration: (
    activity: Activity,
    duration: number,
    moveToSlot?: SlotName,
    progress?: { itemsCompleted?: number; hoursCompleted?: number; pagesCompleted?: number; microSkillName?: string }
  ) => void;
  activeFocusSession: ActiveFocusSession | null;
  setActiveFocusSession: React.Dispatch<React.SetStateAction<ActiveFocusSession | null>>;
  
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
  kanbanBoards: KanbanBoard[];
  setKanbanBoards: React.Dispatch<React.SetStateAction<KanbanBoard[]>>;
  refreshKanbanBoards: () => void;
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
  closeGeneralPopup: (popupId: string) => void;
  navigateGeneralPopupPath: (popupId: string, resourceId: string) => void;
  updateGeneralPopupSize: (popupId: string, resourceId: string, width: number, height: number) => void;
  updateGeneralPopupPosition: (popupId: string, resourceId: string, x: number, y: number) => void;
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
  logMindsetSet: (date: Date, exerciseId: string, definitionId: string, reps: number, weight: number) => void;
  deleteMindsetSet: (date: Date, exerciseId: string, setId: string) => void;
  
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
  goals: Goal[];
  setGoals: React.Dispatch<React.SetStateAction<Goal[]>>;
  createShivGuideFlow: (input: {
    botheringType: 'external' | 'mismatch' | 'constraint';
    botheringText: string;
    domainId?: string | null;
    domainName?: string;
    specializationId?: string | null;
    specializationName?: string;
    learningPlans: Array<{
      type: 'audio' | 'book' | 'path';
      title: string;
      subtitle?: string;
      targetDate?: string;
      requiredHours?: number | null;
      totalPages?: number | null;
      requiredMoney?: number | null;
      targetMicroSkills?: number | null;
      linkedPdfResourceId?: string | null;
    }>;
    projectPlan?: {
      enabled: boolean;
      domainId?: string | null;
      projectName?: string;
      endDate?: string;
      specializationId?: string | null;
    };
    routine?: {
      activityType?: ActivityType;
      specializationId?: string | null;
      details: string;
      slot: SlotName;
      recurrence: RecurrenceRule;
      startDate?: string;
      linkToBothering?: boolean;
    };
  }) => {
    botheringId: string;
    domainId: string;
    specializationId: string;
    routineId: string | null;
    projectId: string | null;
    releaseId: string | null;
  };
  
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
  updateActivity: (updatedActivity: Activity) => void;
  updateActivitySubtask: (activityId: string, subTaskId: string, updates: Partial<SubTask>) => void;
  deleteActivitySubtask: (activityId: string, subTaskId: string) => void;
  handleLinkHabit: (activityId: string, habitId: string, date: Date) => void;
  toggleRoutine: (activity: Activity, rule: RecurrenceRule | null, baseDate?: string) => void;
  missedSlotReviews: Record<string, MissedSlotReview>;
  setMissedSlotReviews: React.Dispatch<React.SetStateAction<Record<string, MissedSlotReview>>>;
  journalSessions: DailyJournalSession[];
  setJournalSessions: React.Dispatch<React.SetStateAction<DailyJournalSession[]>>;
  mindsetSessions: MindsetSession[];
  setMindsetSessions: React.Dispatch<React.SetStateAction<MindsetSession[]>>;
  
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
  selectedUpskillTask: ExerciseDefinition | null;
  setSelectedUpskillTask: React.Dispatch<React.SetStateAction<ExerciseDefinition | null>>;
  selectedDeepWorkTask: ExerciseDefinition | null;
  setSelectedDeepWorkTask: React.Dispatch<React.SetStateAction<ExerciseDefinition | null>>;
  selectedMicroSkill: MicroSkill | null;
  setSelectedMicroSkill: React.Dispatch<React.SetStateAction<MicroSkill | null>>;
  highlightedTaskIds: Set<string>;
  setHighlightedTaskIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  logSubTaskTime: (taskInstanceId: string, durationMinutes: number) => { definitionId?: string } | undefined;
  findRootTask: (activity: Activity) => ExerciseDefinition | null;
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
const normalizeUsernameKey = (username: string) => username.trim().toLowerCase();
const getMainBackupKey = (username: string) => `lifeos_main_backup_${normalizeUsernameKey(username)}`;
const isQuotaExceededStorageError = (error: unknown) => {
  if (!error || typeof error !== 'object') return false;
  const maybeError = error as { name?: string; code?: number; message?: string };
  const name = maybeError.name || '';
  const code = maybeError.code;
  const message = (maybeError.message || '').toLowerCase();
  return (
    name === 'QuotaExceededError' ||
    name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    code === 22 ||
    code === 1014 ||
    message.includes('quota') ||
    message.includes('exceeded')
  );
};
const safeSetLocalStorage = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (error) {
    return false;
  }
};
const getUserScopedStorageValue = (prefix: string, username: string): { key: string; value: string } | null => {
  if (typeof window === 'undefined') return null;
  const normalizedUsername = normalizeUsernameKey(username);
  const candidates: Array<{ key: string; value: string }> = [];

  // Backward compatibility: recover entries saved with mixed-case username suffixes.
  for (let i = 0; i < localStorage.length; i += 1) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    const suffix = key.slice(prefix.length);
    if (normalizeUsernameKey(suffix) === normalizedUsername) {
      const value = localStorage.getItem(key);
      if (value !== null) {
        candidates.push({ key, value });
      }
    }
  }

  if (candidates.length === 0) return null;
  if (candidates.length === 1) return candidates[0];

  // Prefer the fullest payload; this helps recover from accidental writes of empty state.
  candidates.sort((a, b) => b.value.length - a.value.length);
  return candidates[0];
};
const normalizePersistedPayload = (payload: any): { main: any; ui: any } | null => {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.main && typeof payload.main === 'object') {
    return { main: payload.main, ui: payload.ui && typeof payload.ui === 'object' ? payload.ui : {} };
  }
  // Legacy format: payload itself is the main data object.
  return { main: payload, ui: {} };
};

const KANBAN_STAGE_MIGRATION: Array<{ key: 'idea' | 'code' | 'break' | 'fix'; title: string; color: string }> = [
  { key: 'idea', title: 'Idea', color: '#2563eb' },
  { key: 'code', title: 'Code', color: '#059669' },
  { key: 'break', title: 'Break', color: '#d97706' },
  { key: 'fix', title: 'Fix', color: '#9333ea' },
];

const DEFAULT_PROJECT_KANBAN_LIST_TEMPLATES = [
  { key: 'idea', title: 'Idea', color: '#2563eb' },
  { key: 'code', title: 'Code', color: '#059669' },
  { key: 'break', title: 'Break', color: '#d97706' },
  { key: 'fix', title: 'Fix', color: '#9333ea' },
  { key: 'done', title: 'Done', color: '#0f766e' },
] as const;

const buildReleaseBoardId = (specializationId: string, releaseId: string) =>
  `kanban_release_${specializationId}_${releaseId}`;

const buildKanbanMigrationId = (prefix: string, boardId: string, suffix: string) =>
  `${prefix}_${boardId}_${suffix}`;

const buildDefaultProjectLists = (boardId: string): KanbanList[] =>
  DEFAULT_PROJECT_KANBAN_LIST_TEMPLATES.map((list, index) => ({
    id: `${boardId}_${list.key}`,
    boardId,
    title: list.title,
    color: list.color,
    cardOrder: [],
    position: index,
    archived: false,
  }));

const normalizeKanbanBoards = (
  rawBoards: unknown,
  offerizationPlans: Record<string, ProductizationPlan>,
  projects: Project[]
): KanbanBoard[] => {
  const now = new Date().toISOString();
  const boards = Array.isArray(rawBoards) ? rawBoards : [];
  const normalizedBoards: KanbanBoard[] = boards
    .filter((board): board is Record<string, any> => !!board && typeof board === 'object' && typeof board.id === 'string')
    .map((board, boardIndex) => {
      const boardId = board.id;
      const labels = Array.isArray(board.labels) ? board.labels : [];
      const rawLists = Array.isArray(board.lists) ? board.lists : [];
      const cards = Array.isArray(board.cards) ? board.cards : [];
      const attachments = Array.isArray(board.attachments) ? board.attachments : [];
      const comments = Array.isArray(board.comments) ? board.comments : [];
      const boardType = board.boardType === 'branding' ? 'branding' : 'project';
      const lists = rawLists.length > 0 ? rawLists : (boardType === 'project' ? buildDefaultProjectLists(boardId) : []);
      return {
        id: boardId,
        name: typeof board.name === 'string' && board.name.trim() ? board.name : `Board ${boardIndex + 1}`,
        description: typeof board.description === 'string' ? board.description : '',
        projectId: typeof board.projectId === 'string' ? board.projectId : null,
        releaseId: typeof board.releaseId === 'string' ? board.releaseId : null,
        specializationId: typeof board.specializationId === 'string' ? board.specializationId : null,
        createdAt: typeof board.createdAt === 'string' ? board.createdAt : now,
        updatedAt: typeof board.updatedAt === 'string' ? board.updatedAt : now,
        listOrder:
          Array.isArray(board.listOrder) && board.listOrder.some((id: unknown) => typeof id === 'string')
            ? board.listOrder.filter((id: unknown) => typeof id === 'string')
            : lists
                .filter((list): list is Record<string, any> => !!list && typeof list === 'object' && typeof list.id === 'string')
                .sort((a, b) => {
                  const aPos = typeof a.position === 'number' ? a.position : 0;
                  const bPos = typeof b.position === 'number' ? b.position : 0;
                  return aPos - bPos;
                })
                .map((list) => list.id),
        labels: labels
          .filter((label): label is Record<string, any> => !!label && typeof label === 'object' && typeof label.id === 'string')
          .map((label) => ({
            id: label.id,
            boardId,
            title: typeof label.title === 'string' ? label.title : 'Label',
            color: typeof label.color === 'string' ? label.color : '#64748b',
          })),
        lists: lists
          .filter((list): list is Record<string, any> => !!list && typeof list === 'object' && typeof list.id === 'string')
          .map((list, index) => ({
            id: list.id,
            boardId,
            title: typeof list.title === 'string' ? list.title : `List ${index + 1}`,
            color: typeof list.color === 'string' ? list.color : undefined,
            cardOrder: Array.isArray(list.cardOrder) ? list.cardOrder.filter((id: unknown) => typeof id === 'string') : [],
            position: typeof list.position === 'number' ? list.position : index,
            archived: !!list.archived,
          })),
        cards: cards
          .filter((card): card is Record<string, any> => !!card && typeof card === 'object' && typeof card.id === 'string')
          .map((card, index) => ({
            id: card.id,
            boardId,
            listId: typeof card.listId === 'string' ? card.listId : '',
            title: typeof card.title === 'string' ? card.title : '',
            description: typeof card.description === 'string' ? card.description : '',
            labelIds: Array.isArray(card.labelIds) ? card.labelIds.filter((id: unknown) => typeof id === 'string') : [],
            dueDate: typeof card.dueDate === 'string' ? card.dueDate : null,
            checklist: Array.isArray(card.checklist)
              ? card.checklist
                  .filter((item): item is Record<string, any> => !!item && typeof item === 'object' && typeof item.id === 'string')
                  .map((item) => ({
                    id: item.id,
                    text: typeof item.text === 'string' ? item.text : '',
                    completed: !!item.completed,
                    linkedIntentionId: typeof item.linkedIntentionId === 'string' ? item.linkedIntentionId : undefined,
                  }))
              : [],
            attachmentIds: Array.isArray(card.attachmentIds) ? card.attachmentIds.filter((id: unknown) => typeof id === 'string') : [],
            commentIds: Array.isArray(card.commentIds) ? card.commentIds.filter((id: unknown) => typeof id === 'string') : [],
            linkedIntentionIds: Array.isArray(card.linkedIntentionIds)
              ? card.linkedIntentionIds.filter((id: unknown) => typeof id === 'string')
              : [],
            workflowStageKey:
              card.workflowStageKey === 'idea' ||
              card.workflowStageKey === 'code' ||
              card.workflowStageKey === 'break' ||
              card.workflowStageKey === 'fix'
                ? card.workflowStageKey
                : null,
            linkedProjectId: typeof card.linkedProjectId === 'string' ? card.linkedProjectId : null,
            linkedReleaseId: typeof card.linkedReleaseId === 'string' ? card.linkedReleaseId : null,
            linkedResourceId: typeof card.linkedResourceId === 'string' ? card.linkedResourceId : null,
            linkedFeatureResourceId: typeof card.linkedFeatureResourceId === 'string' ? card.linkedFeatureResourceId : null,
            linkedFeaturePointId: typeof card.linkedFeaturePointId === 'string' ? card.linkedFeaturePointId : null,
            linkedFeaturePointIds: Array.isArray(card.linkedFeaturePointIds)
              ? card.linkedFeaturePointIds.filter((id: unknown) => typeof id === 'string')
              : [],
            brandingType:
              card.brandingType === 'blog' || card.brandingType === 'video'
                ? card.brandingType
                : null,
            totalLoggedMinutes: typeof card.totalLoggedMinutes === 'number' ? Math.max(0, card.totalLoggedMinutes) : 0,
            archived: !!card.archived,
            position: typeof card.position === 'number' ? card.position : index,
            createdAt: typeof card.createdAt === 'string' ? card.createdAt : now,
            updatedAt: typeof card.updatedAt === 'string' ? card.updatedAt : now,
          })),
        attachments: attachments
          .filter((item): item is Record<string, any> => !!item && typeof item === 'object' && typeof item.id === 'string')
          .map((item) => ({
            id: item.id,
            cardId: typeof item.cardId === 'string' ? item.cardId : '',
            name: typeof item.name === 'string' ? item.name : 'Attachment',
            url: typeof item.url === 'string' ? item.url : '',
            type: typeof item.type === 'string' ? item.type : undefined,
          })),
        comments: comments
          .filter((item): item is Record<string, any> => !!item && typeof item === 'object' && typeof item.id === 'string')
          .map((item) => ({
            id: item.id,
            cardId: typeof item.cardId === 'string' ? item.cardId : '',
            body: typeof item.body === 'string' ? item.body : '',
            createdAt: typeof item.createdAt === 'string' ? item.createdAt : now,
          })),
        boardType,
        migratedFromReleaseWorkflow: !!board.migratedFromReleaseWorkflow,
      };
    });

  const existingBoardIds = new Set(normalizedBoards.map((board) => board.id));

  Object.entries(offerizationPlans || {}).forEach(([specializationId, plan]) => {
    (plan?.releases || []).forEach((release) => {
      const workflow = release.workflowStages;
      if (!workflow) return;
      const boardId = buildReleaseBoardId(specializationId, release.id);
      if (existingBoardIds.has(boardId) || normalizedBoards.some((board) => board.releaseId === release.id)) return;

      const nowStamp = new Date().toISOString();
      const matchingProject = projects.find((project) => project.name === release.name) || null;
      const labelsByTitle = new Map<string, string>();
      const labels: KanbanBoard['labels'] = [];
      const cards: KanbanCard[] = [];
      const lists: KanbanList[] = [];
      const listOrder: string[] = [];

      const ensureLabelId = (title: string) => {
        const trimmed = title.trim();
        if (!trimmed) return null;
        const existing = labelsByTitle.get(trimmed.toLowerCase());
        if (existing) return existing;
        const labelId = buildKanbanMigrationId('kanban_label', boardId, `${labels.length}`);
        labelsByTitle.set(trimmed.toLowerCase(), labelId);
        labels.push({
          id: labelId,
          boardId,
          title: trimmed,
          color: '#475569',
        });
        return labelId;
      };

      const pushCard = (
        listId: string,
        position: number,
        workflowStageKey: 'idea' | 'code' | 'break' | 'fix',
        rawCard: string | { text?: string; completed?: boolean; description?: string; labels?: string[]; dueDate?: string | null; checklist?: Array<{ id?: string; text?: string; completed?: boolean }>; linkedIntentionIds?: string[] }
      ) => {
        const normalized =
          typeof rawCard === 'string'
            ? { text: rawCard, completed: false, description: '', labels: [], dueDate: null, checklist: [], linkedIntentionIds: [] }
            : {
                text: rawCard.text || '',
                completed: !!rawCard.completed,
                description: rawCard.description || '',
                labels: Array.isArray(rawCard.labels) ? rawCard.labels : [],
                dueDate: typeof rawCard.dueDate === 'string' ? rawCard.dueDate : null,
                checklist: Array.isArray(rawCard.checklist) ? rawCard.checklist : [],
                linkedIntentionIds: Array.isArray(rawCard.linkedIntentionIds) ? rawCard.linkedIntentionIds.filter((id) => typeof id === 'string') : [],
              };

        const cardId = buildKanbanMigrationId('kanban_card', boardId, `${cards.length}`);
        cards.push({
          id: cardId,
          boardId,
          listId,
          title: normalized.text,
          description: normalized.description,
          labelIds: normalized.labels.map(ensureLabelId).filter((id): id is string => !!id),
          dueDate: normalized.dueDate,
          checklist: normalized.checklist.map((item, itemIndex) => ({
            id: item.id && item.id.trim() ? item.id : buildKanbanMigrationId('kanban_check', cardId, `${itemIndex}`),
            text: item.text || '',
            completed: !!item.completed,
          })),
          attachmentIds: [],
          commentIds: [],
          linkedIntentionIds: normalized.linkedIntentionIds,
          workflowStageKey,
          linkedProjectId: matchingProject?.id || null,
          linkedReleaseId: release.id,
          linkedResourceId: null,
          totalLoggedMinutes: 0,
          archived: false,
          position,
          createdAt: nowStamp,
          updatedAt: nowStamp,
        });
      };

      KANBAN_STAGE_MIGRATION.forEach((stage, stageIndex) => {
        const listId = buildKanbanMigrationId('kanban_list', boardId, stage.key);
        listOrder.push(listId);
        const sourceCards = Array.isArray(workflow[stage.key]) ? workflow[stage.key] : [];
        const openCards = sourceCards.filter((card) => !(typeof card === 'object' && card?.completed));
        lists.push({
          id: listId,
          boardId,
          title: stage.title,
          color: stage.color,
          cardOrder: [],
          position: stageIndex,
          archived: false,
        });
        openCards.forEach((card, cardIndex) => {
          const stageKey = stage.key.replace('Items', '');
          if (stageKey === 'idea' || stageKey === 'code' || stageKey === 'break' || stageKey === 'fix') {
            pushCard(listId, cardIndex, stageKey, card);
          }
        });
      });

      const doneListId = buildKanbanMigrationId('kanban_list', boardId, 'done');
      listOrder.push(doneListId);
      lists.push({
        id: doneListId,
        boardId,
        title: 'Done',
        color: '#0f766e',
        cardOrder: [],
        position: KANBAN_STAGE_MIGRATION.length,
        archived: false,
      });
      KANBAN_STAGE_MIGRATION.forEach((stage) => {
        const sourceCards = Array.isArray(workflow[stage.key]) ? workflow[stage.key] : [];
        sourceCards
          .filter((card) => typeof card === 'object' && !!card?.completed)
          .forEach((card, cardIndex) => pushCard(doneListId, cardIndex, stage.key, card));
      });

      const cardsByListId = new Map<string, string[]>();
      cards.forEach((card) => {
        const order = cardsByListId.get(card.listId) || [];
        order.push(card.id);
        cardsByListId.set(card.listId, order);
      });
      const finalizedLists = lists.map((list) => ({
        ...list,
        cardOrder: cardsByListId.get(list.id) || [],
      }));

      normalizedBoards.push({
        id: boardId,
        name: release.name,
        description: release.description || '',
        projectId: matchingProject?.id || null,
        releaseId: release.id,
        specializationId,
        createdAt: nowStamp,
        updatedAt: nowStamp,
        listOrder,
        labels,
        lists: finalizedLists,
        cards,
        attachments: [],
        comments: [],
        migratedFromReleaseWorkflow: true,
      });
      existingBoardIds.add(boardId);
    });
  });

  return normalizedBoards;
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<LocalUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [desktopAccess, setDesktopAccess] = useState<DesktopAccessState>(createEmptyDesktopAccessState());
  const [desktopAccessLoading, setDesktopAccessLoading] = useState(false);
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
  const [gitHubSyncNotification, setGitHubSyncNotification] = useState<GitHubSyncNotification | null>(null);
  const cloudRevisionRef = useRef<number | null>(null);
  const isGitHubSyncInFlightRef = useRef(false);
  const githubModuleHashesRef = useRef<Record<string, string>>({});
  const [currentSlot, setCurrentSlot] = useState('');

  const [isLoadingState, setIsLoadingState] = useState(true);
  const [settings, setSettings] = useState<UserSettings>({ 
    ispSimpleMode: true,
    ispSimpleKeepCanvasAndBotherings: true,
    carryForward: true,
    autoPush: false,
    autoPushLimit: 100,
    debtBalance: 0,
    financeMonthKey: new Date().toISOString().slice(0, 7),
    financeMonthlyIncome: 0,
    financeMonthlyOutflow: 0,
    financeNetBalance: 0,
    holidays: [],
    carryForwardEssentials: true,
    carryForwardNutrition: false,
    smartLogging: false,
    defaultHabitLinks: {},
    routines: [],
    workoutScheduling: 'day-of-week',
    slotRules: {},
    widgetVisibility: { agenda: true, smartLogging: false, pistons: false, mindset: false, activityDistribution: false, favorites: false, topPriorities: false, goals: false, brainHacks: false, ruleEquations: false, visualizationTechniques: false, spacedRepetition: false },
    allWidgetsVisible: false,
    agendaShowCurrentSlotOnly: false,
    spacedRepetitionSlot: 'Late Night',
    pinnedCanvasIds: [],
    coreStateManualOverrides: {},
    githubModuleHashes: {},
    githubPulledHashes: {},
    routineRebalanceLearning: {
      history: [],
    },
    routineSkipByDate: {},
    routineSourceOverrides: {},
    pdfLastOpenedPageByResourceId: {},
    pdfDailyPageTargetByResourceId: {},
    pdfDailyPageStatsByResourceId: {},
    pdfAnnotationsByResourceId: {},
    pdfLinkedCanvasByResourceId: {},
    pdfDiagramTextByResourceId: {},
    flashcardSessions: [],
    flashcardTopicTablesBySpecializationId: {},
    learningPerformanceDailyLogs: {},
    supabasePdfBucket: 'pdfs',
    xttsTtsBaseUrl: '',
    xttsVoiceSamplePath: '',
    xttsVoiceName: 'my_voice',
    xttsLanguage: 'en',
    astraReplyLanguage: 'auto',
    localSttBaseUrl: '',
    means: {
      entries: [],
    },
    ai: normalizeAiSettings(undefined, typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop)),
  });
  useEffect(() => {
    githubModuleHashesRef.current = settings.githubModuleHashes || {};
  }, [settings.githubModuleHashes]);

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
  const [kanbanBoards, setKanbanBoards] = useState<KanbanBoard[]>([]);

  // Resources State
  const [resources, setResources] = useState<Resource[]>([]);
  const [resourceFolders, setResourceFolders] = useState<ResourceFolder[]>([]);
  const [pinnedFolderIds, setPinnedFolderIds] = useState<Set<string>>(new Set());
  const [activeResourceTabIds, setActiveResourceTabIds] = useState<string[]>([]);
  const [selectedResourceFolderId, setSelectedResourceFolderId] = useState<string | null>(null);
  const [lastSelectedHabitFolder, setLastSelectedHabitFolder] = useState<string | null>(null);

  // Resource Popups (Original system, kept for resources page)
  const [openPopups, setOpenPopups] = useState<Map<string, PopupState>>(new Map());
  
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
  const [journalSessions, setJournalSessions] = useState<DailyJournalSession[]>([]);
  const [mindsetSessions, setMindsetSessions] = useState<MindsetSession[]>([]);

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
  const [focusDuration, setFocusDuration] = useState(25);
  const [activeFocusSession, setActiveFocusSession] = useState<ActiveFocusSession | null>(null);

  // Canvas State
  const [canvasLayout, setCanvasLayout] = useState<CanvasLayout>({ nodes: [], edges: [] });

  // Mindset State
  const [mindsetCards, setMindsetCards] = useState<MindsetCard[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  
  // Pistons
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
  const [highlightedTaskIds, setHighlightedTaskIds] = useState<Set<string>>(new Set());

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
  const [importBackupConfirmationOpen, setImportBackupConfirmationOpen] = useState(false);
  const [remoteAheadPrompt, setRemoteAheadPrompt] = useState<{ remoteIso: string; localIso: string } | null>(null);
  const remoteAheadDecisionResolverRef = useRef<((decision: RemoteAheadDecision) => void) | null>(null);

  const resolveRemoteAheadDecision = useCallback((decision: RemoteAheadDecision) => {
    setRemoteAheadPrompt(null);
    if (remoteAheadDecisionResolverRef.current) {
      remoteAheadDecisionResolverRef.current(decision);
      remoteAheadDecisionResolverRef.current = null;
    }
  }, []);

  const requestRemoteAheadDecision = useCallback((remoteIso: string, localIso: string) => {
    return new Promise<RemoteAheadDecision>((resolve) => {
      remoteAheadDecisionResolverRef.current = resolve;
      setRemoteAheadPrompt({ remoteIso, localIso });
    });
  }, []);

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
            const reordered = newActivities
              .map((activity, index) => ({ activity, index }))
              .sort((a, b) => {
                if (a.activity.completed !== b.activity.completed) {
                  return a.activity.completed ? 1 : -1;
                }
                return a.index - b.index;
              })
              .map(({ activity }) => activity);
            newSchedule[dateKey][slotName as SlotName] = reordered;
            found = true;
            break;
          }
        }
        if (found) break;
      }
      return newSchedule;
    });
  }, [setSchedule]);

  const ensureRoutineInstancesForDate = useCallback((date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const routines = settings.routines || [];
    if (routines.length === 0) return;
    const skippedRoutineIdsForDate = new Set(settings.routineSkipByDate?.[dateKey] || []);

    const isHoliday = (target: Date) => {
      const key = format(target, 'yyyy-MM-dd');
      return (settings.holidays || []).some((entry) => {
        if (typeof entry === 'string') return entry === key;
        return entry?.date === key;
      });
    };

    const isBlockedByRule = (target: Date, rule: RecurrenceRule) => {
      if (rule.avoidWeekends) {
        const dow = getISODay(target);
        if (dow === 6 || dow === 7) return true;
      }
      if (rule.avoidHolidays && isHoliday(target)) return true;
      return false;
    };

    const isDueOnDate = (routine: Activity, target: Date) => {
      if (!routine.routine) return false;
      const rule = routine.routine;
      const base = routine.baseDate || routine.createdAt;
      try {
        if (rule.endDate) {
          const endDate = parseISO(rule.endDate);
          if (Number.isNaN(endDate.getTime())) return false;
          if (isAfter(target, endDate)) return false;
        }
        if (rule.type === 'daily') return true;
        if (rule.type === 'weekly') {
          if (!base) return false;
          const baseDow = getISODay(parseISO(base));
          const thisDow = getISODay(target);
          return baseDow === thisDow;
        }
        if (rule.type === 'custom') {
          if (!base) return false;
          const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
          const unit = rule.repeatUnit ?? 'day';
          const baseDate = parseISO(base);
          if (unit === 'month') {
            if (baseDate.getDate() !== target.getDate()) return false;
            const diffMonths = differenceInMonths(target, baseDate);
            return diffMonths >= 0 && diffMonths % interval === 0;
          }
          if (unit === 'week') {
            const diffDays = differenceInDays(target, baseDate);
            return diffDays >= 0 && diffDays % (interval * 7) === 0;
          }
          const diffDays = differenceInDays(target, baseDate);
          return diffDays >= 0 && diffDays % interval === 0;
        }
      } catch (e) {
        return false;
      }
      return false;
    };

    const getPrevDueDate = (routine: Activity, target: Date) => {
      if (!routine.routine) return null;
      const rule = routine.routine;
      const base = routine.baseDate || routine.createdAt;
      if (!base) return null;
      const baseDate = parseISO(base);
      if (Number.isNaN(baseDate.getTime())) return null;
      if (rule.type === 'daily') return addDays(target, -1);
      if (rule.type === 'weekly') return addDays(target, -7);
      if (rule.type === 'custom') {
        const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
        const unit = rule.repeatUnit ?? 'day';
        if (unit === 'month') {
          const diffMonths = differenceInMonths(target, baseDate);
          if (diffMonths < 0) return null;
          const offset = Math.floor(diffMonths / interval) * interval;
          return addMonths(baseDate, offset);
        }
        const stepDays = unit === 'week' ? interval * 7 : interval;
        const diffDays = differenceInDays(target, baseDate);
        if (diffDays < 0) return null;
        const offset = Math.floor(diffDays / stepDays) * stepDays;
        return addDays(baseDate, offset);
      }
      return null;
    };

    const getNextDueDate = (routine: Activity, target: Date) => {
      if (!routine.routine) return null;
      const rule = routine.routine;
      const base = routine.baseDate || routine.createdAt;
      if (!base) return null;
      const baseDate = parseISO(base);
      if (Number.isNaN(baseDate.getTime())) return null;
      if (rule.type === 'daily') return addDays(target, 1);
      if (rule.type === 'weekly') return addDays(target, 7);
      if (rule.type === 'custom') {
        const interval = Math.max(1, rule.repeatInterval ?? rule.days ?? 1);
        const unit = rule.repeatUnit ?? 'day';
        if (unit === 'month') {
          const diffMonths = differenceInMonths(target, baseDate);
          if (diffMonths < 0) return baseDate;
          const offset = (Math.floor(diffMonths / interval) + 1) * interval;
          return addMonths(baseDate, offset);
        }
        const stepDays = unit === 'week' ? interval * 7 : interval;
        const diffDays = differenceInDays(target, baseDate);
        if (diffDays < 0) return baseDate;
        const offset = (Math.floor(diffDays / stepDays) + 1) * stepDays;
        return addDays(baseDate, offset);
      }
      return null;
    };

    const hasAllowedBetween = (start: Date, end: Date, rule: RecurrenceRule) => {
      let cursor = addDays(start, 1);
      while (isBefore(cursor, end)) {
        if (!isBlockedByRule(cursor, rule)) return true;
        cursor = addDays(cursor, 1);
      }
      return false;
    };

    const shouldScheduleOnDate = (routine: Activity, target: Date) => {
      if (!routine.routine) return false;
      const rule = routine.routine;
      if (rule.endDate) {
        const endDate = parseISO(rule.endDate);
        if (!Number.isNaN(endDate.getTime()) && isAfter(target, endDate)) return false;
      }

      const isDue = isDueOnDate(routine, target);
      const isBlocked = isBlockedByRule(target, rule);
      if (isDue) return !isBlocked;

      if (isBlocked || (!rule.avoidWeekends && !rule.avoidHolidays) || !rule.shiftPolicy) return false;

      if (rule.shiftPolicy === 'postpone') {
        const prevDue = getPrevDueDate(routine, target);
        if (!prevDue) return false;
        if (!isDueOnDate(routine, prevDue)) return false;
        if (!isBlockedByRule(prevDue, rule)) return false;
        if (hasAllowedBetween(prevDue, target, rule)) return false;
        return true;
      }
      if (rule.shiftPolicy === 'prepone') {
        const nextDue = getNextDueDate(routine, target);
        if (!nextDue) return false;
        if (!isDueOnDate(routine, nextDue)) return false;
        if (!isBlockedByRule(nextDue, rule)) return false;
        if (hasAllowedBetween(target, nextDue, rule)) return false;
        return true;
      }
      return false;
    };

    setSchedule(prev => {
      const next = { ...prev };
      const day = { ...(next[dateKey] || {}) };
      let changed = false;
      const existingIdsForDay = new Set(
        Object.values(day)
          .flatMap(slotActivities => (slotActivities as Activity[]) || [])
          .map(activity => activity.id)
      );

      const isGenericPlaceholder = (activity: Activity, routine: Activity) => {
        if (activity.type !== routine.type) return false;
        const detail = (activity.details || '').trim().toLowerCase();
        if (!detail) return true;
        const typeLabel = routine.type.replace('-', ' ');
        const generic = `New ${typeLabel}`.trim().toLowerCase();
        return detail === generic;
      };

      routines.forEach(r => {
        if (!shouldScheduleOnDate(r, date)) return;
        if (skippedRoutineIdsForDate.has(r.id)) return;
        const instanceId = `${r.id}_${dateKey}`;
        if (existingIdsForDay.has(instanceId)) return;
        const slot = (r.slot || 'Evening') as SlotName;
        const slotActivities = [...((day[slot] as Activity[]) || [])];

        const existingIndex = slotActivities.findIndex(a =>
          (a.type === r.type && a.details === r.details) || isGenericPlaceholder(a, r)
        );

        const instance: Activity = {
          ...r,
          id: instanceId,
          completed: false,
          isRoutine: false,
          taskIds: r.taskIds && r.taskIds.length > 0 ? r.taskIds : [r.id],
        };

        if (existingIndex >= 0) {
          slotActivities[existingIndex] = { ...slotActivities[existingIndex], ...instance };
        } else {
          slotActivities.push(instance);
        }
        existingIdsForDay.add(instanceId);

        day[slot] = slotActivities;
        changed = true;
      });

      if (!changed) return prev;
      next[dateKey] = day;
      return next;
    });
  }, [settings.routines, settings.routineSkipByDate, setSchedule]);
  
  const onLogDuration = useCallback((
    activity: Activity,
    duration: number,
    moveToSlot?: SlotName,
    progress?: { itemsCompleted?: number; hoursCompleted?: number; pagesCompleted?: number; microSkillName?: string; microSkillId?: string }
  ) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const taskInstanceId = activity.taskIds?.[0];
  
    // Find the master definition ID from the daily log instance
    let definitionId: string | undefined;
    let matchedDefinitionCategory: string | undefined;
    let matchedDefinitionMicroSkillIds: string[] = [];
    let isUpskillLog = false;
    let taskLog;

    if (taskInstanceId) {
        const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
        const taskLogInstance = allLogs.flatMap(log => log.exercises).find(ex => ex.id === taskInstanceId);
        
        if(taskLogInstance) {
            taskLog = taskLogInstance;
            isUpskillLog = allUpskillLogs.some(log => log.exercises.some(ex => ex.id === taskInstanceId));
        } else {
            const allDefs = [...upskillDefinitions, ...deepWorkDefinitions];
            const def = allDefs.find(d => d.id === taskInstanceId);
            if (def) {
                definitionId = def.id;
                matchedDefinitionCategory = def.category;
                isUpskillLog = upskillDefinitions.some(d => d.id === def.id);
            }
        }
        
        if (taskLog) {
            definitionId = taskLog.definitionId;
            const matchingDef = [...upskillDefinitions, ...deepWorkDefinitions].find(d => d.id === taskLog.definitionId);
            matchedDefinitionCategory = matchingDef?.category;
            matchedDefinitionMicroSkillIds = matchingDef?.linkedMicroSkillIds || [];
        }
    }

    if (!matchedDefinitionCategory && progress?.microSkillName) {
      matchedDefinitionCategory = progress.microSkillName;
    }
    if (progress?.microSkillId) {
      matchedDefinitionMicroSkillIds = [progress.microSkillId];
    }
  
    if (definitionId) {
        const setDefinitions = isUpskillLog ? setUpskillDefinitions : setDeepWorkDefinitions;
        
        setDefinitions(prevDefs => prevDefs.map(def => {
            if (def.id === definitionId) {
                const newLoggedDuration = (def.loggedDuration || 0) + duration;
                return {
                    ...def,
                    loggedDuration: newLoggedDuration,
                    last_logged_date: todayKey,
                };
            }
            return def;
        }));

    }

    if (activity.type === 'deepwork' && duration > 0) {
      const linkedCardIds = new Set(activity.taskIds || []);
      if (linkedCardIds.size > 0) {
        setKanbanBoards((prevBoards) =>
          prevBoards.map((board) => {
            let boardChanged = false;
            const nextCards = (board.cards || []).map((card) => {
              if (!linkedCardIds.has(card.id)) return card;
              boardChanged = true;
              return {
                ...card,
                totalLoggedMinutes: Math.max(0, card.totalLoggedMinutes || 0) + duration,
                updatedAt: new Date().toISOString(),
              };
            });
            return boardChanged ? { ...board, cards: nextCards, updatedAt: new Date().toISOString() } : board;
          })
        );
      }
    }

    const itemsDelta = Math.max(0, progress?.itemsCompleted || 0);
    const hoursDelta = Math.max(0, progress?.hoursCompleted || 0);
    const pagesDelta = Math.max(0, progress?.pagesCompleted || 0);
    const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const stripInstanceDateSuffix = (value?: string) => (value || '').replace(/_\d{4}-\d{2}-\d{2}$/, '');
    const specializationCandidates = coreSkills
      .filter((skill) => skill.type === 'Specialization')
      .filter((spec) => {
        const normalizedSpec = normalizeText(spec.name);
        const normalizedActivityDetails = normalizeText(activity.details);
        if (normalizedSpec && normalizedSpec === normalizedActivityDetails) return true;
        const normalizedCategory = normalizeText(matchedDefinitionCategory);
        if (normalizedCategory) {
          if (normalizedCategory === normalizedSpec) return true;
          if (spec.skillAreas.some((area) => normalizeText(area.name) === normalizedCategory)) return true;
          if (spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === normalizedCategory))) return true;
        }
        const rawIds = new Set<string>([
          stripInstanceDateSuffix(activity.id),
          ...(activity.taskIds || []).map(stripInstanceDateSuffix),
          stripInstanceDateSuffix(taskInstanceId || ''),
        ]);
        if (rawIds.has(spec.id)) return true;

        const linkedDefinitions = [...upskillDefinitions, ...deepWorkDefinitions];
        const hasDefinitionMappedToSpec = linkedDefinitions.some((def) => {
          const defId = stripInstanceDateSuffix(def.id);
          const defName = normalizeText(def.name);
          if (!rawIds.has(defId) && (!defName || defName !== normalizedActivityDetails)) return false;
          const category = normalizeText(def.category);
          if (!category) return false;
          if (category === normalizedSpec) return true;
          if (spec.skillAreas.some((area) => normalizeText(area.name) === category)) return true;
          return spec.skillAreas.some((area) => area.microSkills.some((micro) => normalizeText(micro.name) === category));
        });
        return hasDefinitionMappedToSpec;
      })
      .map((spec) => ({ id: spec.id, name: spec.name }));
    const primarySpecialization = specializationCandidates[0];
    if (primarySpecialization && (itemsDelta > 0 || hoursDelta > 0 || pagesDelta > 0 || duration > 0)) {
      setSettings((prev) => {
        const current = prev.learningPerformanceDailyLogs || {};
        const currentDay = current[todayKey] || [];
        const entry = {
          id: `lplog_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          dateKey: todayKey,
          specializationId: primarySpecialization.id,
          specializationName: primarySpecialization.name,
          activityType: activity.type,
          sourceTaskId: taskInstanceId || activity.id,
          durationMinutes: Math.max(0, duration),
          pagesCompleted: pagesDelta,
          hoursCompleted: hoursDelta,
          itemsCompleted: itemsDelta,
        };
        return {
          ...prev,
          learningPerformanceDailyLogs: {
            ...current,
            [todayKey]: [...currentDay, entry],
          },
        };
      });
    }
    const shouldApplyMicroSkillProgress = !!matchedDefinitionCategory && (itemsDelta > 0 || hoursDelta > 0 || pagesDelta > 0);
    const shouldRemoveFromRepetitionQueue = activity.type === 'spaced-repetition' && !!matchedDefinitionCategory;
    if (shouldApplyMicroSkillProgress || shouldRemoveFromRepetitionQueue) {
      const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
      const explicitMicroSkillIds = new Set((matchedDefinitionMicroSkillIds || []).filter(Boolean));
      const normalizedCategory = normalizeText(matchedDefinitionCategory);
      const scopedSpecializationIds = new Set(primarySpecialization?.id ? [primarySpecialization.id] : []);
      const allMatchingMicroSkillIds = new Set<string>();

      if (normalizedCategory) {
        coreSkills.forEach((spec) => {
          spec.skillAreas.forEach((area) => {
            area.microSkills.forEach((ms) => {
              if (normalizeText(ms.name) === normalizedCategory) {
                allMatchingMicroSkillIds.add(ms.id);
              }
            });
          });
        });
      }

      const fallbackMicroSkillIds = new Set<string>();
      if (explicitMicroSkillIds.size === 0 && normalizedCategory) {
        if (allMatchingMicroSkillIds.size === 1) {
          allMatchingMicroSkillIds.forEach((id) => fallbackMicroSkillIds.add(id));
        } else if (scopedSpecializationIds.size > 0) {
          coreSkills.forEach((spec) => {
            if (!scopedSpecializationIds.has(spec.id)) return;
            spec.skillAreas.forEach((area) => {
              area.microSkills.forEach((ms) => {
                if (normalizeText(ms.name) === normalizedCategory) {
                  fallbackMicroSkillIds.add(ms.id);
                }
              });
            });
          });
        }
      }

      const targetMicroSkillIds = explicitMicroSkillIds.size > 0 ? explicitMicroSkillIds : fallbackMicroSkillIds;
      setCoreSkills(prev =>
        prev.map(spec => ({
          ...spec,
          skillAreas: spec.skillAreas.map(area => ({
            ...area,
            microSkills: area.microSkills.map(ms => {
              if (targetMicroSkillIds.size === 0 || !targetMicroSkillIds.has(ms.id)) return ms;
              return {
                ...ms,
                completedItems: (ms.completedItems || 0) + itemsDelta,
                completedHours: (ms.completedHours || 0) + hoursDelta,
                completedPages: (ms.completedPages || 0) + pagesDelta,
                isReadyForRepetition: shouldRemoveFromRepetitionQueue ? false : ms.isReadyForRepetition,
              };
            }),
          })),
        }))
      );
    }
  
    const completedActivity: Activity = {
      ...activity,
      duration: (activity.duration || 0) + duration,
      completed: true,
      completedAt: Date.now(),
    };

    setSchedule(prevSchedule => {
      const newSchedule = { ...prevSchedule };
      let found = false;

      for (const dateKey in newSchedule) {
        const daySchedule = newSchedule[dateKey];
        for (const slotName in daySchedule) {
          const activities = (daySchedule[slotName as SlotName] as Activity[]) || [];
          const activityIndex = activities.findIndex(a => a.id === activity.id);
          if (activityIndex === -1) continue;

          const sourceActivities = [...activities];
          const targetSlot = moveToSlot && moveToSlot !== slotName ? moveToSlot : (slotName as SlotName);
          const updatedDaySchedule = { ...daySchedule };

          if (targetSlot === slotName) {
            sourceActivities[activityIndex] = { ...completedActivity, slot: targetSlot };
            updatedDaySchedule[slotName as SlotName] = sourceActivities;
          } else {
            sourceActivities.splice(activityIndex, 1);
            updatedDaySchedule[slotName as SlotName] = sourceActivities;
            const targetActivities = [...((updatedDaySchedule[targetSlot] as Activity[]) || [])];
            targetActivities.push({ ...completedActivity, slot: targetSlot });
            updatedDaySchedule[targetSlot] = targetActivities;
          }

          newSchedule[dateKey] = updatedDaySchedule;
          found = true;
          break;
        }
        if (found) break;
      }

      return found ? newSchedule : prevSchedule;
    });
  
    const completionDescription = moveToSlot && moveToSlot !== activity.slot
      ? `Logged ${duration} minutes and moved to ${moveToSlot}.`
      : `Logged ${duration} minutes.`;
    toast({ title: 'Task Completed!', description: completionDescription });
  }, [toast, allUpskillLogs, allDeepWorkLogs, setUpskillDefinitions, setDeepWorkDefinitions, upskillDefinitions, deepWorkDefinitions, setCoreSkills, setSchedule, coreSkills, setSettings]);
  
  const openDrawingCanvas = useCallback((state: Omit<DrawingCanvasPopupState, 'isOpen' | 'position' | 'onSave'> & { size?: 'normal' | 'compact' }) => {
    const canvasId = `${state.resourceId}-${state.pointId}`;
    setDrawingCanvasState(prev => {
        if (!prev || !prev.isOpen) {
            const openCanvases = [{
                id: canvasId,
                resourceId: state.resourceId,
                pointId: state.pointId,
                name: state.name,
                data: state.initialDrawing,
                isPinned: (settings.pinnedCanvasIds || []).includes(canvasId)
            }];
            (settings.pinnedCanvasIds || []).forEach(pinnedId => {
                if (pinnedId !== canvasId) {
                    const resource = resources.find(r => r.points?.some(p => `${r.id}-${p.id}` === pinnedId));
                    const point = resource?.points?.find(p => `${resource.id}-${p.id}` === pinnedId);
                    if (resource && point) {
                        openCanvases.push({
                            id: pinnedId,
                            resourceId: resource.id,
                            pointId: point.id,
                            name: point.text || 'Untitled Canvas',
                            data: point.drawing,
                            isPinned: true,
                        });
                    }
                }
            });

            return {
                isOpen: true,
                position: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
                openCanvases,
                activeCanvasId: canvasId,
                size: state.size ?? prev?.size ?? 'normal',
            };
        }

        const newOpenCanvases = [...(prev.openCanvases || [])];
        const canvasIndex = newOpenCanvases.findIndex(c => c.id === canvasId);
    
        if (canvasIndex === -1) {
            newOpenCanvases.push({
                id: canvasId,
                resourceId: state.resourceId,
                pointId: state.pointId,
                name: state.name,
                data: state.initialDrawing,
                isPinned: (settings.pinnedCanvasIds || []).includes(canvasId)
            });
        }
    
        return {
            ...prev,
            isOpen: true,
            openCanvases: newOpenCanvases,
            activeCanvasId: canvasId,
            size: state.size ?? prev.size ?? 'normal',
        };
    });
  }, [settings.pinnedCanvasIds, resources]);
  
  const openDrawingCanvasFromHeader = useCallback(() => {
    let scratchpadFolder = resourceFolders.find(f => f.name === 'Scratchpad');
    let updatedFolders = [...resourceFolders];
    let updatedResources = [...resources];
    
    if (!scratchpadFolder) {
        scratchpadFolder = {
            id: 'folder_scratchpad',
            name: 'Scratchpad',
            parentId: null,
            icon: 'Paintbrush'
        };
        updatedFolders.push(scratchpadFolder);
        setResourceFolders(updatedFolders);
    }
  
    let scratchpadResource = resources.find(r => r.folderId === scratchpadFolder!.id && r.name === 'Default Scratchpad');
    
    if (!scratchpadResource) {
        scratchpadResource = {
            id: 'res_scratchpad',
            name: 'Default Scratchpad',
            folderId: scratchpadFolder.id,
            type: 'card',
            createdAt: new Date().toISOString(),
            points: buildDefaultPointsForResourceType('card', []),
        };
        updatedResources.push(scratchpadResource);
    }
    
    let scratchpadPoint = scratchpadResource.points?.find(p => p.type === 'paint');
    
    if (!scratchpadPoint) {
        scratchpadPoint = {
            id: `point_scratchpad_${Date.now()}`,
            text: 'Default Canvas',
            type: 'paint',
        };
        scratchpadResource.points = [...(scratchpadResource.points || []), scratchpadPoint];
    }
    
    setResources(updatedResources);

    openDrawingCanvas({
        resourceId: scratchpadResource.id,
        pointId: scratchpadPoint.id,
        name: scratchpadPoint.text || 'Scratchpad',
        initialDrawing: scratchpadPoint.drawing,
    });
  }, [resources, resourceFolders, setResources, setResourceFolders, openDrawingCanvas]);

  const openCanvasResourceCard = useCallback(() => {
    let updatedFolders = [...resourceFolders];
    let updatedResources = [...resources];
    let shouldUpdate = false;

    let scratchpadFolder = updatedFolders.find(f => f.name === 'Scratchpad' && !f.parentId);
    if (!scratchpadFolder) {
      scratchpadFolder = {
        id: `folder_scratchpad_${Date.now()}`,
        name: 'Scratchpad',
        parentId: null,
        icon: 'Paintbrush'
      };
      updatedFolders.push(scratchpadFolder);
      shouldUpdate = true;
    }

    let canvasResource = updatedResources.find(r => r.type === 'card' && r.name === 'Canvas');
    if (!canvasResource) {
      canvasResource = {
        id: `res_canvas_${Date.now()}`,
        name: 'Canvas',
        folderId: scratchpadFolder.id,
        type: 'card',
        createdAt: new Date().toISOString(),
        points: [
          createDefaultTextPoint(),
          { id: `point_canvas_${Date.now()}`, text: 'Canvas', type: 'paint' }
        ],
      };
      updatedResources.push(canvasResource);
      shouldUpdate = true;
    }

    if (shouldUpdate) {
      setResourceFolders(updatedFolders);
      setResources(updatedResources);
    }

    setGeneralPopups(prev => {
      const newPopups = new Map(prev);
      const hasMarkdown = (canvasResource?.points || []).some(p => p.type === 'markdown' || p.type === 'code');
      const popupWidth = hasMarkdown ? 1280 : 768;
      const x = (window.innerWidth - popupWidth) / 2;
      const y = (window.innerHeight - 600) / 2;

      newPopups.set(canvasResource!.id, {
        popupId: canvasResource!.id,
        resourceId: canvasResource!.id,
        navigationPath: [canvasResource!.id],
        level: 0,
        x,
        y,
        parentId: undefined,
        width: popupWidth,
        z: 140,
      });
      return newPopups;
    });
  }, [resources, resourceFolders, setResources, setResourceFolders, setGeneralPopups]);

  const updateDrawingData = useCallback((canvasId: string, data: string, onSaveComplete: () => void) => {
    const canvasToUpdate = drawingCanvasState?.openCanvases?.find(c => c.id === canvasId);

    setDrawingCanvasState(prev => {
      if (!prev) return null;
      const updatedCanvases = (prev.openCanvases || []).map(c =>
        c.id === canvasId ? { ...c, data } : c
      );
      return { ...prev, openCanvases: updatedCanvases };
    });

    if (canvasToUpdate) {
      setResources(prevResources => {
        const updatedResources = prevResources.map(resource => {
          if (resource.id !== canvasToUpdate.resourceId) return resource;
          return {
            ...resource,
            points: (resource.points || []).map(point =>
              point.id === canvasToUpdate.pointId ? { ...point, drawing: data } : point
            ),
          };
        });
        onSaveComplete();
        return updatedResources;
      });
      return;
    }

    onSaveComplete();
  }, [drawingCanvasState?.openCanvases, setDrawingCanvasState, setResources]);

  const togglePinDrawing = (canvasId: string) => {
    setSettings(prev => {
        const currentPins = new Set(prev.pinnedCanvasIds || []);
        if (currentPins.has(canvasId)) {
            currentPins.delete(canvasId);
        } else {
            currentPins.add(canvasId);
        }
        return { ...prev, pinnedCanvasIds: Array.from(currentPins) };
    });
  };

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
      safeSetLocalStorage('lifeos_theme', newTheme);
    }
  }, []);

  const setGlobalVolume = useCallback((newVolume: number) => {
    setGlobalVolumeState(newVolume);
    if (typeof window !== 'undefined') {
        safeSetLocalStorage('lifeos_global_volume', String(newVolume));
    }
  }, []);

  const openPdfViewer = (resource: Resource, launchContext?: PdfViewerLaunchContext | null) => {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const minWidth = 500;
    const minHeight = 360;
    const horizontalMargin = 20;
    const verticalMargin = 20;
    const maxWidth = Math.max(minWidth, viewportWidth - horizontalMargin * 2);
    const maxHeight = Math.max(minHeight, viewportHeight - verticalMargin * 2);

    const requestedWidth = settings.pdfViewerWidth || 1024;
    const requestedHeight = settings.pdfViewerHeight || Math.max(520, Math.floor(viewportHeight * 0.9));
    const initialWidth = Math.max(minWidth, Math.min(requestedWidth, maxWidth));
    const initialHeight = Math.max(minHeight, Math.min(requestedHeight, maxHeight));

    const defaultX = Math.max(horizontalMargin, viewportWidth - initialWidth - horizontalMargin);
    const defaultY = Math.max(verticalMargin, Math.floor((viewportHeight - initialHeight) / 2));
    const savedX = typeof settings.pdfViewerPositionX === "number" ? settings.pdfViewerPositionX : defaultX;
    const savedY = typeof settings.pdfViewerPositionY === "number" ? settings.pdfViewerPositionY : defaultY;
    const clampedX = Math.max(horizontalMargin, Math.min(savedX, viewportWidth - initialWidth - horizontalMargin));
    const clampedY = Math.max(verticalMargin, Math.min(savedY, viewportHeight - initialHeight - verticalMargin));

    setPdfViewerState({
      isOpen: true,
      resource,
      position: { x: clampedX, y: clampedY },
      size: { width: initialWidth, height: initialHeight },
      launchContext: launchContext || null,
    });
  };

  const handlePdfViewerPopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    if (pdfViewerState && active.id === 'pdf-viewer-popup') {
      setPdfViewerState(prev => {
        if (!prev) return null;
        const nextX = prev.position.x + delta.x;
        const nextY = prev.position.y + delta.y;
        setSettings(current => ({
          ...current,
          pdfViewerPositionX: nextX,
          pdfViewerPositionY: nextY,
        }));
        return {
          ...prev,
          position: {
            x: nextX,
            y: nextY,
          },
        };
      });
    }
  };

  const handleDrawingCanvasPopupDragEnd = useCallback((event: DragEndEvent) => {
    const { active, delta } = event;
    if (drawingCanvasState && active.id === 'drawing-canvas-popup') {
      setDrawingCanvasState(prev => prev ? {
        ...prev,
        position: {
          x: prev.position.x + delta.x,
          y: prev.position.y + delta.y,
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
  
  const logSubTaskTime = useCallback((taskInstanceId: string, durationMinutes: number) => {
    const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
    const taskLog = allLogs.flatMap(log => log.exercises).find(ex => ex.id === taskInstanceId);
  
    if (!taskLog) {
      console.warn(`Could not find task instance with ID: ${taskInstanceId} to log time.`);
      return;
    }
  
    const { definitionId } = taskLog;
    const isUpskill = upskillDefinitions.some(d => d.id === definitionId);
    const setDefinitions = isUpskill ? setUpskillDefinitions : setDeepWorkDefinitions;
    
    const todayKey = format(new Date(), 'yyyy-MM-dd');

    setDefinitions(prevDefs => prevDefs.map(def => {
        if (def.id === definitionId) {
            const newLoggedDuration = (def.loggedDuration || 0) + durationMinutes;
            return {
                ...def,
                loggedDuration: newLoggedDuration,
                last_logged_date: todayKey,
            };
        }
        return def;
    }));
    
    return { definitionId };

  }, [allUpskillLogs, allDeepWorkLogs, upskillDefinitions, deepWorkDefinitions, setUpskillDefinitions, setDeepWorkDefinitions]);

  const handleCreateTask = useCallback(async (activity: Activity, linkedActivityType: ActivityType, microSkillName: string, parentTaskId: string): Promise<{ parentName: string, childName: string, childId: string } | null> => {
    const setDefinitions = linkedActivityType === 'deepwork' ? setDeepWorkDefinitions : setUpskillDefinitions;
    const allDefinitions = linkedActivityType === 'deepwork' ? deepWorkDefinitions : upskillDefinitions;
    let parentName = '';
    let finalParentId = parentTaskId;
    const duration = activeFocusSession?.duration || 25;

    if (parentTaskId === 'new') {
        const parentType = linkedActivityType === 'deepwork' ? 'Intention' : 'Curiosity';
        const newParentDef: ExerciseDefinition = {
            id: id('def'),
            name: `New ${parentType} - ${format(new Date(), 'MMM d')}`,
            category: microSkillName as ExerciseCategory,
            nodeType: parentType as NodeType
        };
        setDefinitions(prev => [...prev, newParentDef]);
        finalParentId = newParentDef.id;
        parentName = newParentDef.name;
    } else {
        const parentDef = allDefinitions.find(d => d.id === parentTaskId);
        if (parentDef) parentName = parentDef.name;
    }

    const childType = linkedActivityType === 'deepwork' ? 'Action' : 'Visualization';
    const newChildDef: ExerciseDefinition = {
        id: id('def'),
        name: `New ${childType} for ${activity.details}`,
        category: microSkillName as ExerciseCategory,
        nodeType: childType as NodeType,
        estimatedDuration: duration,
    };
    setDefinitions(prev => [...prev, newChildDef]);

    // Link child to parent
    setDefinitions(prev => prev.map(def => {
        if (def.id === finalParentId) {
            const linkKey = linkedActivityType === 'deepwork' ? 'linkedDeepWorkIds' : 'linkedUpskillIds';
            return {
                ...def,
                [linkKey]: [...(def[linkKey] || []), newChildDef.id]
            };
        }
        return def;
    }));

    // Update the activity with the new child task instance
    const newWorkoutExercise: WorkoutExercise = {
        id: id('wex'),
        definitionId: newChildDef.id,
        name: newChildDef.name,
        category: newChildDef.category,
        loggedSets: [],
        targetSets: 1,
        targetReps: '1',
    };
    
    const logUpdater = linkedActivityType === 'deepwork' ? setAllDeepWorkLogs : setAllUpskillLogs;
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    
    logUpdater(prev => {
        const logIndex = prev.findIndex(l => l.date === todayKey);
        if (logIndex > -1) {
            const newLogs = [...prev];
            newLogs[logIndex] = {
                ...newLogs[logIndex],
                exercises: [...newLogs[logIndex].exercises, newWorkoutExercise]
            };
            return newLogs;
        }
        return [...prev, { id: todayKey, date: todayKey, exercises: [newWorkoutExercise] }];
    });

    updateActivity({
        ...activity,
        details: newChildDef.name,
        taskIds: [newWorkoutExercise.id],
    });
    
    toast({ title: "Task Created!", description: `"${newChildDef.name}" has been created and linked.` });
    
    return { parentName, childName: newChildDef.name, childId: newChildDef.id };
  }, [deepWorkDefinitions, upskillDefinitions, setDeepWorkDefinitions, setUpskillDefinitions, toast, updateActivity, setAllDeepWorkLogs, setAllUpskillLogs, activeFocusSession?.duration]);
  
  const onOpenFocusModal = useCallback((activity: Activity) => {
    const isPlanningTask = (activity.type === 'upskill' || activity.type === 'deepwork') && activity.linkedEntityType === 'specialization';
    if (isPlanningTask) {
        return false; // Let the other handler take over
    }
    
    const estDurationStr = activity.duration?.toString();
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
    if (isNaN(minutes) || minutes <= 0) minutes = 25;
  
    setFocusDuration(minutes);
    setFocusActivity(activity);
    setFocusSessionModalOpen(true);
    return true;
  }, []);
  
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
        deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, kanbanBoards, mindProgrammingDefinitions, allMindProgrammingLogs,
        resources, resourceFolders,
        canvasLayout, mindsetCards, goals, pistons, skillDomains, coreSkills, projects, companies, positions,
        purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans,
        autoSuggestions,
        pathNodes,
        mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation,
        missedSlotReviews,
        journalSessions,
        mindsetSessions,
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
    weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan, schedule, dailyPurposes, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions, upskillDefinitions, topicGoals, deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans, kanbanBoards, mindProgrammingDefinitions, allMindProgrammingLogs, resources, resourceFolders, canvasLayout, mindsetCards, goals, pistons, skillDomains, coreSkills, projects, companies, positions, purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans, autoSuggestions, pathNodes, mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation, missedSlotReviews, journalSessions, mindsetSessions, topPriorities, brainHacks, settings, pinnedFolderIds, activeResourceTabIds, selectedResourceFolderId, lastSelectedHabitFolder, selectedUpskillTask, selectedDeepWorkTask, selectedMicroSkill, selectedFormalizationSpecId, expandedItems, selectedDomainId, selectedSkillId, selectedProjectId, selectedCompanyId, activeFocusSession, isAgendaDocked, recentItems, pipState, spacedRepetitionData, dailyReviewLogs, abandonmentLogs
  ]);

  const stripLocalOnlySecretsFromPayload = useCallback((payload: any) => {
    if (!payload || typeof payload !== 'object') return payload;
    const main = payload.main && typeof payload.main === 'object' ? payload.main : payload;
    if (!main?.settings || typeof main.settings !== 'object') return payload;
    if (!('supabaseServiceRoleKey' in main.settings)) return payload;

    const sanitizedMain = {
      ...main,
      settings: {
        ...main.settings,
      },
    };
    delete (sanitizedMain.settings as any).supabaseServiceRoleKey;

    if (payload.main && typeof payload.main === 'object') {
      return { ...payload, main: sanitizedMain };
    }
    return sanitizedMain;
  }, []);
  
  const saveState = useCallback(() => {
    if (currentUser?.username) {
        const storageUsername = normalizeUsernameKey(currentUser.username);
        const allData = getAllUserData();
        const mainDataKey = `lifeos_data_${storageUsername}`;
        const uiDataKey = `lifeos_ui_state_${storageUsername}`;
        const mainRefKey = `lifeos_data_ref_${storageUsername}`;
        const serializedMain = JSON.stringify(allData.main);
        const serializedUi = JSON.stringify(allData.ui);
        const persistMainToIndexedDb = async () => {
          await storeBackup(
            getMainBackupKey(storageUsername),
            new Blob([serializedMain], { type: 'application/json' })
          );
          safeSetLocalStorage(mainRefKey, getMainBackupKey(storageUsername));
          localStorage.removeItem(mainDataKey);
          safeSetLocalStorage(uiDataKey, serializedUi);
        };
        const persistToIndexedDbWithGuard = () => {
          void (async () => {
            try {
              await persistMainToIndexedDb();
            } catch (backupError) {
              console.error('Failed to persist data after localStorage quota exceeded:', backupError);
              toast({
                title: "Save Failed",
                description: "Storage is full. Please export a backup or clear old browser data.",
                variant: "destructive"
              });
            }
          })();
        };
        const persistToLocalStorage = () => {
          const wroteMain = safeSetLocalStorage(mainDataKey, serializedMain);
          if (!wroteMain) return false;

          const wroteUi = safeSetLocalStorage(uiDataKey, serializedUi);
          if (!wroteUi) {
            localStorage.removeItem(mainDataKey);
            return false;
          }

          localStorage.removeItem(mainRefKey);
          // Best-effort backup cleanup can thrash a broken IndexedDB instance and freeze normal edits.
          // Keep the stale backup around; localStorage stays the source of truth when mainRefKey is absent.
          return true;
        };

        try {
          const isAlreadyInOverflowMode = !!localStorage.getItem(mainRefKey);
          if (isAlreadyInOverflowMode) {
            void persistMainToIndexedDb().catch((backupError) => {
              console.error('Failed to persist overflow data to IndexedDB:', backupError);
            });
            return;
          }

          const persistedLocally = persistToLocalStorage();
          if (!persistedLocally) {
            persistToIndexedDbWithGuard();
          }
        } catch (error) {
          if (isQuotaExceededStorageError(error)) {
            persistToIndexedDbWithGuard();
          } else {
            console.error('Failed to save app state:', error);
          }
        }
    }
  }, [currentUser, getAllUserData, toast]);

  useEffect(() => {
    if (!isLoadingState) {
        setLocalChangeCount(prev => prev + 1);
    }
  }, [
    isLoadingState, schedule, settings, dailyPurposes, topPriorities, brainHacks, activeFocusSession,
    weightLogs, goalWeight, height, dateOfBirth, gender, dietPlan,
    allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs,
    workoutMode, strengthTrainingMode, workoutPlanRotation, workoutPlans, exerciseDefinitions,
    upskillDefinitions, topicGoals, deepWorkDefinitions, leadGenDefinitions, productizationPlans, offerizationPlans,
    mindProgrammingDefinitions, allMindProgrammingLogs, mindProgrammingCategories, mindProgrammingMode, mindProgrammingPlans, mindProgrammingPlanRotation,
    resources, resourceFolders, pinnedFolderIds, activeResourceTabIds,
    canvasLayout, mindsetCards, pistons, skillDomains, coreSkills, projects, companies, positions,
    purposeData, patterns, metaRules, pillarEquations, skillAcquisitionPlans,
    autoSuggestions, pathNodes, missedSlotReviews, spacedRepetitionData, dailyReviewLogs, abandonmentLogs
]);
  
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
    const fixMojibake = (input: string) => {
      if (!/[ÃÂà¤â€“â€”â€˜â€™â€œâ€�]/.test(input)) return input;
      try {
        const bytes = new Uint8Array(input.length);
        for (let i = 0; i < input.length; i++) bytes[i] = input.charCodeAt(i);
        const decoded = new TextDecoder().decode(bytes);
        return decoded || input;
      } catch {
        return input;
      }
    };

    const normalizeText = (value: any): any => {
      if (typeof value === 'string') return fixMojibake(value);
      if (Array.isArray(value)) return value.map(normalizeText);
      if (value && typeof value === 'object') {
        const out: Record<string, any> = {};
        for (const [k, v] of Object.entries(value)) out[k] = normalizeText(v);
        return out;
      }
      return value;
    };

    const normalizeProjectOwnership = (definitions: any[], defaultNodeType: 'Intention' | 'Curiosity') => {
      return (Array.isArray(definitions) ? definitions : []).map((def) => {
        if (!def || typeof def !== 'object') return def;
        const linkedProjectIds = Array.isArray(def.linkedProjectIds)
          ? def.linkedProjectIds.filter((id: unknown) => typeof id === 'string' && id.trim().length > 0)
          : [];
        const nodeType = typeof def.nodeType === 'string' ? def.nodeType : defaultNodeType;
        const primaryProjectId =
          typeof def.primaryProjectId === 'string' && def.primaryProjectId.trim().length > 0
            ? def.primaryProjectId
            : nodeType === 'Intention' && linkedProjectIds.length > 0
            ? linkedProjectIds[0]
            : null;
        return {
          ...def,
          linkedProjectIds,
          primaryProjectId,
        };
      });
    };

    const sanitizedMain = normalizeText(mainData || {});
    const sanitizedUi = normalizeText(uiData || {});
    setIsLoadingState(true);

    setWeightLogs(sanitizedMain.weightLogs || []);
    setGoalWeight(sanitizedMain.goalWeight || null);
    setHeight(sanitizedMain.height || null);
    setDateOfBirth(sanitizedMain.dateOfBirth || null);
    setGender(sanitizedMain.gender || null);
    setDietPlan(sanitizedMain.dietPlan || []);
    setSchedule(sanitizedMain.schedule || {});
    setDailyPurposes(sanitizedMain.dailyPurposes || {});
    setAllUpskillLogs(sanitizedMain.allUpskillLogs || sanitizedMain.upskillLogs || []);
    setAllDeepWorkLogs(sanitizedMain.allDeepWorkLogs || sanitizedMain.deepWorkLogs || []);
    setAllWorkoutLogs(sanitizedMain.allWorkoutLogs || sanitizedMain.workoutLogs || []);
    setBrandingLogs(sanitizedMain.brandingLogs || []);
    setAllLeadGenLogs(sanitizedMain.allLeadGenLogs || []);
    setAllMindProgrammingLogs(sanitizedMain.allMindProgrammingLogs || []);
    setWorkoutMode(sanitizedMain.workoutMode || 'two-muscle');
    setStrengthTrainingMode(sanitizedMain.strengthTrainingMode || 'resistance');
    setWorkoutPlanRotation(sanitizedMain.workoutPlanRotation === undefined ? true : sanitizedMain.workoutPlanRotation);
    setWorkoutPlans(sanitizedMain.workoutPlans || INITIAL_PLANS);
    setExerciseDefinitions(sanitizedMain.exerciseDefinitions || DEFAULT_EXERCISE_DEFINITIONS);
    setUpskillDefinitions(normalizeProjectOwnership(sanitizedMain.upskillDefinitions || [], 'Curiosity'));
    setTopicGoals(sanitizedMain.topicGoals || sanitizedMain.upskillTopicGoals || {});
    setDeepWorkDefinitions(normalizeProjectOwnership(sanitizedMain.deepWorkDefinitions || [], 'Intention'));
    setLeadGenDefinitions(sanitizedMain.leadGenDefinitions || LEAD_GEN_DEFINITIONS);
    setMindProgrammingDefinitions(sanitizedMain.mindProgrammingDefinitions || DEFAULT_MIND_PROGRAMMING_DEFINITIONS);
    setMindProgrammingCategories(sanitizedMain.mindProgrammingCategories || defaultMindsetCategories);
    setMindProgrammingMode(sanitizedMain.mindProgrammingMode || 'two-muscle');
    setMindProgrammingPlans(sanitizedMain.mindProgrammingPlans || INITIAL_PLANS);
    setMindProgrammingPlanRotation(sanitizedMain.mindProgrammingPlanRotation === undefined ? true : sanitizedMain.mindProgrammingPlanRotation);
    setProductizationPlans(sanitizedMain.productizationPlans || {});
    setOfferizationPlans(sanitizedMain.offerizationPlans || {});
    setKanbanBoards(normalizeKanbanBoards(sanitizedMain.kanbanBoards || [], sanitizedMain.offerizationPlans || {}, sanitizedMain.projects || []));
    // Repair folder/resource relationships from imported payload.
    const rawFolders = Array.isArray(sanitizedMain.resourceFolders) ? sanitizedMain.resourceFolders : [];
    const rawResources = Array.isArray(sanitizedMain.resources) ? sanitizedMain.resources : [];
    const normalizedFolders: ResourceFolder[] = rawFolders
      .filter((f: any) => f && typeof f.id === 'string' && typeof f.name === 'string')
      .map((f: any) => ({
        ...f,
        id: f.id,
        name: f.name,
        parentId: typeof f.parentId === 'string' || f.parentId === null ? f.parentId : null,
      }));

    const folderIds = new Set(normalizedFolders.map((f) => f.id));
    const healedFolders: ResourceFolder[] = normalizedFolders.map((f) => {
      if (typeof f.parentId !== 'string') return f;
      if (f.parentId === f.id || !folderIds.has(f.parentId)) {
        return { ...f, parentId: null };
      }
      return f;
    });

    const updatedFolders: ResourceFolder[] = [...healedFolders];
    let dashboardFolder = updatedFolders.find((f) => f.name === 'Dashboard');
    if (!dashboardFolder) {
      dashboardFolder = { id: 'folder_dashboard', name: 'Dashboard', parentId: null, icon: 'Grid' };
      updatedFolders.push(dashboardFolder);
    }

    let fallbackFolderId =
      updatedFolders.find((f) => f.name === 'Quick Access')?.id ||
      dashboardFolder.id ||
      updatedFolders.find((f) => f.parentId === null)?.id ||
      updatedFolders[0]?.id;

    if (!fallbackFolderId) {
      const recoveredFolder: ResourceFolder = { id: 'folder_recovered', name: 'Recovered', parentId: null, icon: 'Folder' };
      updatedFolders.push(recoveredFolder);
      fallbackFolderId = recoveredFolder.id;
    }

    const updatedFolderIds = new Set(updatedFolders.map((f) => f.id));
    const updatedResources = rawResources
      .filter((r: any) => r && typeof r.id === 'string')
      .map((r: any) => {
        const folderId = typeof r.folderId === 'string' && updatedFolderIds.has(r.folderId) ? r.folderId : fallbackFolderId!;
        return { ...r, folderId };
      });

    const addIfMissing = (name: string, id: string) => {
      if (!updatedResources.some((r: any) => r.name === name)) {
        updatedResources.push({
          id,
          name,
          folderId: dashboardFolder!.id,
          type: 'card',
          createdAt: new Date().toISOString(),
          points: [{ id: `point_${id}_1`, text: `${name} resources`, type: 'text' }],
        });
      }
    };

    addIfMissing('Health', 'res_health');
    addIfMissing('Wealth', 'res_wealth');
    addIfMissing('Growth', 'res_growth');
    addIfMissing('Direction', 'res_direction');

    setResourceFolders(updatedFolders);
    setResources(updatedResources as Resource[]);
    setCanvasLayout(sanitizedMain.canvasLayout || { nodes: [], edges: [] });
    setMindsetCards(sanitizedMain.mindsetCards || []);
    setGoals(sanitizedMain.goals || []);
    setPistons(sanitizedMain.pistons || {});
    setSkillDomains(sanitizedMain.skillDomains || []);
    setCoreSkills(sanitizedMain.coreSkills || []);
    setProjects(sanitizedMain.projects || []);
    setCompanies(sanitizedMain.companies || []);
    setPositions(sanitizedMain.positions || []);
    setPurposeData(sanitizedMain.purposeData || { statement: '', specializationPurposes: {}, pillarCards: [] });
    setPatterns(sanitizedMain.patterns || []);
    setMetaRules(sanitizedMain.metaRules || []);
    setPillarEquations(sanitizedMain.pillarEquations || {});
    setSkillAcquisitionPlans(sanitizedMain.skillAcquisitionPlans || []);
    setAutoSuggestions(sanitizedMain.autoSuggestions || {});
    setPathNodes(sanitizedMain.pathNodes || []);
    setMissedSlotReviews(sanitizedMain.missedSlotReviews || {});
    setJournalSessions(sanitizedMain.journalSessions || []);
    setMindsetSessions(sanitizedMain.mindsetSessions || []);
    setTopPriorities(sanitizedMain.topPriorities || []);
    setBrainHacks(sanitizedMain.brainHacks || []);
    setSpacedRepetitionData(sanitizedMain.spacedRepetitionData || {});
    setDailyReviewLogs(sanitizedMain.dailyReviewLogs || []);
    setAbandonmentLogs(sanitizedMain.abandonmentLogs || []);
    
    // UI State
    const safeFolderIds = new Set(updatedFolders.map((f) => f.id));
    const safePinnedFolderIds = (sanitizedUi.pinnedFolderIds || []).filter((id: string) => safeFolderIds.has(id));
    const safeActiveTabs = (sanitizedUi.activeResourceTabIds || []).filter((id: string) => safeFolderIds.has(id));
    const safeSelectedFolderId =
      sanitizedUi.selectedResourceFolderId && safeFolderIds.has(sanitizedUi.selectedResourceFolderId)
        ? sanitizedUi.selectedResourceFolderId
        : (safeActiveTabs[0] || updatedFolders.find((f) => f.parentId === null)?.id || null);
    setPinnedFolderIds(new Set(safePinnedFolderIds));
    setActiveResourceTabIds(safeActiveTabs);
    setSelectedResourceFolderId(safeSelectedFolderId);
    setLastSelectedHabitFolder(sanitizedUi.lastSelectedHabitFolder || null);
    setSelectedUpskillTask(sanitizedUi.selectedUpskillTask || null);
    setSelectedDeepWorkTask(sanitizedUi.selectedDeepWorkTask || null);
    setSelectedMicroSkill(sanitizedUi.selectedMicroSkill || null);
    setSelectedFormalizationSpecId(sanitizedUi.selectedFormalizationSpecId || null);
    setExpandedItems(sanitizedUi.expandedItems || []);
    setSelectedDomainId(sanitizedUi.selectedDomainId || null);
    setSelectedSkillId(sanitizedUi.selectedSkillId || null);
    setSelectedProjectId(sanitizedUi.selectedProjectId || null);
    setSelectedCompanyId(sanitizedUi.selectedCompanyId || null);
    setRecentItems(sanitizedUi.recentItems || []);
    setIsAgendaDocked(sanitizedUi.isAgendaDocked === undefined ? true : sanitizedUi.isAgendaDocked);
    setPipState(sanitizedUi.pipState || { isOpen: false, position: { x: 0, y: 0 }, size: { width: 448, height: 252 } });
    
    if (sanitizedUi.activeFocusSession) {
        const restoredSession: ActiveFocusSession = sanitizedUi.activeFocusSession;
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
        ispSimpleMode: true,
        ispSimpleKeepCanvasAndBotherings: true,
        carryForward: true, autoPush: false, autoPushLimit: 100, 
        carryForwardEssentials: true, carryForwardNutrition: false,
        smartLogging: false, defaultHabitLinks: {}, routines: [],
        debtBalance: 0,
        financeMonthKey: new Date().toISOString().slice(0, 7),
        financeMonthlyIncome: 0,
        financeMonthlyOutflow: 0,
        financeNetBalance: 0,
        holidays: [],
        workoutScheduling: 'day-of-week',
        slotRules: {},
        widgetVisibility: { agenda: true, smartLogging: false, pistons: false, mindset: false, activityDistribution: false, favorites: false, topPriorities: false, goals: false, brainHacks: false, ruleEquations: false, visualizationTechniques: false, spacedRepetition: false },
        allWidgetsVisible: false,
        agendaShowCurrentSlotOnly: false,
        spacedRepetitionSlot: 'Late Night',
          pinnedCanvasIds: [],
          coreStateManualOverrides: {},
          githubModuleHashes: {},
          githubPulledHashes: {},
          githubFetchMissingOnly: true,
          routineRebalanceLearning: {
            history: [],
          },
          routineSkipByDate: {},
          routineSourceOverrides: {},
      pdfLastOpenedPageByResourceId: {},
      pdfDailyPageTargetByResourceId: {},
      pdfDailyPageStatsByResourceId: {},
      pdfAnnotationsByResourceId: {},
      pdfLinkedCanvasByResourceId: {},
      pdfDiagramTextByResourceId: {},
          flashcardSessions: [],
          flashcardTopicTablesBySpecializationId: {},
          learningPerformanceDailyLogs: {},
          supabasePdfBucket: 'pdfs',
          xttsTtsBaseUrl: '',
          xttsVoiceSamplePath: '',
          xttsVoiceName: 'my_voice',
          xttsLanguage: 'en',
          astraReplyLanguage: 'auto',
          localSttBaseUrl: '',
          ai: normalizeAiSettings(undefined, typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop)),
      };
    const incomingSettings = (sanitizedMain.settings || {}) as Partial<UserSettings>;
    setSettings((prev) => ({
      ...defaultSettings,
      ...incomingSettings,
      // Session-only behavior: always start with widgets hidden on fresh app launch.
      allWidgetsVisible: false,
      ai: normalizeAiSettings(
        {
          ...(defaultSettings.ai || {}),
          ...(prev.ai || {}),
          ...(incomingSettings.ai || {}),
        },
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop)
      ),
      flashcardSessions: Array.isArray(incomingSettings.flashcardSessions)
        ? incomingSettings.flashcardSessions
        : defaultSettings.flashcardSessions,
      flashcardTopicTablesBySpecializationId:
        incomingSettings.flashcardTopicTablesBySpecializationId &&
        typeof incomingSettings.flashcardTopicTablesBySpecializationId === 'object'
          ? incomingSettings.flashcardTopicTablesBySpecializationId
          : defaultSettings.flashcardTopicTablesBySpecializationId,
      supabaseServiceRoleKey: incomingSettings.supabaseServiceRoleKey ?? prev.supabaseServiceRoleKey,
      // Keep local hash maps if imported payload does not include them.
      githubModuleHashes:
        incomingSettings.githubModuleHashes && Object.keys(incomingSettings.githubModuleHashes).length > 0
          ? incomingSettings.githubModuleHashes
          : (prev.githubModuleHashes || {}),
      githubPulledHashes:
        incomingSettings.githubPulledHashes && Object.keys(incomingSettings.githubPulledHashes).length > 0
          ? incomingSettings.githubPulledHashes
          : (prev.githubPulledHashes || {}),
    }));


    setTimeout(() => setIsLoadingState(false), 100);
  }, []);
  
  const loadState = useCallback(async (username: string) => {
    const normalizedUsername = normalizeUsernameKey(username);
    const normalizedMainKey = `lifeos_data_${normalizedUsername}`;
    const normalizedUiKey = `lifeos_ui_state_${normalizedUsername}`;
    const normalizedMainRefKey = `lifeos_data_ref_${normalizedUsername}`;
    const mainEntry = getUserScopedStorageValue('lifeos_data_', username);
    const uiEntry = getUserScopedStorageValue('lifeos_ui_state_', username);
    const mainRefEntry = getUserScopedStorageValue('lifeos_data_ref_', username);
    let mainDataString = mainEntry?.value ?? null;
    const uiDataString = uiEntry?.value ?? null;

    if (!mainDataString) {
      const backupRef = mainRefEntry?.value || getMainBackupKey(username);
      try {
        const backupBlob = await getBackup(backupRef);
        if (backupBlob) {
          mainDataString = await backupBlob.text();
        }
      } catch (error) {
        console.error("Failed to load backup data from IndexedDB", error);
      }
    }
    
    if (mainDataString) {
      try {
        const parsedMainData = JSON.parse(mainDataString);
        const parsedUiData = uiDataString ? JSON.parse(uiDataString) : {};
        const normalized = normalizePersistedPayload(parsedMainData);
        if (!normalized) throw new Error('Local payload is not a valid object.');
        const mainData = normalized.main;
        const uiData = Object.keys(normalized.ui || {}).length > 0 ? normalized.ui : parsedUiData;
        if (mainEntry?.key && mainEntry.key !== normalizedMainKey) {
          safeSetLocalStorage(normalizedMainKey, mainEntry.value);
        }
        if (uiEntry?.key && uiEntry.key !== normalizedUiKey) {
          safeSetLocalStorage(normalizedUiKey, uiEntry.value);
        }
        if (mainRefEntry?.key && mainRefEntry.key !== normalizedMainRefKey) {
          safeSetLocalStorage(normalizedMainRefKey, mainRefEntry.value);
        }
        loadImportedData(mainData, uiData);
      } catch (error) {
        console.error("Failed to parse data from localStorage", error);
        toast({ title: "Load Error", description: "Could not load your saved data.", variant: "destructive" });
      }
    } else {
      setIsLoadingState(false);
    }
  }, [loadImportedData, toast]);
  
  const register = async (username: string, password: string, email: string) => {
    setLoading(true);
    const { success, message, user } = await localRegisterUser(username, password, email);
    if (success && user) {
      setCurrentUser(user);
      router.push('/my-plate');
      toast({ title: "Success", description: message });
    } else {
      toast({ title: "Error", description: message, variant: "destructive" });
    }
    setLoading(false);
  };

  const signIn = async (username: string, password: string, opts?: { force?: boolean }) => {
      setLoading(true);
      try {
        const trimmedUsername = username.trim();
        const isDemoLogin = trimmedUsername.toLowerCase() === 'demo';
        const loginUsername = isDemoLogin ? 'demo' : trimmedUsername;
        const { success, message, user, code } = await localLoginUser(loginUsername, password, opts);
        if (success && user) {
            setCurrentUser(user);
            let didLoadData = false;
            const localMainEntry = getUserScopedStorageValue('lifeos_data_', user.username);
            const localMainRefEntry = getUserScopedStorageValue('lifeos_data_ref_', user.username);
            const localMainDataString = localMainEntry?.value ?? null;
            const hasLocalMainState = !!localMainDataString || !!localMainRefEntry?.value;
    
            try {
              if (user.username === 'demo') {
                  if (hasLocalMainState) {
                    await loadState(user.username);
                    didLoadData = true;
                  } else {
                    await pullDataFromCloud(user.username);
                  }
              } else {
                if (hasLocalMainState) {
                    await loadState(user.username);
                    didLoadData = true;
                } else {
                    const mainDataResponse = await fetch(`/api/blob-sync?username=${user.username.toLowerCase()}`, {
                      credentials: 'include',
                    });
                    if (mainDataResponse.ok) {
                        const mainDataResult = await mainDataResponse.json();
                        if (typeof mainDataResult?.revision === 'number') {
                          cloudRevisionRef.current = mainDataResult.revision;
                        }
                        if (mainDataResult.data) {
                            const normalizedCloud = normalizePersistedPayload(mainDataResult.data);
                            if (!normalizedCloud) {
                              throw new Error('Cloud payload is malformed.');
                            }
                            const githubSettingsResponse = await fetch(`/api/github-settings?username=${user.username.toLowerCase()}`, {
                              credentials: 'include',
                            });
                            if (githubSettingsResponse.ok) {
                                const githubSettingsResult = await githubSettingsResponse.json();
                                if (githubSettingsResult.settings) {
                                    const currentMainSettings = normalizedCloud.main?.settings || {};
                                    const combinedSettings = { ...currentMainSettings, ...githubSettingsResult.settings };
                                    normalizedCloud.main.settings = combinedSettings;
                                }
                            }
                            loadImportedData(normalizedCloud.main, normalizedCloud.ui || {});
                            didLoadData = true;
                        }
                    }
                }
              }
            } catch (syncError) {
              console.error('Post-login cloud sync failed. Continuing with local session.', syncError);
              toast({
                title: "Partial Sync",
                description: "Logged in, but cloud data sync failed. Opening dashboard with available local data.",
                variant: "default",
              });
            }

            if (!didLoadData) {
              setIsLoadingState(false);
            }
            
            await hydrateGitHubSettings(user.username);
          
            router.push('/my-plate');
            toast({ title: "Success", description: message });
        } else {
            if (code === "SESSION_ACTIVE") {
                toast({ title: "Session Active", description: message, variant: "destructive" });
            } else {
                toast({ title: "Error", description: message, variant: "destructive" });
            }
        }
        return { success, message, code };
      } finally {
        setLoading(false);
      }
  };

  const signOut = async () => {
    setLoading(true);
    await localLogoutUser();
    cloudRevisionRef.current = null;
    setCurrentUser(null);
    setDesktopAccess(createEmptyDesktopAccessState());
    router.push('/login');
    setLoading(false);
  };

  const ensureCloudSession = useCallback(async () => {
    if (!currentUser?.username) {
      return {
        success: false,
        message: 'You are not signed in.',
      };
    }

    const refreshed = await refreshSessionFromStoredToken(currentUser.username);
    if (refreshed.success) {
      if (refreshed.user) {
        setCurrentUser(refreshed.user);
      }
      return {
        success: true,
        message: refreshed.message || 'Session refreshed.',
      };
    }

    return {
      success: false,
      message: 'Your local session is available, but your cloud sign-in expired. Please sign in again to continue using admin and cloud features.',
    };
  }, [currentUser?.username]);

  const refreshDesktopAccess = useCallback(async () => {
    if (!currentUser?.username) {
      setDesktopAccess(createEmptyDesktopAccessState());
      return;
    }

    setDesktopAccessLoading(true);
    try {
      let response = await fetch('/api/desktop-access', {
        credentials: 'include',
        cache: 'no-store',
        headers: createDesktopAuthHeaders(currentUser.username),
      });
      if (response.status === 401) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message);
        }
        response = await fetch('/api/desktop-access', {
          credentials: 'include',
          cache: 'no-store',
          headers: createDesktopAuthHeaders(currentUser.username),
        });
      }
      const result = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to load desktop access state.');
      }
      const nextAccess = result?.access || createEmptyDesktopAccessState();
      setDesktopAccess(nextAccess);
      persistDesktopEntitlementSnapshot(currentUser.username, {
        paymentCompleted: Boolean(nextAccess.grantedAt),
        purchaseDate: nextAccess.grantedAt,
        expiresAt: nextAccess.expiresAt,
        isPriviledge: false,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : '';
      if (!/cloud sign-in expired|sign in again|session expired/i.test(message)) {
        console.error('Failed to refresh desktop access:', error);
      }
      const cachedAccess = getCachedDesktopAccessState(currentUser.username);
      setDesktopAccess(cachedAccess || createEmptyDesktopAccessState());
    } finally {
      setDesktopAccessLoading(false);
    }
  }, [currentUser?.username, ensureCloudSession]);

  const startDesktopCheckout = useCallback(async (provider: DesktopPaymentProvider, planId?: string | null) => {
    if (!currentUser?.username) {
      return {
        success: false,
        message: 'You must be signed in to buy desktop access.',
        access: createEmptyDesktopAccessState(),
        sessionId: null,
        checkoutUrl: null,
        checkoutData: null,
      };
    }

    setDesktopAccessLoading(true);
    try {
      let response = await fetch('/api/desktop-access/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createDesktopAuthHeaders(currentUser.username),
        },
        credentials: 'include',
        body: JSON.stringify({ provider, username: currentUser.username, planId: planId || undefined }),
      });
      if (response.status === 401) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message);
        }
        response = await fetch('/api/desktop-access/start', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...createDesktopAuthHeaders(currentUser.username),
          },
          credentials: 'include',
          body: JSON.stringify({ provider, username: currentUser.username, planId: planId || undefined }),
        });
      }
      const result = await response.json().catch(() => null);
      const nextAccess = result?.access || createEmptyDesktopAccessState();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to start desktop checkout.');
      }
      setDesktopAccess(nextAccess);
      return {
        success: true,
        message: result?.message || 'Desktop checkout started.',
        access: nextAccess,
        sessionId: result?.sessionId || null,
        checkoutUrl: result?.checkoutUrl || null,
        checkoutData: result?.checkoutData || null,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to start desktop checkout.';
      return {
        success: false,
        message,
        access: desktopAccess,
        sessionId: null,
        checkoutUrl: null,
        checkoutData: null,
      };
    } finally {
      setDesktopAccessLoading(false);
    }
  }, [currentUser?.username, desktopAccess, ensureCloudSession]);

  const confirmDesktopCheckout = useCallback(async (sessionId: string, provider?: DesktopPaymentProvider, paymentDetails?: { providerSessionId?: string; providerOrderId?: string; providerSignature?: string }) => {
    if (!currentUser?.username) {
      return {
        success: false,
        message: 'You must be signed in to confirm desktop access.',
        access: createEmptyDesktopAccessState(),
      };
    }

    setDesktopAccessLoading(true);
    try {
      let response = await fetch('/api/desktop-access/confirm', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...createDesktopAuthHeaders(currentUser.username),
        },
        credentials: 'include',
        body: JSON.stringify({
          sessionId,
          username: currentUser.username,
          provider,
          providerSessionId: paymentDetails?.providerSessionId,
          providerOrderId: paymentDetails?.providerOrderId,
          providerSignature: paymentDetails?.providerSignature,
        }),
      });
      if (response.status === 401) {
        const refreshed = await ensureCloudSession();
        if (!refreshed.success) {
          throw new Error(refreshed.message);
        }
        response = await fetch('/api/desktop-access/confirm', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...createDesktopAuthHeaders(currentUser.username),
          },
          credentials: 'include',
          body: JSON.stringify({
            sessionId,
            username: currentUser.username,
            provider,
            providerSessionId: paymentDetails?.providerSessionId,
            providerOrderId: paymentDetails?.providerOrderId,
            providerSignature: paymentDetails?.providerSignature,
          }),
        });
      }
      const result = await response.json().catch(() => null);
      const nextAccess = result?.access || createEmptyDesktopAccessState();
      if (!response.ok) {
        throw new Error(result?.error || 'Failed to confirm desktop checkout.');
      }
      setDesktopAccess(nextAccess);
      persistDesktopEntitlementSnapshot(currentUser.username, {
        paymentCompleted: Boolean(nextAccess.grantedAt),
        purchaseDate: nextAccess.grantedAt,
        expiresAt: nextAccess.expiresAt,
        isPriviledge: false,
      });
      return {
        success: true,
        message: result?.message || 'Desktop access unlocked.',
        access: nextAccess,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to confirm desktop checkout.';
      return {
        success: false,
        message,
        access: desktopAccess,
      };
    } finally {
      setDesktopAccessLoading(false);
    }
  }, [currentUser?.username, desktopAccess, ensureCloudSession]);
  
  const pushDemoDataWithToken = async (token: string) => {
    const username = 'demo';
    if (!token || token.trim() === '') {
        toast({ title: "Update Cancelled", description: "No override token was provided.", variant: "default" });
        return;
    }
    
    toast({ title: "Syncing...", description: "Pushing demo data to the cloud." });
    try {
        const allUserData = stripLocalOnlySecretsFromPayload(getAllUserData().main);
        const requestBody = {
          username,
          data: allUserData,
          demo_override_token: token,
          baseRevision: cloudRevisionRef.current ?? 0,
        };
        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestBody),
        });
        const result = await response.json();
        if (response.status === 409 && typeof result?.serverRevision === 'number') {
            cloudRevisionRef.current = result.serverRevision;
        }
        if (!response.ok) {
            throw new Error(result.error || 'Failed to push data.');
        }
        if (typeof result?.revision === 'number') {
          cloudRevisionRef.current = result.revision;
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
        const allUserData = stripLocalOnlySecretsFromPayload(getAllUserData());
        const requestBody = { username, data: allUserData, baseRevision: cloudRevisionRef.current ?? 0 };
        const response = await fetch('/api/blob-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify(requestBody),
        });

        const result = await response.json();
        if (response.status === 409 && typeof result?.serverRevision === 'number') {
            cloudRevisionRef.current = result.serverRevision;
        }
        if (!response.ok) {
            throw new Error(result.error || 'Failed to push data.');
        }
        if (typeof result?.revision === 'number') {
          cloudRevisionRef.current = result.revision;
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

    let didLoadData = false;
    try {
        const response = await fetch(`/api/blob-sync?username=${effectiveUsername.toLowerCase()}`, {
          credentials: 'include',
        });
        
        if (!response.ok) {
            const errorResult = await response.json().catch(() => ({ error: `HTTP error! status: ${response.status}` }));
            throw new Error(errorResult.error || 'Failed to fetch data.');
        }

        const result = await response.json();
        if (typeof result?.revision === 'number') {
          cloudRevisionRef.current = result.revision;
        }
        const localDataIsEmpty = coreSkills.length === 0 && projects.length === 0;

        if (result?.data) {
            const normalizedCloud = normalizePersistedPayload(result.data);
            if (!normalizedCloud) {
              throw new Error("Cloud payload is malformed.");
            }
            const githubSettingsResponse = await fetch(`/api/github-settings?username=${effectiveUsername.toLowerCase()}`, {
              credentials: 'include',
            });
            if (githubSettingsResponse.ok) {
                const githubSettingsResult = await githubSettingsResponse.json();
                if (githubSettingsResult.settings) {
                    const currentMainSettings = normalizedCloud.main?.settings || {};
                    normalizedCloud.main.settings = { ...currentMainSettings, ...githubSettingsResult.settings };
                }
            }
            loadImportedData(normalizedCloud.main, normalizedCloud.ui || {});
            didLoadData = true;
            toast({ title: "Sync Successful", description: "Data pulled from cloud and loaded." });
        } else if (!localDataIsEmpty) {
            toast({ title: "No Data Found", description: result?.message || "No data was found in the cloud for this user." });
        } else if (result?.message) {
            toast({ title: "No Data Found", description: result.message });
        } else {
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
    } finally {
        if (!didLoadData) {
          setIsLoadingState(false);
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

  const mergeGitHubSettings = useCallback((incoming?: Partial<UserSettings>) => {
    if (!incoming) return;
    setSettings(prev => ({
      ...prev,
      githubToken: prev.githubToken || incoming.githubToken,
      githubOwner: prev.githubOwner || incoming.githubOwner,
      githubRepo: prev.githubRepo || incoming.githubRepo,
      githubPath: prev.githubPath || incoming.githubPath,
      githubFetchMissingOnly:
        prev.githubFetchMissingOnly ?? (incoming.githubFetchMissingOnly ?? prev.githubFetchMissingOnly ?? true),
    }));
  }, [setSettings]);

  const hydrateGitHubSettings = useCallback(async (username: string) => {
    try {
      const response = await fetch(`/api/github-settings?username=${username.toLowerCase()}`, {
        credentials: 'include',
      });
      if (!response.ok) return;
      const result = await response.json();
      if (result?.settings) {
        mergeGitHubSettings(result.settings);
      }
    } catch (error) {
      console.debug("Failed to hydrate GitHub settings:", error);
    }
  }, [mergeGitHubSettings]);

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
  
  const activityDurations = useMemo(() => {
    const durations: Record<string, string> = {};
  
    Object.values(schedule).flat().forEach((dayActivities) => {
      Object.values(dayActivities).flat().forEach((activity: Activity) => {
        if (!activity) return;
        
        let netMinutes = 0;
  
        if (activity.completed) {
          if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
            const durationMs = activity.focusSessionEndTime - activity.focusSessionInitialStartTime;
            const pauseMs = (activity.focusSessionPauses || []).reduce((sum, p) => sum + (p.resumeTime ? p.resumeTime - p.pauseTime : 0), 0);
            netMinutes = Math.round((durationMs - pauseMs) / 60000);
          } else if (activity.duration) {
            netMinutes = activity.duration;
          } else {
             const dateKey = Object.keys(schedule).find(key => 
                Object.values(schedule[key]).flat().some(act => act.id === activity.id)
             );
             if (dateKey) {
                const logsForDay = [
                    ...allUpskillLogs.find(l => l.date === dateKey)?.exercises || [],
                    ...allDeepWorkLogs.find(l => l.date === dateKey)?.exercises || [],
                    ...allWorkoutLogs.find(l => l.date === dateKey)?.exercises || [],
                    ...brandingLogs.find(l => l.date === dateKey)?.exercises || [],
                    ...allLeadGenLogs.find(l => l.date === dateKey)?.exercises || [],
                    ...allMindProgrammingLogs.find(l => l.date === dateKey)?.exercises || [],
                ];
                
                const relevantLogs = logsForDay.filter(ex => activity.taskIds?.includes(ex.id));
                
                netMinutes = relevantLogs.reduce((total, ex) => {
                    const durationPerSet = (activity.type === 'upskill' || activity.type === 'workout') ? ex.loggedSets.reduce((sum, set) => sum + (set.reps || 0), 0) : ex.loggedSets.reduce((sum, set) => sum + (set.weight || 0), 0);
                    return total + durationPerSet;
                }, 0);
             }
          }
        }
  
        if (netMinutes > 0) {
          const hours = Math.floor(netMinutes / 60);
          const minutes = netMinutes % 60;
          durations[activity.id] = hours > 0 ? `${hours}h ${minutes}m` : `${minutes} min`;
        }
      });
    });
    return durations;
  }, [schedule, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs]);

  const expectedActivityDurations = useMemo(() => {
    const formatDuration = (minutes: number) => {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return hours > 0 ? `${hours}h ${mins}m` : `${mins} min`;
    };
    const normalizeText = (value: string | undefined) => {
      const raw = (value || '').toLowerCase().trim();
      if (!raw) return '';
      return raw
        .replace(/&/g, ' and ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    };
    const routineIds = new Set((settings.routines || []).map((routine) => routine.id));

    const upskillByDate = new Map(allUpskillLogs.map((log) => [log.date, log.exercises || []]));
    const deepWorkByDate = new Map(allDeepWorkLogs.map((log) => [log.date, log.exercises || []]));
    const workoutByDate = new Map(allWorkoutLogs.map((log) => [log.date, log.exercises || []]));
    const brandingByDate = new Map(brandingLogs.map((log) => [log.date, log.exercises || []]));
    const leadGenByDate = new Map(allLeadGenLogs.map((log) => [log.date, log.exercises || []]));
    const mindsetByDate = new Map(allMindProgrammingLogs.map((log) => [log.date, log.exercises || []]));

    const getHistoryKey = (activity: Activity): string | null => {
      const baseMatch = activity.id.match(/_(\d{4}-\d{2}-\d{2})$/);
      const baseId = baseMatch ? activity.id.slice(0, -11) : activity.id;
      if (routineIds.has(baseId)) return `routine:${baseId}`;
      if (routineIds.has(activity.id)) return `routine:${activity.id}`;
      for (const taskId of activity.taskIds || []) {
        if (routineIds.has(taskId)) return `routine:${taskId}`;
      }

      const normalizedDetails = normalizeText(activity.details);
      if (!normalizedDetails) return null;
      return `signature:${activity.type}:${normalizedDetails}`;
    };

    const getNetMinutes = (activity: Activity, dateKey: string): number => {
      if (!activity.completed) return 0;
      if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
        const durationMs = activity.focusSessionEndTime - activity.focusSessionInitialStartTime;
        const pauseMs = (activity.focusSessionPauses || []).reduce((sum, pause) => {
          return sum + (pause.resumeTime ? pause.resumeTime - pause.pauseTime : 0);
        }, 0);
        return Math.max(0, Math.round((durationMs - pauseMs) / 60000));
      }
      if (activity.duration) {
        return Math.max(0, activity.duration);
      }
      if (activity.focusSessionInitialDuration) {
        return Math.max(0, activity.focusSessionInitialDuration);
      }

      const logsForDay = [
        ...(upskillByDate.get(dateKey) || []),
        ...(deepWorkByDate.get(dateKey) || []),
        ...(workoutByDate.get(dateKey) || []),
        ...(brandingByDate.get(dateKey) || []),
        ...(leadGenByDate.get(dateKey) || []),
        ...(mindsetByDate.get(dateKey) || []),
      ];
      const relevantLogs = logsForDay.filter((exercise) => activity.taskIds?.includes(exercise.id));
      return relevantLogs.reduce((total, exercise) => {
        const durationPerSet = (activity.type === 'upskill' || activity.type === 'workout')
          ? exercise.loggedSets.reduce((sum, set) => sum + (set.reps || 0), 0)
          : exercise.loggedSets.reduce((sum, set) => sum + (set.weight || 0), 0);
        return total + durationPerSet;
      }, 0);
    };

    const historyByKey = new Map<string, { dateKey: string; timestamp: number; minutes: number }[]>();
    Object.entries(schedule).forEach(([dateKey, daySchedule]) => {
      const timestamp = parseISO(dateKey).getTime();
      if (Number.isNaN(timestamp)) return;
      Object.values(daySchedule).flat().forEach((activity: Activity) => {
        if (!activity || !activity.completed) return;
        const historyKey = getHistoryKey(activity);
        if (!historyKey) return;
        const minutes = getNetMinutes(activity, dateKey);
        if (minutes <= 0) return;
        if (!historyByKey.has(historyKey)) {
          historyByKey.set(historyKey, []);
        }
        historyByKey.get(historyKey)!.push({ dateKey, timestamp, minutes });
      });
    });

    historyByKey.forEach((entries) => {
      entries.sort((a, b) => a.timestamp - b.timestamp);
    });

    const MIN_LOGGED_DAYS = 7;
    const MAX_LOGGED_DAYS = 30;
    const estimateCache = new Map<string, string>();
    const expectedDurations: Record<string, string> = {};

    Object.entries(schedule).forEach(([dateKey, daySchedule]) => {
      const targetTimestamp = parseISO(dateKey).getTime();
      if (Number.isNaN(targetTimestamp)) return;
      Object.values(daySchedule).flat().forEach((activity: Activity) => {
        if (!activity || activity.completed) return;
        const historyKey = getHistoryKey(activity);
        if (!historyKey) return;
        const cacheKey = `${historyKey}|${dateKey}`;
        if (estimateCache.has(cacheKey)) {
          const cached = estimateCache.get(cacheKey);
          if (cached) expectedDurations[activity.id] = cached;
          return;
        }

        const history = (historyByKey.get(historyKey) || []).filter((entry) => entry.timestamp <= targetTimestamp);
        const recentHistory = history.slice(-MAX_LOGGED_DAYS);
        if (recentHistory.length < MIN_LOGGED_DAYS) {
          estimateCache.set(cacheKey, '');
          return;
        }

        let weightedMinutes = 0;
        let totalWeight = 0;
        recentHistory.forEach((entry, index) => {
          const weight = index + 1;
          weightedMinutes += entry.minutes * weight;
          totalWeight += weight;
        });
        if (totalWeight <= 0) {
          estimateCache.set(cacheKey, '');
          return;
        }
        const estimate = Math.round(weightedMinutes / totalWeight);
        if (estimate <= 0) {
          estimateCache.set(cacheKey, '');
          return;
        }
        const formatted = formatDuration(estimate);
        estimateCache.set(cacheKey, formatted);
        expectedDurations[activity.id] = formatted;
      });
    });

    return expectedDurations;
  }, [schedule, settings.routines, allUpskillLogs, allDeepWorkLogs, allWorkoutLogs, brandingLogs, allLeadGenLogs, allMindProgrammingLogs]);

  const handleToggleComplete = useCallback((slotName: string, activityId: string, isCompleted?: boolean) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let activityToUpdate: Activity | undefined;
    let targetDateKey = todayKey;
    let targetSlot = slotName;

    const daySchedule = schedule[todayKey] || {};
    if (daySchedule[slotName]) {
        const activities = [...(daySchedule[slotName] as Activity[])];
        const activityIndex = activities.findIndex(a => a.id === activityId);
        
        if (activityIndex > -1) {
            activityToUpdate = activities[activityIndex];
        }
    }

    if (!activityToUpdate) {
        const match = activityId.match(/_(\d{4}-\d{2}-\d{2})$/);
        const inferredDateKey = match?.[1] || todayKey;
        const baseId = match ? activityId.slice(0, -11) : activityId;
        const routine = (settings.routines || []).find(r => r.id === baseId);
        if (routine) {
            targetDateKey = inferredDateKey;
            targetSlot = routine.slot || slotName;
            const fallbackTaskIds = routine.taskIds && routine.taskIds.length > 0 ? routine.taskIds : [baseId];
            activityToUpdate = { ...routine, id: activityId, completed: false, isRoutine: false, taskIds: fallbackTaskIds };
            setSchedule(prev => {
                const next = { ...prev };
                const day = { ...(next[targetDateKey] || {}) };
                const slotActivities = [...((day[targetSlot as SlotName] as Activity[]) || [])];
                if (!slotActivities.some(a => a.id === activityId)) {
                    slotActivities.push(activityToUpdate!);
                }
                day[targetSlot as SlotName] = slotActivities;
                next[targetDateKey] = day;
                return next;
            });
        }
    }

    if (!activityToUpdate) return;

    const shouldBeCompleted = isCompleted !== undefined ? isCompleted : !activityToUpdate.completed;
    const baseMatch = activityToUpdate.id.match(/_(\d{4}-\d{2}-\d{2})$/);
    if (shouldBeCompleted && !activityToUpdate.completed && activityToUpdate.type === 'spaced-repetition') {
        const linkedTaskId = activityToUpdate.taskIds?.[0];
        let definitionId: string | undefined;
        let matchedDefinitionCategory: string | undefined;
        let matchedDefinitionMicroSkillIds: string[] = [];
        let isUpskillLog = false;

        if (linkedTaskId) {
            const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
            const taskLogInstance = allLogs.flatMap(log => log.exercises).find(ex => ex.id === linkedTaskId);
            if (taskLogInstance) {
                definitionId = taskLogInstance.definitionId;
                isUpskillLog = allUpskillLogs.some(log => log.exercises.some(ex => ex.id === linkedTaskId));
            } else {
                const allDefs = [...upskillDefinitions, ...deepWorkDefinitions];
                const def = allDefs.find(d => d.id === linkedTaskId);
                if (def) {
                    definitionId = def.id;
                    isUpskillLog = upskillDefinitions.some(d => d.id === def.id);
                }
            }
        }

        if (definitionId) {
            const setDefinitions = isUpskillLog ? setUpskillDefinitions : setDeepWorkDefinitions;
            const matchedDef = [...upskillDefinitions, ...deepWorkDefinitions].find((def) => def.id === definitionId);
            matchedDefinitionCategory = matchedDef?.category;
            matchedDefinitionMicroSkillIds = matchedDef?.linkedMicroSkillIds || [];
            setDefinitions(prevDefs => prevDefs.map(def => {
                if (def.id !== definitionId) return def;
                return {
                    ...def,
                    loggedDuration: (def.loggedDuration || 0) + Math.max(1, activityToUpdate.duration || 0),
                    last_logged_date: todayKey,
                };
            }));
        }

        if (matchedDefinitionCategory) {
            const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
            const explicitMicroSkillIds = new Set((matchedDefinitionMicroSkillIds || []).filter(Boolean));
            const normalizedCategory = normalizeText(matchedDefinitionCategory);
            const allMatchingMicroSkillIds = new Set<string>();

            if (normalizedCategory) {
                coreSkills.forEach((spec) => {
                    spec.skillAreas.forEach((area) => {
                        area.microSkills.forEach((ms) => {
                            if (normalizeText(ms.name) === normalizedCategory) {
                                allMatchingMicroSkillIds.add(ms.id);
                            }
                        });
                    });
                });
            }

            const targetMicroSkillIds = explicitMicroSkillIds.size > 0 ? explicitMicroSkillIds : allMatchingMicroSkillIds.size === 1 ? allMatchingMicroSkillIds : new Set<string>();
            setCoreSkills(prev =>
                prev.map(spec => ({
                    ...spec,
                    skillAreas: spec.skillAreas.map(area => ({
                        ...area,
                        microSkills: area.microSkills.map(ms =>
                            targetMicroSkillIds.size > 0 && targetMicroSkillIds.has(ms.id)
                                ? { ...ms, isReadyForRepetition: false }
                                : ms
                        ),
                    })),
                }))
            );
        }
    }

    if (shouldBeCompleted && !activityToUpdate.completed) {
        const normalizeText = (value?: string) => (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
        const financeLabel = normalizeText(activityToUpdate.details);
        const incomeLabels = new Set(['income']);
        const outflowLabels = new Set(['emi', 'debt', 'saving', 'emergency', 'unplanned']);
        const hasCostIn = typeof activityToUpdate.costIn === 'number';
        const hasCostOut =
            typeof activityToUpdate.costOut === 'number' || typeof activityToUpdate.cost === 'number';
        const isIncome = hasCostIn;
        const isOutflow = hasCostOut;
        const incomeAmount = isIncome
            ? (typeof activityToUpdate.costIn === 'number' ? activityToUpdate.costIn : null)
            : null;
        const outflowAmount = isOutflow
            ? (typeof activityToUpdate.costOut === 'number'
                ? activityToUpdate.costOut
                : typeof activityToUpdate.cost === 'number'
                    ? activityToUpdate.cost
                    : null)
            : null;
        const debtAdjustment =
            outflowAmount !== null && financeLabel === 'debt'
                ? outflowAmount
                : outflowAmount !== null && financeLabel === 'emi'
                    ? -outflowAmount
                    : 0;
        const netAdjustment =
            incomeAmount !== null
                ? incomeAmount
                : outflowAmount !== null
                    ? financeLabel === 'debt'
                        ? outflowAmount
                        : -outflowAmount
                    : 0;
        const monthKey = String(targetDateKey || '').slice(0, 7);

        if ((isIncome && incomeAmount !== null) || (isOutflow && outflowAmount !== null)) {
            setSettings(prev => {
                const routines = prev.routines || [];
                const existingIndex = routines.findIndex(r =>
                    r.type === 'finance' && normalizeText(r.details) === financeLabel
                );
                const shouldResetMonth = monthKey && prev.financeMonthKey !== monthKey;
                const baseMonthlyIncome = shouldResetMonth ? 0 : (prev.financeMonthlyIncome ?? 0);
                const baseMonthlyOutflow = shouldResetMonth ? 0 : (prev.financeMonthlyOutflow ?? 0);
                const nextMonthlyIncome = isIncome && incomeAmount !== null ? baseMonthlyIncome + incomeAmount : baseMonthlyIncome;
                const shouldCountOutflow = isOutflow && outflowAmount !== null && financeLabel !== 'debt';
                const nextMonthlyOutflow = shouldCountOutflow ? baseMonthlyOutflow + outflowAmount! : baseMonthlyOutflow;
                const nextFinanceNet = Number.isFinite(prev.financeNetBalance ?? 0)
                    ? Math.max(0, (prev.financeNetBalance ?? 0) + netAdjustment)
                    : Math.max(0, netAdjustment);
                if (existingIndex >= 0) {
                    const updated = { ...routines[existingIndex] };
                    if (isIncome) updated.costIn = incomeAmount;
                    if (isOutflow) {
                        updated.costOut = outflowAmount;
                        updated.cost = outflowAmount;
                    }
                    const next = [...routines];
                    next[existingIndex] = updated;
                    const nextDebtBalance = Number.isFinite(prev.debtBalance ?? 0)
                        ? Math.max(0, (prev.debtBalance ?? 0) + debtAdjustment)
                        : Math.max(0, debtAdjustment);
                    return {
                        ...prev,
                        routines: next,
                        debtBalance: nextDebtBalance,
                        financeMonthKey: monthKey || prev.financeMonthKey,
                        financeMonthlyIncome: nextMonthlyIncome,
                        financeMonthlyOutflow: nextMonthlyOutflow,
                        financeNetBalance: nextFinanceNet,
                    };
                }

                const routineId = `routine-finance-${financeLabel || Date.now()}`;
                const newRoutine: Activity = {
                    id: routineId,
                    type: 'finance',
                    details: activityToUpdate.details,
                    completed: false,
                    slot: activityToUpdate.slot || slotName,
                    costIn: isIncome ? incomeAmount : null,
                    costOut: isOutflow ? outflowAmount : null,
                    cost: isOutflow ? outflowAmount : null,
                    routine: { type: 'custom', repeatInterval: 1, repeatUnit: 'month' },
                    isRoutine: true,
                    baseDate: targetDateKey,
                    taskIds: [],
                };
                const nextDebtBalance = Number.isFinite(prev.debtBalance ?? 0)
                    ? Math.max(0, (prev.debtBalance ?? 0) + debtAdjustment)
                    : Math.max(0, debtAdjustment);
                return {
                    ...prev,
                    routines: [...routines, newRoutine],
                    debtBalance: nextDebtBalance,
                    financeMonthKey: monthKey || prev.financeMonthKey,
                    financeMonthlyIncome: nextMonthlyIncome,
                    financeMonthlyOutflow: nextMonthlyOutflow,
                    financeNetBalance: nextFinanceNet,
                };
            });
        }
    }
    
    if (shouldBeCompleted && !activityToUpdate.completed) {
        if (activityToUpdate.duration) {
             updateActivity({
                ...activityToUpdate,
                completed: true,
                completedAt: Date.now(),
            });
        } else {
            onOpenFocusModal(activityToUpdate);
        }
    } else {
         updateActivity({
            ...activityToUpdate,
            completed: false,
            completedAt: undefined,
            duration: undefined,
            focusSessionEndTime: undefined,
            focusSessionInitialStartTime: undefined,
            focusSessionPauses: [],
            focusSessionStartTime: undefined,
        });
    }

    if ((activityToUpdate.taskIds && activityToUpdate.taskIds.length > 0) || baseMatch) {
        const linkedIds = new Set(activityToUpdate.taskIds || []);
        linkedIds.add(activityToUpdate.id);
        if (baseMatch) {
            linkedIds.add(activityToUpdate.id.slice(0, -11));
        }
        setMindsetCards(prev => {
            let changed = false;
            const next = prev.map(card => {
                if (!card.id.startsWith('mindset_botherings_')) return card;
                const updatedPoints = card.points.map(point => {
                    if (!point.tasks || point.tasks.length === 0) return point;
                    let tasksChanged = false;
                    const nextTasks = point.tasks.map(task => {
                        if (!linkedIds.has(task.id) && !linkedIds.has(task.activityId || '')) {
                            return task;
                        }
                        const nextHistory = task.recurrence && task.recurrence !== 'none'
                            ? { ...(task.completionHistory || {}), [targetDateKey]: shouldBeCompleted }
                            : task.completionHistory;
                        tasksChanged = true;
                        return {
                            ...task,
                            completed: shouldBeCompleted,
                            completionHistory: nextHistory,
                        };
                    });
                    if (!tasksChanged) return point;
                    changed = true;
                    return { ...point, tasks: nextTasks };
                });
                return changed ? { ...card, points: updatedPoints } : card;
            });
            return changed ? next : prev;
        });
    }
  }, [
    schedule,
    settings.routines,
    updateActivity,
    onOpenFocusModal,
    setSchedule,
    setMindsetCards,
    allUpskillLogs,
    allDeepWorkLogs,
    upskillDefinitions,
    deepWorkDefinitions,
    setUpskillDefinitions,
    setDeepWorkDefinitions,
    setCoreSkills,
    setSettings,
  ]);

  const onRemoveActivity = useCallback((slotName: string, activityId: string, date: Date) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    const baseMatch = activityId.match(/_(\d{4}-\d{2}-\d{2})$/);
    const baseRoutineId = baseMatch ? activityId.slice(0, -11) : activityId;
    const isRoutineInstance = (settings.routines || []).some(r => r.id === baseRoutineId);

    if (isRoutineInstance) {
      setSettings(prev => {
        const existingForDate = new Set(prev.routineSkipByDate?.[dateKey] || []);
        existingForDate.add(baseRoutineId);
        return {
          ...prev,
          routineSkipByDate: {
            ...(prev.routineSkipByDate || {}),
            [dateKey]: Array.from(existingForDate),
          },
        };
      });
    }

    setSchedule(prev => {
        const newSchedule = { ...prev };
        if (newSchedule[dateKey]) {
            const daySchedule = { ...newSchedule[dateKey] };
            if (daySchedule[slotName]) {
                daySchedule[slotName] = (daySchedule[slotName] as any[]).filter(act => act.id !== activityId);
                newSchedule[dateKey] = daySchedule;
            }
        }
        return newSchedule;
    });
  }, [settings.routines, setSchedule, setSettings]);
  
  const carryForwardTask = (activity: Activity, targetSlot: string) => {
    // This function is now a placeholder as the logic is moved to my-plate
  };

  const scheduleTaskFromMindMap = (
    definitionId: string,
    activityType: ActivityType,
    slotName: string,
    duration = 0,
    sourceActivityType?: ActivityType
  ) => {
    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const definition = allDefs.find(d => d.id === definitionId);
    if (!definition) {
        toast({ title: 'Error', description: 'Could not find the task definition.', variant: 'destructive' });
        return;
    }
    const inferredSourceType: ActivityType | undefined =
      deepWorkDefinitions.some((d) => d.id === definitionId)
        ? 'deepwork'
        : upskillDefinitions.some((d) => d.id === definitionId)
          ? 'upskill'
          : undefined;
    const effectiveSourceType: ActivityType | undefined =
      activityType === 'spaced-repetition' ? (sourceActivityType || inferredSourceType) : activityType;
    const linkedEntityType =
      effectiveSourceType === 'deepwork'
        ? 'intention'
        : effectiveSourceType === 'upskill'
          ? 'curiosity'
          : undefined;

    if (focusActivity) {
      // Update the existing activity that opened the modal
      updateActivity({
        ...focusActivity,
        details: definition.name,
        taskIds: [definition.id],
        type: activityType,
        linkedEntityType,
        linkedActivityType: activityType === 'spaced-repetition' ? effectiveSourceType : undefined,
      });
      setFocusActivity(null);
      toast({ title: 'Agenda Updated', description: `Set task to "${definition.name}".`});
    } else {
      // Create a new activity if no focus activity is set
      const dateKey = format(new Date(), 'yyyy-MM-dd');
      const newActivity: Activity = {
        id: id('act'),
        type: activityType,
        details: definition.name,
        completed: false,
        slot: slotName,
        taskIds: [definition.id],
        linkedEntityType,
        linkedActivityType: activityType === 'spaced-repetition' ? effectiveSourceType : undefined,
      };

      setSchedule(prev => {
        const daySchedule = prev[dateKey] || {};
        const slotActivities = (daySchedule[slotName as SlotName] as Activity[] || []);
        return {
          ...prev,
          [dateKey]: {
            ...daySchedule,
            [slotName]: [...slotActivities, newActivity],
          },
        };
      });
      toast({ title: 'Task Scheduled', description: `Added "${definition.name}" to your agenda.` });
    }
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
  
  const logMindsetSet = (date: Date, exerciseId: string, definitionId: string, reps: number, weight: number) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setAllMindProgrammingLogs(prevLogs => {
      const newLogs = [...prevLogs];
      const logIndex = newLogs.findIndex(log => log.date === dateKey);

      const definition = mindProgrammingDefinitions.find(d => d.id === definitionId);

      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };

      if (logIndex > -1) {
          const log = { ...newLogs[logIndex] };
          const exerciseIndex = log.exercises.findIndex(e => e.id === exerciseId);
          if (exerciseIndex > -1) {
              const exercise = { ...log.exercises[exerciseIndex] };
              exercise.loggedSets = [...exercise.loggedSets, newSet];
              log.exercises[exerciseIndex] = exercise;
          } else if (definition) {
              log.exercises.push({
                  id: exerciseId,
                  definitionId: definition.id,
                  name: definition.name,
                  category: definition.category,
                  loggedSets: [newSet],
                  targetSets: 1,
                  targetReps: "1",
              });
          }
          newLogs[logIndex] = log;
      } else if (definition) {
          newLogs.push({
              id: dateKey,
              date: dateKey,
              exercises: [{
                  id: exerciseId,
                  definitionId: definition.id,
                  name: definition.name,
                  category: definition.category,
                  loggedSets: [newSet],
                  targetSets: 1,
                  targetReps: "1",
              }],
          });
      }
      return newLogs;
    });
  };
  
  const deleteMindsetSet = (date: Date, exerciseId: string, setId: string) => {
    const dateKey = format(date, 'yyyy-MM-dd');
    setAllMindProgrammingLogs(prevLogs => {
      return prevLogs.map(log => {
        if (log.date === dateKey) {
          const newExercises = log.exercises.map(ex => {
            if (ex.id === exerciseId) {
              return {
                ...ex,
                loggedSets: ex.loggedSets.filter(set => set.id !== setId),
              };
            }
            return ex;
          });
          return { ...log, exercises: newExercises.filter(ex => ex.loggedSets.length > 0) };
        }
        return log;
      }).filter(log => log.exercises.length > 0);
    });
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
  
  const closeGeneralPopup = useCallback((popupId: string) => {
    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        newPopups.delete(popupId);
        return newPopups;
    });
  }, []);

  const getStoredGeneralPopupSize = useCallback((resourceId: string): { width: number; height: number } | null => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(`lifeos_general_popup_size_${resourceId}`);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { width?: number; height?: number };
      if (typeof parsed.width === 'number' && typeof parsed.height === 'number') {
        return { width: parsed.width, height: parsed.height };
      }
    } catch {
      // ignore
    }
    return null;
  }, []);

  const persistGeneralPopupSize = useCallback((resourceId: string, width: number, height: number) => {
    if (typeof window === 'undefined') return;
    safeSetLocalStorage(
      `lifeos_general_popup_size_${resourceId}`,
      JSON.stringify({ width, height })
    );
  }, []);

  const updateGeneralPopupSize = useCallback((popupId: string, resourceId: string, width: number, height: number) => {
    const normalizedWidth = Math.max(360, Math.round(width));
    const normalizedHeight = Math.max(260, Math.round(height));
    setGeneralPopups(prev => {
      const newPopups = new Map(prev);
      const popup = newPopups.get(popupId);
      if (!popup) return newPopups;
      if (popup.width === normalizedWidth && popup.height === normalizedHeight) return newPopups;
      newPopups.set(popupId, { ...popup, width: normalizedWidth, height: normalizedHeight });
      return newPopups;
    });
    persistGeneralPopupSize(resourceId, normalizedWidth, normalizedHeight);
  }, [persistGeneralPopupSize]);

  const updateGeneralPopupPosition = useCallback((popupId: string, resourceId: string, x: number, y: number) => {
    setGeneralPopups(prev => {
      const newPopups = new Map(prev);
      const popup = newPopups.get(popupId);
      if (!popup) return newPopups;
      const nextX = Math.round(x);
      const nextY = Math.round(y);
      if (popup.x === nextX && popup.y === nextY) return newPopups;
      newPopups.set(popupId, { ...popup, x: nextX, y: nextY });
      return newPopups;
    });
  }, []);

  const navigateGeneralPopupPath = useCallback((popupId: string, resourceId: string) => {
    setGeneralPopups(prev => {
      const newPopups = new Map(prev);
      const popup = newPopups.get(popupId);
      if (!popup) return newPopups;
      const resource = resources.find(r => r.id === resourceId);
      if (!resource) return newPopups;
      const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
      const defaultPopupWidth = hasMarkdown ? 1280 : 768;
      const storedSize = getStoredGeneralPopupSize(resourceId);
      const existingPath = popup.navigationPath && popup.navigationPath.length > 0
        ? popup.navigationPath
        : [popup.resourceId];
      const idx = existingPath.indexOf(resourceId);
      const nextPath = idx >= 0 ? existingPath.slice(0, idx + 1) : [...existingPath, resourceId];
      newPopups.set(popupId, {
        ...popup,
        popupId,
        resourceId,
        width: storedSize?.width ?? popup.width ?? defaultPopupWidth,
        height: storedSize?.height ?? popup.height ?? 600,
        navigationPath: nextPath,
      });
      return newPopups;
    });
  }, [resources, getStoredGeneralPopupSize]);
  
  const openGeneralPopup = useCallback((resourceId: string, event: React.MouseEvent | null, parentPopupState?: PopupState, parentRect?: DOMRect) => {
    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        const resource = resources.find(r => r.id === resourceId);
        if (!resource) return newPopups;
        
        const hasMarkdown = (resource.points || []).some(p => p.type === 'markdown' || p.type === 'code');
        const defaultPopupWidth = hasMarkdown ? 1280 : 768;
        const storedSize = getStoredGeneralPopupSize(resourceId);
        const popupWidth = storedSize?.width ?? defaultPopupWidth;
        const popupHeight = storedSize?.height ?? 600;
        
        let x, y, level, parentId, z;
        const parentPopupId = parentPopupState?.popupId || parentPopupState?.resourceId;

        if (parentPopupId && newPopups.has(parentPopupId)) {
            const parentPopup = newPopups.get(parentPopupId)!;
            const path = parentPopup.navigationPath && parentPopup.navigationPath.length > 0
              ? parentPopup.navigationPath
              : [parentPopup.resourceId];
            const nextPath = path[path.length - 1] === resourceId ? path : [...path, resourceId];
            newPopups.set(parentPopupId, {
              ...parentPopup,
              popupId: parentPopupId,
              resourceId,
              width: storedSize?.width ?? parentPopup.width ?? popupWidth,
              height: storedSize?.height ?? parentPopup.height ?? popupHeight,
              navigationPath: nextPath,
            });
            return newPopups;
        }

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
            x = event.clientX;
            y = event.clientY;
            z = 80;
        } else { // Fallback if no event (e.g., from search)
            level = 0;
            parentId = undefined;
            x = (window.innerWidth - popupWidth) / 2;
            y = (window.innerHeight - popupHeight) / 2;
            z = 80;
        }
        
        const popupId = resourceId;
        newPopups.set(popupId, { 
            popupId, resourceId, level, x, y, parentId, width: popupWidth, height: popupHeight, z, navigationPath: [resourceId]
        });
        return newPopups;
    });
  }, [resources, getStoredGeneralPopupSize]);

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
        onNavigatePath={navigateGeneralPopupPath}
        onUpdate={handleUpdateResource}
        onOpenNestedPopup={handleOpenNestedPopup}
        onResize={updateGeneralPopupSize}
        onPositionChange={updateGeneralPopupPosition}
      />
    )
  }, [resources, closeGeneralPopup, navigateGeneralPopupPath, handleUpdateResource, handleOpenNestedPopup, updateGeneralPopupSize, updateGeneralPopupPosition]);
  
  const handlePopupDragEnd = (event: DragEndEvent) => {
    const { active, delta } = event;
    const activeId = active.id as string;
    const { x, y } = delta;

    setGeneralPopups(prev => {
        const newPopups = new Map(prev);
        const popupId = activeId.replace('general-popup-', '');
        const popup = newPopups.get(popupId);
        if (popup) {
            newPopups.set(popupId, { ...popup, x: popup.x + x, y: popup.y + y });
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

    const leafIds = new Set(allLeafNodes.map(node => node.id));
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    setDeepWorkDefinitions(prev =>
      prev.map(def => {
        if (!leafIds.has(def.id)) return def;
        if ((def.loggedDuration || 0) > 0) return def;
        return { ...def, loggedDuration: 1, last_logged_date: todayKey };
      })
    );
    setUpskillDefinitions(prev =>
      prev.map(def => {
        if (!leafIds.has(def.id)) return def;
        if ((def.loggedDuration || 0) > 0) return def;
        return { ...def, loggedDuration: 1, last_logged_date: todayKey };
      })
    );
    
    toast({
        title: "Micro-skill Completed!",
        description: `All child tasks for "${updatedMicroSkill.name}" have been marked as complete.`,
    });
  }

}, [setCoreSkills, toast, deepWorkDefinitions, upskillDefinitions, getDescendantLeafNodes, setDeepWorkDefinitions, setUpskillDefinitions]);
  
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
    
    if (targetRect.right + popupWidth < screenWidth) {
      x = targetRect.right + 10;
    } else {
      x = targetRect.left - popupWidth - 10;
    }
    
    y = targetRect.top;
    
    if (x < 10) x = 10;
    if (x + popupWidth > screenWidth - 10) x = screenWidth - popupWidth - 10;
    if (y < 10) y = 10;
    if (y + popupHeight > window.innerHeight - 10) y = window.innerHeight - popupHeight - 10;

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

    if (x + popupWidth > window.innerWidth) {
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
        if (r.id === habitId && (r.type === 'habit' || r.type === 'mechanism')) {
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
        points: buildDefaultPointsForResourceType(type, []),
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
        const activities = (daySchedule[slotName as SlotName] as Activity[]) || [];
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

  const toggleRoutine = (activity: Activity, rule: RecurrenceRule | null, baseDate?: string) => {
    setSettings(prev => {
      const rawId = activity.id || '';
      const normalizedId = rawId.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
      const routineId = normalizedId || `routine_${activity.type}_${activity.details.replace(/\s/g, '')}`;

      const newRoutines = (prev.routines || []).filter(r =>
          r.id !== routineId &&
          !(r.details === activity.details && r.type === activity.type && r.slot === activity.slot)
      );
      if (rule) {
          newRoutines.push({
              ...activity,
              id: routineId,
              completed: false,
              routine: rule,
              isRoutine: true,
              createdAt: new Date().toISOString(),
              baseDate: baseDate || undefined,
          });
      }
      return {...prev, routines: newRoutines};
    });
  };

  const createShivGuideFlow = useCallback((input: {
    botheringType: 'external' | 'mismatch' | 'constraint';
    botheringText: string;
    domainId?: string | null;
    domainName?: string;
    specializationId?: string | null;
    specializationName?: string;
    learningPlans: Array<{
      type: 'audio' | 'book' | 'path';
      title: string;
      subtitle?: string;
      targetDate?: string;
      requiredHours?: number | null;
      totalPages?: number | null;
      requiredMoney?: number | null;
      targetMicroSkills?: number | null;
      linkedPdfResourceId?: string | null;
    }>;
    projectPlan?: {
      enabled: boolean;
      domainId?: string | null;
      projectName?: string;
      endDate?: string;
      specializationId?: string | null;
    };
    routine?: {
      activityType?: ActivityType;
      specializationId?: string | null;
      details: string;
      slot: SlotName;
      recurrence: RecurrenceRule;
      startDate?: string;
      linkToBothering?: boolean;
    };
  }) => {
    const normalizeName = (value?: string | null) => String(value || '').trim().toLowerCase();
    const botheringText = String(input.botheringText || '').trim();
    const isExternalFlow = input.botheringType === 'external';
    if (!botheringText) throw new Error('Bothering text is required.');

    const typeToCardId: Record<'external' | 'mismatch' | 'constraint', string> = {
      external: 'mindset_botherings_external',
      mismatch: 'mindset_botherings_mismatch',
      constraint: 'mindset_botherings_constraint',
    };
    const titleMap: Record<'external' | 'mismatch' | 'constraint', string> = {
      external: 'External Botherings',
      mismatch: 'Mismatch Botherings',
      constraint: 'Constraint Botherings',
    };

    let domainId = '';
    let specializationId = '';
    if (!isExternalFlow) {
      const domainName = String(input.domainName || '').trim();
      const requestedDomainId = String(input.domainId || '').trim();
      domainId = requestedDomainId;
      const existingDomain = domainId
        ? skillDomains.find((domain) => domain.id === domainId)
        : skillDomains.find((domain) => normalizeName((domain as any).name) === normalizeName(domainName));

      if (existingDomain) {
        domainId = existingDomain.id;
      } else {
        if (!domainName) throw new Error('Choose an existing domain or enter a new domain name.');
        const newDomain: SkillDomain = { id: `d_${Date.now()}`, name: domainName };
        const foundationSkill: CoreSkill = {
          id: `cs_${Date.now()}_f`,
          domainId: newDomain.id,
          name: 'Realization',
          type: 'Foundation',
          skillAreas: [],
          parentId: null,
        };
        domainId = newDomain.id;
        setSkillDomains((prev) => [...prev, newDomain]);
        setCoreSkills((prev) => [...prev, foundationSkill]);
      }

      const specializationName = String(input.specializationName || '').trim();
      const requestedSpecializationId = String(input.specializationId || '').trim();
      specializationId = requestedSpecializationId;
      const existingSpecialization = specializationId
        ? coreSkills.find((skill) => skill.id === specializationId && skill.type === 'Specialization')
        : coreSkills.find(
            (skill) =>
              skill.type === 'Specialization' &&
              skill.domainId === domainId &&
              normalizeName(skill.name) === normalizeName(specializationName)
          );

      if (existingSpecialization) {
        specializationId = existingSpecialization.id;
      } else {
        if (!specializationName) throw new Error('Choose an existing specialization or enter a new specialization name.');
        const newSkill: CoreSkill = {
          id: `cs_${Date.now()}_s`,
          domainId,
          name: specializationName,
          type: 'Specialization',
          skillAreas: [],
          parentId: null,
        };
        specializationId = newSkill.id;
        setCoreSkills((prev) => [...prev, newSkill]);
      }
    }

    const cardId = typeToCardId[input.botheringType];
    const botheringId = `bother_${Date.now()}`;
    setMindsetCards((prev) => {
      const point: MindsetPoint = {
        id: botheringId,
        text: botheringText,
        tasks: [],
      };
      const existingCard = prev.find((card) => card.id === cardId);
      if (existingCard) {
        return prev.map((card) => (card.id === cardId ? { ...card, points: [...card.points, point] } : card));
      }
      return [
        ...prev,
        {
          id: cardId,
          title: titleMap[input.botheringType],
          icon: 'Brain',
          points: [point],
        },
      ];
    });

    const learningPlans = Array.isArray(input.learningPlans) ? input.learningPlans : [];
    const normalizedLearningPlans = learningPlans
      .map((plan) => ({
        ...plan,
        title: String(plan?.title || '').trim(),
        subtitle: String(plan?.subtitle || '').trim(),
        targetDate: String(plan?.targetDate || ''),
        linkedPdfResourceId: typeof plan?.linkedPdfResourceId === 'string' ? plan.linkedPdfResourceId : null,
      }))
      .filter((plan) => plan.title.length > 0);

    if (!isExternalFlow && normalizedLearningPlans.length === 0) {
      throw new Error('Add at least one learning path.');
    }

    if (!isExternalFlow) {
      setSkillAcquisitionPlans((prev) => {
      const hours = normalizedLearningPlans
        .map((plan) => plan.requiredHours)
        .find((value) => typeof value === 'number' && Number.isFinite(value));
      const money = normalizedLearningPlans
        .map((plan) => plan.requiredMoney)
        .find((value) => typeof value === 'number' && Number.isFinite(value));
      const targetDate = normalizedLearningPlans.map((plan) => plan.targetDate).find((value) => value) || '';
      const nextPlan = {
        specializationId,
        targetDate,
        requiredMoney: money ?? null,
        requiredHours: hours ?? null,
        linkedRuleEquationIds: [] as string[],
      };
      const existingIndex = prev.findIndex((plan) => plan.specializationId === specializationId);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          ...nextPlan,
          linkedRuleEquationIds: updated[existingIndex].linkedRuleEquationIds || [],
        };
        return updated;
      }
      return [...prev, nextPlan];
      });

      setOfferizationPlans((prev) => {
      const current = prev[specializationId] || {};
      const learningPlan = { ...(current.learningPlan || {}) };
      normalizedLearningPlans.forEach((plan) => {
        if (plan.type === 'audio') {
          learningPlan.audioVideoResources = [
            ...(learningPlan.audioVideoResources || []),
            {
              id: id('audio_plan'),
              name: plan.title,
              tutor: plan.subtitle || '',
              totalItems: null,
              totalHours: plan.requiredHours ?? null,
              startDate: null,
              completionDate: plan.targetDate || null,
            },
          ];
          return;
        }
        if (plan.type === 'book') {
          learningPlan.bookWebpageResources = [
            ...(learningPlan.bookWebpageResources || []),
            {
              id: id('book_plan'),
              name: plan.title,
              author: plan.subtitle || '',
              totalPages: plan.totalPages ?? null,
              startDate: null,
              completionDate: plan.targetDate || null,
              linkedPdfResourceId: plan.linkedPdfResourceId || null,
            },
          ];
          return;
        }
        learningPlan.skillTreePaths = [
          ...(learningPlan.skillTreePaths || []),
          {
            id: id('path_plan'),
            name: plan.title,
            skillAreaIds: [],
            targetMicroSkills: plan.targetMicroSkills ?? null,
            completionDate: plan.targetDate || null,
            linkedPdfResourceId: plan.linkedPdfResourceId || null,
          },
        ];
      });

      return {
        ...prev,
        [specializationId]: {
          ...current,
          learningPlan,
        },
      };
      });
    }

    let projectId: string | null = null;
    let releaseId: string | null = null;
    const projectPlan = input.projectPlan;
    if (!isExternalFlow && projectPlan?.enabled) {
      const projectName = String(projectPlan.projectName || '').trim();
      const projectDomainId = String(projectPlan.domainId || domainId).trim() || domainId;
      const projectSpecializationId = String(projectPlan.specializationId || specializationId).trim() || specializationId;
      const endDate = String(projectPlan.endDate || '').trim();

      if (!projectName) throw new Error('Project name is required when project plan is enabled.');
      if (!endDate) throw new Error('Project end date is required when project plan is enabled.');

      const existingProject = projects.find(
        (project) => project.domainId === projectDomainId && normalizeName(project.name) === normalizeName(projectName)
      );

      projectId = existingProject?.id || `proj_${Date.now()}`;
      if (!existingProject) {
        const newProject: Project = {
          id: projectId,
          name: projectName,
          domainId: projectDomainId,
          features: [],
        };
        setProjects((prev) => [...prev, newProject]);
      }

      releaseId = `release_${projectId}_${projectSpecializationId}`;
      setOfferizationPlans((prev) => {
        const plan = prev[projectSpecializationId] || { offers: [], releases: [] };
        const alreadyLinked = (plan.releases || []).some((release) => release.id === releaseId || release.name === projectName);
        if (alreadyLinked) {
          return {
            ...prev,
            [projectSpecializationId]: {
              ...plan,
              releases: (plan.releases || []).map((release) =>
                release.id === releaseId || release.name === projectName
                  ? { ...release, launchDate: endDate }
                  : release
              ),
            },
          };
        }
        return {
          ...prev,
          [projectSpecializationId]: {
            ...plan,
            releases: [
              ...(plan.releases || []),
              {
                id: releaseId,
                name: projectName,
                description: '',
                launchDate: endDate,
                focusAreaIds: [],
                workflowStages: {
                  botheringPointId: botheringId,
                  botheringText,
                  stageLabels: {
                    idea: 'Idea -> pick simplest solution',
                    code: 'Code -> make it run',
                    break: 'Break -> observe failure',
                    fix: 'Fix -> improve system',
                  },
                  ideaItems: [],
                  codeItems: [],
                  breakItems: [],
                  fixItems: [],
                },
                features: [],
              },
            ],
          },
        };
      });
      setSelectedProjectId(projectId);
    }

    let routineId: string | null = null;
    if (input.routine?.details?.trim()) {
      const routineActivityType: ActivityType =
        input.routine.activityType === 'workout' ||
        input.routine.activityType === 'upskill' ||
        input.routine.activityType === 'deepwork' ||
        input.routine.activityType === 'essentials'
          ? input.routine.activityType
          : 'upskill';
      const linkedSpecializationId =
        routineActivityType === 'upskill' || routineActivityType === 'deepwork'
          ? String(input.routine.specializationId || specializationId || '').trim()
          : '';
      const activity: Activity = {
        id: id('routine'),
        type: routineActivityType,
        details: input.routine.details.trim(),
        completed: false,
        slot: input.routine.slot,
        linkedEntityType: linkedSpecializationId ? 'specialization' : undefined,
        createdAt: new Date().toISOString(),
      };
      const normalizedId = activity.id.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
      routineId = normalizedId || `routine_${activity.type}_${activity.details.replace(/\s/g, '')}`;
      toggleRoutine(activity, input.routine.recurrence, input.routine.startDate);

      if (input.routine.linkToBothering) {
        const dateKey = String(input.routine.startDate || new Date().toISOString().slice(0, 10));
        setMindsetCards((prev) =>
          prev.map((card) =>
            card.id !== cardId
              ? card
              : {
                  ...card,
                  points: card.points.map((point) =>
                    point.id !== botheringId
                      ? point
                      : {
                          ...point,
                          tasks: [
                            ...(point.tasks || []),
                            {
                              id: routineId as string,
                              type: routineActivityType,
                              details: activity.details,
                              completed: false,
                              activityId: routineId as string,
                              slotName: input.routine.slot,
                              dateKey,
                              startDate: dateKey,
                              recurrence: input.routine.recurrence.type,
                              repeatInterval: input.routine.recurrence.repeatInterval,
                              repeatUnit: input.routine.recurrence.repeatUnit,
                            },
                          ],
                        }
                  ),
                }
          )
        );
      }
    }

    setSelectedDomainId(domainId);
    setSelectedSkillId(specializationId);
    if (!projectId) {
      setSelectedProjectId(null);
    }

    return { botheringId, domainId, specializationId, routineId, projectId, releaseId };
  }, [
    coreSkills,
    projects,
    skillDomains,
    setCoreSkills,
    setMindsetCards,
    setOfferizationPlans,
    setSelectedDomainId,
    setSelectedProjectId,
    setSelectedSkillId,
    setSkillAcquisitionPlans,
    setSkillDomains,
    toggleRoutine,
  ]);
  
  const openLinkedResistancePopup = (techniqueId: string, event: React.MouseEvent) => {
    const popupWidth = 384;
    const popupHeight = 400;
    const targetRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    
    let x = targetRect.right + 10;
    let y = targetRect.top;

    if (x + popupWidth > window.innerWidth) {
      x = targetRect.left - popupWidth - 10;
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
        const parentRect = targetElement ? targetElement.getBoundingClientRect() : null;

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
    
    let currentDefId: string | undefined;
    const taskInstanceId = activity.taskIds?.[0];
    
    if (taskInstanceId) {
      const allLogs = [...allUpskillLogs, ...allDeepWorkLogs];
      const taskLog = allLogs.flatMap(log => log.exercises).find(ex => ex.id === taskInstanceId);
      if(taskLog){
        currentDefId = taskLog.definitionId;
      } else if (allDefs.has(taskInstanceId)) {
        currentDefId = taskInstanceId;
      }
    }
  
    if (!currentDefId) return null;
  
    let currentId: string | undefined = currentDefId;
    let rootTask: ExerciseDefinition | undefined;
  
    // Traverse up the parent tree
    while (currentId) {
      const parentId = childToParentMap.get(currentId)?.[0];
      if (parentId) {
        currentId = parentId;
      } else {
        // No more parents, this is the root.
        break;
      }
    }
    
    if (currentId) {
        rootTask = allDefs.get(currentId);
    }
    
    return rootTask || null;
  }, [deepWorkDefinitions, upskillDefinitions, allUpskillLogs, allDeepWorkLogs, childToParentMap]);

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
        const newNode = { id: newElement.id, x: x, y: y, width: 300, height: 150 };
        return {
            ...prev,
            nodes: [...prev.nodes, newNode]
        };
    });
  
    return newElement;
  }, [setCanvasLayout]);

  const updateGlobalElement = (elementId: string, updates: Partial<FormalizationItem>) => {
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
          points: buildDefaultPointsForResourceType('card', []),
      };
      setResources(prev => [...prev, newCard]);
      return newCard;
  };

  const PERSISTENT_TOAST_DURATION_MS = 24 * 60 * 60 * 1000;
  const dismissGitHubSyncNotification = useCallback(() => {
    setGitHubSyncNotification(null);
  }, []);
  const publishGitHubSyncNotification = useCallback(
    (notification: Omit<GitHubSyncNotification, 'updatedAt'>) => {
      setGitHubSyncNotification({ ...notification, updatedAt: Date.now() });
    },
    []
  );

  type GitHubAssetSyncProgress = {
    phase: 'preparing' | 'uploading' | 'complete' | 'failed';
    total: number;
    processed: number;
    uploaded: number;
    skipped: number;
    currentItem?: string;
    note?: string;
  };

  type GitHubAssetSyncOptions = {
    silent?: boolean;
    onProgress?: (progress: GitHubAssetSyncProgress) => void;
  };

  const syncWithGitHub = async () => {
    if (isGitHubSyncInFlightRef.current) {
      publishGitHubSyncNotification({
        mode: 'push',
        status: 'running',
        title: "GitHub Push Already Running",
        details: "A sync is already in progress. Wait for it to finish.",
      });
      return;
    }
    const token = settings.githubToken;
    const owner = settings.githubOwner;
    const repo = settings.githubRepo;
    const username = currentUser?.username?.toLowerCase();
    const path = settings.githubPath;

    if (!token || !owner || !repo || !path) {
      toast({
        title: "GitHub Sync Not Configured",
        description: "Please configure your GitHub details in the settings.",
        variant: "destructive",
      });
      return;
    }
    if (!username) {
      toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
      return;
    }

    const prefixedPath = withUserGitHubPrefix(path, username);
    const { dir } = getGitHubBaseDir(prefixedPath);
    const syncStatusPath = dir ? `${dir}/sync-status.json` : 'sync-status.json';
    // Default to incremental push mode: only changed files are considered for upload.
    let forcePushDirtyOnly = true;
    try {
      const remoteStatus = await getGitHubJson<{ status?: string; startedAt?: string; updatedAt?: string }>(
        token,
        owner,
        repo,
        syncStatusPath
      );
      const localLastSyncTs = settings.lastSync?.timestamp || 0;
      const remoteUpdatedAtTs = remoteStatus?.updatedAt ? Date.parse(remoteStatus.updatedAt) : NaN;
      const remoteAhead = Number.isFinite(remoteUpdatedAtTs) && remoteUpdatedAtTs > (localLastSyncTs + 1000);
      if (remoteAhead) {
        const remoteIso = new Date(remoteUpdatedAtTs).toISOString();
        const localIso = localLastSyncTs ? new Date(localLastSyncTs).toISOString() : 'never';
        const decision = await requestRemoteAheadDecision(remoteIso, localIso);
        if (decision === 'cancel') {
          publishGitHubSyncNotification({
            mode: 'push',
            status: 'error',
            title: "Push Cancelled",
            details: "Remote is ahead. Pull first, then push.",
          });
          return;
        }
        if (decision === 'force') {
          forcePushDirtyOnly = true;
        }
        if (decision === 'pull') {
          const imported = await pullAndImportFromGitHubForPushGuard();
          if (!imported) {
            publishGitHubSyncNotification({
              mode: 'push',
              status: 'error',
              title: "Push Cancelled",
              details: "Pull/import before push failed.",
            });
            return;
          }
        }
      }
    } catch (guardError) {
      publishGitHubSyncNotification({
        mode: 'push',
        status: 'error',
        title: "Push Guard Failed",
        details: guardError instanceof Error ? guardError.message : "Could not verify remote sync status.",
      });
      return;
    }

    isGitHubSyncInFlightRef.current = true;

    const moduleTotals = { total: 0, processed: 0, pushed: 0, skipped: 0 };
    const assetProgress: Record<'images' | 'audio' | 'pdfs', GitHubAssetSyncProgress> = {
      images: { phase: 'preparing', total: 0, processed: 0, uploaded: 0, skipped: 0 },
      audio: { phase: 'preparing', total: 0, processed: 0, uploaded: 0, skipped: 0 },
      pdfs: { phase: 'preparing', total: 0, processed: 0, uploaded: 0, skipped: 0 },
    };
    const formatAssetLine = (label: string, progress: GitHubAssetSyncProgress) =>
      `${label}: ${progress.uploaded} uploaded | ${progress.skipped} skipped | ${progress.processed}/${progress.total || 0} processed${progress.currentItem ? ` | ${progress.currentItem}` : ''}`;
    const publishPushProgress = (headline: string, currentAction: string) => {
      publishGitHubSyncNotification({
        mode: 'push',
        status: 'running',
        title: headline,
        details: [
          `Core files: ${moduleTotals.processed}/${moduleTotals.total} processed | ${moduleTotals.pushed} pushed | ${moduleTotals.skipped} skipped`,
          formatAssetLine('Images', assetProgress.images),
          formatAssetLine('Audio', assetProgress.audio),
          formatAssetLine('PDFs', assetProgress.pdfs),
          `Current: ${currentAction}`,
        ].join('\n'),
      });
    };

    const syncId = `sync_${Date.now()}`;
    const updateSyncStatus = async (
      status: 'in_progress' | 'completed' | 'failed',
      extra?: Record<string, unknown>
    ) => {
      const payload = JSON.stringify(
        {
          status,
          syncId,
          user: username,
          updatedAt: new Date().toISOString(),
          ...extra,
        },
        null,
        2
      );
      const statusSha = await getGitHubFileSha(token, owner, repo, syncStatusPath);
      await pushToGitHub(
        token,
        owner,
        repo,
        syncStatusPath,
        payload,
        `LifeOS sync status: ${status}`,
        statusSha,
        { suppressToast: true }
      );
    };
    const safeUpdateSyncStatus = async (
      status: 'in_progress' | 'completed' | 'failed',
      extra?: Record<string, unknown>
    ) => {
      try {
        await updateSyncStatus(status, extra);
      } catch (statusError) {
        console.error('Failed to write GitHub sync status:', statusError);
      }
    };

    try {
      publishPushProgress("GitHub Push Running", "Preparing upload plan...");
      await safeUpdateSyncStatus('in_progress', { phase: 'modules', startedAt: new Date().toISOString() });
      const allData = getAllUserData();
      const content = JSON.stringify(allData, null, 2);
      const message = `LifeOS backup: ${new Date().toISOString()}`;

      const nextHashes: Record<string, string> = { ...(githubModuleHashesRef.current || {}) };
      const remoteExistsCache = new Map<string, boolean>();
      const shouldSkipUnchangedPath = async (pathToCheck: string, hashToCheck: string) => {
        if (nextHashes[pathToCheck] !== hashToCheck) return false;
        if (remoteExistsCache.has(pathToCheck)) return !!remoteExistsCache.get(pathToCheck);
        const remoteSha = await getGitHubFileSha(token, owner, repo, pathToCheck);
        const exists = !!remoteSha;
        remoteExistsCache.set(pathToCheck, exists);
        return exists;
      };

      const modulesBase = dir ? `${dir}/modules` : 'modules';
      const manifestPath = dir ? `${dir}/manifest.json` : 'manifest.json';
      const modules = buildModuleData(allData);
      const canvasFilesMetaByCanvasId = getCanvasFilesMetaByCanvasId();
      const canvasFilesFromDb = await getAllExcalidrawFiles();
      canvasFilesFromDb.forEach(({ key, record }) => {
        const sepIndex = key.indexOf(':');
        if (sepIndex <= 0 || sepIndex >= key.length - 1) return;
        const canvasId = key.slice(0, sepIndex);
        const fileId = key.slice(sepIndex + 1);
        if (!canvasId || !fileId) return;
        const current = canvasFilesMetaByCanvasId.get(canvasId) || {};
        if (!current[fileId]) {
          current[fileId] = { mimeType: record?.mimeType || 'application/octet-stream' };
        }
        canvasFilesMetaByCanvasId.set(canvasId, current);
      });
      const allCanvasIds = Array.from(new Set(
        (modules.resources?.resources || []).flatMap((resource: Resource) =>
          (resource.points || [])
            .filter((point) => point.type === 'paint')
            .map((point) => `${resource.id}-${point.id}`)
        )
      )).concat(
        Array.from(canvasFilesMetaByCanvasId.keys()).filter((id) => id && !id.includes('undefined'))
      );
      const uniqueCanvasIds = Array.from(new Set(allCanvasIds));
      const canvasFileIndex = Object.fromEntries(
        uniqueCanvasIds.map((canvasId) => [canvasId, canvasFilesMetaByCanvasId.get(canvasId) || {}])
      );
      const updatedAt = new Date().toISOString();

      const moduleEntries: { name: string; path: string; content: string }[] = [
        { name: 'core', path: `${modulesBase}/core.json`, content: JSON.stringify(modules.core, null, 2) },
        { name: 'workouts', path: `${modulesBase}/workouts.json`, content: JSON.stringify(modules.workouts, null, 2) },
        { name: 'knowledge', path: `${modulesBase}/knowledge.json`, content: JSON.stringify(modules.knowledge, null, 2) },
        { name: 'ui', path: `${modulesBase}/ui.json`, content: JSON.stringify(modules.ui, null, 2) },
      ];

      const resourcesByFolder = new Map<string, Resource[]>();
      (modules.resources?.resources || []).forEach((res: Resource) => {
        const folderKey = res.folderId || 'unfoldered';
        const list = resourcesByFolder.get(folderKey) || [];
        list.push(res);
        resourcesByFolder.set(folderKey, list);
      });
      const resourceFoldersById = new Map<string, ResourceFolder>();
      (modules.resources?.resourceFolders || []).forEach((folder: ResourceFolder) => {
        if (folder?.id) resourceFoldersById.set(folder.id, folder);
      });
      const resourcesFoldersBase = `${modulesBase}/resources-folders`;
      const resourcesFolderIndex = {
        version: 1,
        updatedAt,
        folders: [] as Array<{ id: string; path: string }>,
      };
      for (const [folderId, list] of resourcesByFolder.entries()) {
        const folder = resourceFoldersById.get(folderId);
        const folderPath = `${resourcesFoldersBase}/folder_${folderId}.json`;
        moduleEntries.push({
          name: `resources-folder-${folderId}`,
          path: folderPath,
          content: JSON.stringify({ folderId, folder, resources: list }, null, 2),
        });
        resourcesFolderIndex.folders.push({ id: folderId, path: folderPath });
      }
      moduleEntries.push({
        name: 'resources-folders-index',
        path: `${resourcesFoldersBase}/index.json`,
        content: JSON.stringify(resourcesFolderIndex, null, 2),
      });

      const canvasFilesBase = `${modulesBase}/canvas-files`;
      const canvasFilesIndex = {
        version: 1,
        updatedAt,
        folder: getGitHubImagesFolder(currentUser?.username),
        canvases: uniqueCanvasIds,
      };
      moduleEntries.push({
        name: 'canvas-files-index',
        path: `${canvasFilesBase}/index.json`,
        content: JSON.stringify(canvasFilesIndex, null, 2),
      });

      const manifest = {
        version: 1,
        updatedAt,
        modules: moduleEntries.reduce((acc, entry) => {
          acc[entry.name] = { path: entry.path, updatedAt };
          return acc;
        }, {} as Record<string, { path: string; updatedAt: string }>),
      };

      moduleTotals.total = forcePushDirtyOnly ? 0 : (1 + moduleEntries.length + uniqueCanvasIds.length + 1);
      const updateModuleProgress = (label: string) => {
        publishPushProgress("GitHub Push Running", label);
      };

      const backupHash = await hashString(content);
      const backupDirty = nextHashes[prefixedPath] !== backupHash;
      if (forcePushDirtyOnly && !backupDirty) {
        // force mode uploads only locally dirty core files
      } else if (!(await shouldSkipUnchangedPath(prefixedPath, backupHash))) {
        if (forcePushDirtyOnly) moduleTotals.total += 1;
        const sha = await getGitHubFileSha(token, owner, repo, prefixedPath);
        await pushToGitHub(token, owner, repo, prefixedPath, content, message, sha, { suppressToast: true });
        nextHashes[prefixedPath] = backupHash;
        moduleTotals.pushed += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Pushed ${prefixedPath}`);
      } else if (!forcePushDirtyOnly) {
        moduleTotals.skipped += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Skipped ${prefixedPath}`);
      }

      for (const entry of moduleEntries) {
        const moduleHash = await hashString(entry.content);
        const moduleDirty = nextHashes[entry.path] !== moduleHash;
        if (forcePushDirtyOnly && !moduleDirty) {
          continue;
        }
        if (forcePushDirtyOnly) moduleTotals.total += 1;
        if (await shouldSkipUnchangedPath(entry.path, moduleHash)) {
          if (!forcePushDirtyOnly) {
            moduleTotals.skipped += 1;
            moduleTotals.processed += 1;
            updateModuleProgress(`Skipped ${entry.path}`);
          }
          continue;
        }
        const moduleSha = await getGitHubFileSha(token, owner, repo, entry.path);
        await pushToGitHub(token, owner, repo, entry.path, entry.content, `LifeOS module: ${entry.name}`, moduleSha, { suppressToast: true });
        nextHashes[entry.path] = moduleHash;
        moduleTotals.pushed += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Pushed ${entry.path}`);
      }

      try {
        const listResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${resourcesFoldersBase}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (listResp.ok) {
          const listData = await listResp.json();
          const expectedFolderFiles = new Set(
            moduleEntries
              .filter(m => m.name.startsWith('resources-folder-'))
              .map(m => m.path.split('/').pop() as string)
          );
          for (const item of listData || []) {
            if (item?.type !== 'file' || !item?.name || !item?.sha) continue;
            if (item.name === 'index.json') continue;
            if (!expectedFolderFiles.has(item.name)) {
              const delPath = `${resourcesFoldersBase}/${item.name}`;
              await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${delPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete stale resources folder file: ${item.name}`, sha: item.sha }),
              });
            }
          }
        }
      } catch (e) {
        console.debug('Failed to prune resource folder files', e);
      }

      for (const [canvasId, filesMeta] of Object.entries(canvasFileIndex)) {
        const canvasPath = `${canvasFilesBase}/${canvasId}.json`;
        const canvasContent = JSON.stringify({ canvasId, files: filesMeta }, null, 2);
        const canvasHash = await hashString(canvasContent);
        const canvasDirty = nextHashes[canvasPath] !== canvasHash;
        if (forcePushDirtyOnly && !canvasDirty) {
          continue;
        }
        if (forcePushDirtyOnly) moduleTotals.total += 1;
        if (await shouldSkipUnchangedPath(canvasPath, canvasHash)) {
          if (!forcePushDirtyOnly) {
            moduleTotals.skipped += 1;
            moduleTotals.processed += 1;
            updateModuleProgress(`Skipped ${canvasPath}`);
          }
          continue;
        }
        const canvasSha = await getGitHubFileSha(token, owner, repo, canvasPath);
        await pushToGitHub(token, owner, repo, canvasPath, canvasContent, `LifeOS canvas files: ${canvasId}`, canvasSha, { suppressToast: true });
        nextHashes[canvasPath] = canvasHash;
        moduleTotals.pushed += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Pushed ${canvasPath}`);
      }

      try {
        const listResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${canvasFilesBase}`, {
          headers: { 'Authorization': `token ${token}` }
        });
        if (listResp.ok) {
          const listData = await listResp.json();
          const expectedCanvasFiles = new Set(uniqueCanvasIds.map((canvasId) => `${canvasId}.json`));
          for (const item of listData || []) {
            if (item?.type !== 'file' || !item?.name || !item?.sha) continue;
            if (item.name === 'index.json') continue;
            if (!expectedCanvasFiles.has(item.name)) {
              const delPath = `${canvasFilesBase}/${item.name}`;
              await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${delPath}`, {
                method: 'DELETE',
                headers: { 'Authorization': `token ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: `Delete stale canvas file: ${item.name}`, sha: item.sha }),
              });
            }
          }
        }
      } catch (e) {
        console.debug('Failed to prune canvas files', e);
      }

      const manifestContent = JSON.stringify(manifest, null, 2);
      const manifestHash = await hashString(manifestContent);
      const manifestDirty = nextHashes[manifestPath] !== manifestHash;
      if (forcePushDirtyOnly && !manifestDirty) {
        // no-op in dirty-only force mode
      } else if (!(await shouldSkipUnchangedPath(manifestPath, manifestHash))) {
        if (forcePushDirtyOnly) moduleTotals.total += 1;
        const manifestSha = await getGitHubFileSha(token, owner, repo, manifestPath);
        await pushToGitHub(token, owner, repo, manifestPath, manifestContent, `LifeOS manifest`, manifestSha, { suppressToast: true });
        nextHashes[manifestPath] = manifestHash;
        moduleTotals.pushed += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Pushed ${manifestPath}`);
      } else if (!forcePushDirtyOnly) {
        moduleTotals.skipped += 1;
        moduleTotals.processed += 1;
        updateModuleProgress(`Skipped ${manifestPath}`);
      }

      githubModuleHashesRef.current = nextHashes;
      setSettings(prev => ({ ...prev, githubModuleHashes: nextHashes }));

      await syncCanvasImagesToGitHub({
        silent: true,
        onProgress: (progress) => {
          assetProgress.images = progress;
          publishPushProgress("GitHub Push Running", "Uploading canvas images...");
        },
      });
      await syncAudioFilesToGitHub({
        silent: true,
        onProgress: (progress) => {
          assetProgress.audio = progress;
          publishPushProgress("GitHub Push Running", "Uploading audio files...");
        },
      });
      await syncPdfFilesToGitHub({
        silent: true,
        onProgress: (progress) => {
          assetProgress.pdfs = progress;
          publishPushProgress("GitHub Push Running", "Uploading PDF files...");
        },
      });

      await safeUpdateSyncStatus('completed', {
        phase: 'done',
        completedAt: new Date().toISOString(),
        pushed: moduleTotals.pushed,
        skipped: moduleTotals.skipped,
        manifestPath,
      });

      publishGitHubSyncNotification({
        mode: 'push',
        status: 'success',
        title: "GitHub Push Complete",
        details: [
          `Core files: ${moduleTotals.pushed} pushed | ${moduleTotals.skipped} skipped`,
          formatAssetLine('Images', assetProgress.images),
          formatAssetLine('Audio', assetProgress.audio),
          formatAssetLine('PDFs', assetProgress.pdfs),
          "Close this notification when reviewed.",
        ].join('\n'),
      });
    } catch (error) {
      await safeUpdateSyncStatus('failed', {
        phase: 'error',
        failedAt: new Date().toISOString(),
        error: error instanceof Error ? error.message : String(error),
      });
      console.error("GitHub sync failed:", error);
      publishGitHubSyncNotification({
        mode: 'push',
        status: 'error',
        title: "GitHub Push Failed",
        details: error instanceof Error ? error.message : "An unknown error occurred.",
      });
    } finally {
      isGitHubSyncInFlightRef.current = false;
    }
  };

  async function pushToGitHub(token: string, owner: string, repo: string, path: string, content: string, message: string, sha?: string, opts?: { suppressToast?: boolean }) {
    if (!content || content === "{}") {
      toast({ title: "Sync Cancelled", description: "Cannot push empty data.", variant: "destructive" });
      return;
    }
    const encoded = btoa(unescape(encodeURIComponent(content)));
    let lastError: any = null;
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        if (!sha) {
          try {
            sha = await getGitHubFileSha(token, owner, repo, path);
          } catch (e) {
            // ignore; file may not exist yet
          }
        }
        const pushResponse = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                message,
                content: encoded,
                ...(sha ? { sha } : {})
            })
        });

        const result = await pushResponse.json();
        if (!pushResponse.ok) {
          const messageText = String(result.message || '');
          // If conflict/sha mismatch, refetch latest sha and retry
          if (pushResponse.status === 409 || /expected .* but/.test(messageText) || /sha.*wasn'?t supplied/i.test(messageText)) {
            // Try to parse the latest sha from the error message
            const match = messageText.match(/is at ([0-9a-f]{40})/i);
            if (match?.[1]) {
              sha = match[1];
            } else {
              const latestSha = await getGitHubFileSha(token, owner, repo, path).catch(() => undefined);
              sha = latestSha;
            }
            // If remote already has same content, treat as success (idempotent conflict).
            try {
              const remoteResp = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
                headers: { 'Authorization': `token ${token}` }
              });
              if (remoteResp.ok) {
                const remote = await remoteResp.json();
                const remoteDecoded = remote?.content ? decodeBase64Utf8(remote.content) : '';
                if (remoteDecoded === content) {
                  setSettings(prev => ({...prev, lastSync: { sha: remote.sha, timestamp: Date.now() }}));
                  setLocalChangeCount(0);
                  return;
                }
              }
            } catch {
              // best-effort comparison only
            }
            lastError = result;
            continue;
          }
          throw new Error(result.message || 'Failed to push file to GitHub.');
        }

        setSettings(prev => ({...prev, lastSync: { sha: result.content.sha, timestamp: Date.now() }}));
        setLocalChangeCount(0);
        if (!opts?.suppressToast) {
          toast({ title: "Success", description: "Your data has been backed up to GitHub." });
        }
        return;
      } catch (e) {
        lastError = e;
        // small backoff before retrying
        await new Promise(r => setTimeout(r, (250 * attempt) + Math.floor(Math.random() * 200)));
      }
    }
    console.error('pushToGitHub failed after retries for', path, lastError);
    throw lastError;
  }

  async function hashString(content: string): Promise<string> {
    if (typeof window !== 'undefined' && window.crypto?.subtle) {
      const data = new TextEncoder().encode(content);
      const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // Fallback: lightweight hash
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      hash = (hash << 5) - hash + content.charCodeAt(i);
      hash |= 0;
    }
    return `fallback-${hash}`;
  }

  async function getGitHubFileSha(token: string, owner: string, repo: string, path: string): Promise<string | undefined> {
    const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (response.ok) {
        const data = await response.json();
        return data.sha as string | undefined;
    }
    if (response.status === 404) {
        return undefined;
    }
    const errorData = await response.json();
    throw new Error(errorData.message || `Failed to fetch file details for ${path}.`);
  }

  const decodeBase64Utf8 = (base64: string) => {
    const cleaned = String(base64).replace(/\n/g, '');
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  };

  async function fetchWithTimeout(url: string, options: RequestInit, timeoutMs = 20000, retries = 2): Promise<Response> {
    let lastError: unknown;
    for (let attempt = 0; attempt <= retries; attempt += 1) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
      try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (error) {
        clearTimeout(timeoutId);
        lastError = error;
        if (attempt < retries) {
          const backoffMs = 500 * Math.pow(2, attempt);
          await new Promise((resolve) => setTimeout(resolve, backoffMs));
          continue;
        }
      }
    }
    throw lastError;
  }

  async function getGitHubJson<T>(token: string, owner: string, repo: string, path?: string): Promise<T | null> {
    if (!path) return null;
    const response = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
        headers: { 'Authorization': `token ${token}` }
    });
    if (response.status === 404) return null;
    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || `Failed to fetch ${path}.`);
    }
    const data = await response.json();
    // GitHub Contents API may omit inline `content` for larger files; use `download_url` fallback.
    if (data?.content) {
      const content = decodeBase64Utf8(data.content);
      return JSON.parse(content) as T;
    }
    if (data?.download_url) {
      const fileResponse = await fetchWithTimeout(data.download_url, {});
      if (fileResponse.ok) {
        const text = await fileResponse.text();
        return JSON.parse(text) as T;
      }
    }
    // Mobile/network-safe fallback: fetch blob content directly by SHA.
    if (data?.sha) {
      const blobResponse = await fetchWithTimeout(`https://api.github.com/repos/${owner}/${repo}/git/blobs/${data.sha}`, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (blobResponse.ok) {
        const blobData = await blobResponse.json();
        if (blobData?.content) {
          const blobContent = decodeBase64Utf8(String(blobData.content).replace(/\n/g, ""));
          return JSON.parse(blobContent) as T;
        }
      }
    }
    return null;
  }

  function getGitHubBaseDir(path: string): { dir: string; base: string } {
    if (!path.includes('/')) return { dir: '', base: path };
    const parts = path.split('/');
    const base = parts.pop() as string;
    const dir = parts.join('/');
    return { dir, base };
  }

  async function listGitHubDirectory(token: string, owner: string, repo: string, dir: string): Promise<Array<{ name: string; type: string; path: string; sha?: string; download_url?: string }> | null> {
    const endpoint = dir
      ? `https://api.github.com/repos/${owner}/${repo}/contents/${dir}`
      : `https://api.github.com/repos/${owner}/${repo}/contents`;
    const response = await fetch(endpoint, {
      headers: { 'Authorization': `token ${token}` }
    });
    if (response.status === 404) return null;
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error((errorData as any).message || `Failed to list GitHub directory: ${dir || '/'}`);
    }
    const data = await response.json();
    return Array.isArray(data) ? data : null;
  }

  async function listGitHubDirectoryPaged(
    token: string,
    owner: string,
    repo: string,
    dir: string
  ): Promise<Array<{ name: string; type: string; path: string; sha?: string; download_url?: string }> | null> {
    const perPage = 100;
    let page = 1;
    const entries: Array<{ name: string; type: string; path: string; sha?: string; download_url?: string }> = [];
    while (page <= 50) {
      const endpoint = dir
        ? `https://api.github.com/repos/${owner}/${repo}/contents/${dir}?per_page=${perPage}&page=${page}`
        : `https://api.github.com/repos/${owner}/${repo}/contents?per_page=${perPage}&page=${page}`;
      const response = await fetchWithTimeout(endpoint, {
        headers: { 'Authorization': `token ${token}` }
      });
      if (response.status === 404) {
        return entries.length > 0 ? entries : null;
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error((errorData as any).message || `Failed to list GitHub directory: ${dir || '/'}`);
      }
      const data = await response.json();
      const pageEntries = Array.isArray(data) ? data : [];
      entries.push(...pageEntries);
      if (pageEntries.length < perPage) break;
      page += 1;
    }
    return entries;
  }

  function pickLatestDatedBackupPath(
    entries: Array<{ name: string; type: string; path: string }>,
    username: string
  ): string | null {
    const pattern = new RegExp(`^lifeos_backup_${username}_(\\d{4}-\\d{2}-\\d{2})\\.json$`, 'i');
    const candidates = entries
      .filter(entry => entry.type === 'file' && pattern.test(entry.name))
      .map(entry => {
        const match = entry.name.match(pattern);
        return { path: entry.path, date: match?.[1] || '' };
      })
      .sort((a, b) => b.date.localeCompare(a.date));
    return candidates[0]?.path || null;
  }

  function resolveGitHubNamespace(username?: string | null): string | null {
    const rawPath = String(settings.githubPath || '').replace(/^\/+/, '');
    const firstSegment = rawPath.includes('/') ? rawPath.split('/')[0].trim() : '';
    if (firstSegment && !/\.(json|txt|md)$/i.test(firstSegment)) {
      return firstSegment.toLowerCase();
    }
    if (username) return username.toLowerCase();
    return null;
  }

  function getGitHubImagesFolder(username?: string | null): string {
    const namespace = resolveGitHubNamespace(username) || username?.toLowerCase() || 'unknown';
    return `images_${namespace}`;
  }

  function withUserGitHubPrefix(path: string, username?: string | null): string {
    const namespace = resolveGitHubNamespace(username);
    if (!namespace) return path;
    const cleaned = path.replace(/^\/+/, '');
    const prefix = `${namespace}/`;
    if (cleaned.startsWith(prefix)) return cleaned;
    return `${prefix}${cleaned}`;
  }

  function buildModuleData(allData: ReturnType<typeof getAllUserData>) {
    const main = allData.main;
    const ui = allData.ui;

    const core = {
      weightLogs: main.weightLogs,
      goalWeight: main.goalWeight,
      height: main.height,
      dateOfBirth: main.dateOfBirth,
      gender: main.gender,
      dietPlan: main.dietPlan,
      schedule: main.schedule,
      dailyPurposes: main.dailyPurposes,
      settings: main.settings,
    };

    const workouts = {
      allUpskillLogs: main.allUpskillLogs,
      allDeepWorkLogs: main.allDeepWorkLogs,
      allWorkoutLogs: main.allWorkoutLogs,
      brandingLogs: main.brandingLogs,
      allLeadGenLogs: main.allLeadGenLogs,
      workoutMode: main.workoutMode,
      strengthTrainingMode: main.strengthTrainingMode,
      workoutPlanRotation: main.workoutPlanRotation,
      workoutPlans: main.workoutPlans,
      exerciseDefinitions: main.exerciseDefinitions,
      upskillDefinitions: main.upskillDefinitions,
      topicGoals: main.topicGoals,
      deepWorkDefinitions: main.deepWorkDefinitions,
      leadGenDefinitions: main.leadGenDefinitions,
      mindProgrammingDefinitions: main.mindProgrammingDefinitions,
      allMindProgrammingLogs: main.allMindProgrammingLogs,
      mindProgrammingCategories: main.mindProgrammingCategories,
      mindProgrammingMode: main.mindProgrammingMode,
      mindProgrammingPlans: main.mindProgrammingPlans,
      mindProgrammingPlanRotation: main.mindProgrammingPlanRotation,
    };

    const resourcesModule = {
      resources: main.resources,
      resourceFolders: main.resourceFolders,
    };

    const knowledge = {
      canvasLayout: main.canvasLayout,
      mindsetCards: main.mindsetCards,
      pistons: main.pistons,
      skillDomains: main.skillDomains,
      coreSkills: main.coreSkills,
      projects: main.projects,
      companies: main.companies,
      positions: main.positions,
      purposeData: main.purposeData,
      patterns: main.patterns,
      metaRules: main.metaRules,
      pillarEquations: main.pillarEquations,
      skillAcquisitionPlans: main.skillAcquisitionPlans,
      autoSuggestions: main.autoSuggestions,
      pathNodes: main.pathNodes,
      missedSlotReviews: main.missedSlotReviews,
      journalSessions: main.journalSessions,
      mindsetSessions: main.mindsetSessions,
      topPriorities: main.topPriorities,
      brainHacks: main.brainHacks,
      spacedRepetitionData: main.spacedRepetitionData,
      dailyReviewLogs: main.dailyReviewLogs,
      abandonmentLogs: main.abandonmentLogs,
      productizationPlans: main.productizationPlans,
      offerizationPlans: main.offerizationPlans,
    };

    return { core, workouts, resources: resourcesModule, knowledge, ui };
  }

  const reseedGitHubModuleHashesFromImported = useCallback(async (
    mainData: any,
    uiData: any,
    rawBackupText?: string
  ) => {
    const username = currentUser?.username?.toLowerCase();
    const githubPath = settings.githubPath;
    if (!username || !githubPath) return;

    const allData = { main: mainData, ui: uiData } as ReturnType<typeof getAllUserData>;
    const modules = buildModuleData(allData);
    const prefixedPath = withUserGitHubPrefix(githubPath, username);
    const { dir } = getGitHubBaseDir(prefixedPath);
    const modulesBase = dir ? `${dir}/modules` : 'modules';
    const resourcesFoldersBase = `${modulesBase}/resources-folders`;
    const canvasFilesBase = `${modulesBase}/canvas-files`;
    const updatedAt = new Date().toISOString();

    const moduleEntries: { name: string; path: string; content: string }[] = [
      { name: 'core', path: `${modulesBase}/core.json`, content: JSON.stringify(modules.core, null, 2) },
      { name: 'workouts', path: `${modulesBase}/workouts.json`, content: JSON.stringify(modules.workouts, null, 2) },
      { name: 'knowledge', path: `${modulesBase}/knowledge.json`, content: JSON.stringify(modules.knowledge, null, 2) },
      { name: 'ui', path: `${modulesBase}/ui.json`, content: JSON.stringify(modules.ui, null, 2) },
    ];

    const resourcesByFolder = new Map<string, Resource[]>();
    (modules.resources?.resources || []).forEach((res: Resource) => {
      const folderKey = res.folderId || 'unfoldered';
      const list = resourcesByFolder.get(folderKey) || [];
      list.push(res);
      resourcesByFolder.set(folderKey, list);
    });
    const resourceFoldersById = new Map<string, ResourceFolder>();
    (modules.resources?.resourceFolders || []).forEach((folder: ResourceFolder) => {
      if (folder?.id) resourceFoldersById.set(folder.id, folder);
    });
    const resourcesFolderIndex = {
      version: 1,
      updatedAt,
      folders: [] as Array<{ id: string; path: string }>,
    };
    for (const [folderId, list] of resourcesByFolder.entries()) {
      const folder = resourceFoldersById.get(folderId);
      const folderPath = `${resourcesFoldersBase}/folder_${folderId}.json`;
      moduleEntries.push({
        name: `resources-folder-${folderId}`,
        path: folderPath,
        content: JSON.stringify({ folderId, folder, resources: list }, null, 2),
      });
      resourcesFolderIndex.folders.push({ id: folderId, path: folderPath });
    }
    moduleEntries.push({
      name: 'resources-folders-index',
      path: `${resourcesFoldersBase}/index.json`,
      content: JSON.stringify(resourcesFolderIndex, null, 2),
    });

    const importedCanvasFileIndex = (mainData?.canvasFileIndex && typeof mainData.canvasFileIndex === 'object')
      ? mainData.canvasFileIndex
      : {};
    const importedCanvasIds = Object.keys(importedCanvasFileIndex);
    const canvasFilesIndex = {
      version: 1,
      updatedAt,
      folder: getGitHubImagesFolder(username),
      canvases: importedCanvasIds,
    };
    moduleEntries.push({
      name: 'canvas-files-index',
      path: `${canvasFilesBase}/index.json`,
      content: JSON.stringify(canvasFilesIndex, null, 2),
    });
    importedCanvasIds.forEach((canvasId) => {
      moduleEntries.push({
        name: `canvas-file-${canvasId}`,
        path: `${canvasFilesBase}/${canvasId}.json`,
        content: JSON.stringify({ canvasId, files: importedCanvasFileIndex[canvasId] || {} }, null, 2),
      });
    });

    const manifest = {
      version: 1,
      updatedAt,
      modules: moduleEntries.reduce((acc, entry) => {
        acc[entry.name] = { path: entry.path, updatedAt };
        return acc;
      }, {} as Record<string, { path: string; updatedAt: string }>),
    };
    const manifestPath = dir ? `${dir}/manifest.json` : 'manifest.json';
    moduleEntries.push({
      name: 'manifest',
      path: manifestPath,
      content: JSON.stringify(manifest, null, 2),
    });

    const nextHashes: Record<string, string> = { ...(githubModuleHashesRef.current || {}) };
    const backupContent = rawBackupText || JSON.stringify({ main: mainData, ui: uiData }, null, 2);
    nextHashes[prefixedPath] = await hashString(backupContent);
    for (const entry of moduleEntries) {
      nextHashes[entry.path] = await hashString(entry.content);
    }

    githubModuleHashesRef.current = nextHashes;
    setSettings(prev => ({ ...prev, githubModuleHashes: nextHashes }));
  }, [currentUser?.username, settings.githubPath]);

  async function pullFromGitHub(token: string, owner: string, repo: string, path: string, sha: string) {
      const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}`, {
          headers: { 'Authorization': `token ${token}` }
      });
      if (!response.ok) {
          throw new Error('Could not pull data from GitHub.');
      }
      const data = await response.json();
      
      const content = decodeBase64Utf8(data.content);
      
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

  const downloadFromGitHub = async () => {
    const { githubToken, githubOwner, githubRepo, githubPath } = settings;
    const username = currentUser?.username?.toLowerCase();
    const nextPulledHashes: Record<string, string> = { ...(settings.githubPulledHashes || {}) };
    if (!githubToken || !githubOwner || !githubRepo || !githubPath) {
        toast({ title: 'GitHub settings not configured', variant: 'destructive' });
        return;
    }
    if (!username) {
        toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
        return;
    }
    const setDownloadProgress = (
      step: number,
      message: string,
      options?: { modulesFetched?: number; modulesTotal?: number; foldersFetched?: number; foldersTotal?: number }
    ) => {
      const details = [
        `Step ${step}/7`,
        message,
      ];
      if (options?.modulesTotal !== undefined) {
        details.push(`Modules: ${options.modulesFetched || 0}/${options.modulesTotal}`);
      }
      if (options?.foldersTotal !== undefined) {
        details.push(`Resource folders: ${options.foldersFetched || 0}/${options.foldersTotal}`);
      }
      publishGitHubSyncNotification({
        mode: 'pull',
        status: 'running',
        title: 'GitHub Download Running',
        details: details.join('\n'),
      });
    };

    try {
        setDownloadProgress(2, "Checking remote sync status...");
        const prefixedPath = withUserGitHubPrefix(githubPath, username);
        const { dir } = getGitHubBaseDir(prefixedPath);
        const syncStatusPath = dir ? `${dir}/sync-status.json` : 'sync-status.json';
        const syncStatus = await getGitHubJson<{ status?: string; startedAt?: string; updatedAt?: string }>(
          githubToken,
          githubOwner,
          githubRepo,
          syncStatusPath
        );
        if (syncStatus?.status === 'in_progress') {
          const startedAtMs = syncStatus.startedAt ? Date.parse(syncStatus.startedAt) : NaN;
          const isLikelyActive = Number.isFinite(startedAtMs) && (Date.now() - startedAtMs) < 15 * 60 * 1000;
          if (isLikelyActive) {
            throw new Error('A GitHub sync is currently in progress. Please wait a minute and retry download.');
          }
        }

        setDownloadProgress(3, "Inspecting repository structure...");
        const manifestPath = dir ? `${dir}/manifest.json` : 'manifest.json';
        const directoryEntries = await listGitHubDirectory(githubToken, githubOwner, githubRepo, dir);
        const namesInDir = new Set((directoryEntries || []).map(entry => entry.name));
        const hasManifest = namesInDir.has('manifest.json');
        const manifest = hasManifest
          ? await getGitHubJson<{ version: number; modules: Record<string, { path: string }> }>(githubToken, githubOwner, githubRepo, manifestPath)
          : null;
        let effectiveManifest = manifest;

        // Compatibility mode: repositories that have modular files but no manifest.json.
        if (!effectiveManifest && namesInDir.has('modules')) {
            const modulesBase = dir ? `${dir}/modules` : 'modules';
            const moduleEntries = await listGitHubDirectory(githubToken, githubOwner, githubRepo, modulesBase);
            const moduleNames = new Set((moduleEntries || []).map(entry => entry.name));
            const modules: Record<string, { path: string }> = {};

            if (moduleNames.has('core.json')) modules.core = { path: `${modulesBase}/core.json` };
            if (moduleNames.has('workouts.json')) modules.workouts = { path: `${modulesBase}/workouts.json` };
            if (moduleNames.has('knowledge.json')) modules.knowledge = { path: `${modulesBase}/knowledge.json` };
            if (moduleNames.has('ui.json')) modules.ui = { path: `${modulesBase}/ui.json` };
            if (moduleNames.has('resources.json')) modules.resources = { path: `${modulesBase}/resources.json` };

            // Optional indexes used by newer modular format.
            if (moduleNames.has('resources-folders')) {
              modules['resources-folders-index'] = { path: `${modulesBase}/resources-folders/index.json` };
            }
            if (moduleNames.has('canvas-files')) {
              modules['canvas-files-index'] = { path: `${modulesBase}/canvas-files/index.json` };
            }

            effectiveManifest = { version: 1, modules };
        }

        if (effectiveManifest && effectiveManifest.modules) {
            const localModulesBaseline = buildModuleData(getAllUserData());
            const modulePathEntries = [
              ['core', effectiveManifest.modules.core?.path],
              ['workouts', effectiveManifest.modules.workouts?.path],
              ['resources', effectiveManifest.modules.resources?.path],
              ['knowledge', effectiveManifest.modules.knowledge?.path],
              ['ui', effectiveManifest.modules.ui?.path],
              ['canvas-files-index', effectiveManifest.modules['canvas-files-index']?.path],
            ].filter((entry): entry is [string, string] => !!entry[1]);
            let modulesFetched = 0;
            let modulesSkipped = 0;
            const modulesTotal = modulePathEntries.length;
            const readModule = async <T,>(name: string, modulePath: string | undefined, localFallback: T | null) => {
              if (!modulePath) return null as T | null;
              const moduleSha = await getGitHubFileSha(githubToken, githubOwner, githubRepo, modulePath);
              if (moduleSha && settings.githubPulledHashes?.[modulePath] === moduleSha) {
                modulesSkipped += 1;
                setDownloadProgress(4, `Skipped unchanged module "${name}"`, { modulesFetched, modulesTotal });
                return localFallback;
              }
              const value = await getGitHubJson<T>(githubToken, githubOwner, githubRepo, modulePath);
              modulesFetched += 1;
              if (moduleSha) nextPulledHashes[modulePath] = moduleSha;
              setDownloadProgress(4, `Fetched module "${name}"`, { modulesFetched, modulesTotal });
              return value;
            };

            let resourcesMod = await readModule<any>('resources', effectiveManifest.modules.resources?.path, localModulesBaseline.resources);
            const core = await readModule<any>('core', effectiveManifest.modules.core?.path, localModulesBaseline.core);
            const workouts = await readModule<any>('workouts', effectiveManifest.modules.workouts?.path, localModulesBaseline.workouts);
            const knowledge = await readModule<any>('knowledge', effectiveManifest.modules.knowledge?.path, localModulesBaseline.knowledge);
            const ui = await readModule<any>('ui', effectiveManifest.modules.ui?.path, localModulesBaseline.ui);
            const canvasFilesIndex = await readModule<any>('canvas-files-index', effectiveManifest.modules['canvas-files-index']?.path, null);

            const resourcesFoldersBase = dir ? `${dir}/modules/resources-folders` : 'modules/resources-folders';

            // Prefer per-folder resource modules when present
            let folderModuleEntries = Object.entries(effectiveManifest.modules)
              .filter(([key]) => key.startsWith('resources-folder-'))
              .map(([, value]) => value?.path)
              .filter(Boolean) as string[];

            // If an index exists, use it for faster import
            const folderIndexPath = effectiveManifest.modules['resources-folders-index']?.path;
            if (folderIndexPath) {
                const indexPayload = await getGitHubJson<{ folders?: Array<{ id: string; path: string }> }>(githubToken, githubOwner, githubRepo, folderIndexPath);
                if (indexPayload?.folders && Array.isArray(indexPayload.folders)) {
                    folderModuleEntries = indexPayload.folders.map(f => f.path).filter(Boolean);
                }
            }

            const resourcesFolderEntries = await listGitHubDirectory(githubToken, githubOwner, githubRepo, resourcesFoldersBase);
            const folderShaByPath = new Map<string, string>();
            (resourcesFolderEntries || []).forEach((entry) => {
              if (entry.type === 'file' && entry.name.endsWith('.json') && entry.name !== 'index.json' && entry.sha) {
                folderShaByPath.set(entry.path, entry.sha);
              }
            });

            // Compatibility fallback: if no index, enumerate modules/resources-folders directly.
            if (folderModuleEntries.length === 0) {
                if (resourcesFolderEntries && resourcesFolderEntries.length > 0) {
                    folderModuleEntries = resourcesFolderEntries
                      .filter(entry => entry.type === 'file' && entry.name.endsWith('.json') && entry.name !== 'index.json')
                      .map(entry => entry.path);
                }
            }

            if (folderModuleEntries.length > 0) {
                const changedFolderEntries = folderModuleEntries.filter((folderPath) => {
                  const remoteSha = folderShaByPath.get(folderPath);
                  if (!remoteSha) return true;
                  if (settings.githubPulledHashes?.[folderPath] === remoteSha) {
                    nextPulledHashes[folderPath] = remoteSha;
                    return false;
                  }
                  return true;
                });

                if (changedFolderEntries.length === 0 && !resourcesMod) {
                  resourcesMod = localModulesBaseline.resources;
                }

                const folderResources: Resource[] = [];
                const folderFolders: ResourceFolder[] = [];
                let foldersFetched = 0;
                for (let index = 0; index < changedFolderEntries.length; index += 1) {
                    const folderPath = changedFolderEntries[index];
                    setDownloadProgress(4, `Loading changed modular folder ${index + 1}/${changedFolderEntries.length}`, {
                      modulesFetched,
                      modulesTotal,
                      foldersFetched,
                      foldersTotal: changedFolderEntries.length,
                    });
                    let folderPayload: { folderId?: string; folder?: ResourceFolder; resources?: Resource[] } | null = null;
                    try {
                      folderPayload = await getGitHubJson<{ folderId?: string; folder?: ResourceFolder; resources?: Resource[] }>(
                        githubToken,
                        githubOwner,
                        githubRepo,
                        folderPath
                      );
                    } catch (folderError) {
                      console.error('Failed to load modular folder file:', folderPath, folderError);
                      foldersFetched += 1;
                      continue;
                    }
                    foldersFetched += 1;
                    const remoteSha = folderShaByPath.get(folderPath);
                    if (remoteSha) {
                      nextPulledHashes[folderPath] = remoteSha;
                    }
                    if (!folderPayload) continue;
                    if (folderPayload?.folder) folderFolders.push(folderPayload.folder);
                    if (folderPayload?.resources && Array.isArray(folderPayload.resources)) {
                        folderResources.push(...folderPayload.resources);
                    }
                }
                if (folderResources.length > 0) {
                    const byId = new Map<string, Resource>();
                    folderResources.forEach(r => {
                      if (r?.id) byId.set(r.id, r);
                    });
                    const foldersById = new Map<string, ResourceFolder>();
                    folderFolders.forEach(f => {
                      if (f?.id) foldersById.set(f.id, f);
                    });
                    resourcesMod = {
                      resources: Array.from(byId.values()),
                      resourceFolders: Array.from(foldersById.values()),
                    };
                }
            }

            const hasCore = !!core;
            const hasResources = !!resourcesMod || folderModuleEntries.length > 0;
            const needsKnowledgeModule = !!effectiveManifest.modules.knowledge?.path;
            const hasKnowledge = !needsKnowledgeModule || !!knowledge;
            if (!hasCore || !hasResources || !hasKnowledge) {
                setDownloadProgress(5, "Modular backup incomplete. Falling back to full backup...");
            } else {
                setDownloadProgress(6, "Assembling and storing modular backup locally...");
                const mergedMain = {
                    ...(core || {}),
                    ...(workouts || {}),
                    ...(resourcesMod || {}),
                    ...(knowledge || {}),
                    ...(canvasFilesIndex ? { canvasFileIndex: canvasFilesIndex } : {}),
                };

                const merged = { main: mergedMain, ui: ui || {} };
                const blob = new Blob([JSON.stringify(merged)], { type: 'application/json' });
                await storeBackup('github_backup', blob);
                setDownloadProgress(7, "Fetching canvas/audio/pdf assets...");
                const modularAssetFetchResults = await Promise.allSettled([
                  fetchCanvasImagesFromGitHub(),
                  fetchAudioFilesFromGitHub(),
                  fetchPdfFilesFromGitHub(),
                ]);
                const modularAssetFailures = modularAssetFetchResults
                  .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
                  .map((r) => String(r.reason));
                setImportBackupConfirmationOpen(true);
                setSettings(prev => ({ ...prev, githubPulledHashes: nextPulledHashes }));
                publishGitHubSyncNotification({
                  mode: 'pull',
                  status: 'success',
                  title: "GitHub Download Ready",
                  details: `Modular backup has been assembled locally.\nModules: ${modulesFetched} fetched, ${modulesSkipped} skipped.${modularAssetFailures.length > 0 ? `\nAssets partial: ${modularAssetFailures.length} fetch step(s) failed.` : "\nAssets fetched successfully."}\nClose this notification when reviewed.`,
                });
                return;
            }
        }

        setDownloadProgress(5, "Resolving full backup file...");
        let resolvedBackupPath = prefixedPath;
        const preferredName = prefixedPath.split('/').pop() || prefixedPath;
        if (!namesInDir.has(preferredName)) {
            const latestPath = pickLatestDatedBackupPath(directoryEntries || [], username);
            if (latestPath) {
                resolvedBackupPath = latestPath;
            } else {
                throw new Error(`No backup file found in ${dir || '/'} for user ${username}.`);
            }
        }

        setDownloadProgress(6, "Downloading full backup payload...");
        const response = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${resolvedBackupPath}`, {
            headers: { 'Authorization': `token ${githubToken}` }
        });
        if (!response.ok) throw new Error('Failed to fetch file metadata from GitHub.');
        
        const data = await response.json();
        if (data?.sha) {
          nextPulledHashes[resolvedBackupPath] = data.sha;
        }
        let blob: Blob | null = null;

        if (data?.content) {
            const content = decodeBase64Utf8(data.content);
            blob = new Blob([content], { type: 'application/json' });
        } else if (data?.download_url) {
            const fileResponse = await fetch(data.download_url);
            if (!fileResponse.ok) throw new Error('Failed to download file content.');
            blob = await fileResponse.blob();
        }

        if (!blob) {
            throw new Error('Failed to retrieve backup content from GitHub.');
        }

        setDownloadProgress(7, "Saving backup locally...");
        await storeBackup('github_backup', blob);
        setDownloadProgress(7, "Fetching canvas/audio/pdf assets...");
        const fullAssetFetchResults = await Promise.allSettled([
          fetchCanvasImagesFromGitHub(),
          fetchAudioFilesFromGitHub(),
          fetchPdfFilesFromGitHub(),
        ]);
        const fullAssetFailures = fullAssetFetchResults
          .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
          .map((r) => String(r.reason));

        setImportBackupConfirmationOpen(true);
        setSettings(prev => ({ ...prev, githubPulledHashes: nextPulledHashes }));
        publishGitHubSyncNotification({
          mode: 'pull',
          status: 'success',
          title: "GitHub Download Ready",
          details: `Backup has been downloaded and stored locally.${fullAssetFailures.length > 0 ? `\nAssets partial: ${fullAssetFailures.length} fetch step(s) failed.` : "\nAssets fetched successfully."}\nClose this notification when reviewed.`,
        });
        
    } catch (error) {
        publishGitHubSyncNotification({
          mode: 'pull',
          status: 'error',
          title: 'GitHub Download Failed',
          details: error instanceof Error ? error.message : "Unknown error",
        });
    }
  };

  const getCanvasFilesMetaByCanvasId = useCallback(() => {
      const canvasFilesById = new Map<string, Record<string, any>>();
      const sanitizeJson = (input: string) =>
        input.replace(/[\u0000-\u001F]/g, ' ').trim();
      const tryParseDrawing = (raw: string): any | null => {
        try {
          return JSON.parse(raw);
        } catch {
          try {
            return JSON.parse(sanitizeJson(raw));
          } catch {
            return null;
          }
        }
      };

      (resources || []).forEach(resource => {
          (resource.points || []).forEach(point => {
              if (point.type !== 'paint' || !point.drawing) return;
                try {
                  const drawing = point.drawing;
                  const canvasId = `${resource.id}-${point.id}`;

                  // If drawing is a JSON string (starts with { or [), attempt to parse it.
                  // Otherwise it's likely a data URL or other inline content and there are no external files to fetch.
                  if (typeof drawing === 'string' && (drawing.trim().startsWith('{') || drawing.trim().startsWith('['))) {
                    const parsed = tryParseDrawing(drawing);
                    if (!parsed) {
                      console.debug("Skipping invalid canvas drawing while collecting file metadata: could not parse JSON.");
                      return;
                    }

                    if (parsed && parsed.files && typeof parsed.files === 'object' && Object.keys(parsed.files).length > 0) {
                      canvasFilesById.set(canvasId, parsed.files);
                      return;
                    }

                    // Fallback: derive file IDs from image elements if files metadata is missing.
                    const fileIds = new Set<string>();
                    const elements = Array.isArray(parsed?.elements) ? parsed.elements : [];
                    elements.forEach((el: any) => {
                      if (el?.type === 'image' && typeof el.fileId === 'string') {
                        fileIds.add(el.fileId);
                      }
                    });

                    if (fileIds.size > 0) {
                      const derivedMeta: Record<string, any> = {};
                      fileIds.forEach(fileId => {
                        derivedMeta[fileId] = { mimeType: 'image/png' };
                      });
                      canvasFilesById.set(canvasId, derivedMeta);
                    }
                  } else {
                    // Non-JSON drawing (e.g., data URL) — nothing to fetch from GitHub for this canvas.
                    return;
                  }
                } catch (e) {
                  console.debug("Skipping invalid canvas drawing while collecting file metadata:", e && (e as Error).message ? (e as Error).message : e);
                }
          });
      });

      return canvasFilesById;
  }, [resources]);

  const syncCanvasImagesToGitHub = async (options?: GitHubAssetSyncOptions) => {
      const silent = !!options?.silent;
      const emitProgress = (progress: GitHubAssetSyncProgress) => {
        options?.onProgress?.(progress);
      };
      const username = currentUser?.username?.toLowerCase();
      const { githubToken, githubOwner, githubRepo } = settings;

      if (!username) {
          if (!silent) toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
          return;
      }

      if (!githubToken || !githubOwner || !githubRepo) {
          if (!silent) toast({ title: 'GitHub settings not configured', variant: 'destructive' });
          return;
      }

      const entries = await getAllExcalidrawFiles();
      if (entries.length === 0) {
          emitProgress({ phase: 'complete', total: 0, processed: 0, uploaded: 0, skipped: 0, note: 'No local images found.' });
          if (!silent) toast({ title: "No images found", description: "No Excalidraw images are stored locally." });
          return;
      }

      const folderPath = withUserGitHubPrefix(getGitHubImagesFolder(username), username);
      let toastHandle: ReturnType<typeof toast> | null = null;
      if (!silent) {
        toastHandle = toast({
          title: "Uploading images...",
          description: `Pushing ${entries.length} images to GitHub.`,
          duration: PERSISTENT_TOAST_DURATION_MS,
        });
      }

      try {
          let uploaded = 0;
          let skipped = 0;
          let processed = 0;
          const nextHashes: Record<string, string> = { ...(githubModuleHashesRef.current || {}) };
          emitProgress({ phase: 'preparing', total: entries.length, processed, uploaded, skipped, note: 'Reading local image cache...' });

            // Pre-list existing files in the target folder to avoid many 404 GETs
            const existingFilesMap = new Map<string, string>();
            const uploadedFileNames = new Set<string>();
            try {
            const listData = await listGitHubDirectoryPaged(githubToken, githubOwner, githubRepo, folderPath);
            if (listData) {
              for (const item of listData || []) {
                if (item && item.type === 'file' && item.name && item.sha) {
                  existingFilesMap.set(item.name, item.sha);
                }
              }
            }
            } catch (e) {
            console.debug('Could not list existing GitHub image folder, continuing with per-file upload', e);
            }

            for (const { key, record } of entries) {
              const fileId = key.split(':').pop();
              if (!fileId || !record?.blob) {
                skipped += 1;
                processed += 1;
                emitProgress({ phase: 'uploading', total: entries.length, processed, uploaded, skipped, currentItem: key, note: 'Skipped invalid local image record.' });
                continue;
              }

              const mimeType = record.mimeType || record.blob.type || 'application/octet-stream';
              const ext = mimeType.includes('png') ? 'png'
                : mimeType.includes('jpeg') ? 'jpg'
                : mimeType.includes('jpg') ? 'jpg'
                : mimeType.includes('webp') ? 'webp'
                : mimeType.includes('gif') ? 'gif'
                : 'bin';

              const filename = `${fileId}.${ext}`;
              const path = `${folderPath}/${filename}`;
              emitProgress({ phase: 'uploading', total: entries.length, processed, uploaded, skipped, currentItem: filename, note: 'Uploading image file...' });
              if (uploadedFileNames.has(filename)) {
                skipped += 1;
                processed += 1;
                emitProgress({ phase: 'uploading', total: entries.length, processed, uploaded, skipped, currentItem: filename, note: 'Duplicate in current sync; skipped.' });
                continue;
              }

              const buffer = await record.blob.arrayBuffer();
              const base64Content = arrayBufferToBase64(buffer);
              const fileHash = await hashString(base64Content);
              const existingHash = nextHashes[path];
              if (existingHash === fileHash) {
                skipped += 1;
                processed += 1;
                emitProgress({ phase: 'uploading', total: entries.length, processed, uploaded, skipped, currentItem: filename, note: 'Unchanged; skipped.' });
                continue;
              }

              const message = `LifeOS canvas image: ${filename}`;
              let uploadSucceeded = false;
              let lastUploadError: unknown = null;
              let sha = existingFilesMap.get(filename);
              for (let attempt = 1; attempt <= 4 && !uploadSucceeded; attempt += 1) {
                const pushResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
                  method: 'PUT',
                  headers: {
                    'Authorization': `token ${githubToken}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    message,
                    content: base64Content,
                    ...(sha ? { sha } : {}),
                  }),
                });

                const result = await pushResponse.json();
                if (pushResponse.ok) {
                  uploadSucceeded = true;
                  const nextSha = result?.content?.sha as string | undefined;
                  if (nextSha) existingFilesMap.set(filename, nextSha);
                  break;
                }

                const messageText = String(result?.message || '');
                if (pushResponse.status === 409 || /is at ([0-9a-f]{40})/i.test(messageText)) {
                  const parsedSha = messageText.match(/is at ([0-9a-f]{40})/i)?.[1];
                  sha = parsedSha || await getGitHubFileSha(githubToken, githubOwner, githubRepo, path);
                  lastUploadError = result;
                  await new Promise(r => setTimeout(r, 250 * attempt));
                  continue;
                }

                throw new Error(result?.message || `Failed to upload ${filename}.`);
              }
              if (!uploadSucceeded) {
                throw new Error(lastUploadError && typeof lastUploadError === 'object' && 'message' in (lastUploadError as Record<string, unknown>)
                  ? String((lastUploadError as Record<string, unknown>).message)
                  : `Failed to upload ${filename}.`);
              }

              uploaded += 1;
              processed += 1;
              nextHashes[path] = fileHash;
              uploadedFileNames.add(filename);
              emitProgress({ phase: 'uploading', total: entries.length, processed, uploaded, skipped, currentItem: filename, note: 'Uploaded.' });
            }

          githubModuleHashesRef.current = nextHashes;
          setSettings(prev => ({ ...prev, githubModuleHashes: nextHashes }));
          emitProgress({ phase: 'complete', total: entries.length, processed, uploaded, skipped, note: 'Image upload finished.' });
          if (toastHandle) {
            toastHandle.update({ title: "Images Uploaded", description: `${uploaded} uploaded | ${skipped} skipped` });
          } else if (!silent) {
            toast({ title: "Images Uploaded", description: `${uploaded} images uploaded to GitHub.` });
          }
      } catch (error) {
          console.error("GitHub image upload failed:", error);
          emitProgress({ phase: 'failed', total: entries.length, processed: 0, uploaded: 0, skipped: 0, note: error instanceof Error ? error.message : "Unknown error" });
          if (toastHandle) {
            toastHandle.update({ title: "Upload Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
          } else if (!silent) {
            toast({ title: "Upload Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
          }
      }
  };

    const syncAudioFilesToGitHub = async (options?: GitHubAssetSyncOptions) => {
        const silent = !!options?.silent;
        const emitProgress = (progress: GitHubAssetSyncProgress) => {
          options?.onProgress?.(progress);
        };
        const username = currentUser?.username?.toLowerCase();
        const { githubToken, githubOwner, githubRepo } = settings;

        if (!username) {
          if (!silent) toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
          return;
        }
        if (!githubToken || !githubOwner || !githubRepo) {
          if (!silent) toast({ title: 'GitHub settings not configured', variant: 'destructive' });
          return;
        }

        const audios = (resources || []).filter(r => r.hasLocalAudio || r.audioFileName);
        if (audios.length === 0) {
          emitProgress({ phase: 'complete', total: 0, processed: 0, uploaded: 0, skipped: 0, note: 'No local audio files found.' });
          if (!silent) toast({ title: "No audio files", description: "No local audio files found to upload." });
          return;
        }

        const folderPath = withUserGitHubPrefix(`audio_${username}`, username);
        const syncToast = silent ? null : toast({ title: "Uploading audio...", description: `Preparing ${audios.length} files...`, duration: PERSISTENT_TOAST_DURATION_MS });

        try {
          let uploaded = 0;
          let skipped = 0;
          let processed = 0;
          emitProgress({ phase: 'preparing', total: audios.length, processed, uploaded, skipped, note: 'Preparing audio upload...' });

          for (const res of audios) {
            const { blob, key: foundKey } = await getAudioForResource(res.id, res.audioFileName);
            const rawName = String(res.audioFileName || foundKey || res.id || 'audio');
            if (!blob) {
              skipped += 1;
              processed += 1;
              emitProgress({ phase: 'uploading', total: audios.length, processed, uploaded, skipped, currentItem: rawName, note: 'Skipped missing local blob.' });
              continue;
            }

            const buffer = await blob.arrayBuffer();
            const base64Content = arrayBufferToBase64(buffer);
            const fileHash = await hashString(base64Content);

            const mimeType = blob.type || 'audio/mpeg';
            const ext = mimeType.includes('mpeg') || mimeType.includes('mp3') ? 'mp3' : mimeType.split('/').pop() || 'bin';
            const safeName = rawName.replace(/\s+/g, '_');
            const hasExt = /\.[a-zA-Z0-9]{1,5}$/.test(safeName);
            const filename = (hasExt ? safeName : `${safeName}.${ext}`);
            const path = `${folderPath}/${filename}`;

            const existingHash = githubModuleHashesRef.current?.[path];
            if (existingHash === fileHash) {
              skipped += 1;
              processed += 1;
              syncToast?.update({ title: 'Skipping', description: `Unchanged: ${filename}` });
              emitProgress({ phase: 'uploading', total: audios.length, processed, uploaded, skipped, currentItem: filename, note: 'Unchanged; skipped.' });
              continue;
            }

            // retry loop
            let success = false;
            let lastError: any = null;
            for (let attempt = 1; attempt <= 3 && !success; attempt++) {
              try {
                const fileResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
                  headers: { 'Authorization': `token ${githubToken}` }
                });
                let sha: string | undefined;
                if (fileResponse.ok) {
                  const fileData = await fileResponse.json();
                  sha = fileData.sha;
                } else if (fileResponse.status !== 404) {
                  const err = await fileResponse.json();
                  throw new Error(err.message || 'Failed to check existing file');
                }

                const message = `LifeOS audio: ${filename}`;
                const pushResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${path}`, {
                  method: 'PUT',
                  headers: { 'Authorization': `token ${githubToken}`, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ message, content: base64Content, sha }),
                });

                const result = await pushResponse.json();
                if (!pushResponse.ok) throw new Error(result.message || 'Failed to push audio');

                // update hash store
                githubModuleHashesRef.current = { ...(githubModuleHashesRef.current || {}), [path]: fileHash };
                setSettings(prev => ({ ...prev, githubModuleHashes: { ...(prev.githubModuleHashes || {}), [path]: fileHash } }));
                uploaded += 1;
                processed += 1;
                success = true;
                syncToast?.update({ title: 'Uploading', description: `Uploaded ${uploaded} / ${audios.length}` });
                emitProgress({ phase: 'uploading', total: audios.length, processed, uploaded, skipped, currentItem: filename, note: 'Uploaded.' });
              } catch (e) {
                lastError = e;
                const delay = 500 * Math.pow(2, attempt);
                await new Promise(r => setTimeout(r, delay));
              }
            }

            if (!success) {
              skipped += 1;
              processed += 1;
              console.error('Upload audio failed for', res.id, lastError);
              emitProgress({ phase: 'uploading', total: audios.length, processed, uploaded, skipped, currentItem: filename, note: 'Failed after retries; skipped.' });
            }
          }

          emitProgress({ phase: 'complete', total: audios.length, processed, uploaded, skipped, note: 'Audio upload finished.' });
          syncToast?.update({ title: "Audio Upload Complete", description: `${uploaded} uploaded | ${skipped} skipped` });
        } catch (error) {
          console.error('Audio upload failed:', error);
          emitProgress({ phase: 'failed', total: audios.length, processed: 0, uploaded: 0, skipped: 0, note: error instanceof Error ? error.message : 'Unknown error' });
          syncToast?.update({ title: 'Upload Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
        }
    };

    const fetchAudioFilesFromGitHub = async () => {
      const username = currentUser?.username?.toLowerCase();
      const { githubToken, githubOwner, githubRepo } = settings;

      if (!username) {
        toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
        return;
      }
      if (!githubToken || !githubOwner || !githubRepo) {
        toast({ title: 'GitHub settings not configured', variant: 'destructive' });
        return;
      }

      const folderPath = withUserGitHubPrefix(`audio_${username}`, username);
      toast({ title: "Fetching audio...", description: "Downloading audio files from GitHub to this browser." });

      try {
        const listResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${folderPath}`, {
          headers: { 'Authorization': `token ${githubToken}` }
        });
        if (!listResponse.ok) {
          if (listResponse.status === 404) {
            console.info(`GitHub folder ${folderPath} not found; nothing to fetch.`);
            toast({ title: 'No audio folder', description: `No folder "${folderPath}" found on GitHub. Nothing to fetch.` });
            return;
          }
          const err = await listResponse.json().catch(() => ({ message: 'Failed to list audios on GitHub' }));
          throw new Error(err.message || 'Failed to list audios on GitHub');
        }

        const listData = await listResponse.json();
        console.info(`Found ${Array.isArray(listData) ? listData.length : 0} items in ${folderPath}`, listData);
        let downloaded = 0;
        let skippedUnchanged = 0;
        const nextPulledHashes: Record<string, string> = { ...(settings.githubPulledHashes || {}) };

        for (const item of listData || []) {
          if (item.type !== 'file' || !item.name) continue;
          const filePath = `${folderPath}/${item.name}`;
          if (item.sha && settings.githubPulledHashes?.[filePath] === item.sha) {
            skippedUnchanged += 1;
            continue;
          }
          try {
            // Prefer the provided download_url when available (raw content), fallback to GitHub contents API
            const downloadUrl = item.download_url as string | undefined;
            let blob: Blob | null = null;

            // If the download_url points to raw.githubusercontent.com it often fails CORS from the browser.
            // Prefer using the GitHub Contents API when we have an auth token, or when the download_url host is raw.githubusercontent.com.
            if (downloadUrl) {
              const isRawHost = downloadUrl.includes('raw.githubusercontent.com');
              if (githubToken || isRawHost === false) {
                try {
                  // Only attempt direct download when not raw.githubusercontent (to avoid CORS) or when no token is present
                  if (!isRawHost) {
                    const dataResp = await fetch(downloadUrl);
                    if (!dataResp.ok) {
                      console.warn('Download URL fetch failed', downloadUrl, dataResp.status);
                    } else {
                      const arrayBuffer = await dataResp.arrayBuffer();
                      const ext = item.name.split('.').pop() || 'mp3';
                      const mimeType = ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`;
                      blob = new Blob([arrayBuffer], { type: mimeType });
                    }
                  }
                } catch (dd) {
                  console.warn('Failed to fetch download_url for', item.name, dd);
                }
              }
            }

            if (!blob) {
              // Use the GitHub Contents API which returns base64 content. This works with the Authorization header and avoids CORS issues.
              const fileResponse = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`, {
                headers: { 'Authorization': `token ${githubToken}` }
              });
              if (!fileResponse.ok) {
                console.warn('Contents API fetch failed for', filePath, fileResponse.status);
                const errText = await fileResponse.text().catch(() => 'no-response-text');
                console.warn('Contents API response text:', errText);
                continue;
              }
              const fileData = await fileResponse.json();
              // GitHub may omit `content` for large files in the Contents API response.
              // If content is missing but we have a SHA, fetch the blob via the Git Data API.
              let base64Content: string | undefined = fileData?.content;
              if (!base64Content && fileData?.sha) {
                try {
                  const blobResp = await fetch(`https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs/${fileData.sha}`, {
                    headers: { 'Authorization': `token ${githubToken}` }
                  });
                  if (blobResp.ok) {
                    const blobData = await blobResp.json();
                    if (blobData?.content) base64Content = blobData.content;
                    else console.warn('Git blobs API returned no content for', filePath, fileData.sha, blobData);
                  } else {
                    console.warn('Git blobs API fetch failed for', filePath, fileData.sha, blobResp.status);
                  }
                } catch (blobErr) {
                  console.warn('Error fetching git blob for', filePath, fileData.sha, blobErr);
                }
              }
              if (!base64Content) {
                console.warn('Contents API returned no content for', filePath, fileData);
                continue;
              }
              const cleaned = String(base64Content).replace(/\n/g, '');
              try {
                const binary = atob(cleaned);
                const bytes = new Uint8Array(binary.length);
                for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
                const ext = item.name.split('.').pop() || 'mp3';
                const mimeType = ext === 'mp3' ? 'audio/mpeg' : `audio/${ext}`;
                blob = new Blob([bytes], { type: mimeType });
              } catch (decodeErr) {
                console.warn('Failed to decode base64 content for', filePath, decodeErr);
                continue;
              }
            }

            if (!blob) continue;

            const key = item.name.split('.').slice(0, -1).join('.') || item.name;
            await storeAudio(key, blob);

            // Update resources that might reference this audio by id/key
            setResources(prev => prev.map(r => {
              if (r.audioFileName === key || r.id === key) {
                return { ...r, hasLocalAudio: true, audioFileName: key };
              }
              return r;
            }));
            downloaded += 1;
            if (item.sha) {
              nextPulledHashes[filePath] = item.sha;
            }
          } catch (e) {
            console.warn('Error fetching audio item', item.name, e);
            continue;
          }
        }
        setSettings(prev => ({ ...prev, githubPulledHashes: nextPulledHashes }));
        toast({ title: "Audio Fetch Complete", description: `Downloaded ${downloaded} audio files. ${skippedUnchanged > 0 ? `${skippedUnchanged} unchanged skipped.` : ''}` });
      } catch (error) {
        console.error('Fetch audio failed:', error);
        toast({ title: 'Fetch Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      }
    };
    const syncPdfFilesToGitHub = async (options?: GitHubAssetSyncOptions) => {
        const silent = !!options?.silent;
        const emitProgress = (progress: GitHubAssetSyncProgress) => {
          options?.onProgress?.(progress);
        };
        const username = currentUser?.username?.toLowerCase();

        if (!username) {
          if (!silent) toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
          return;
        }
        if (!settings.supabaseUrl) {
          if (!silent) toast({ title: "Supabase not configured", description: "Save Supabase URL in Settings.", variant: "destructive" });
          return;
        }

        const pdfs = (resources || []).filter(r => r.type === 'pdf');
        if (pdfs.length === 0) {
          emitProgress({ phase: 'complete', total: 0, processed: 0, uploaded: 0, skipped: 0, note: 'No local PDFs found.' });
          if (!silent) toast({ title: "No PDFs", description: "No local PDFs found to upload." });
          return;
        }

        const syncToast = silent ? null : toast({ title: "Uploading PDFs...", description: `Preparing ${pdfs.length} files to Supabase...`, duration: PERSISTENT_TOAST_DURATION_MS });

        try {
          let uploaded = 0;
          let skipped = 0;
          let processed = 0;
          emitProgress({ phase: 'preparing', total: pdfs.length, processed, uploaded, skipped, note: 'Preparing PDF upload to Supabase...' });

          const allLocalPdfKeys = await getAllPdfKeys().catch(() => [] as string[]);
          for (const res of pdfs) {
            const primaryKey = `${res.id}`;
            let lookup = await getPdfForResource(primaryKey, res.pdfFileName ? String(res.pdfFileName) : undefined);
            if (!lookup.blob && res.name) {
              // Older resources may only have filename in DB, not pdfFileName metadata.
              lookup = await getPdfForResource(primaryKey, String(res.name));
            }
            if (!lookup.blob && allLocalPdfKeys.length > 0) {
              const normalizeKey = (value: string) =>
                String(value || '')
                  .toLowerCase()
                  .replace(/\.[a-z0-9]{1,5}$/i, '')
                  .replace(/[^\w]/g, '_')
                  .replace(/_+/g, '_')
                  .replace(/^_+|_+$/g, '');
              const targetSet = new Set<string>([
                normalizeKey(primaryKey),
                normalizeKey(String(res.pdfFileName || '')),
                normalizeKey(String(res.name || '')),
              ]);
              for (const localKey of allLocalPdfKeys) {
                const keyNorm = normalizeKey(localKey);
                if (!keyNorm) continue;
                if (targetSet.has(keyNorm)) {
                  lookup = await getPdfForResource(localKey, localKey);
                  if (lookup.blob) break;
                }
              }
            }
            if (!lookup.blob) {
              skipped += 1;
              processed += 1;
              emitProgress({ phase: 'uploading', total: pdfs.length, processed, uploaded, skipped, currentItem: res.name || primaryKey, note: 'Skipped missing local PDF.' });
              continue;
            }
            const blob = lookup.blob;
            const matchedPdfKey = lookup.key;

            let uploadSucceeded = false;
            let lastUploadError: unknown = null;
            for (let attempt = 1; attempt <= 3 && !uploadSucceeded; attempt += 1) {
              try {
                await uploadPdfToSupabase(username, primaryKey, blob, {
                  url: settings.supabaseUrl,
                  anonKey: settings.supabaseAnonKey,
                  bucket: settings.supabasePdfBucket,
                  serviceRoleKey:
                    typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop)
                      ? settings.supabaseServiceRoleKey
                      : undefined,
                });
                uploadSucceeded = true;
              } catch (e) {
                lastUploadError = e;
                await new Promise(r => setTimeout(r, 250 * attempt));
              }
            }
            if (!uploadSucceeded) {
              skipped += 1;
              processed += 1;
              const filename = `${primaryKey}.pdf`.replace(/\s+/g, '_');
              const msg = lastUploadError && typeof lastUploadError === 'object' && 'message' in (lastUploadError as Record<string, unknown>)
                ? String((lastUploadError as Record<string, unknown>).message)
                : `Failed to upload ${filename} to Supabase.`;
              console.error('Upload pdf failed for', res.id, msg);
              emitProgress({ phase: 'uploading', total: pdfs.length, processed, uploaded, skipped, currentItem: filename, note: `Failed: ${msg}` });
              continue;
            }
            uploaded += 1;
            processed += 1;
            const filename = `${primaryKey}.pdf`.replace(/\s+/g, '_');
            syncToast?.update({ title: 'Uploading', description: `Uploaded ${uploaded} / ${pdfs.length}` });
            emitProgress({
              phase: 'uploading',
              total: pdfs.length,
              processed,
              uploaded,
              skipped,
              currentItem: filename,
              note: matchedPdfKey ? `Uploaded from local key: ${matchedPdfKey}` : 'Uploaded.',
            });
          }

          emitProgress({ phase: 'complete', total: pdfs.length, processed, uploaded, skipped, note: 'PDF upload to Supabase finished.' });
          syncToast?.update({ title: "PDF Upload Complete", description: `${uploaded} uploaded to Supabase | ${skipped} skipped` });
        } catch (error) {
          console.error('PDF upload failed:', error);
          emitProgress({ phase: 'failed', total: pdfs.length, processed: 0, uploaded: 0, skipped: 0, note: error instanceof Error ? error.message : 'Unknown error' });
          syncToast?.update({ title: 'Upload Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
        }
    };
    const fetchPdfFilesFromGitHub = async () => {
      const username = currentUser?.username?.toLowerCase();

      if (!username) {
        toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
        return;
      }
      if (!settings.supabaseUrl) {
        toast({ title: "Supabase not configured", description: "Save Supabase URL in Settings.", variant: "destructive" });
        return;
      }

      toast({ title: "Fetching PDFs...", description: "Downloading PDFs from Supabase to this browser." });

      try {
        const pdfResources = (resources || []).filter(r => r.type === 'pdf');
        if (pdfResources.length === 0) {
          toast({ title: "No PDFs", description: "No PDF resources found." });
          return;
        }

        let downloaded = 0;
        for (const res of pdfResources) {
          try {
            const blob = await downloadPdfFromSupabase(username, res.id, {
              url: settings.supabaseUrl,
              anonKey: settings.supabaseAnonKey,
              bucket: settings.supabasePdfBucket,
              serviceRoleKey:
                typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop)
                  ? settings.supabaseServiceRoleKey
                  : undefined,
            });
            if (!blob) continue;
            await storePdf(res.id, blob);
            downloaded += 1;
          } catch (e) {
            // continue per-resource
          }
        }

        if (downloaded > 0) {
          setResources(prev => prev.map(r => r.type === 'pdf' ? { ...r, hasLocalPdf: true } : r));
        }
        toast({ title: "PDF Fetch Complete", description: `Downloaded ${downloaded} PDFs from Supabase.` });
      } catch (error) {
        console.error('Fetch pdf from Supabase failed:', error);
        toast({ title: 'Fetch Failed', description: error instanceof Error ? error.message : 'Unknown error', variant: 'destructive' });
      }
    };

  const fetchCanvasImagesFromGitHub = async (options?: { missingOnly?: boolean }) => {
      const username = currentUser?.username?.toLowerCase();
      const { githubToken, githubOwner, githubRepo } = settings;

      if (!username) {
          toast({ title: "Login required", description: "Please log in first.", variant: "destructive" });
          return;
      }

      if (!githubToken || !githubOwner || !githubRepo) {
          toast({ title: 'GitHub settings not configured', variant: 'destructive' });
          return;
      }

      const localCanvasFilesById = getCanvasFilesMetaByCanvasId();
      const prefixedPath = withUserGitHubPrefix(settings.githubPath || 'backup.json', username);
      const { dir } = getGitHubBaseDir(prefixedPath);
      const modulesBase = dir ? `${dir}/modules` : 'modules';
      const canvasFilesBase = `${modulesBase}/canvas-files`;
      toast({ title: "Fetching images...", description: "Downloading images from GitHub to this browser." });

      try {
      const remoteCanvasIndex = await getGitHubJson<{ canvases?: string[]; folder?: string }>(
          githubToken,
          githubOwner,
          githubRepo,
          `${canvasFilesBase}/index.json`
      );
      const resolvedFolder = typeof remoteCanvasIndex?.folder === 'string' && remoteCanvasIndex.folder.trim().length > 0
        ? remoteCanvasIndex.folder.trim()
        : getGitHubImagesFolder(username);
      const folderPath = withUserGitHubPrefix(resolvedFolder, username);
          const remoteCanvasIds = new Set(
              Array.isArray(remoteCanvasIndex?.canvases)
                  ? remoteCanvasIndex!.canvases!.filter((canvasId): canvasId is string => typeof canvasId === 'string' && canvasId.length > 0)
                  : []
          );
          const candidateCanvasIds = new Set<string>([
              ...Array.from(localCanvasFilesById.keys()),
              ...Array.from(remoteCanvasIds),
          ]);

          let remoteCanvasMetaPathById = new Map<string, string>();
          try {
          const canvasFilesListData = await listGitHubDirectoryPaged(githubToken, githubOwner, githubRepo, canvasFilesBase);
          if (canvasFilesListData) {
              remoteCanvasMetaPathById = new Map(
                  (Array.isArray(canvasFilesListData) ? canvasFilesListData : [])
                      .filter((item: any) => item?.type === 'file' && typeof item?.name === 'string' && item.name.endsWith('.json') && item.name !== 'index.json')
                      .map((item: any) => [item.name.slice(0, -5), item.path] as const)
              );
          }
          } catch {
              // Optional optimization; fallback logic below still works without this list.
          }

          if (candidateCanvasIds.size === 0) {
              toast({ title: "No canvas metadata found", description: "No canvases with image metadata were found in local or GitHub index." });
              return;
          }

      const namespace = resolveGitHubNamespace(username);
      const folderCandidates = [folderPath];
      if (resolvedFolder && resolvedFolder !== folderPath) {
        folderCandidates.push(resolvedFolder);
      }
      if (namespace) {
        const prefix = `${namespace}/`;
        if (resolvedFolder.startsWith(prefix)) {
          const withoutPrefix = resolvedFolder.slice(prefix.length);
          if (withoutPrefix && !folderCandidates.includes(withoutPrefix)) {
            folderCandidates.push(withoutPrefix);
          }
        }
        if (folderPath.startsWith(prefix)) {
          const withoutPrefix = folderPath.slice(prefix.length);
          if (withoutPrefix && !folderCandidates.includes(withoutPrefix)) {
            folderCandidates.push(withoutPrefix);
          }
        }
      }

      const folderListings: Array<{ folder: string; items: Array<{ name: string; type: string; path: string; sha?: string; download_url?: string }> }> = [];
      for (const candidate of folderCandidates) {
        const data = await listGitHubDirectoryPaged(githubToken, githubOwner, githubRepo, candidate);
        if (data && data.length > 0) {
          folderListings.push({ folder: candidate, items: data });
        }
      }

      if (folderListings.length === 0) {
        console.info(`GitHub image folder(s) not found or empty: ${folderCandidates.join(', ')}`);
        toast({
          title: 'No image folder',
          description: `No images found in: ${folderCandidates.join(', ')}.`,
        });
        return;
      }
      const effectiveFolderPath = folderListings[0]?.folder || folderPath;
      const fileMap = new Map<string, { name: string; sha?: string; path: string; download_url?: string }>();
      const fileMapLower = new Map<string, { name: string; sha?: string; path: string; download_url?: string }>();
      folderListings.forEach(({ folder, items }) => {
        (items || []).forEach((item: any) => {
            if (item.type !== 'file' || !item.name) return;
            const fileId = item.name.split('.').slice(0, -1).join('.') || item.name;
            if (fileMap.has(fileId)) return;
            const path = item.path || `${folder}/${item.name}`;
            const entry = { name: item.name, sha: item.sha, path, download_url: item.download_url };
            fileMap.set(fileId, entry);
            fileMapLower.set(fileId.toLowerCase(), entry);
        });
      });

      const missingOnly = options?.missingOnly ?? settings.githubFetchMissingOnly ?? true;
      let downloaded = 0;
      let missing = 0;
          const missingIds: string[] = [];
          let skippedUnchanged = 0;
          const nextPulledHashes: Record<string, string> = { ...(settings.githubPulledHashes || {}) };

      const base64ToBlob = (base64: string, mimeType: string) => {
          const cleaned = base64.replace(/\n/g, '');
          const binary = atob(cleaned);
          const bytes = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
              bytes[i] = binary.charCodeAt(i);
          }
          return new Blob([bytes], { type: mimeType });
      };
      const fetchBlobBySha = async (sha: string, mimeType: string): Promise<Blob | null> => {
        try {
          const blobResponse = await fetchWithTimeout(`https://api.github.com/repos/${githubOwner}/${githubRepo}/git/blobs/${sha}`, {
            headers: { 'Authorization': `token ${githubToken}` }
          });
          if (!blobResponse.ok) return null;
          const blobData = await blobResponse.json();
          if (!blobData?.content) return null;
          return base64ToBlob(String(blobData.content), mimeType);
        } catch {
          return null;
        }
      };
      const getExtForMime = (mimeType?: string) => {
        const lower = String(mimeType || '').toLowerCase();
        if (lower.includes('png')) return 'png';
        if (lower.includes('jpeg')) return 'jpg';
        if (lower.includes('jpg')) return 'jpg';
        if (lower.includes('webp')) return 'webp';
        if (lower.includes('gif')) return 'gif';
        return '';
      };

      for (const canvasId of candidateCanvasIds) {
          let filesMeta = localCanvasFilesById.get(canvasId) || {};
          const remoteCanvasMetaPath = remoteCanvasMetaPathById.get(canvasId);
              if (remoteCanvasMetaPath) {
                  try {
                      const canvasMeta = await getGitHubJson<any>(githubToken, githubOwner, githubRepo, remoteCanvasMetaPath);
                      if (canvasMeta?.files && typeof canvasMeta.files === 'object' && Object.keys(canvasMeta.files).length > 0) {
                          filesMeta = canvasMeta.files;
                      }
                  } catch {
                      // fallback to local metadata
                  }
              }

              if (!filesMeta || Object.keys(filesMeta).length === 0) {
                  continue;
          }

          for (const fileId of Object.keys(filesMeta || {})) {
              const entry = fileMap.get(fileId) || fileMapLower.get(fileId.toLowerCase());
              if (!entry?.name) {
                  // Fallback: try direct fetch by inferred filename (for cases where list is incomplete).
                  const mimeType = filesMeta[fileId]?.mimeType || 'application/octet-stream';
                  const ext = getExtForMime(mimeType);
                  const candidateNames = [];
                  if (ext) candidateNames.push(`${fileId}.${ext}`);
                  candidateNames.push(`${fileId}.png`, `${fileId}.jpg`, `${fileId}.webp`, `${fileId}.gif`, `${fileId}.bin`);
                   let fetched = false;
                   const fallbackFolders = folderListings.map(listing => listing.folder);
                   for (const candidate of candidateNames) {
                     if (fetched) break;
                     const candidatesToTry = fallbackFolders.length > 0 ? fallbackFolders : [effectiveFolderPath];
                     for (const folder of candidatesToTry) {
                     try {
                      const filePath = `${folder}/${candidate}`;
                      const fileResponse = await fetchWithTimeout(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`, {
                        headers: { 'Authorization': `token ${githubToken}` }
                      });
                      if (!fileResponse.ok) continue;
                      const fileData = await fileResponse.json();
                      let blob: Blob | null = null;
                      if (fileData?.content) {
                        blob = base64ToBlob(fileData.content, mimeType);
                      } else if (fileData?.sha) {
                        blob = await fetchBlobBySha(String(fileData.sha), mimeType);
                      }
                      if (!blob) continue;
                      const record: ExcalidrawFileRecord = { blob, mimeType };
                      await storeExcalidrawFile(`${canvasId}:${fileId}`, record);
                      downloaded += 1;
                      if (fileData?.sha) {
                        nextPulledHashes[filePath] = fileData.sha;
                      }
                      fetched = true;
                      break;
                    } catch {
                      // try next candidate
                    }
                     }
                   }
                  if (!fetched) {
                    missing += 1;
                    if (missingIds.length < 10) missingIds.push(fileId);
                  }
                  continue;
              }

              try {
                  const filePath = entry.path;
                  if (missingOnly && entry.sha && settings.githubPulledHashes?.[filePath] === entry.sha) {
                          const localRecord = await getExcalidrawFile(`${canvasId}:${fileId}`);
                          if (localRecord) {
                            skippedUnchanged += 1;
                            continue;
                          }
                      }
                  const fileResponse = await fetchWithTimeout(`https://api.github.com/repos/${githubOwner}/${githubRepo}/contents/${filePath}`, {
                          headers: { 'Authorization': `token ${githubToken}` }
                      });
                      if (!fileResponse.ok) {
                          missing += 1;
                          if (missingIds.length < 10) missingIds.push(fileId);
                          continue;
                      }
                      const fileData = await fileResponse.json();
                      const mimeType = filesMeta[fileId]?.mimeType || 'application/octet-stream';
                      let blob: Blob | null = null;
                      if (fileData?.content) {
                        blob = base64ToBlob(fileData.content, mimeType);
                      } else if (entry.sha) {
                        blob = await fetchBlobBySha(entry.sha, mimeType);
                      } else if (entry.download_url) {
                        try {
                          const rawResp = await fetchWithTimeout(entry.download_url);
                          if (rawResp.ok) blob = await rawResp.blob();
                        } catch {
                          // ignore
                        }
                      }
                      if (!blob) {
                          missing += 1;
                          if (missingIds.length < 10) missingIds.push(fileId);
                          continue;
                      }
                      const record: ExcalidrawFileRecord = { blob, mimeType };
                      await storeExcalidrawFile(`${canvasId}:${fileId}`, record);
                      downloaded += 1;
                      if (entry.sha) {
                        nextPulledHashes[filePath] = entry.sha;
                      }
                  } catch (e) {
                      missing += 1;
                  }
              }
          }
          setSettings(prev => ({ ...prev, githubPulledHashes: nextPulledHashes }));

          toast({
              title: "Images Fetched",
              description: `Folder: ${effectiveFolderPath}. Downloaded ${downloaded} images. ${skippedUnchanged > 0 ? `${skippedUnchanged} unchanged skipped. ` : ''}${missing > 0 ? `${missing} missing (${missingIds.join(', ')}).` : ''}`,
          });
      } catch (error) {
          console.error("GitHub image fetch failed:", error);
          toast({
              title: "Fetch Failed",
              description: error instanceof Error ? error.message : "Unknown error",
              variant: "destructive",
          });
      }
  };

  const handleImportFromLocalBackup = async () => {
    try {
        const blob = await getBackup('github_backup');
        if (blob) {
            const text = await blob.text();
            const importedData = JSON.parse(text);
            const mainData = importedData.main || importedData;
            const uiData = importedData.ui || {};
            loadImportedData(mainData, uiData);
            await reseedGitHubModuleHashesFromImported(mainData, uiData, text);
            await deleteBackup('github_backup');
            toast({ title: 'Import Successful', description: 'Data from GitHub backup has been loaded.' });
        } else {
            toast({ title: 'Import Failed', description: 'No local backup found.', variant: 'destructive' });
        }
    } catch (error) {
        toast({ title: 'Import Failed', description: 'Could not read or parse the local backup.', variant: 'destructive' });
    } finally {
        setImportBackupConfirmationOpen(false);
    }
  };

  async function pullAndImportFromGitHubForPushGuard(): Promise<boolean> {
    try {
      await deleteBackup('github_backup');
      await downloadFromGitHub();
      const blob = await getBackup('github_backup');
      if (!blob) {
        return false;
      }
      const text = await blob.text();
      const importedData = JSON.parse(text);
      const mainData = importedData.main || importedData;
      const uiData = importedData.ui || {};
      loadImportedData(mainData, uiData);
      await reseedGitHubModuleHashesFromImported(mainData, uiData, text);
      await deleteBackup('github_backup');
      setImportBackupConfirmationOpen(false);
      publishGitHubSyncNotification({
        mode: 'pull',
        status: 'success',
        title: "GitHub Pull + Import Complete",
        details: "Remote delta was pulled and imported before push.",
      });
      return true;
    } catch (error) {
      console.error('Pull/import guard flow failed:', error);
      return false;
    }
  }

  useEffect(() => {
    const user = getCurrentLocalUser();
    if (user) {
      setCurrentUser(user);
      if (!(isDesktopRuntimeClient() && getCachedDesktopAccessState(user.username))) {
        void refreshSessionFromStoredToken(user.username);
      }
      void loadState(user.username);
    }
    setLoading(false);
    const savedTheme = typeof window !== 'undefined' ? localStorage.getItem('lifeos_theme') || 'ad-dark' : 'ad-dark';
    setThemeState(savedTheme);

    const savedVolume = typeof window !== 'undefined' ? localStorage.getItem('lifeos_global_volume') : null;
    if (savedVolume !== null) {
        setGlobalVolumeState(parseFloat(savedVolume));
    }
  }, [loadState]);

  const appConfigLoadedRef = useRef(false);

  useEffect(() => {
    if (!currentUser?.username) return;
    refreshSessionHeartbeat(currentUser.username);
    const interval = setInterval(() => {
      refreshSessionHeartbeat(currentUser.username);
    }, 15000);
    return () => clearInterval(interval);
  }, [currentUser?.username]);

  useEffect(() => {
    if (!currentUser?.username) {
      setDesktopAccess(createEmptyDesktopAccessState());
      return;
    }

    if (isDesktopRuntimeClient()) {
      const cachedAccess = getCachedDesktopAccessState(currentUser.username);
      if (cachedAccess) {
        setDesktopAccess(cachedAccess);
        return;
      }
    }

    void refreshDesktopAccess();
  }, [currentUser?.username, refreshDesktopAccess]);

  useEffect(() => {
    if (!currentUser?.username) return;
    if (appConfigLoadedRef.current) return;
    appConfigLoadedRef.current = true;

    const loadAppConfig = async () => {
      try {
        const config = await fetchAppConfig();
        const nextSettings: Partial<UserSettings> = {};
        if (config.supabaseUrl) nextSettings.supabaseUrl = config.supabaseUrl;
        if (config.supabaseAnonKey) nextSettings.supabaseAnonKey = config.supabaseAnonKey;
        if (config.supabaseStorageBucket) nextSettings.supabasePdfBucket = config.supabaseStorageBucket;

        if (Object.keys(nextSettings).length > 0) {
          setSettings((prev) => ({ ...prev, ...nextSettings }));
        }
      } catch (error) {
        console.warn("Failed to load app config:", error);
      }
    };

    void loadAppConfig();
  }, [currentUser?.username, setSettings]);

  useEffect(() => {
    if (!currentUser?.username) return;
    const handleStorage = (event: StorageEvent) => {
      if (event.key !== 'lifeos_active_session') return;
      if (!isCurrentSessionOwner(currentUser.username)) {
        toast({ title: "Session Ended", description: "Your account was opened in another session.", variant: "destructive" });
        void localLogoutUser();
        setCurrentUser(null);
        router.push('/login');
      }
    };
    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [currentUser?.username, toast, router]);

  const lastRoutineDateKeyRef = useRef<string>('');
  const lastRoutineSignatureRef = useRef<string>('');
  useEffect(() => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    const routineSignature = JSON.stringify(
      (settings.routines || []).map(r => ({
        id: r.id,
        type: r.type,
        slot: r.slot,
        details: r.details,
        routine: r.routine,
        baseDate: r.baseDate,
        createdAt: r.createdAt,
      }))
    );
    if (lastRoutineDateKeyRef.current !== todayKey || lastRoutineSignatureRef.current !== routineSignature) {
      lastRoutineDateKeyRef.current = todayKey;
      lastRoutineSignatureRef.current = routineSignature;
      ensureRoutineInstancesForDate(new Date());
    }
  }, [ensureRoutineInstancesForDate, settings.routines]);
  
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
    if (playbackRequest) {
      openGeneralPopup(playbackRequest.resourceId, null); 
    }
  }, [playbackRequest, openGeneralPopup]);
  
  const permanentlyLoggedTaskIds = useMemo(() => {
    const idSet = new Set<string>();
    
    [...allDeepWorkLogs, ...allUpskillLogs].forEach(log => {
      log.exercises.forEach(ex => {
        const defId = ex.definitionId;
        const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
        const definition = allDefs.find(d => d.id === defId);

        if (definition) {
            const isUpskill = upskillDefinitions.some(d => d.id === defId);
            const getNodeType = isUpskill ? getUpskillNodeType : getDeepWorkNodeType;
            const nodeType = getNodeType(definition);
            
            if (nodeType === 'Action' || nodeType === 'Visualization' || nodeType === 'Standalone') {
                 if (ex.loggedSets.length > 0) {
                     idSet.add(defId);
                 }
            }
        }
      });
    });

    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    allDefs.forEach(def => {
      const isUpskill = upskillDefinitions.some(d => d.id === def.id);
      const getNodeType = isUpskill ? getUpskillNodeType : getDeepWorkNodeType;
      const nodeType = getNodeType(def);
      const isActionable = nodeType === 'Action' || nodeType === 'Visualization' || nodeType === 'Standalone';
      if (isActionable && (def.loggedDuration || 0) > 0) {
        idSet.add(def.id);
      }
    });

    return idSet;
  }, [allDeepWorkLogs, allUpskillLogs, deepWorkDefinitions, upskillDefinitions, getDeepWorkNodeType, getUpskillNodeType]);

  const refreshKanbanBoards = useCallback(() => {
    setKanbanBoards((prevBoards) => normalizeKanbanBoards(prevBoards, offerizationPlans, projects));
  }, [offerizationPlans, projects]);

  const value: AuthContextType = {
    currentUser, loading, register, signIn, signOut,
    pushDataToCloud, pullDataFromCloud, exportData, importData,
    localChangeCount,
    desktopAccess, desktopAccessLoading, ensureCloudSession, refreshDesktopAccess, startDesktopCheckout, confirmDesktopCheckout,
    isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken,
    theme, setTheme,
    floatingVideoUrl, setFloatingVideoUrl,
    floatingVideoPlaylist, setFloatingVideoPlaylist,
    pipState, setPipState,
    isAudioPlaying, setIsAudioPlaying,
    globalVolume, setGlobalVolume,
    playbackRequest, setPlaybackRequest,
    pdfViewerState, setPdfViewerState, openPdfViewer, handlePdfViewerPopupDragEnd,
    drawingCanvasState, setDrawingCanvasState, openDrawingCanvas, openDrawingCanvasFromHeader, openCanvasResourceCard, handleDrawingCanvasPopupDragEnd,
    togglePinDrawing, updateDrawingData,
    clearAllLocalFiles,
    isTodaysPredictionModalOpen, setIsTodaysPredictionModalOpen,
      syncWithGitHub,
      downloadFromGitHub,
      gitHubSyncNotification,
      dismissGitHubSyncNotification,
      syncCanvasImagesToGitHub,
      fetchCanvasImagesFromGitHub,
      syncAudioFilesToGitHub,
      fetchAudioFilesFromGitHub,
      syncPdfFilesToGitHub,
      fetchPdfFilesFromGitHub,
    handleCreateTask,
    settings, setSettings,
    weightLogs, setWeightLogs, goalWeight, setGoalWeight, height, setHeight, dateOfBirth, setDateOfBirth, gender, setGender, dietPlan, setDietPlan,
    schedule, setSchedule, activityDurations, expectedActivityDurations, handleToggleComplete, onRemoveActivity, carryForwardTask, scheduleTaskFromMindMap,
    allUpskillLogs, setAllUpskillLogs,
    allDeepWorkLogs, setAllDeepWorkLogs,
    allWorkoutLogs, setAllWorkoutLogs,
    brandingLogs, setBrandingLogs,
    allLeadGenLogs, setAllLeadGenLogs,
    allMindProgrammingLogs, setAllMindProgrammingLogs,
    dailyPurposes, setDailyPurposes, isAgendaDocked, setIsAgendaDocked,
    onLogDuration,
    findRootTask,
    focusSessionModalOpen, setFocusSessionModalOpen, focusActivity, setFocusActivity, focusDuration, setFocusDuration, onOpenFocusModal, handleStartFocusSession,
    activeFocusSession, setActiveFocusSession,
    workoutMode, setWorkoutMode, strengthTrainingMode, setStrengthTrainingMode, workoutPlanRotation, setWorkoutPlanRotation, workoutPlans, setWorkoutPlans, exerciseDefinitions, setExerciseDefinitions,
    upskillDefinitions, setUpskillDefinitions, topicGoals, setTopicGoals,
    deepWorkDefinitions, setDeepWorkDefinitions, getDeepWorkNodeType, getUpskillNodeType, updateTaskDuration,
    leadGenDefinitions, setLeadGenDefinitions,
    productizationPlans, setProductizationPlans, offerizationPlans, setOfferizationPlans, kanbanBoards, setKanbanBoards, refreshKanbanBoards,
    addFeatureToRelease,
    copyOffer,
    mindProgrammingDefinitions, setMindProgrammingDefinitions,
    mindProgrammingCategories, setMindProgrammingCategories,
    mindProgrammingMode, setMindProgrammingMode,
    mindProgrammingPlans, setMindProgrammingPlans,
    mindProgrammingPlanRotation, setMindProgrammingPlanRotation,
      resources, setResources, resourceFolders, setResourceFolders, deleteResource,
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
    generalPopups, openGeneralPopup, closeGeneralPopup, navigateGeneralPopupPath, updateGeneralPopupSize, updateGeneralPopupPosition,
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
    logMindsetSet, deleteMindsetSet,
    canvasLayout, setCanvasLayout, globalElements, allComponentsForSpec,
    addGlobalElement, updateGlobalElement, deleteGlobalElement, handleAddNewResourceCard,
    mindsetCards, setMindsetCards, goals, setGoals, createShivGuideFlow,
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
    highlightedTaskIds, setHighlightedTaskIds,
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
    updateActivity, updateActivitySubtask, deleteActivitySubtask,
    handleLinkHabit,
    toggleRoutine,
    missedSlotReviews, setMissedSlotReviews,
    journalSessions, setJournalSessions,
    mindsetSessions, setMindsetSessions,
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
    logSubTaskTime
  };

  return (
    <AuthContext.Provider value={value}>
        {children}
        <AlertDialog open={importBackupConfirmationOpen} onOpenChange={setImportBackupConfirmationOpen}>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Import Downloaded Backup?</AlertDialogTitle>
                    <AlertDialogDescription>
                        A backup from GitHub has been downloaded to your browser. Would you like to import it now? This will overwrite your current local data.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel onClick={() => deleteBackup('github_backup')}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={handleImportFromLocalBackup}>Import Data</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
        <AlertDialog
          open={!!remoteAheadPrompt}
          onOpenChange={(open) => {
            if (!open && remoteAheadPrompt) resolveRemoteAheadDecision('cancel');
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Remote backup is newer</AlertDialogTitle>
              <AlertDialogDescription>
                <div>Remote: {remoteAheadPrompt?.remoteIso}</div>
                <div>Local: {remoteAheadPrompt?.localIso}</div>
                <div className="pt-2">Choose how to continue before push.</div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <Button variant="outline" onClick={() => resolveRemoteAheadDecision('cancel')}>Cancel</Button>
              <Button variant="secondary" onClick={() => resolveRemoteAheadDecision('force')}>Force Push</Button>
              <Button onClick={() => resolveRemoteAheadDecision('pull')}>Pull + Import</Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
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
    
    








    

    

    






    


    

    








