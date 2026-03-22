import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/lib/authTokens';
import { updateAuthUserPrivilege } from '@/lib/authUsersServer';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { isAdminUsername } from '@/lib/adminUsers';
import { isDesktopStatusDbConfigured, listDesktopUserPurchaseOverviews } from '@/lib/desktopStatusServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = getSessionUserFromRequest(request);
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  const effectiveUser = sessionUser || tokenUser;

  if (!isAdminUsername(effectiveUser)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  if (!isDesktopStatusDbConfigured()) {
    return NextResponse.json({
      users: [],
      totals: {
        totalUsers: 0,
        privilegedUsers: 0,
        activePurchases: 0,
        expiredPurchases: 0,
        noPurchase: 0,
      },
      storageConfigured: false,
    });
  }

  try {
    const users = await listDesktopUserPurchaseOverviews();
    const totals = users.reduce(
      (accumulator, user) => {
        accumulator.totalUsers += 1;
        if (user.isPriviledge) accumulator.privilegedUsers += 1;
        else if (user.desktopStatus === 'active') accumulator.activePurchases += 1;
        else if (user.desktopStatus === 'expired') accumulator.expiredPurchases += 1;
        else accumulator.noPurchase += 1;
        return accumulator;
      },
      {
        totalUsers: 0,
        privilegedUsers: 0,
        activePurchases: 0,
        expiredPurchases: 0,
        noPurchase: 0,
      }
    );

    return NextResponse.json({
      users,
      totals,
      storageConfigured: true,
    });
  } catch (error) {
    console.error('GET /api/admin/desktop-users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load desktop purchase users.' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: Request) {
  const sessionUser = getSessionUserFromRequest(request);
  const authHeader = request.headers.get('authorization') || '';
  const bearerToken = authHeader.toLowerCase().startsWith('bearer ') ? authHeader.slice(7).trim() : '';
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  const effectiveUser = sessionUser || tokenUser;

  if (!isAdminUsername(effectiveUser)) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 403 });
  }

  try {
    const payload = (await request.json()) as { username?: string; isPriviledge?: boolean };
    const username = String(payload?.username || '').trim().toLowerCase();
    if (!username) {
      return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    const updated = await updateAuthUserPrivilege({
      username,
      isPriviledge: Boolean(payload?.isPriviledge),
    });

    return NextResponse.json({
      success: true,
      user: {
        username: updated.username,
        isPriviledge: updated.isPriviledge,
      },
    });
  } catch (error) {
    console.error('PATCH /api/admin/desktop-users error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update user privilege.' },
      { status: 500 }
    );
  }
}