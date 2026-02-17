
import { put, head } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/serverSession';

export const dynamic = 'force-dynamic';
const normalizeUsername = (username: string) => username.trim().toLowerCase();

/**
 * POST /api/github-settings
 * Uploads a user's GitHub sync settings to Vercel Blob storage.
 */
export async function POST(request: Request) {
  const { username, githubToken, githubOwner, githubRepo, githubPath } = await request.json();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server.' },
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
    const settingsData = { githubToken, githubOwner, githubRepo, githubPath };
    const blob = await put(blobPathname, JSON.stringify(settingsData, null, 2), {
      access: 'public',
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    return NextResponse.json({ success: true, message: 'GitHub settings saved.', blob });
  } catch (error) {
    console.error(`Error in POST /api/github-settings for user ${requestedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/github-settings?username=<username>
 * Fetches a user's GitHub settings from Vercel Blob storage.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server.' },
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
    const blob = await head(blobPathname);
    
    const response = await fetch(blob.url);
    
    if (!response.ok) {
        throw new Error(`Failed to download GitHub settings from Blob storage. Status: ${response.status}`);
    }

    const settingsData = await response.json();
    return NextResponse.json({ settings: settingsData });

  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('404')) {
        return NextResponse.json({ settings: null, message: "No GitHub settings found for this user." }, { status: 200 });
    }
    console.error(`GitHub settings read error for user ${requestedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read GitHub settings: ${errorMessage}` }, { status: 500 });
  }
}
