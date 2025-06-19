export interface LoggedSet {
  id: string;
  reps: number;
  weight: number;
  timestamp: number;
}

export interface WorkoutExercise {
  id: string; // Unique instance ID for this exercise in this workout
  definitionId: string; // Links to ExerciseDefinition
  name: string; // Copied from definition for display convenience
  loggedSets: LoggedSet[];
  targetSets: number;
  targetReps: string; // e.g., "10-15"
}

export interface ExerciseDefinition {
  id: string;
  name: string;
}
