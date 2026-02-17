
import { list, put } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { hashPassword, verifyPassword } from '@/lib/password';
import { attachSessionCookie } from '@/lib/serverSession';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const { username, password } = await request.json();
  const normalizedUsername = String(username || '').trim().toLowerCase();

  // Bypass Blob check for demo user
  if (normalizedUsername === 'demo' && password === 'demo') {
    const response = NextResponse.json({ success: true, message: 'Demo login successful.' });
    attachSessionCookie(response, normalizedUsername);
    return response;
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json(
      { error: 'Vercel Blob Storage is not configured on the server. Please link a Blob store.' },
      { status: 500 }
    );
  }

  if (!normalizedUsername || !password) {
    return NextResponse.json({ error: 'Username and password are required.' }, { status: 400 });
  }

  const blobPathname = `auth/${normalizedUsername}.json`;

  try {
    const { blobs } = await list({ prefix: blobPathname, limit: 1 });

    const userBlob = blobs.find(blob => blob.pathname === blobPathname);

    if (!userBlob) {
      return NextResponse.json({ error: 'Username not found.' }, { status: 404 });
    }

    const response = await fetch(userBlob.url);
    
    if (!response.ok) {
        throw new Error(`Failed to download user data from Blob storage. Status: ${response.status}`);
    }
    
    const userData = await response.json();

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
        await put(blobPathname, JSON.stringify(migrated), {
          access: 'public',
          contentType: 'application/json',
          addRandomSuffix: false,
        });
      }
    }

    if (!isPasswordValid) {
        return NextResponse.json({ error: 'Incorrect password.' }, { status: 401 });
    }

    const responsePayload = NextResponse.json({ success: true, message: 'Login successful.' });
    attachSessionCookie(responsePayload, normalizedUsername);
    return responsePayload;

  } catch (error) {
    console.error(`Blob storage login error for user ${normalizedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read data from Blob storage: ${errorMessage}` }, { status: 500 });
  }
}
