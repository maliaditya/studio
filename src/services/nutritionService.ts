
/**
 * @fileOverview A local, keyword-based service for estimating nutritional content.
 * This service avoids AI calls for speed and reliability.
 *
 * - estimateCalories - A function that estimates calories and macros from meal descriptions.
 * - MealInput - The input type for the estimateCalories function.
 * - NutritionOutput - The return type for the estimateCalories function.
 */

// NOTE: This is a client-side utility and not a Server Action. Do not add 'use server'.

// Basic nutritional data for common foods. Values are approximate per 100g unless unit is 'item' or 'scoop'.
const foodData: Record<string, { calories: number; protein: number; carbs: number; fat: number; fiber: number; unit: 'g' | 'item' | 'scoop'; defaultAmount: number }> = {
  // Proteins
  'chicken breast': { calories: 165, protein: 31, carbs: 0, fat: 3.6, fiber: 0, unit: 'g', defaultAmount: 150 },
  'ground beef': { calories: 250, protein: 26, carbs: 0, fat: 15, fiber: 0, unit: 'g', defaultAmount: 150 },
  'salmon': { calories: 208, protein: 20, carbs: 0, fat: 13, fiber: 0, unit: 'g', defaultAmount: 150 },
  'tuna': { calories: 132, protein: 28, carbs: 0, fat: 1, fiber: 0, unit: 'g', defaultAmount: 100 },
  'egg': { calories: 78, protein: 6.5, carbs: 0.5, fat: 5.5, fiber: 0, unit: 'item', defaultAmount: 2 },
  'whey protein': { calories: 120, protein: 25, carbs: 3, fat: 1, fiber: 0, unit: 'scoop', defaultAmount: 1 },
  'tofu': { calories: 76, protein: 8, carbs: 1.9, fat: 4.8, fiber: 1.2, unit: 'g', defaultAmount: 100 },

  // Carbs
  'white rice': { calories: 130, protein: 2.7, carbs: 28, fat: 0.3, fiber: 0.4, unit: 'g', defaultAmount: 150 },
  'brown rice': { calories: 111, protein: 2.6, carbs: 23, fat: 0.9, fiber: 1.8, unit: 'g', defaultAmount: 150 },
  'oats': { calories: 389, protein: 16.9, carbs: 66, fat: 6.9, fiber: 10.6, unit: 'g', defaultAmount: 50 },
  'quinoa': { calories: 120, protein: 4.1, carbs: 21, fat: 1.9, fiber: 2.8, unit: 'g', defaultAmount: 100 },
  'pasta': { calories: 131, protein: 5, carbs: 25, fat: 1.1, fiber: 1.8, unit: 'g', defaultAmount: 100 },
  'bread': { calories: 265, protein: 9, carbs: 49, fat: 3.2, fiber: 2.7, unit: 'g', defaultAmount: 50 }, // ~2 slices
  'potato': { calories: 77, protein: 2, carbs: 17, fat: 0.1, fiber: 2.2, unit: 'g', defaultAmount: 150 },
  'sweet potato': { calories: 86, protein: 1.6, carbs: 20, fat: 0.1, fiber: 3, unit: 'g', defaultAmount: 150 },

  // Fats
  'avocado': { calories: 160, protein: 2, carbs: 8.5, fat: 15, fiber: 7, unit: 'item', defaultAmount: 0.5 },
  'almonds': { calories: 579, protein: 21, carbs: 22, fat: 49, fiber: 12, unit: 'g', defaultAmount: 25 },
  'peanut butter': { calories: 588, protein: 25, carbs: 20, fat: 50, fiber: 8, unit: 'g', defaultAmount: 30 },
  'olive oil': { calories: 884, protein: 0, carbs: 0, fat: 100, fiber: 0, unit: 'g', defaultAmount: 15 }, // ~1 tbsp

  // Veggies & Fruits
  'broccoli': { calories: 55, protein: 3.7, carbs: 11.2, fat: 0.6, fiber: 5.2, unit: 'g', defaultAmount: 100 },
  'spinach': { calories: 23, protein: 2.9, carbs: 3.6, fat: 0.4, fiber: 2.2, unit: 'g', defaultAmount: 100 },
  'banana': { calories: 89, protein: 1.1, carbs: 23, fat: 0.3, fiber: 2.6, unit: 'item', defaultAmount: 1 },
  'apple': { calories: 52, protein: 0.3, carbs: 14, fat: 0.2, fiber: 2.4, unit: 'item', defaultAmount: 1 },
  'berries': { calories: 57, protein: 0.7, carbs: 14.5, fat: 0.3, fiber: 2.4, unit: 'g', defaultAmount: 100 },
};

export interface MealInput {
  meal1: string;
  meal2: string;
  meal3: string;
}

export interface NutritionOutput {
  totalCalories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

// Sort keys by length, descending, to match longer phrases first (e.g., "chicken breast" before "chicken")
const sortedFoodKeys = Object.keys(foodData).sort((a, b) => b.length - a.length);

export function estimateCalories(input: MealInput): NutritionOutput {
  let fullText = `${input.meal1} ${input.meal2} ${input.meal3}`.toLowerCase();
  
  const totals = {
    totalCalories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
  };

  sortedFoodKeys.forEach(food => {
    // Regex to find an optional number, optional unit, and the food keyword
    const foodRegex = new RegExp(`(\\d*\\.?\\d+)?\\s*(g|grams|gram|scoop|scoops|items|item)?\\s*${food.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'gi');
    
    let match;
    while ((match = foodRegex.exec(fullText)) !== null) {
      if (match[0].trim().length === 0) continue;

      const data = foodData[food];
      let quantity = parseFloat(match[1]);
      
      if (isNaN(quantity)) {
        quantity = data.defaultAmount;
      }

      let multiplier = 1;
      if (data.unit === 'g') {
        multiplier = quantity / 100;
      } else { // 'item' or 'scoop'
        multiplier = quantity;
      }

      totals.totalCalories += data.calories * multiplier;
      totals.protein += data.protein * multiplier;
      totals.carbs += data.carbs * multiplier;
      totals.fat += data.fat * multiplier;
      totals.fiber += data.fiber * multiplier;

      fullText = fullText.substring(0, match.index) + " ".repeat(match[0].length) + fullText.substring(match.index + match[0].length);
    }
  });

  return {
    totalCalories: Math.round(totals.totalCalories),
    protein: Math.round(totals.protein),
    carbs: Math.round(totals.carbs),
    fat: Math.round(totals.fat),
    fiber: Math.round(totals.fiber),
  };
}
