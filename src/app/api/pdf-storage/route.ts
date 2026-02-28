import { head } from '@vercel/blob';
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getSessionUserFromRequest } from '@/lib/serverSession';
import { decryptSupabaseServiceKeyForUser } from '@/lib/serverSupabaseSecret';

export const dynamic = 'force-dynamic';

const normalizeUsername = (username: string) => username.trim().toLowerCase();
const settingsBlobPathForUser = (username: string) => `github-settings/${username}.json`;

async function readUserSyncSettings(username: string): Promise<{ supabaseUrl?: string; supabasePdfBucket?: string } | null> {
  if (!process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const blob = await head(settingsBlobPathForUser(username));
    const response = await fetch(blob.url);
    if (!response.ok) return null;
    const json = await response.json();
    return {
      supabaseUrl: json?.supabaseUrl,
      supabasePdfBucket: json?.supabasePdfBucket,
    };
  } catch {
    return null;
  }
}

function buildObjectPath(username: string, resourceId: string) {
  return `${username}/${resourceId}.pdf`;
}

async function getSupabaseAdmin(username: string, requestedUrl?: string | null, requestedServiceRoleKey?: string | null) {
  const settings = await readUserSyncSettings(username);
  const url = requestedUrl || settings?.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  if (!url) {
    const err = new Error('Supabase URL is not configured. Save Sync Settings first.');
    (err as any).status = 400;
    throw err;
  }

  const serviceRoleKey =
    requestedServiceRoleKey ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    (await decryptSupabaseServiceKeyForUser(username));
  if (!serviceRoleKey) {
    const err = new Error('Supabase service role key is not configured. Set SUPABASE_SERVICE_ROLE_KEY or save a per-user service key.');
    (err as any).status = 400;
    throw err;
  }

  return {
    client: createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } }),
    bucket: settings?.supabasePdfBucket || process.env.SUPABASE_PDF_BUCKET || 'pdfs',
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const usernameRaw = searchParams.get('username');
  const resourceId = searchParams.get('resourceId');
  const bucketOverride = searchParams.get('bucket');
  const supabaseUrl = searchParams.get('supabaseUrl');
  const supabaseServiceRoleKey = searchParams.get('supabaseServiceRoleKey');

  if (!usernameRaw || !resourceId) {
    return NextResponse.json({ error: 'username and resourceId are required.' }, { status: 400 });
  }
  const username = normalizeUsername(usernameRaw);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  if (sessionUser !== username) return NextResponse.json({ error: 'Forbidden. You can only access your own files.' }, { status: 403 });

  try {
    const { client, bucket } = await getSupabaseAdmin(username, supabaseUrl, supabaseServiceRoleKey);
    const { data, error } = await client.storage.from(bucketOverride || bucket).download(buildObjectPath(username, resourceId));
    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'File not found.' }, { status: 404 });
    }
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status });
  }
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  const isMultipart = contentType.includes('multipart/form-data');
  const body = isMultipart ? await request.formData() : await request.json();

  const action = String((body as any).get?.('action') || (body as any).action || '').trim();
  const usernameRaw = String((body as any).get?.('username') || (body as any).username || '').trim();
  const supabaseUrl = String((body as any).get?.('supabaseUrl') || (body as any).supabaseUrl || '').trim() || null;
  const bucketOverride = String((body as any).get?.('bucket') || (body as any).bucket || '').trim() || null;
  const supabaseServiceRoleKey =
    String((body as any).get?.('supabaseServiceRoleKey') || (body as any).supabaseServiceRoleKey || '').trim() || null;

  if (!usernameRaw) return NextResponse.json({ error: 'username is required.' }, { status: 400 });
  const username = normalizeUsername(usernameRaw);
  const sessionUser = getSessionUserFromRequest(request);
  if (!sessionUser) return NextResponse.json({ error: 'Unauthorized. Please sign in again.' }, { status: 401 });
  if (sessionUser !== username) return NextResponse.json({ error: 'Forbidden. You can only update your own files.' }, { status: 403 });

  try {
    const { client, bucket } = await getSupabaseAdmin(username, supabaseUrl, supabaseServiceRoleKey);
    const finalBucket = bucketOverride || bucket;

    if (action === 'init') {
      const { data: buckets, error: listErr } = await client.storage.listBuckets();
      if (listErr) throw new Error(listErr.message);
      const exists = (buckets || []).some((b) => b.name === finalBucket);
      if (!exists) {
        const { error: createErr } = await client.storage.createBucket(finalBucket, {
          public: false,
          allowedMimeTypes: ['application/pdf'],
        });
        if (createErr && !String(createErr.message || '').toLowerCase().includes('already')) {
          throw new Error(createErr.message);
        }
      }
      return NextResponse.json({ success: true, bucket: finalBucket });
    }

    if (action === 'signed-upload-url') {
      const resourceId = String((body as any).get?.('resourceId') || (body as any).resourceId || '').trim();
      if (!resourceId) {
        return NextResponse.json({ error: 'resourceId is required.' }, { status: 400 });
      }

      const objectPath = buildObjectPath(username, resourceId);
      const { data, error } = await client.storage
        .from(finalBucket)
        .createSignedUploadUrl(objectPath, { upsert: true });
      if (error || !data?.token) {
        throw new Error(error?.message || 'Failed to create signed upload URL.');
      }

      return NextResponse.json({
        success: true,
        bucket: finalBucket,
        path: objectPath,
        token: data.token,
      });
    }

    if (action === 'upload') {
      const resourceId = String((body as any).get?.('resourceId') || (body as any).resourceId || '').trim();
      const file = (body as any).get?.('file') as File | null;
      if (!resourceId || !file) {
        return NextResponse.json({ error: 'resourceId and file are required.' }, { status: 400 });
      }
      const { error } = await client.storage
        .from(finalBucket)
        .upload(buildObjectPath(username, resourceId), file, {
          upsert: true,
          contentType: file.type || 'application/pdf',
          cacheControl: '3600',
        });
      if (error) throw new Error(error.message);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Unsupported action.' }, { status: 400 });
  } catch (error) {
    const status = (error as any)?.status || 500;
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Unknown error' }, { status });
  }
}
