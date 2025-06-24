
'use server';
/**
 * @fileOverview A diet plan generation AI flow.
 *
 * - generateDietPlan - A function that creates a personalized diet plan.
 */

import {ai} from '@/ai/genkit';
import {
    GenerateDietPlanInput,
    GenerateDietPlanInputSchema,
    GenerateDietPlanOutput,
    GenerateDietPlanOutputSchema
} from '@/types/workout';

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

The plan should be healthy, balanced, and realistic. Ensure all calorie values are numbers, not strings.`,
});

const generateDietPlanFlow = ai.defineFlow(
  {
    name: 'generateDietPlanFlow',
    inputSchema: GenerateDietPlanInputSchema,
    outputSchema: GenerateDietPlanOutputSchema,
  },
  async (input) => {
    const {output} = await prompt(input);
    if (!output) {
      throw new Error("The AI model failed to generate a diet plan. Please check your inputs and try again.");
    }
    return output;
  }
);
