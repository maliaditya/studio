
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
  name: string;
  category: ExerciseCategory; // Added category
}

export interface WorkoutExercise {
  id: string; // Unique instance ID for this exercise in this workout
  definitionId: string; // Links to ExerciseDefinition
  name: string; // Copied from definition for display convenience
  category: ExerciseCategory; // Copied from definition
  loggedSets: LoggedSet[];
  targetSets: number;
  targetReps: string; // e.g., "10-15"
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

// Types for editable workout plans
export type WorkoutPlan = Partial<Record<ExerciseCategory, string[]>>;
export type AllWorkoutPlans = Record<string, WorkoutPlan>;

export interface WeightLog {
  date: string; // ISO week format 'YYYY-WW'
  weight: number;
}


// AI Diet Plan Types
export const GenerateDietPlanInputSchema = z.object({
  currentWeight: z.number().describe('The user\'s current weight in kg or lb.'),
  goalWeight: z.number().describe('The user\'s goal weight in kg or lb.'),
  height: z.number().describe('The user\'s height in centimeters.'),
  age: z.number().describe('The user\'s age in years.'),
  gender: z.enum(['male', 'female', 'other']).describe('The user\'s gender.'),
  activityLevel: z.enum(['sedentary', 'light', 'moderate', 'active', 'very_active']).describe('The user\'s daily activity level.'),
  preferences: z.string().optional().describe('Any dietary preferences or restrictions, e.g., "vegetarian, no nuts".'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

export const GenerateDietPlanOutputSchema = z.object({
  plan: z.string().describe('A detailed 7-day diet plan in Markdown format. It should include breakfast, lunch, dinner, and snacks for each day, with estimated calorie counts for each meal and a daily total. Provide a brief summary of the overall strategy at the top.'),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;
