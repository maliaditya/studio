
import { put, head } from '@vercel/blob';
import { NextResponse } from 'next/server';

/**
 * POST /api/edge-config
 * Uploads a user's entire data object to Vercel Blob storage.
 * The user's data is stored as a single JSON file.
 * The filename is the same as this route for simplicity, but it's now a blob sync endpoint.
 */
export async function POST(request: Request) {
  const { username, data } = await request.json();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server. Please link a Blob store.' },
      { status: 500 }
    );
  }

  if (!username || data === undefined) {
    return NextResponse.json({ error: 'Username and data payload are required.' }, { status: 400 });
  }

  const blobPathname = `${username}-data.json`;

  try {
    const blob = await put(blobPathname, JSON.stringify(data, null, 2), {
      access: 'public', // 'public' is required on Vercel's Hobby plan.
      contentType: 'application/json',
    });

    return NextResponse.json({ success: true, message: 'Data synced to cloud.', blob });
  } catch (error) {
    console.error('Error in POST /api/edge-config:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/edge-config?username=<username>
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

  const blobPathname = `${username}-data.json`;

  try {
    // To download a blob, we must fetch its URL from the server-side.
    // First, check if the blob exists to avoid 404 errors.
    const blobInfo = await head(blobPathname);
    
    // If head returns successfully, we can fetch the blob's content via its URL.
    const response = await fetch(blobInfo.url);
    
    if (!response.ok) {
        throw new Error(`Failed to download data from Blob storage. Status: ${response.status}`);
    }

    const userData = await response.json();
    return NextResponse.json({ data: userData });

  } catch (error) {
     // The `head` method throws an error for a 404, which we can catch.
     if (error instanceof Error && error.message.includes('404')) {
        return NextResponse.json({ data: null, message: "No cloud data found for this user." }, { status: 200 });
    }
    console.error(`Blob storage read error for user ${username}:`, error);
    return NextResponse.json({ error: 'Failed to read data from Blob storage.' }, { status: 500 });
  }
}
