import { NextResponse } from 'next/server';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';

type CloudEnvelope = {
  version: 2;
  username: string;
  revision: number;
  updatedAt: string;
  data: unknown;
};

const normalizeUsername = (username: string) => username.trim().toLowerCase();

const normalizeStoredPayload = (payload: unknown): { data: unknown; revision: number } => {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    'revision' in payload &&
    typeof (payload as any).revision === 'number'
  ) {
    const envelope = payload as Partial<CloudEnvelope>;
    return {
      data: envelope.data ?? null,
      revision: Math.max(0, Math.floor(envelope.revision || 0)),
    };
  }

  // Backward compatibility for legacy backups (raw payload without envelope).
  return { data: payload, revision: 0 };
};

const parseBaseRevision = (value: unknown) => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) return null;
  return Math.floor(parsed);
};

const getCurrentCloudPayload = async (blobPathname: string): Promise<{ data: unknown | null; revision: number }> => {
  try {
    const parsed = await readJsonFromStorage<any>(blobPathname);
    if (!parsed) return { data: null, revision: 0 };
    return normalizeStoredPayload(parsed);
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('404')) {
      return { data: null, revision: 0 };
    }
    throw error;
  }
};

/**
 * POST /api/blob-sync
 * Uploads a user's entire data object to Supabase Storage with optimistic revision guards.
 */
export async function POST(request: Request) {
  const { username, data, demo_override_token, baseRevision } = await request.json();

  if (!isSupabaseStorageConfigured()) {
    const requestedUsername = normalizeUsername(String(username || ''));
    if (!requestedUsername || data === undefined) {
      return NextResponse.json({ error: 'Username and data payload are required.' }, { status: 400 });
    }
    const responseRevision = parseBaseRevision(baseRevision) ?? 0;
    return NextResponse.json({
      success: true,
      message: 'Cloud sync skipped (local mode).',
      localMode: true,
      revision: responseRevision,
    });
  }

  if (!username || data === undefined) {
    return NextResponse.json({ error: 'Username and data payload are required.' }, { status: 400 });
  }

  const requestedUsername = normalizeUsername(String(username));
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }
  if (sessionUser !== requestedUsername) {
    return NextResponse.json({ error: 'Forbidden. You can only access your own data.' }, { status: 403 });
  }

  // Special handling for the 'demo' user.
  if (requestedUsername === 'demo') {
    // If the DEMO_ACCOUNT_UPDATE_TOKEN is set on the server, it MUST be validated.
    if (process.env.DEMO_ACCOUNT_UPDATE_TOKEN) {
      if (!demo_override_token || demo_override_token !== process.env.DEMO_ACCOUNT_UPDATE_TOKEN) {
        return NextResponse.json(
          { error: 'The override token is incorrect. A valid token is required to update the demo account.' },
          { status: 403 }
        );
      }
    } else {
      // If the token is not set on the server, log a warning but allow the update to proceed for ease of development.
      console.warn('WARNING: DEMO_ACCOUNT_UPDATE_TOKEN is not set. The demo account can be updated without a token.');
    }
  }

  const blobPathname = `${requestedUsername}-data.json`;

  try {
    const current = await getCurrentCloudPayload(blobPathname);
    const requestedBaseRevision = parseBaseRevision(baseRevision);

    if (requestedBaseRevision !== null && requestedBaseRevision !== current.revision) {
      return NextResponse.json(
        {
          error: 'Revision conflict. Cloud has newer data. Pull latest before pushing.',
          serverRevision: current.revision,
        },
        { status: 409 }
      );
    }

    const envelope: CloudEnvelope = {
      version: 2,
      username: requestedUsername,
      revision: current.revision + 1,
      updatedAt: new Date().toISOString(),
      data,
    };

    await writeJsonToStorage(blobPathname, envelope);

    return NextResponse.json({
      success: true,
      message: 'Data synced to cloud.',
      revision: envelope.revision,
    });
  } catch (error) {
    console.error('Error in POST /api/blob-sync:', error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}

/**
 * GET /api/blob-sync?username=<username>
 * Fetches a user's data file from Supabase Storage.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const username = searchParams.get('username');

  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({
      data: null,
      revision: 0,
      message: 'Cloud sync unavailable in local mode.',
      localMode: true,
    });
  }

  if (!username) {
    return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
  }

  const requestedUsername = normalizeUsername(username);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) {
    return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  }
  if (sessionUser !== requestedUsername) {
    return NextResponse.json({ error: 'Forbidden. You can only access your own data.' }, { status: 403 });
  }

  const blobPathname = `${requestedUsername}-data.json`;

  try {
    const current = await getCurrentCloudPayload(blobPathname);
    if (!current.data) {
      return NextResponse.json({ data: null, revision: current.revision, message: 'Cloud data is empty.' });
    }

    return NextResponse.json({ data: current.data, revision: current.revision });
  } catch (error: any) {
    if (error?.status === 404 || error?.message?.includes('404')) {
      return NextResponse.json({ data: null, revision: 0, message: 'No cloud data found for this user.' }, { status: 200 });
    }
    console.error(`Supabase storage read error for user ${requestedUsername}:`, error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
    return NextResponse.json({ error: `Failed to read data from storage: ${errorMessage}` }, { status: 500 });
  }
}
