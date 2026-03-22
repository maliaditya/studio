import { NextResponse } from 'next/server';

import { verifyAccessToken } from '@/lib/authTokens';
import { isAdminUsername } from '@/lib/adminUsers';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { isSupportDonationsDbConfigured, listSupportDonations } from '@/lib/supportDonationsServer';

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
      donors: [],
      totals: {
        totalDonations: 0,
        completedDonations: 0,
        pendingDonations: 0,
        uniqueDonors: 0,
        totalRevenueInr: 0,
      },
      storageConfigured: false,
    });
  }

  try {
    const donors = await listSupportDonations();
    const uniqueDonorKeys = new Set(
      donors
        .map((donor) => donor.username || donor.email || donor.providerPaymentId || donor.sessionId)
        .filter((value): value is string => Boolean(value))
    );

    const totals = donors.reduce(
      (accumulator, donor) => {
        accumulator.totalDonations += 1;
        if (donor.status === 'completed') {
          accumulator.completedDonations += 1;
          accumulator.totalRevenueInr += donor.amountInr;
        } else if (donor.status === 'started') {
          accumulator.pendingDonations += 1;
        }
        return accumulator;
      },
      {
        totalDonations: 0,
        completedDonations: 0,
        pendingDonations: 0,
        uniqueDonors: uniqueDonorKeys.size,
        totalRevenueInr: 0,
      }
    );

    return NextResponse.json({
      donors,
      totals,
      storageConfigured: true,
    });
  } catch (error) {
    console.error('GET /api/admin/donors error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load donors.' },
      { status: 500 }
    );
  }
}