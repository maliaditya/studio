
'use server';
/**
 * @fileOverview A diet plan generation AI flow.
 *
 * - generateDietPlan - A function that creates a personalized diet plan.
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

const prompt = ai.definePrompt({
  name: 'generateDietPlanPrompt',
  input: {schema: GenerateDietPlanInputSchema},
  output: {schema: GenerateDietPlanOutputSchema},
  prompt: `You are an expert nutritionist. A user wants a personalized diet plan to help them go from their current weight to their goal weight.

User Details:
- Current Weight: {{{currentWeight}}} kg/lb
- Goal Weight: {{{goalWeight}}} kg/lb
- Height: {{{height}}} cm
- Age: {{{age}}}
- Gender: {{{gender}}}
- Activity Level: {{{activityLevel}}}
- Dietary Preferences/Restrictions: {{{preferences}}}

Based on these details, create a comprehensive 7-day diet plan.

Your response MUST be a valid JSON object that adheres to the provided output schema.
1. Create a brief summary of the recommended caloric intake and overall strategy.
2. Create a 7-day plan, with an entry for each day.
3. For each day, provide suggestions for breakfast, lunch, dinner, and two snacks.
4. For each meal and snack, provide a brief description and an estimated calorie count.
5. Provide a total estimated calorie count for each day.

The plan should be healthy, balanced, and realistic. Ensure all calorie values are numbers, not strings.

Do not include any other text, explanations, or markdown formatting like \`\`\`json blocks in your response. The response should be ONLY the JSON object.
If any user details are missing or nonsensical, you must still return a valid JSON object, but the summary should state that a plan cannot be generated and the daily plans should be empty.`,
});

const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: GenerateDietPlanInputSchema,
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async (input) => {
    try {
        const {output} = await prompt(input);
        
        // Explicitly check for a valid output object and its primary properties.
        if (!output || !output.summary || !Array.isArray(output.dailyPlans)) {
          console.error("AI returned invalid or incomplete data for diet plan generation.", output);
          throw new Error("The AI model returned an unexpected data format. Please try again.");
        }

        return output;
    } catch (e) {
        console.error("An exception occurred during the generateDietPlanFlow execution:", e);
        // This will be caught by the client-side try/catch and shown in a toast.
        throw new Error("An error occurred while communicating with the AI. Please check your input or try again later.");
    }
  }
);
