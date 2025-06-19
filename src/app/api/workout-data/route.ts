import { type NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebaseAdmin';
import type { ExerciseDefinition, DatedWorkout } from '@/types/workout';

const EXERCISE_DEFINITIONS_COLLECTION = 'exerciseDefinitions';
const WORKOUT_LOGS_COLLECTION = 'workoutLogs';

// Helper to get user document references
const getUserDocRef = (collection: string, userId: string) => db.collection(collection).doc(userId);

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const exerciseDefDoc = await getUserDocRef(EXERCISE_DEFINITIONS_COLLECTION, userId).get();
    const workoutLogsDoc = await getUserDocRef(WORKOUT_LOGS_COLLECTION, userId).get();

    const exerciseDefinitions = exerciseDefDoc.exists ? exerciseDefDoc.data()?.definitions || [] : [];
    const allWorkoutLogs = workoutLogsDoc.exists ? workoutLogsDoc.data()?.logs || [] : [];
    
    return NextResponse.json({ exerciseDefinitions, allWorkoutLogs });
  } catch (error) {
    console.error('Error fetching workout data:', error);
    return NextResponse.json({ error: 'Failed to fetch workout data' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
  }

  try {
    const body = await request.json();
    const { exerciseDefinitions, allWorkoutLogs } = body as { exerciseDefinitions: ExerciseDefinition[], allWorkoutLogs: DatedWorkout[] };

    if (!Array.isArray(exerciseDefinitions) || !Array.isArray(allWorkoutLogs)) {
        return NextResponse.json({ error: 'Invalid data format' }, { status: 400 });
    }
    
    const batch = db.batch();

    const exerciseDefRef = getUserDocRef(EXERCISE_DEFINITIONS_COLLECTION, userId);
    batch.set(exerciseDefRef, { definitions: exerciseDefinitions }, { merge: true });

    const workoutLogsRef = getUserDocRef(WORKOUT_LOGS_COLLECTION, userId);
    batch.set(workoutLogsRef, { logs: allWorkoutLogs }, { merge: true });

    await batch.commit();
    
    return NextResponse.json({ message: 'Workout data saved successfully' });
  } catch (error) {
    console.error('Error saving workout data:', error);
    return NextResponse.json({ error: 'Failed to save workout data' }, { status: 500 });
  }
}
