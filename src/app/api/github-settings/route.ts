
import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';
const normalizeUsername = (username: string) => username.trim().toLowerCase();

/**
 * POST /api/github-settings
 * Uploads a user's GitHub sync settings to Supabase Storage.
 */
export async function POST(request: Request) {
  const {
    username,
    githubToken,
    githubOwner,
    githubRepo,
    githubPath,
    githubFetchMissingOnly,
    supabaseUrl,
    supabaseAnonKey,
    supabasePdfBucket,
  } = await request.json();

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      { error: 'Supabase storage is not configured on the server.' },
      { status: 500 }
    );
  }

  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }

  const requestedUsername = normalizeUsername(username);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }
  if (sessionUser !== requestedUsername) {
    return NextResponse.json({ error: 'Forbidden. You can only access your own settings.' }, { status: 403 });
  }

  const blobPathname = `github-settings/${requestedUsername}.json`;

  try {
    const settingsData = {
      githubToken,
      githubOwner,
      githubRepo,
      githubPath,
      githubFetchMissingOnly,
      supabaseUrl,
      supabaseAnonKey,
      supabasePdfBucket,
    };
    await writeJsonToStorage(blobPathname, settingsData);

    return NextResponse.json({ success: true, message: 'GitHub settings saved.' });
  } catch (error) {
    console.error(`Error in POST /api/github-settings for user ${requestedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/github-settings?username=<username>
 * Fetches a user's GitHub settings from Supabase Storage.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      { error: 'Supabase storage is not configured on the server.' },
      { status: 500 }
    );
  }

  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }

  const requestedUsername = normalizeUsername(username);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }
  if (sessionUser !== requestedUsername) {
    return NextResponse.json({ error: 'Forbidden. You can only access your own settings.' }, { status: 403 });
  }

  const blobPathname = `github-settings/${requestedUsername}.json`;

  try {
    const settingsData = await readJsonFromStorage<any>(blobPathname);
    if (!settingsData) {
      return NextResponse.json({ settings: null, message: "No GitHub settings found for this user." }, { status: 200 });
    }
    return NextResponse.json({ settings: settingsData });

  } catch (error: any) {
    console.error(`GitHub settings read error for user ${requestedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read GitHub settings: ${errorMessage}` }, { status: 500 });
  }
}
