import { NextResponse } from 'next/server';
import { readDesktopAccessState, resolveDesktopAccessUser } from '@/lib/desktopAccessServer';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const sessionUser = resolveDesktopAccessUser(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }

  try {
    const access = await readDesktopAccessState(request, sessionUser);
    return NextResponse.json({ access });
  } catch (error) {
    console.error('GET /api/desktop-access error:', error);
    return NextResponse.json({ error: 'Failed to load desktop access state.' }, { status: 500 });
  }
}
