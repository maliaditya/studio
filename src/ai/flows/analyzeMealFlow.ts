'use server';
/**
 * @fileOverview An AI flow to analyze the nutritional content of a single meal.
 *
 * This file exports a single async function:
 * - analyzeMeal: A function that estimates calories and macros from a single meal description.
 */

import {ai} from '@/ai/genkit';
import { 
    AnalyzeMealInput,
    AnalyzeMealOutput,
    AnalyzeMealInputSchema,
    AnalyzeMealOutputSchema,
} from '@/types/workout';

export async function analyzeMeal(input: AnalyzeMealInput): Promise<AnalyzeMealOutput> {
  return analyzeMealFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeMealPrompt',
  input: {schema: AnalyzeMealInputSchema},
  output: {schema: AnalyzeMealOutputSchema},
  prompt: `You are a nutrition expert. Analyze the provided meal description.
  Based on the ingredients you can identify, estimate the calories, protein, carbohydrates, fat, and fiber for this single meal.
  If the meal is empty or contains no discernible food items, return all nutritional values as 0.

  Meal Description: {{input}}

  Your response MUST be a valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.
  `,
});

const analyzeMealFlow = ai.defineFlow(
  {
    name: 'analyzeMealFlow',
    inputSchema: AnalyzeMealInputSchema,
    outputSchema: AnalyzeMealOutputSchema,
  },
  async (input) => {
    // If input is empty, return zeroed-out data to save an AI call.
    if (!input || input.trim() === '') {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      };
    }
    
    try {
        const {output} = await prompt(input);
        if (!output) {
            // This case handles if the model returns a non-parsable or empty response.
            throw new Error("The AI model did not return a valid response. Please try again.");
        }
        return output;
    } catch (e) {
        console.error("An exception occurred during the analyzeMealFlow execution:", e);
        // This will be caught by the client-side try/catch and shown in a toast.
        throw new Error("An error occurred while analyzing the meal. The AI model may be busy or unavailable.");
    }
  }
);
