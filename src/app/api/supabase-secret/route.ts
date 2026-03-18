import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { hasSupabaseServiceKeyForUser, saveSupabaseServiceKeyForUser } from '@/lib/serverSupabaseSecret';
import { isSupabaseStorageConfigured } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';

const normalizeUsername = (username: string) => username.trim().toLowerCase();

export async function POST(request: Request) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({ error: 'Supabase storage is not configured on the server.' }, { status: 500 });
  }

  const { username, supabaseServiceRoleKey } = await request.json();
  if (!username || !supabaseServiceRoleKey) {
    return NextResponse.json({ error: 'Username and service role key are required.' }, { status: 400 });
  }

  const requestedUsername = normalizeUsername(username);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  if (sessionUser !== requestedUsername) return NextResponse.json({ error: 'Forbidden. You can only update your own settings.' }, { status: 403 });

  try {
    await saveSupabaseServiceKeyForUser(requestedUsername, String(supabaseServiceRoleKey));
    return NextResponse.json({ success: true, configured: true });
  } catch (error) {
    console.error('Failed to save Supabase service key:', error);
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}

export async function GET(request: Request) {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({ error: 'Supabase storage is not configured on the server.' }, { status: 500 });
  }
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');
  if (!username) return NextResponse.json({ error: 'Username is required.' }, { status: 400 });

  const requestedUsername = normalizeUsername(username);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  if (sessionUser !== requestedUsername) return NextResponse.json({ error: 'Forbidden. You can only access your own settings.' }, { status: 403 });

  try {
    const configured = await hasSupabaseServiceKeyForUser(requestedUsername);
    return NextResponse.json({ configured });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status: 500 });
  }
}
