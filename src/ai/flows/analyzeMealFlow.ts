
'use server';
/**
 * @fileOverview An AI flow to analyze the nutritional content of a single meal.
 *
 * - analyzeMeal - A function that estimates calories and macros from a single meal description.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

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
}

const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
  input: {schema: AnalyzeMealInputSchema},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `You are an expert nutritionist. Based on the following meal description, estimate its caloric content and macronutrient breakdown.

Meal: {{{mealDescription}}}

If the description is nonsensical or not a food item, return all values as 0.
Your response must be a valid JSON object that strictly adheres to the output schema. Do not include any other text, explanations, or markdown formatting. The response should be ONLY the JSON object.`,
  config: {
    temperature: 0,
  },
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
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
    }
  }
);
