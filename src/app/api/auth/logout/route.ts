import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/serverSession';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out.' });
  clearSessionCookie(response);
  return response;
}
