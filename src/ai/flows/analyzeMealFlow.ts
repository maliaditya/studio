
"use server";
/**
 * @fileoverview This flow analyzes a single meal and returns its estimated nutritional information.
 *
 * - analyzeMeal - A function that takes a meal description and returns its macronutrient breakdown.
 * - AnalyzeMealInput - The Zod schema for the input of the analyzeMeal function.
 * - AnalyzeMealOutput - The Zod schema for the output of the analyzeMeal function.
 */

import { ai } from "@/ai/genkit";
import { z } from "genkit/zod";
import { Meat, Soup } from "lucide-react";

export const AnalyzeMealInput = z.object({
  mealDescription: z.string().describe("The description of a single meal, including ingredients and approximate quantities."),
});

export const AnalyzeMealOutput = z.object({
  calories: z.number().describe("Estimated calories for the meal."),
  protein: z.number().describe("Estimated protein in grams for the meal."),
  carbs: z.number().describe("Estimated carbohydrates in grams for the meal."),
  fat: z.number().describe("Estimated fat in grams for the meal."),
  fiber: z.number().describe("Estimated fiber in grams for the meal."),
});

const analyzeMealPrompt = ai.definePrompt(
  {
    name: "analyzeMealPrompt",
    inputSchema: AnalyzeMealInput,
    outputSchema: AnalyzeMealOutput,
  },
  async (input) => {
    return {
      prompt: `Analyze the following meal and provide its estimated nutritional information. The description is: "${input.mealDescription}". Provide your best estimation for calories, protein, carbs, fat, and fiber.`,
      tools: [],
    };
  }
);

export async function analyzeMeal(
  input: z.infer<typeof AnalyzeMealInput>
): Promise<z.infer<typeof AnalyzeMealOutput>> {
  const { output } = await analyzeMealPrompt(input);
  return output!;
}
