
'use server';
/**
 * @fileOverview An AI flow to calculate total calories and macronutrients for a day's meals.
 *
 * - calculateCalories - A function that estimates calories and macros from meal descriptions.
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
  protein: z.number().describe('The estimated total grams of protein for the day.'),
  carbs: z.number().describe('The estimated total grams of carbohydrates for the day.'),
  fat: z.number().describe('The estimated total grams of fat for the day.'),
  fiber: z.number().describe('The estimated total grams of fiber for the day.'),
});
export type CalculateCaloriesOutput = z.infer<typeof CalculateCaloriesOutputSchema>;

export async function calculateCalories(input: CalculateCaloriesInput): Promise<CalculateCaloriesOutput> {
  return calculateCaloriesFlow(input);
}

const prompt = ai.definePrompt({
  name: 'calculateCaloriesPrompt',
  input: {schema: CalculateCaloriesInputSchema},
  output: {schema: CalculateCaloriesOutputSchema},
  prompt: `You are an expert nutritionist. Based on the following meal descriptions, estimate the total caloric content and macronutrient breakdown for the day. If a meal description is empty, ignore it.

Meal 1: {{{meal1}}}
Meal 2: {{{meal2}}}
Meal 3: {{{meal3}}}

Analyze each provided meal description, estimate its calories and macronutrients, and provide a single total sum for each. Do not include supplements in the calculation unless they are explicitly part of a meal and have caloric value.

If no valid meal descriptions are provided, or if the input is nonsensical and a nutritional estimate cannot be made, return a JSON object with all values set to 0.

Your response must be a valid JSON object that strictly adheres to the output schema. Do not include any other text, explanations, or markdown formatting like \`\`\`json blocks in your response. The response should be ONLY the JSON object.`,
  config: {
    temperature: 0,
  },
});

const calculateCaloriesFlow = ai.defineFlow(
  {
    name: 'calculateCaloriesFlow',
    inputSchema: CalculateCaloriesInputSchema,
    outputSchema: CalculateCaloriesOutputSchema,
  },
  async (input) => {
    try {
      const {output} = await prompt(input);
      
      // Explicitly check for a valid output object and its primary property.
      if (!output || typeof output.totalCalories !== 'number') {
        console.error("AI returned invalid or incomplete data for calorie calculation.", output);
        throw new Error("The AI model returned an unexpected data format. Please try again.");
      }

      return output;
    } catch (e) {
        console.error("An exception occurred during the calculateCaloriesFlow execution:", e);
        // This will be caught by the client-side try/catch and shown in a toast.
        throw new Error("An error occurred while communicating with the AI. Please check your input or try again later.");
    }
  }
);
