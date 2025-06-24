<<<<<<< HEAD
'use server';
/**
 * @fileOverview An AI flow to analyze a single meal for nutritional content.
 *
 * - analyzeMeal - A function that estimates macros for a single meal description.
 * - AnalyzeMealOutputSchema - The return type for the analyzeMeal function.
=======

'use server';
/**
 * @fileOverview An AI flow to analyze the nutritional content of a single meal.
 *
 * - analyzeMeal - A function that estimates calories and macros from a single meal description.
>>>>>>> 627e93586c6e688e45cb9ec6dbf704485f947acd
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

<<<<<<< HEAD
export const AnalyzeMealOutputSchema = z.object({
  calories: z.number().describe('The estimated calorie count for the meal.'),
  protein: z.number().describe('The estimated protein in grams.'),
  carbs: z.number().describe('The estimated carbohydrates in grams.'),
  fat: z.number().describe('The estimated fat in grams.'),
  fiber: z.number().describe('The estimated fiber in grams.'),
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export async function analyzeMeal(mealDescription: string): Promise<AnalyzeMealOutput> {
  return analyzeMealFlow(mealDescription);
=======
const AnalyzeMealInputSchema = z.object({
  mealDescription: z.string().describe('A description of a single meal.'),
});
export type AnalyzeMealInput = z.infer<typeof AnalyzeMealInputSchema>;

const AnalyzeMealOutputSchema = z.object({
  calories: z.number().describe('The estimated calories for the meal.'),
  protein: z.number().describe('The estimated grams of protein for the meal.'),
  carbs: z.number().describe('The estimated grams of carbohydrates for the meal.'),
  fat: z.number().describe('The estimated grams of fat for the meal.'),
  fiber: z.number().describe('The estimated grams of fiber for the meal.'),
});
export type AnalyzeMealOutput = z.infer<typeof AnalyzeMealOutputSchema>;

export async function analyzeMeal(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  // If the meal description is empty, return zero values immediately.
  if (!input.mealDescription.trim()) {
    return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
  }
  return analyzeMealFlow(input);
>>>>>>> 627e93586c6e688e45cb9ec6dbf704485f947acd
}

const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
<<<<<<< HEAD
  input: {schema: z.string()},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `You are an expert nutritionist. Analyze the following meal description and estimate its nutritional content (calories, protein, carbs, fat, fiber).

Your response MUST be a valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.

Meal Description:
"{{input}}"

If the meal description is empty or nonsensical, return a JSON object with all values set to 0.`,
=======
  input: {schema: AnalyzeMealInputSchema},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `You are an expert nutritionist. Based on the following meal description, estimate its caloric content and macronutrient breakdown.

Meal: {{{mealDescription}}}

If the description is nonsensical or not a food item, return all values as 0.
Your response must be a valid JSON object that strictly adheres to the output schema. Do not include any other text, explanations, or markdown formatting. The response should be ONLY the JSON object.`,
  config: {
    temperature: 0,
  },
>>>>>>> 627e93586c6e688e45cb9ec6dbf704485f947acd
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
<<<<<<< HEAD
    inputSchema: z.string(),
    outputSchema: AnalyzeMealOutputSchema,
  },
  async (mealDescription) => {
    if (!mealDescription.trim()) {
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
    }
    
    try {
        const {output} = await prompt(mealDescription);
        if (!output) {
          throw new Error("AI model returned an empty response.");
        }
        return output;
    } catch (e) {
        console.error("An exception occurred during the analyzeMealFlow execution:", e);
        throw new Error("An error occurred while communicating with the AI. Please try again later.");
=======
    inputSchema: AnalyzeMealInputSchema,
    outputSchema: AnalyzeMealOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      
      if (!output || typeof output.calories !== 'number') {
        console.error("AI returned invalid or incomplete data for meal analysis.", output);
        // Return zero-values instead of throwing an error to allow other meals to be calculated.
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
      }

      return output;
    } catch (e) {
        console.error("An exception occurred during the analyzeMealFlow execution:", e);
        // To avoid failing the entire calculation, return zero-values on error.
        return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0 };
>>>>>>> 627e93586c6e688e45cb9ec6dbf704485f947acd
    }
  }
);
