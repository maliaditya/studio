

import { z } from 'zod';

export type ExerciseCategory = 
  | "Chest" 
  | "Triceps" 
  | "Shoulders" 
  | "Legs" 
  | "Back" 
  | "Biceps" 
  | "Core" 
  | "Full Body"
  | "Content Bundle"
  | "Lead Generation"
  | "Desire"
  | "Thought"
  | "Other";

export const exerciseCategories: ExerciseCategory[] = [
  "Chest", 
  "Triceps", 
  "Shoulders", 
  "Legs", 
  "Back", 
  "Biceps", 
  "Core", 
  "Full Body", 
  "Other"
];

export interface LoggedSet {
  id: string;
  reps: number;
  weight: number;
  timestamp: number;
}

export interface SharingStatus {
  twitter?: boolean;
  linkedin?: boolean;
  devto?: boolean;
  youtube?: boolean;
}

export interface DecompositionRow {
  technique: string;
  description: string;
  useCases: string;
}

export interface ExerciseDefinition {
  id: string;
  name: string; // Subtopic for upskill
  category: ExerciseCategory; // Topic for upskill
  description?: string;
  link?: string;
  iconUrl?: string;
  estimatedDuration?: number; // Total minutes
  loggedDuration?: number; // Total minutes logged for this specific task
  decompositionData?: { id: string; text: string, type: 'text' }[];
  focusAreaIds?: string[];
  sourceUpskillId?: string;
  linkedUpskillIds?: string[];
  linkedDeepWorkIds?: string[];
  linkedResourceIds?: string[];
  isReadyForBranding?: boolean;
  linkedProjectIds?: string[];
  // Personal Branding
  brandingStatus?: 'converted' | 'published';
  contentUrls?: {
    blog?: string;
    youtube?: string;
    demo?: string;
  };
  sharingStatus?: SharingStatus;
  resourceCards?: { name: string, type: 'Elements' | 'Tools' | 'Patterns', points: { text: string }[] }[];
  habitEquationIds?: string[];
}

export interface TopicGoal {
  goalType: 'pages' | 'hours';
  goalValue: number;
}

export interface TopicBrandingInfo {
  brandingStatus?: 'converted' | 'published';
  contentUrls?: {
    blog?: string;
    youtube?: string;
    demo?: string;
  };
  sharingStatus?: SharingStatus;
}

export interface WorkoutExercise {
  id: string; // Unique instance ID for this exercise in this workout
  definitionId: string; // Links to ExerciseDefinition
  name: string; // Copied from definition for display convenience
  category: ExerciseCategory; // Copied from definition
  description?: string;
  loggedSets: LoggedSet[];
  targetSets: number;
  targetReps: string; // e.g., "8-12"
  focusAreaIds?: string[];
  lastPerformance?: {
    reps: number;
    weight: number;
  } | null;
  sharingStatus?: SharingStatus;
}

export interface DatedWorkout {
  id: string; // Unique ID for this workout log, typically the date string 'yyyy-MM-dd'
  date: string; // Date string in 'yyyy-MM-dd' format
  exercises: WorkoutExercise[];
  notes?: string; // Optional notes for the workout
}

export interface LocalUser {
  username: string;
}

export type WorkoutMode = 'one-muscle' | 'two-muscle';
export type StrengthTrainingMode = 'resistance' | 'calisthenics';
export type Gender = 'male' | 'female';
export type WorkoutSchedulingMode = 'day-of-week' | 'sequential';

export type WorkoutPlan = Partial<Record<ExerciseCategory, string[]>>;
export type AllWorkoutPlans = Record<string, WorkoutPlan>;

export interface WeightLog {
  date: string; // ISO week format 'YYYY-WW'
  weight: number;
}

export interface MealItem {
  id: string;
  quantity: string;
  content: string;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
  calories: number | null;
}

export interface EditableMealPlan {
  day: string;
  meal1: MealItem[];
  meal2: MealItem[];
  meal3: MealItem[];
  supplements: MealItem[];
  // The daily totals are now derived values, but can be kept for caching/display
  totalCalories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

export type UserDietPlan = EditableMealPlan[];

export type ActivityType = 'workout' | 'upskill' | 'deepwork' | 'planning' | 'tracking' | 'branding' | 'lead-generation' | 'interrupt' | 'essentials' | 'nutrition' | 'mindset' | 'distraction';

export interface PauseEvent {
  pauseTime: number;
  resumeTime: number | null;
}

export interface PostSessionReview {
  resistance: string;
  helpfulTechniqueId: string;
  cortisolLevel: 'low' | 'medium' | 'high';
}

export interface SubTask {
  id: string;
  text: string;
  completed: boolean;
}

export interface Activity {
  id: string;
  type: ActivityType;
  details: string;
  completed: boolean;
  taskIds?: string[];
  slot: string;
  isRoutine?: boolean;
  habitEquationIds?: string[]; // New field to link rule equations
  focusSessionInitialStartTime?: number;
  focusSessionStartTime?: number; // Tracks start of current segment (or initial start)
  focusSessionEndTime?: number;
  focusSessionPauses?: PauseEvent[]; // Detailed pause tracking
  focusSessionInitialDuration?: number; // The originally intended duration
  postSessionReview?: PostSessionReview;
  duration?: number; // For interruptions
  subTasks?: SubTask[]; // Added for sub-task functionality
};

export interface Interrupt {
  id: string;
  text: string;
  duration: number; // in minutes
}

export interface DailySchedule {
  purpose?: string;
  [slotName: string]: Activity[] | string | Interrupt[] | undefined;
}

export type FullSchedule = Record<string, DailySchedule>; // Date key -> DailySchedule

export interface Release {
  id: string;
  name: string;
  description: string;
  launchDate: string; // yyyy-MM-dd format
  focusAreaIds: string[];
  features?: string[];
  daysRemaining?: number;
  availableHours?: number;
  totalAvailableHours?: number;
  totalLoggedHours?: number;
  totalEstimatedHours?: number;
}

export interface Offer {
  id: string;
  name: string;
  outcome: string;
  audience: string;
  deliverables: string;
  valueStack: string;
  timeline: string;
  price: string;
  format: string;
}

export interface ProductizationPlan {
  productType?: string;
  offerTypes?: string[];
  gapAnalysis?: GapAnalysis;
  releases?: Release[];
  offers?: Offer[];
}

export interface GapAnalysis {
  gapTypes: string[];
  whatYouCanFill: string;
  coreSolution: string;
  outcomeGoal: string;
  strainReduction?: string;
}

export interface ResourcePoint {
  id: string;
  text: string;
  type?: 'text' | 'youtube' | 'obsidian' | 'card' | 'markdown' | 'code' | 'link';
  url?: string;
  resourceId?: string; // ID of the linked Resource card
  displayText?: string;
}

export interface Stopper {
    id: string;
    text: string;
    status: 'none' | 'manageable' | 'unmanageable';
    managementStrategy?: string;
    linkedResourceId?: string;
    linkedTechniqueId?: string;
    timestamps?: number[];
}

export interface Strength {
    id: string;
    text: string;
}

export interface Resource {
  id: string;
  name: string;
  folderId: string;
  type: 'link' | 'card' | 'habit' | 'mechanism' | 'model3d';
  createdAt: string;
  isFavorite?: boolean;

  // For 'link' type
  link?: string;
  description?: string;
  iconUrl?: string;
  githubLink?: string;
  demoLink?: string;
  linkedResourceId?: string;

  // For 'card' type
  points?: ResourcePoint[];
  icon?: string;
  audioUrl?: string;
  
  // For 'habit' type
  trigger?: {
    action?: string;
    feeling?: string;
  };
  response?: {
    text?: string;
    resourceId?: string;
    visualize?: string;
  };
  reward?: string;
  newResponse?: {
    text?: string;
    resourceId?: string;
    action?: string;
    visualize?: string;
  };
  urges?: Stopper[];
  resistances?: Stopper[];
  strengths?: Strength[];
  
  // For 'mechanism' type
  mechanismFramework?: 'positive' | 'negative';
  benefit?: string;
  law?: {
    premise?: string;
    outcome?: string;
  };
  
  // For 3D Model
  modelUrl?: string;
}

export interface ResourceFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string; // Optional: for root folders or special folders
}

export interface PopupState {
    resourceId: string;
    level: number;
    x: number;
    y: number;
    parentId?: string;
    width?: number;
    height?: number;
    z?: number;
}

// Canvas Types
export interface CanvasNode {
  id: string; // This will be the definitionId
  x: number;
  y: number;
}

export interface CanvasEdge {
  id: string;
  source: string; // definitionId of source node
  target: string; // definitionId of target node
}

export interface CanvasLayout {
  nodes: CanvasNode[];
  edges: CanvasEdge[];
}

// Mindset Types
export interface MindsetCard {
  id: string;
  title: string;
  icon: string;
  points: MindsetPoint[];
}

// Pistons of Intention
export type PistonType = 'Gratitude' | 'Curiosity' | 'Inspiration' | 'Compassion' | 'Truth Seeking';

export interface PistonEntry {
    id: string;
    text: string;
    timestamp: number;
}

export type PistonState = PistonEntry[];

export type PistonsData = Partial<Record<PistonType, PistonState>> & {
    activity?: string;
    linkedResourceIds?: Partial<Record<PistonType, string>>;
    thoughtEntries?: PistonEntry[]; // For negative thoughts
};

export interface PistonsCategoryData {
    health?: PistonsData;
    [topicId: string]: PistonsData | undefined; // For wealth, growth, and desire topics
}

// Skill Page Types
export type PurposePillar =
  | 'Mind' | 'Focus' | 'Learning' | 'Creativity'
  | 'Body' | 'Health' | 'Strength' | 'Energy'
  | 'Heart' | 'Relationships' | 'Emotional Health'
  | 'Spirit' | 'Meaning' | 'Contribution' | 'Legacy';

export interface SkillAcquisitionPlan {
    specializationId: string;
    targetDate: string;
    requiredMoney: number | null;
    requiredHours: number | null;
    linkedRuleEquationIds: string[];
}

export interface SkillDomain {
  id: string;
  name: string;
}

export interface CoreSkill {
  id: string;
  domainId: string;
  name: string;
  type: 'Foundation' | 'Specialization' | 'Professionalism';
  skillAreas: SkillArea[];
  purposePillar?: string;
  parentId?: string | null;
}

export interface SkillArea {
  id: string;
  name: string;
  purpose: string;
  microSkills: MicroSkill[];
}

export interface MicroSkill {
  id: string;
  name: string;
}

// Project Skill Linking
export interface ProjectSkillLink {
  featureId: string;
  microSkillId: string;
}

export interface Feature {
  id: string;
  name: string;
  linkedSkills: ProjectSkillLink[];
}

export interface Project {
  id: string;
  name: string;
  domainId: string;
  features: Feature[];
  // Re-purposing these from the old system for product planning
  productType?: string;
  gapAnalysis?: GapAnalysis;
  releases?: Release[];
  purposePillar?: string;
  productPlan?: ProjectPlan; // Added for dedicated product planning
}

// Professional Experience Types
export interface Company {
    id: string;
    name: string;
}

export interface WorkProject {
    id: string;
    name: string;
    description: string;
    linkedSpecializationId: string; // ID of a CoreSkill with type 'Specialization'
}

export interface Position {
    id: string;
    companyId: string;
    title: string;
    projects: WorkProject[];
}

// Purpose & Patterns Data
export interface PillarCardData {
  id: string;
  principle: string;
  practiceEquationIds: string[];
  applicationSpecializationIds: string[];
  outcome: string;
}

export interface ProjectPlan {
  linkedRuleEquationIds: string[];
  targetDate: string;
  requiredMoney: number | null;
  requiredHours: number | null;
}

export interface HabitEquation {
  id: string;
  metaRuleIds: string[];
  outcome: string;
  linkedResourceId?: string;
}

export interface PurposeData {
  statement: string;
  specializationPurposes: Record<string, string>; // Key is CoreSkill ID
  pillarCards?: PillarCardData[];
}

// Pattern Recognition Types
export interface PatternPhrase {
  category: string;
  text: string;
  mechanismCardId: string;
  mechanismCardName?: string;
  linkedMechanisms?: string[];
}

export interface Pattern {
  id: string;
  name: string;
  type: 'Positive' | 'Negative';
  phrases: PatternPhrase[];
}

export interface MetaRule {
  id: string;
  text: string;
  patternId: string;
  purposePillar?: string;
}

export interface PistonsInitialState {
  view: 'quick-access' | 'rule-equations' | 'autosuggestion' | 'starred';
  context?: any;
}

export type AutoSuggestionEntry = PistonEntry;

export interface RuleDetailPopupState {
  ruleId: string;
  x: number;
  y: number;
}

export interface HabitDetailPopupState {
  habitId: string;
  x: number;
  y: number;
  level: number;
}


export interface TaskContextPopupState {
  activityId: string;
  x: number;
  y: number;
  level: number;
  parentId?: string;
}

export interface ContentViewPopupState {
    id: string;
    resource: Resource;
    point: ResourcePoint;
    x: number;
    y: number;
}

export interface TodaysDietPopupState {
  id: string;
  x: number;
  y: number;
  z?: number;
}

export interface PathNode {
  id: string;
  text: string;
}

export interface MindsetPoint {
  id: string;
  text: string;
}

export interface MindsetTechniquePopupState {
  techniqueId: string;
  x: number;
  y: number;
  level: number;
  z?: number;
}

export interface StopperProgressPopupState {
    isOpen: boolean;
    stopper: Stopper | null;
    habitName: string | null;
}

export interface MissedSlotReview {
    id: string; // composite key: `${date}-${slotName}`
    reason: string;
    followedRuleIds: string[];
    snoozedUntil?: number; // timestamp
}

export interface Priority {
  id: string;
  text: string;
  completed: boolean;
  deadline?: string; // Stored as ISO string: yyyy-MM-dd
}

export interface UserSettings {
  carryForward: boolean;
  autoPush: boolean;
  autoPushLimit: number;
  carryForwardEssentials: boolean;
  carryForwardNutrition: boolean;
  smartLogging: boolean;
  defaultHabitLinks: Partial<Record<ActivityType, string | null>>;
  routines: Activity[];
  workoutScheduling: WorkoutSchedulingMode;
}
