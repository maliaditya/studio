import { NextResponse } from 'next/server';

import { readDesktopUserStatus, isDesktopUserStatusActive } from '@/lib/desktopStatusServer';
import { readAuthUserByUsername, updateAuthUser } from '@/lib/authUsersServer';
import { verifyAccessToken } from '@/lib/authTokens';
import { verifyPassword, hashPassword } from '@/lib/password';
import { getSessionUserFromRequest } from '@/lib/serverSession';

export const dynamic = 'force-dynamic';

const normalizeUsername = (value: string) => String(value || '').trim().toLowerCase();

const getAuthenticatedUsername = (request: Request) => {
  const sessionUser = getSessionUserFromRequest(request);
  if (sessionUser) return sessionUser;

  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  return tokenPayload?.sub?.trim().toLowerCase() || null;
};

const toPurchaseStatus = (record: Awaited<ReturnType<typeof readDesktopUserStatus>>) => {
  if (!record?.paymentCompleted) {
    return {
      status: 'not-purchased' as const,
      paymentCompleted: false,
      purchaseDate: null,
      expiresAt: null,
      paymentProvider: null,
    };
  }

  return {
    status: isDesktopUserStatusActive(record) ? ('active' as const) : ('expired' as const),
    paymentCompleted: record.paymentCompleted,
    purchaseDate: record.purchaseDate,
    expiresAt: record.expiresAt,
    paymentProvider: record.paymentProvider,
  };
};

export async function GET(request: Request) {
  const sessionUser = getAuthenticatedUsername(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }

  try {
    const user = await readAuthUserByUsername(sessionUser);
    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const desktopStatus = await readDesktopUserStatus(sessionUser);

    return NextResponse.json({
      profile: {
        username: user.username,
        email: user.email,
      },
      purchaseStatus: toPurchaseStatus(desktopStatus),
    });
  } catch (error) {
    console.error('GET /api/account/profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load profile.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const sessionUser = getAuthenticatedUsername(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }

  try {
    const payload = (await request.json()) as {
      username?: string;
      email?: string;
      currentPassword?: string;
      newPassword?: string;
    };

    const requestedUsername = normalizeUsername(payload.username || sessionUser);
    if (requestedUsername !== sessionUser) {
      return NextResponse.json(
        { error: 'Username changes are not supported yet because this app stores synced user data under the username key.' },
        { status: 400 }
      );
    }

    const currentPassword = String(payload.currentPassword || '');
    if (!currentPassword) {
      return NextResponse.json({ error: 'Current password is required to update your profile.' }, { status: 400 });
    }

    const user = await readAuthUserByUsername(sessionUser);
    if (!user) {
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }

    const passwordValid = verifyPassword(currentPassword, {
      passwordHash: user.passwordHash,
      passwordSalt: user.passwordSalt,
      passwordAlgo: user.passwordAlgo,
    });

    if (!passwordValid) {
      return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
    }

    const nextEmail = String(payload.email || '').trim().toLowerCase();
    const nextPassword = String(payload.newPassword || '');
    if (!nextEmail && !nextPassword) {
      return NextResponse.json({ error: 'Nothing to update.' }, { status: 400 });
    }

    const updated = await updateAuthUser({
      username: sessionUser,
      email: nextEmail || user.email,
      password: nextPassword ? hashPassword(nextPassword) : null,
    });

    const desktopStatus = await readDesktopUserStatus(sessionUser);

    return NextResponse.json({
      success: true,
      message: 'Profile updated.',
      profile: {
        username: updated.username,
        email: updated.email,
      },
      purchaseStatus: toPurchaseStatus(desktopStatus),
    });
  } catch (error) {
    console.error('PATCH /api/account/profile error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update profile.' },
      { status: 500 }
    );
  }
}