
import { put, head, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/blob-sync
 * Uploads a user's entire data object to Vercel Blob storage.
 * The user's data is stored as a single JSON file.
 */
export async function POST(request: Request) {
  const { username, data, demo_override_token } = await request.json();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server. Please link a Blob store.' },
      { status: 500 }
    );
  }

  // Special handling for the 'demo' user.
  if (username === 'demo') {
    // If the DEMO_ACCOUNT_UPDATE_TOKEN is set on the server, it MUST be validated.
    if (process.env.DEMO_ACCOUNT_UPDATE_TOKEN) {
      if (!demo_override_token || demo_override_token !== process.env.DEMO_ACCOUNT_UPDATE_TOKEN) {
        return NextResponse.json(
          { error: 'The override token is incorrect. A valid token is required to update the demo account.' },
          { status: 403 } // 403 Forbidden
        );
      }
    } else {
      // If the token is not set on the server, log a warning but allow the update to proceed for ease of development.
      console.warn("WARNING: DEMO_ACCOUNT_UPDATE_TOKEN is not set. The demo account can be updated without a token.");
    }
    // If the token is valid or not required, the function will proceed.
  }

  if (!username || data === undefined) {
    return NextResponse.json({ error: 'Username and data payload are required.' }, { status: 400 });
  }

  const blobPathname = `${username.toLowerCase()}-data.json`;

  try {
    const blob = await put(blobPathname, JSON.stringify(data, null, 2), {
      access: 'public', // 'public' is required on Vercel's Hobby plan.
      contentType: 'application/json',
      addRandomSuffix: false, // This ensures the filename is predictable.
    });

    return NextResponse.json({ success: true, message: 'Data synced to cloud.', blob });
  } catch (error) {
    console.error('Error in POST /api/blob-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/blob-sync?username=<username>
 * Fetches a user's data file from Vercel Blob storage.
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

  const blobPathname = `${username.toLowerCase()}-data.json`;

  try {
    const { blobs } = await list({ prefix: blobPathname, limit: 1 });

    const userBlob = blobs.find(blob => blob.pathname === blobPathname);

    if (!userBlob) {
      return NextResponse.json({ data: null, message: "No cloud data found for this user. This is expected for a first-time sync." }, { status: 200 });
    }

    const response = await fetch(userBlob.url);
    
    if (!response.ok) {
        throw new Error(`Failed to download data from Blob storage. Status: ${response.status} - ${response.statusText}`);
    }

    const textData = await response.text();
    
    if (!textData) {
        return NextResponse.json({ data: null, message: "Cloud data is empty." });
    }

    const userData = JSON.parse(textData);
    return NextResponse.json({ data: userData });

  } catch (error: any) {
    console.error(`Blob storage read error for user ${username}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read data from Blob storage: ${errorMessage}` }, { status: 500 });
  }
}
