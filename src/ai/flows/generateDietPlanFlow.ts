
'use server';
/**
 * @fileOverview A diet plan generation AI flow.
 *
 * - generateDietPlan - A function that creates a personalized diet plan by breaking the task into smaller, parallel AI calls.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

// Define schemas directly in the file
export const GenerateDietPlanInputSchema = z.object({
  currentWeight: z.number().describe("The user's current weight in kg or lb."),
  goalWeight: z.number().describe("The user's goal weight in kg or lb."),
  height: z.number().describe("The user's height in cm."),
  age: z.number().describe("The user's age in years."),
  gender: z.enum(['male', 'female']).describe("The user's gender."),
  activityLevel: z.string().describe("The user's daily activity level (e.g., sedentary, light, moderate, active)."),
  preferences: z.string().describe('Any dietary preferences or restrictions the user has.'),
});
export type GenerateDietPlanInput = z.infer<typeof GenerateDietPlanInputSchema>;

const MealSchema = z.object({
    description: z.string().describe("A brief description of the meal."),
    calories: z.number().describe("The estimated calorie count for the meal."),
});

const DailyPlanSchema = z.object({
    day: z.string().describe("The day of the week (e.g., Monday, Tuesday)."),
    breakfast: MealSchema,
    lunch: MealSchema,
    dinner: MealSchema,
    snacks: z.array(MealSchema).describe("A list of snacks for the day."),
    totalCalories: z.number().describe("The total estimated calories for the day."),
});

export const GenerateDietPlanOutputSchema = z.object({
    summary: z.string().describe("A brief summary of the diet plan strategy and recommended intake."),
    dailyPlans: z.array(DailyPlanSchema).length(7).describe("A 7-day diet plan."),
});
export type GenerateDietPlanOutput = z.infer<typeof GenerateDietPlanOutputSchema>;


export async function generateDietPlan(input: GenerateDietPlanInput): Promise<GenerateDietPlanOutput> {
  return generateDietPlanFlow(input);
}


// Internal prompt for just the summary
const summaryPrompt = ai.definePrompt({
    name: 'generateDietPlanSummaryPrompt',
    input: { schema: GenerateDietPlanInputSchema },
    output: { schema: z.string().describe("A brief summary of the diet plan strategy and recommended caloric intake.") },
    prompt: `You are an expert nutritionist. Based on the user's details, provide a brief summary of a recommended diet plan strategy and caloric intake.

    User Details:
    - Current Weight: {{{currentWeight}}} kg/lb
    - Goal Weight: {{{goalWeight}}} kg/lb
    - Height: {{{height}}} cm
    - Age: {{{age}}}
    - Gender: {{{gender}}}
    - Activity Level: {{{activityLevel}}}
    - Dietary Preferences/Restrictions: {{{preferences}}}
    
    Keep the summary concise and to the point. If user details are missing or nonsensical, state that a plan cannot be generated.
    `
});

// Internal schema for single day prompt input
const SingleDayPlanInputSchema = GenerateDietPlanInputSchema.extend({
    day: z.string().describe("The day of the week to generate a plan for (e.g., Monday).")
});

// Internal schema for single day output (re-using parts of the original)
const SingleDayMealPlanSchema = z.object({
    breakfast: MealSchema,
    lunch: MealSchema,
    dinner: MealSchema,
    snacks: z.array(MealSchema).describe("A list of snacks for the day."),
    totalCalories: z.number().describe("The total estimated calories for the day."),
});

// Internal prompt for a single day's plan
const singleDayPrompt = ai.definePrompt({
    name: 'generateSingleDayPlanPrompt',
    input: { schema: SingleDayPlanInputSchema },
    output: { schema: SingleDayMealPlanSchema },
    prompt: `You are an expert nutritionist. Create a single-day meal plan for {{{day}}} based on the user's details and dietary preferences.

    User Details:
    - Current Weight: {{{currentWeight}}} kg/lb
    - Goal Weight: {{{goalWeight}}} kg/lb
    - Height: {{{height}}} cm
    - Age: {{{age}}}
    - Gender: {{{gender}}}
    - Activity Level: {{{activityLevel}}}
    - Dietary Preferences/Restrictions: {{{preferences}}}

    Provide suggestions for breakfast, lunch, dinner, and two snacks. For each, provide a brief description and an estimated calorie count.
    Also provide a total estimated calorie count for the day. Ensure all calorie values are numbers, not strings.

    Your response MUST be a valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.
    `
});


// The main flow, rewritten to orchestrate multiple smaller AI calls
const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: GenerateDietPlanInputSchema,
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async (input) => {
    try {
      // Step 1: Start the summary generation
      const summaryPromise = summaryPrompt(input);

      // Step 2: Start generating all 7 daily plans in parallel
      const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
      const dailyPlanPromises = days.map(day => 
        singleDayPrompt({ ...input, day })
      );

      // Step 3: Wait for all promises to complete
      const [summaryResult, ...dailyResults] = await Promise.all([summaryPromise, ...dailyPlanPromises]);
      
      const summary = summaryResult.output ?? "Could not generate a plan summary. Please check your input.";

      const dailyPlans = dailyResults.map((result, index) => {
        if (!result.output) {
          // If a single day fails, create a blank entry to avoid crashing the whole process
          console.error(`Failed to generate plan for ${days[index]}. AI output was null.`);
          return {
            day: days[index],
            breakfast: { description: 'Error generating meal.', calories: 0 },
            lunch: { description: 'Error generating meal.', calories: 0 },
            dinner: { description: 'Error generating meal.', calories: 0 },
            snacks: [],
            totalCalories: 0,
          };
        }
        return {
          day: days[index],
          ...result.output,
        }
      });

      const finalOutput: GenerateDietPlanOutput = {
        summary,
        // Ensure the output is a valid 7-element array, even if some calls failed.
        dailyPlans: dailyPlans as [any, any, any, any, any, any, any],
      };

      return finalOutput;

    } catch (e) {
        console.error("An exception occurred during the generateDietPlanFlow execution:", e);
        // This will be caught by the client-side try/catch and shown in a toast.
        throw new Error("An error occurred while generating the diet plan. Please try again later.");
    }
  }
);
