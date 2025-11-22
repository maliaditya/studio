
"use server";
/**
 * @fileoverview This flow calculates the Basal Metabolic Rate (BMR) and maintenance calories for a user.
 *
 * - calculateCalories - A function that takes user biometrics and returns BMR and maintenance calories.
 * - UserBiometricsInput - The Zod schema for the input of the calculateCalories function.
 * - CalorieOutput - The Zod schema for the output of the calculateCalories function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit/zod";

export const UserBiometricsInput = z.object({
    weight: z.number().describe("User's weight in kilograms."),
    height: z.number().describe("User's height in centimeters."),
    age: z.number().describe("User's age in years."),
    gender: z.enum(['male', 'female']).describe("User's gender."),
});

export const CalorieOutput = z.object({
    bmr: z.number().describe("Basal Metabolic Rate (BMR) in calories."),
    maintenanceCalories: z.number().describe("Estimated daily maintenance calories."),
});

const calculateCaloriesPrompt = ai.definePrompt(
  {
    name: "calculateCaloriesPrompt",
    inputSchema: UserBiometricsInput,
    outputSchema: CalorieOutput,
  },
  async (input) => {
    // Using Mifflin-St Jeor Equation
    const bmr = (10 * input.weight) + (6.25 * input.height) - (5 * input.age) + (input.gender === 'male' ? 5 : -161);
    const maintenanceCalories = bmr * 1.55; // Assuming moderate activity level

    return {
      prompt: `Based on the user's biometrics, I have calculated their BMR to be ${bmr.toFixed(0)} and their maintenance calories to be ${maintenanceCalories.toFixed(0)}. Please format this as the output.`,
      tools: [],
    };
  }
);


export async function calculateCalories(
  input: z.infer<typeof UserBiometricsInput>
): Promise<z.infer<typeof CalorieOutput>> {
  const { output } = await calculateCaloriesPrompt(input);
  return output!;
}
