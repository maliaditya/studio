
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';
import { issueAuthTokens } from '@/lib/authTokens';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { username, password } = await request.json();

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error: 'Cloud authentication is not configured for this build. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before first-time registration.',
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
    const existing = await readJsonFromStorage(blobPathname);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 }); // 409 Conflict
    }

    // Create user data
    const userData = {
      ...hashPassword(password),
      createdAt: new Date().toISOString(),
    };
    await writeJsonToStorage(blobPathname, userData);

    const tokens = await issueAuthTokens(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful.',
      user: { username: normalizedUsername },
      ...tokens,
    });
    attachSessionCookie(response, normalizedUsername);
    return response;
  } catch (error) {
    console.error('Error in POST /api/auth/register:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    if (typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('store has been suspended')) {
      return NextResponse.json(
        {
          error: 'Cloud registration is temporarily unavailable because the storage backend is suspended.',
          code: 'CLOUD_AUTH_SUSPENDED',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
