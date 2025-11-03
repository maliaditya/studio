

import { getDay, getISOWeek, format, parseISO } from 'date-fns';
import type { WorkoutExercise, AllWorkoutPlans, ExerciseDefinition, WorkoutMode, ExerciseCategory, DatedWorkout, WorkoutSchedulingMode } from '@/types/workout';

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

const twoMuscleSequence: ExerciseCategory[][] = [
    ["Chest", "Triceps"],
    ["Back", "Biceps"],
    ["Shoulders", "Legs"]
];

const oneMuscleSequence: (ExerciseCategory | null)[] = ["Chest", "Triceps", "Back", "Biceps", "Shoulders", "Legs"];


/**
 * Generates a list of workout exercises for a given day based on the workout mode and plans.
 * This function handles "two-muscle" (all exercises for the group) and "one-muscle" (all exercises for the group) modes.
 * It supplements with random exercises if the plan has too few, and truncates if it has too many based on mode-specific limits.
 * @param date The date for which to generate the workout.
 * @param mode The current workout mode ('one-muscle' or 'two-muscle').
 * @param plans The complete set of user-defined workout plans.
 * @param definitions The master list of all available exercise definitions.
 * @param rotationEnabled Whether to rotate weekly workout plans.
 * @param schedulingMode The workout scheduling mode ('day-of-week' or 'sequential').
 * @param allWorkoutLogs The complete log of all workouts, used for sequential mode.
 * @param findLastPerformance Optional function to get previous performance data for an exercise.
 * @param overrideCategories Optional array of muscle groups to force for a specific day.
 * @returns An object containing the list of exercises and a description of the generated workout.
 */
export const getExercisesForDay = (
    date: Date,
    mode: WorkoutMode,
    plans: AllWorkoutPlans,
    definitions: ExerciseDefinition[],
    rotationEnabled: boolean,
    schedulingMode: WorkoutSchedulingMode = 'day-of-week',
    allWorkoutLogs?: DatedWorkout[],
    findLastPerformance?: (exerciseDefinitionId: string) => { reps: number; weight: number } | null,
    overrideCategories?: ExerciseCategory[]
): { exercises: WorkoutExercise[], description: string } => {
    let muscleGroups: ExerciseCategory[] | null = [];
    let planKey: keyof AllWorkoutPlans | null = null;
    
    // This determines which muscle groups to train for the given day.
    if (overrideCategories) {
        muscleGroups = overrideCategories;
    } else if (schedulingMode === 'sequential' && allWorkoutLogs) {
        const sortedLogs = allWorkoutLogs
            .filter(log => log.exercises.length > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastWorkout = sortedLogs[0];
        
        if (mode === 'two-muscle') {
            let lastWorkoutIndex = -1;
            if (lastWorkout) {
                const lastMuscleGroup = lastWorkout.exercises[0]?.category;
                lastWorkoutIndex = twoMuscleSequence.findIndex(pair => pair.includes(lastMuscleGroup));
            }
            muscleGroups = twoMuscleSequence[(lastWorkoutIndex + 1) % twoMuscleSequence.length];
        } else { // one-muscle
            let lastWorkoutIndex = -1;
            if (lastWorkout) {
                const lastMuscleGroup = lastWorkout.exercises[0]?.category;
                lastWorkoutIndex = oneMuscleSequence.indexOf(lastMuscleGroup);
            }
            const nextMuscle = oneMuscleSequence[(lastWorkoutIndex + 1) % oneMuscleSequence.length];
            muscleGroups = nextMuscle ? [nextMuscle] : [];
        }

    } else { // 'day-of-week' scheduling
        const dayOfWeek = getDay(date);
        if (mode === 'two-muscle') {
            muscleGroups = (dailyMuscleGroups[dayOfWeek] || []) as ExerciseCategory[];
        } else { // 'one-muscle' mode
            const muscle = singleMuscleDailySchedule[dayOfWeek];
            muscleGroups = muscle ? [muscle] : [];
        }
    }

    if (muscleGroups.length === 0) {
        return { exercises: [], description: "Rest day." };
    }

    // This determines which weekly plan (W1, W2, etc.) to use.
    const isoWeek = getISOWeek(date);
    if (mode === 'two-muscle') {
        if (rotationEnabled) {
            const isOddWeek = isoWeek % 2 !== 0;
            planKey = isOddWeek ? (getDay(date) <= 3 ? 'W1' : 'W2') : (getDay(date) <= 3 ? 'W3' : 'W4');
        } else {
            planKey = 'W1';
        }
    } else { // one-muscle
        if (rotationEnabled) {
            planKey = isoWeek % 2 !== 0 ? 'W5' : 'W6';
        } else {
            planKey = 'W5';
        }
    }

    if (!planKey) {
        return { exercises: [], description: "No workout plan for today." };
    }

    const plan = plans[planKey];
    if (!plan) {
        return { exercises: [], description: `Plan ${planKey} not found.` };
    }

    const definitionsMap = new Map(definitions.map(def => [def.name.toLowerCase(), def]));
    const allExercisesToAdd: WorkoutExercise[] = [];
    const allAddedDefinitionIds = new Set<string>();

    for (const mg of muscleGroups) {
        const planExerciseNames = plan[mg] || [];
        
        for (const name of planExerciseNames) {
            const definition = definitionsMap.get(name.toLowerCase());
            if (definition && !allAddedDefinitionIds.has(definition.id)) {
                allExercisesToAdd.push({
                    id: `${definition.id}-${Date.now()}-${Math.random()}`,
                    definitionId: definition.id,
                    name: definition.name,
                    category: definition.category,
                    loggedSets: [],
                    targetSets: DEFAULT_TARGET_SETS,
                    targetReps: DEFAULT_TARGET_REPS,
                    ...(findLastPerformance && { lastPerformance: findLastPerformance(definition.id) }),
                });
                allAddedDefinitionIds.add(definition.id);
            } else if (!definition) {
                console.warn(`Definition not found for exercise: "${name}" in plan ${planKey}, category ${mg}`);
            }
        }
    }

    const description = `${muscleGroups.join(' & ')} workout added.`;
    return { exercises: allExercisesToAdd, description };
};
