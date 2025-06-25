
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

export interface ExerciseDefinition {
  id: string;
  name: string; // Subtopic for upskill
  category: ExerciseCategory; // Topic for upskill
}

export interface TopicGoal {
  goalType: 'pages' | 'hours';
  goalValue: number;
}

export interface WorkoutExercise {
  id: string; // Unique instance ID for this exercise in this workout
  definitionId: string; // Links to ExerciseDefinition
  name: string; // Copied from definition for display convenience
  category: ExerciseCategory; // Copied from definition
  loggedSets: LoggedSet[];
  targetSets: number;
  targetReps: string; // e.g., "10-15"
  lastPerformance?: {
    reps: number;
    weight: number;
  } | null;
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
export type ActivityType = 'workout' | 'upskill' | 'deepwork' | 'planning' | 'tracking';

export type Activity = {
  id: string;
  type: ActivityType;
  details: string;
  completed: boolean;
};

export type DailySchedule = Record<string, Activity[]>; // Slot name -> Array of Activities
export type FullSchedule = Record<string, DailySchedule>; // Date key -> DailySchedule
