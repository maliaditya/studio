
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
  decompositionData?: DecompositionRow[];
  focusAreaIds?: string[];
  sourceUpskillId?: string;
  linkedUpskillIds?: string[];
  linkedDeepWorkIds?: string[];
  linkedResourceIds?: string[];
  isReadyForBranding?: boolean;
  // Personal Branding
  brandingStatus?: 'converted' | 'published';
  contentUrls?: {
    blog?: string;
    youtube?: string;
    demo?: string;
  };
  sharingStatus?: SharingStatus;
}

export interface TopicGoal {
  goalType: 'pages' | 'hours';
  goalValue: number;
}

export interface DeepWorkTopicMetadata {
  classification: 'product' | 'service';
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

// Updated to include more user profile data
export interface LocalUser {
  username: string;
}

export type WorkoutMode = 'one-muscle' | 'two-muscle';
export type Gender = 'male' | 'female';

// Types for editable workout plans
export type WorkoutPlan = Partial<Record<ExerciseCategory, string[]>>;
export type AllWorkoutPlans = Record<string, WorkoutPlan>;

export interface WeightLog {
  date: string; // ISO week format 'YYYY-WW'
  weight: number;
}

// User-editable diet plan
export interface EditableMealPlan {
  day: string;
  meal1: string;
  meal2: string;
  meal3: string;
  supplements: string;
  totalCalories: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  fiber: number | null;
}

export type UserDietPlan = EditableMealPlan[];

// Types for homepage schedule
export type ActivityType = 'workout' | 'upskill' | 'deepwork' | 'planning' | 'tracking' | 'branding' | 'lead-generation';

export type Activity = {
  id: string;
  type: ActivityType;
  details: string;
  completed: boolean;
  taskIds?: string[];
  slot: string;
};

export type DailySchedule = Record<string, Activity[]>; // Slot name -> Array of Activities
export type FullSchedule = Record<string, DailySchedule>; // Date key -> DailySchedule

// Productization Plan types
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
}

// Resource Library Types
export interface Resource {
  id: string;
  name: string;
  link: string;
  description: string;
  folderId: string;
  iconUrl?: string;
}

export interface ResourceFolder {
  id: string;
  name: string;
  parentId: string | null;
  icon?: string; // Optional: for root folders or special folders
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
export interface MindsetPoint {
  id: string;
  text: string;
}

export interface MindsetCard {
  id: string;
  title: string;
  icon: string;
  points: MindsetPoint[];
}
