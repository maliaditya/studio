
import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  // Bypass Blob check for demo user
  if (username.toLowerCase() === 'demo' && password === 'demo') {
    return NextResponse.json({ success: true, message: 'Demo login successful.' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server. Please link a Blob store.' },
      { status: 500 }
    );
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const blobPathname = `auth/${username.toLowerCase()}.json`;

  try {
    const { blobs } = await list({ prefix: blobPathname, limit: 1 });

    if (blobs.length === 0 || blobs[0]?.pathname !== blobPathname) {
      return NextResponse.json({ error: 'Username not found.' }, { status: 404 });
    }

    const blobInfo = blobs[0];
    const response = await fetch(blobInfo.url);
    
    if (!response.ok) {
        throw new Error(`Failed to download user data from Blob storage. Status: ${response.status}`);
    }
    
    const userData = await response.json();

    if (userData.password !== password) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    return NextResponse.json({ success: true, message: 'Login successful.' });

  } catch (error) {
    console.error(`Blob storage login error for user ${username}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read data from Blob storage: ${errorMessage}` }, { status: 500 });
  }
}
