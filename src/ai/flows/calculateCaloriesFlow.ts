'use server';
/**
 * @fileOverview An AI flow to calculate total calories for a day's meals.
 *
 * - calculateCalories - A function that estimates calories from meal descriptions.
 */

import {ai} from '@/ai/genkit';
import {z} from 'zod';

const CalculateCaloriesInputSchema = z.object({
  meal1: z.string().describe('Description of the first meal of the day.'),
  meal2: z.string().describe('Description of the second meal of the day.'),
  meal3: z.string().describe('Description of the third meal of the day.'),
});
export type CalculateCaloriesInput = z.infer<typeof CalculateCaloriesInputSchema>;

const CalculateCaloriesOutputSchema = z.object({
  totalCalories: z.number().describe('The estimated total calories for all provided meals combined. This should be a single number.'),
});
export type CalculateCaloriesOutput = z.infer<typeof CalculateCaloriesOutputSchema>;

export async function calculateCalories(input: CalculateCaloriesInput): Promise<CalculateCaloriesOutput> {
  return calculateCaloriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateCaloriesPrompt',
  input: {schema: CalculateCaloriesInputSchema},
  output: {schema: CalculateCaloriesOutputSchema},
  prompt: `You are an expert nutritionist. Based on the following meal descriptions, estimate the total caloric content for the day.

Meal 1: {{{meal1}}}
Meal 2: {{{meal2}}}
Meal 3: {{{meal3}}}

Analyze each meal description, estimate its calories, and provide a single total sum. Do not include supplements in the calculation unless they are explicitly part of a meal and have caloric value. Your response must be a valid JSON object containing only the total number of calories.`,
});

const calculateCaloriesFlow = ai.defineFlow(
  {
    name: 'calculateCaloriesFlow',
    inputSchema: CalculateCaloriesInputSchema,
    outputSchema: CalculateCaloriesOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    return output!;
  }
);
