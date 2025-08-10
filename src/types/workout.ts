

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
  decompositionData?: DecompositionRow[];
  focusAreaIds?: string[];
  sourceUpskillId?: string;
  linkedUpskillIds?: string[];
  linkedDeepWorkIds?: string[];
  linkedResourceIds?: string[];
  isReadyForBranding?: boolean;
  linkedProjectId?: string;
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

// This is no longer used and will be removed.
// export interface DeepWorkTopicMetadata {
//   classification: 'product' | 'service';
// }

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
export type ActivityType = 'workout' | 'upskill' | 'deepwork' | 'planning' | 'tracking' | 'branding' | 'lead-generation' | 'thoughtwork';

export interface Activity {
  id: string;
  type: ActivityType;
  details: string;
  completed: boolean;
  taskIds?: string[];
  slot: string;
};

export interface DailySchedule {
  purpose?: string;
  [slotName: string]: Activity[] | string | undefined;
}

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
export interface ResourcePoint {
  id: string;
  text: string;
  type?: 'text' | 'youtube' | 'obsidian' | 'card' | 'code' | 'markdown' | 'link';
  url?: string;
  resourceId?: string; // ID of the linked Resource card
  displayText?: string; // Optional display text for links
}
export interface Resource {
  id: string;
  name: string;
  folderId: string;
  type: 'link' | 'card' | 'habit' | 'model3d' | 'mechanism';
  createdAt?: string;
  // For 'link' type
  link?: string;
  description?: string;
  iconUrl?: string;
  audioUrl?: string;
  githubLink?: string;
  demoLink?: string;
  linkedResourceId?: string;
  // For 'card' type
  points?: ResourcePoint[];
  icon?: string;
  // For 'habit' or 'mechanism' type
  mechanismFramework?: 'negative' | 'positive';
  trigger?: { action?: string; feeling?: string; };
  reward?: string;
  benefit?: string;
  law?: { premise?: string; outcome?: string; };
  response?: { text?: string; resourceId?: string; visualize?: string; };
  newResponse?: { text?: string; resourceId?: string; action?: string; visualize?: string; };
  
  // For 'model3d' type
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

// Pistons of Intention
export type PistonType = 'Stabilizer' | 'Fire' | 'Explorer' | 'Clarity' | 'Bridge';

export interface PistonEntry {
    id: string;
    text: string;
    timestamp: number;
    mechanismCardId?: string;
}

export type PistonState = PistonEntry[];

export type PistonsData = Partial<Record<PistonType, PistonState> & {
    activity?: string;
    linkedResourceIds?: Partial<Record<PistonType, string>>;
    thoughtEntries?: PistonEntry[]; // For negative thoughts
}>;

export interface PistonsCategoryData {
    health?: PistonsData;
    [topicId: string]: PistonsData | undefined; // For wealth, growth, and desire topics
}

// Skill Page Types
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
  purposePillar?: 'Health' | 'Wealth' | 'Growth' | 'Direction';
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

// Purpose Page Types
export interface PurposeData {
  statement: string;
  specializationPurposes: Record<string, string>; // Key is CoreSkill ID
}

// Pattern Recognition Types
export interface PatternPhrase {
  category: string;
  text: string;
  mechanismCardId: string;
  mechanismCardName?: string;
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
  purposePillar?: 'Health' | 'Wealth' | 'Growth' | 'Direction';
}
