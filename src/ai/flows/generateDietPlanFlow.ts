
'use server';
/**
 * @fileOverview A diet plan generation AI flow.
 *
 * - generateDietPlan - A function that creates a personalized diet plan by breaking the task into smaller, parallel AI calls.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';
import type { GenerateDietPlanInput, GenerateDietPlanOutput } from '@/types/workout';
import { GenerateDietPlanInputSchema, GenerateDietPlanOutputSchema, MealSchema as BaseMealSchema } from '@/types/workout';


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

// Make the meal schema more robust for flaky AI responses
const MealSchema = BaseMealSchema.extend({
    description: z.string().default('N/A'),
    calories: z.number().default(0),
}).default({ description: 'N/A', calories: 0 });


// Internal schema for single day output. We no longer ask the AI for totalCalories.
const SingleDayMealPlanSchema = z.object({
    breakfast: MealSchema,
    lunch: MealSchema,
    dinner: MealSchema,
    snacks: z.array(MealSchema).default([]),
});

// Internal prompt for a single day's plan.
const singleDayPrompt = ai.definePrompt({
    name: 'generateSingleDayPlanPrompt',
    input: { schema: SingleDayPlanInputSchema },
    output: { schema: SingleDayMealPlanSchema },
    prompt: `You are an expert nutritionist. Your task is to create a single-day meal plan for {{{day}}} based on the user's details.

    User Details:
    - Current Weight: {{{currentWeight}}} kg/lb
    - Goal Weight: {{{goalWeight}}} kg/lb
    - Height: {{{height}}} cm
    - Age: {{{age}}}
    - Gender: {{{gender}}}
    - Activity Level: {{{activityLevel}}}
    - Dietary Preferences/Restrictions: {{{preferences}}}

    You MUST provide suggestions for breakfast, lunch, dinner, and two snacks.
    For EACH meal (breakfast, lunch, dinner, and each snack), you MUST provide:
    1. A 'description' of the meal (a string).
    2. An estimated 'calories' for that meal (a number).

    Example for one meal:
    {
      "description": "2 scrambled eggs with spinach and a slice of whole-wheat toast.",
      "calories": 350
    }

    Do NOT provide a total calorie count for the day.
    Your entire response MUST be a single, valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.
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
        const output = result.output;
        // Robust fallback if AI fails for a day
        if (!output) {
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
        
        // Ensure all parts of the plan exist, even if AI omitted them
        const breakfast = output.breakfast || { description: 'N/A', calories: 0 };
        const lunch = output.lunch || { description: 'N/A', calories: 0 };
        const dinner = output.dinner || { description: 'N/A', calories: 0 };
        const snacks = output.snacks || [];
        
        // Manually calculate the total calories. This is much more reliable.
        const totalCalories =
          (breakfast.calories || 0) +
          (lunch.calories || 0) +
          (dinner.calories || 0) +
          snacks.reduce((sum, snack) => sum + (snack.calories || 0), 0);
          
        return {
          day: days[index],
          breakfast: breakfast,
          lunch: lunch,
          dinner: dinner,
          snacks: snacks,
          totalCalories: Math.round(totalCalories),
        };
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
