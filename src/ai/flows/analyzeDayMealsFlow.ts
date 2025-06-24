'use server';
/**
 * @fileOverview An AI flow to analyze the nutritional content of a day's meals.
 *
 * This file exports a single async function:
 * - analyzeDayMeals: A function that estimates calories and macros from meal descriptions for a single day.
 */

import {ai} from '@/ai/genkit';
import { 
    AnalyzeDayMealsInput, 
    AnalyzeDayMealsOutput,
    AnalyzeDayMealsInputSchema,
    AnalyzeDayMealsOutputSchema,
} from '@/types/workout';


export async function analyzeDayMeals(input: AnalyzeDayMealsInput): Promise<AnalyzeDayMealsOutput> {
  return analyzeDayMealsFlow(input);
}

const prompt = ai.definePrompt({
  name: 'analyzeDayMealsPrompt',
  input: {schema: AnalyzeDayMealsInputSchema},
  output: {schema: AnalyzeDayMealsOutputSchema},
  prompt: `You are a nutrition expert. Analyze the provided meal descriptions for a single day.
  Based on the ingredients you can identify, estimate the total calories, protein, carbohydrates, fat, and fiber for the entire day.
  If a meal is empty or contains no discernible food items, treat its nutritional value as zero.
  Sum up the values from all meals to provide a daily total.

  Meal 1: {{{meal1}}}
  Meal 2: {{{meal2}}}
  Meal 3: {{{meal3}}}

  Your response MUST be a valid JSON object that adheres to the provided output schema. Do not include any other text, explanations, or markdown formatting.
  Provide only the total estimated values for the day.
  `,
});

const analyzeDayMealsFlow = ai.defineFlow(
  {
    name: 'analyzeDayMealsFlow',
    inputSchema: AnalyzeDayMealsInputSchema,
    outputSchema: AnalyzeDayMealsOutputSchema,
  },
  async (input) => {
    // If all inputs are empty, return zeroed-out data to save an AI call.
    if (!input.meal1 && !input.meal2 && !input.meal3) {
      return {
        totalCalories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        fiber: 0,
      };
    }
    
    try {
        const {output} = await prompt(input);
        if (!output) {
            throw new Error("The AI model did not return a valid response.");
        }
        return output;
    } catch (e) {
        console.error("An exception occurred during the analyzeDayMealsFlow execution:", e);
        // This will be caught by the client-side try/catch and shown in a toast.
        throw new Error("An error occurred while analyzing the meals. The AI model may be temporarily unavailable.");
    }
  }
);
