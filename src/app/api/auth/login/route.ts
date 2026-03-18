
import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';
import { issueAuthTokens } from '@/lib/authTokens';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const normalizedUsername = String(username || '').trim().toLowerCase();

  // Bypass Blob check for demo user
  if (normalizedUsername === 'demo' && password === 'demo') {
    const responsePayload: Record<string, unknown> = {
      success: true,
      message: 'Demo login successful.',
      user: { username: normalizedUsername },
    };
    if (isSupabaseStorageConfigured()) {
      try {
        const tokens = await issueAuthTokens(normalizedUsername);
        Object.assign(responsePayload, tokens);
      } catch (error) {
        console.error("Demo login token issuance failed; continuing without cloud tokens:", error);
      }
    }
    const response = NextResponse.json(responsePayload);
    attachSessionCookie(response, normalizedUsername);
    return response;
  }

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json(
      {
        error: 'Cloud authentication is not configured for this build. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before first login on this device.',
        code: 'CLOUD_AUTH_UNAVAILABLE',
      },
      { status: 503 }
    );
  }

  if (!normalizedUsername || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const blobPathname = `auth/${normalizedUsername}.json`;

  try {
    const userData = await readJsonFromStorage<any>(blobPathname);
    if (!userData) {
      return NextResponse.json({ error: 'Username not found.' }, { status: 404 });
    }

    const hasHashedPassword =
      typeof userData?.passwordHash === 'string' &&
      typeof userData?.passwordSalt === 'string' &&
      typeof userData?.passwordAlgo === 'string';

    let isPasswordValid = false;
    if (hasHashedPassword) {
      isPasswordValid = verifyPassword(password, {
        passwordHash: userData.passwordHash,
        passwordSalt: userData.passwordSalt,
        passwordAlgo: userData.passwordAlgo,
      });
    } else if (typeof userData?.password === 'string') {
      // Backward compatibility for legacy plaintext credentials.
      isPasswordValid = userData.password === password;
      if (isPasswordValid) {
        const migrated = {
          ...userData,
          ...hashPassword(password),
          migratedAt: new Date().toISOString(),
        };
        delete migrated.password;
        await writeJsonToStorage(blobPathname, migrated);
      }
    }

    if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const tokens = await issueAuthTokens(normalizedUsername);
    const responsePayload = NextResponse.json({
      success: true,
      message: 'Login successful.',
      user: { username: normalizedUsername },
      ...tokens,
    });
    attachSessionCookie(responsePayload, normalizedUsername);
    return responsePayload;

  } catch (error) {
    console.error(`Supabase storage login error for user ${normalizedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Cloud authentication request failed: ${errorMessage}` }, { status: 500 });
  }
}
