'use server';
/**
 * @fileOverview An AI flow to analyze a single meal for nutritional content.
 *
 * - analyzeMeal - A function that estimates macros for a single meal description.
 * - AnalyzeMealOutputSchema - The return type for the analyzeMeal function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
}

const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
  input: {schema: z.string()},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `You are an expert nutritionist. Analyze the following meal description and estimate its nutritional content (calories, protein, carbs, fat, fiber).

Your response MUST be a valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.

Meal Description:
"{{input}}"

If the meal description is empty or nonsensical, return a JSON object with all values set to 0.`,
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
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
    }
  }
);
