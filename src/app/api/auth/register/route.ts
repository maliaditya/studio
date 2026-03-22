
import { NextResponse } from 'next/server';
import { hashPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';
import { issueAuthTokens } from '@/lib/authTokens';
import { createAuthUser, isAuthDbConfigured, readAuthUserByUsername } from '@/lib/authUsersServer';

export const dynamic = 'force-dynamic';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  const { username, password, email } = await request.json();

  if (!isAuthDbConfigured()) {
    return NextResponse.json(
      {
        error: 'Cloud authentication database is not configured for this build. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY and run docs/auth-users.sql before first-time registration.',
        code: 'CLOUD_AUTH_UNAVAILABLE',
      },
      { status: 503 }
    );
  }

  if (!username || !password || !email) {
    return NextResponse.json({ error: 'Username, email, and password are required.' }, { status: 400 });
  }

  const normalizedUsername = String(username).trim().toLowerCase();
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 });
  }

  try {
    const existing = await readAuthUserByUsername(normalizedUsername);
    if (existing) {
      return NextResponse.json({ error: 'Username already exists.' }, { status: 409 }); // 409 Conflict
    }

    await createAuthUser({
      username: normalizedUsername,
      email: normalizedEmail,
      password: hashPassword(password),
      createdAt: new Date().toISOString(),
    });

    const tokens = await issueAuthTokens(normalizedUsername);
    const response = NextResponse.json({
      success: true,
      message: 'Registration successful.',
      user: { username: normalizedUsername, email: normalizedEmail },
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
          error: 'Cloud registration is temporarily unavailable because the Supabase backend is suspended.',
          code: 'CLOUD_AUTH_SUSPENDED',
        },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
