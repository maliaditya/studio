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


// Schemas for AI-based single meal analysis
export const AnalyzeMealInputSchema = z.string().describe("A description of a single meal to be analyzed for nutritional content.");
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;

export const AnalyzeMealOutputSchema = z.object({
    calories: z.number().describe("The estimated calorie count for the meal."),
    protein: z.number().describe("The estimated protein in grams for the meal."),
    carbs: z.number().describe("The estimated carbohydrates in grams for the meal."),
    fat: z.number().describe("The estimated fat in grams for the meal."),
    fiber: z.number().describe("The estimated fiber in grams for the meal."),
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

// Schemas for AI Diet Plan Generation
export const GenerateDietPlanInputSchema = z.object({
  currentWeight: z.string().describe('User\'s current weight (e.g., "80 kg" or "175 lbs").'),
  goalWeight: z.string().describe('User\'s goal weight (e.g., "75 kg" or "165 lbs").'),
  height: z.string().describe('User\'s height (e.g., "180 cm" or "5\'11"").'),
  age: z.string().describe('User\'s age in years.'),
  gender: z.string().describe('User\'s gender (e.g., "male", "female").'),
  activityLevel: z.string().describe('User\'s activity level (e.g., "Sedentary", "Lightly Active", "Moderately Active", "Very Active").'),
  preferences: z.string().describe('User\'s dietary preferences, allergies, or restrictions (e.g., "vegetarian, no nuts").'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

export const MealSchema = z.object({
  description: z.string().describe('A brief description of the meal.'),
  calories: z.number().describe('The estimated calorie count for the meal.'),
});
export type Meal = z.infer<typeof MealSchema>;

export const DailyPlanSchema = z.object({
  day: z.string().describe('The day of the week (e.g., "Monday").'),
  breakfast: MealSchema,
  lunch: MealSchema,
  dinner: MealSchema,
  snacks: z.array(MealSchema).describe('A list of snacks for the day.'),
  totalCalories: z.number().describe('The total estimated calorie count for the day.'),
});
export type DailyPlan = z.infer<typeof DailyPlanSchema>;

export const GenerateDietPlanOutputSchema = z.object({
  summary: z.string().describe("A brief summary of the diet plan strategy and recommended caloric intake."),
  dailyPlans: z.tuple([
    DailyPlanSchema,
    DailyPlanSchema,
    DailyPlanSchema,
    DailyPlanSchema,
    DailyPlanSchema,
    DailyPlanSchema,
    DailyPlanSchema,
  ]).describe('An array of 7 daily meal plans, one for each day of the week.'),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;
