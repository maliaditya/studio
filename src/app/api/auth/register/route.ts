
import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';
import { issueAuthTokens } from '@/lib/authTokens';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      {
        error: 'Cloud authentication is not configured for this build. Set BLOB_READ_WRITE_TOKEN or use a deployed auth service before first-time registration.',
        code: 'CLOUD_AUTH_UNAVAILABLE',
      },
      { status: 503 }
    );
  }

  if (!username || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  const blobPathname = `auth/${normalizedUsername}.json`;

  try {
    // Check if user already exists
    const { blobs } = await list({ prefix: blobPathname, limit: 1 });
    if (blobs.length > 0 && blobs[0]?.pathname === blobPathname) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 }); // 409 Conflict
    }

    // Create user data
    const userData = {
      ...hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    const blob = await put(blobPathname, JSON.stringify(userData), {
      access: 'public', // Hobby plan requirement
      contentType: 'application/json',
      addRandomSuffix: false,
    });

    const tokens = await issueAuthTokens(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful.',
      blob,
      user: { username: normalizedUsername },
      ...tokens,
    });
    attachSessionCookie(response, normalizedUsername);
    return response;
  } catch (error) {
    console.error('Error in POST /api/auth/register:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
