
import { getDay, getISOWeek } from 'date-fns';
import type { WorkoutExercise, AllWorkoutPlans, ExerciseDefinition, WorkoutMode, ExerciseCategory } from '@/types/workout';

const DEFAULT_TARGET_SETS = 3;
const DEFAULT_TARGET_REPS = "8-12";

const dailyMuscleGroups: Record<number, string[]> = {
  1: ["Chest", "Triceps"], 2: ["Back", "Biceps"], 3: ["Shoulders", "Legs"],
  4: ["Chest", "Triceps"], 5: ["Back", "Biceps"], 6: ["Shoulders", "Legs"], 0: [],
};

const singleMuscleDailySchedule: Record<number, ExerciseCategory | null> = {
    1: "Chest",       // Monday
    2: "Triceps",     // Tuesday
    3: "Back",        // Wednesday
    4: "Biceps",      // Thursday
    5: "Shoulders",   // Friday
    6: "Legs",        // Saturday
    0: null,          // Sunday
};

/**
 * Generates a list of workout exercises for a given day based on the workout mode and plans.
 * This function handles "two-muscle" (4 exercises per group) and "one-muscle" (6 exercises per group) modes.
 * It supplements with random exercises if the plan has too few, and truncates if it has too many.
 * @param date The date for which to generate the workout.
 * @param mode The current workout mode ('one-muscle' or 'two-muscle').
 * @param plans The complete set of user-defined workout plans.
 * @param definitions The master list of all available exercise definitions.
 * @param findLastPerformance Optional function to get previous performance data for an exercise.
 * @returns An object containing the list of exercises and a description of the generated workout.
 */
export const getExercisesForDay = (
    date: Date,
    mode: WorkoutMode,
    plans: AllWorkoutPlans,
    definitions: ExerciseDefinition[],
    findLastPerformance?: (exerciseDefinitionId: string) => { reps: number; weight: number } | null
): { exercises: WorkoutExercise[], description: string } => {
    const dayOfWeek = getDay(date);
    const isoWeek = getISOWeek(date);

    let muscleGroups: ExerciseCategory[] = [];
    let planKey: keyof AllWorkoutPlans | null = null;
    let exercisesPerGroup = 0;

    // 1. Determine plan, muscle groups, and target exercise count based on the mode.
    if (mode === 'two-muscle') {
        muscleGroups = (dailyMuscleGroups[dayOfWeek] || []) as ExerciseCategory[];
        exercisesPerGroup = 4;
        if (muscleGroups.length > 0) {
            const isOddWeek = isoWeek % 2 !== 0;
            planKey = isOddWeek
                ? (dayOfWeek <= 3 ? 'W1' : 'W2')
                : (dayOfWeek <= 3 ? 'W3' : 'W4');
        }
    } else { // 'one-muscle' mode
        const muscle = singleMuscleDailySchedule[dayOfWeek];
        if (muscle) {
            muscleGroups = [muscle];
            exercisesPerGroup = 6;
            const isOddWeek = isoWeek % 2 !== 0;
            planKey = isOddWeek ? 'W5' : 'W6';
        }
    }

    if (!planKey || muscleGroups.length === 0) {
        return { exercises: [], description: "Rest day." };
    }

    const plan = plans[planKey];
    if (!plan) {
        return { exercises: [], description: `Plan ${planKey} not found.` };
    }

    const definitionsMap = new Map(definitions.map(def => [def.name.toLowerCase(), def]));
    const allExercisesToAdd: WorkoutExercise[] = [];
    const allAddedDefinitionIds = new Set<string>();

    // 2. Process each muscle group individually to ensure correct counts.
    for (const mg of muscleGroups) {
        const planExerciseNames = plan[mg] || [];
        let selectedDefinitions: ExerciseDefinition[] = [];

        // Get valid, unique exercises from the plan, up to the target count.
        for (const name of planExerciseNames) {
            if (selectedDefinitions.length >= exercisesPerGroup) break;
            const definition = definitionsMap.get(name.toLowerCase());
            if (definition && !allAddedDefinitionIds.has(definition.id)) {
                selectedDefinitions.push(definition);
                allAddedDefinitionIds.add(definition.id);
            } else if (!definition) {
                console.warn(`Definition not found for exercise: "${name}" in plan ${planKey}, category ${mg}`);
            }
        }

        // 3. Supplement with random exercises if the plan has fewer than required.
        if (selectedDefinitions.length < exercisesPerGroup) {
            const needed = exercisesPerGroup - selectedDefinitions.length;
            
            // Find available exercises for this category that haven't been added yet.
            const supplementPool = definitions.filter(def => 
                def.category === mg && !allAddedDefinitionIds.has(def.id)
            );
            
            // Shuffle the pool to get random exercises.
            for (let i = supplementPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [supplementPool[i], supplementPool[j]] = [supplementPool[j], supplementPool[i]];
            }

            const supplements = supplementPool.slice(0, needed);
            selectedDefinitions.push(...supplements);
            supplements.forEach(def => allAddedDefinitionIds.add(def.id));
        }
        
        // 4. Convert selected definitions to WorkoutExercise objects.
        const workoutExercisesForGroup = selectedDefinitions.map(definition => {
            const lastPerformance = findLastPerformance ? findLastPerformance(definition.id) : null;
            return {
                id: `${definition.id}-${Date.now()}-${Math.random()}`,
                definitionId: definition.id,
                name: definition.name,
                category: definition.category,
                loggedSets: [],
                targetSets: DEFAULT_TARGET_SETS,
                targetReps: DEFAULT_TARGET_REPS,
                ...(lastPerformance && { lastPerformance }),
            };
        });

        allExercisesToAdd.push(...workoutExercisesForGroup);
    }

    const description = `Added ${planKey} exercises for ${muscleGroups.join(' & ')}. Loaded ${allExercisesToAdd.length} exercises.`;
    return { exercises: allExercisesToAdd, description };
};
