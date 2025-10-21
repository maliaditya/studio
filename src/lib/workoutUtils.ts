
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
 * This function handles "two-muscle" (4 exercises per group) and "one-muscle" (6 exercises per group) modes.
 * It supplements with random exercises if the plan has too few, and truncates if it has too many.
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
    let exercisesPerGroup = 0;

    if (overrideCategories) {
        muscleGroups = overrideCategories;
        exercisesPerGroup = mode === 'one-muscle' ? 6 : 2; // Corrected for override
    } else if (schedulingMode === 'sequential' && allWorkoutLogs) {
        const sortedLogs = allWorkoutLogs
            .filter(log => log.exercises.length > 0)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        
        const lastWorkout = sortedLogs[0];
        
        if (mode === 'two-muscle') {
            exercisesPerGroup = 2; // Each group gets 2 exercises
            let lastWorkoutIndex = -1;
            if (lastWorkout) {
                const lastMuscleGroup = lastWorkout.exercises[0]?.category;
                lastWorkoutIndex = twoMuscleSequence.findIndex(pair => pair.includes(lastMuscleGroup));
            }
            muscleGroups = twoMuscleSequence[(lastWorkoutIndex + 1) % twoMuscleSequence.length];
        } else { // one-muscle
            exercisesPerGroup = 6;
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
            exercisesPerGroup = 2; // Corrected: 2 exercises per muscle group for a total of 4
        } else { // 'one-muscle' mode
            const muscle = singleMuscleDailySchedule[dayOfWeek];
            muscleGroups = muscle ? [muscle] : [];
            exercisesPerGroup = 6;
        }
    }

    if (muscleGroups.length === 0) {
        return { exercises: [], description: "Rest day." };
    }

    // Determine planKey based on rotation, regardless of scheduling mode
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
        let selectedDefinitions: ExerciseDefinition[] = [];

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

        if (selectedDefinitions.length < exercisesPerGroup) {
            const needed = exercisesPerGroup - selectedDefinitions.length;
            const supplementPool = definitions.filter(def => 
                def.category === mg && !allAddedDefinitionIds.has(def.id)
            );
            
            for (let i = supplementPool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [supplementPool[i], supplementPool[j]] = [supplementPool[j], supplementPool[i]];
            }

            const supplements = supplementPool.slice(0, needed);
            selectedDefinitions.push(...supplements);
            supplements.forEach(def => allAddedDefinitionIds.add(def.id));
        }
        
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
