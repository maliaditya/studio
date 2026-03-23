import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/lib/authTokens';
import { isAdminUsername } from '@/lib/adminUsers';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { isSupportDonationsDbConfigured, listSetupSupportPurchases } from '@/lib/supportDonationsServer';

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

  if (!isSupportDonationsDbConfigured()) {
    return NextResponse.json({
      purchases: [],
      totals: {
        totalPurchases: 0,
        uniqueBuyers: 0,
        totalRevenueInr: 0,
      },
      storageConfigured: false,
    });
  }

  try {
    const purchases = await listSetupSupportPurchases();
    const uniqueBuyerKeys = new Set(
      purchases
        .map((purchase) => purchase.username || purchase.email || purchase.providerPaymentId || purchase.sessionId)
        .filter((value): value is string => Boolean(value))
    );

    const totals = purchases.reduce(
      (accumulator, purchase) => {
        accumulator.totalPurchases += 1;
        accumulator.totalRevenueInr += purchase.amountInr;
        return accumulator;
      },
      {
        totalPurchases: 0,
        uniqueBuyers: uniqueBuyerKeys.size,
        totalRevenueInr: 0,
      }
    );

    return NextResponse.json({
      purchases,
      totals,
      storageConfigured: true,
    });
  } catch (error) {
    console.error('GET /api/admin/setup-support-purchases error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load setup/support purchases.' },
      { status: 500 }
    );
  }
}