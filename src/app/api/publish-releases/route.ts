
import { NextResponse } from 'next/server';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';
const BLOB_PATHNAME = 'dock-releases.json';
const ADMIN_USERNAME = "Lonewolf";

export async function GET() {
    // This is a public endpoint, but the `list` function requires a token.
    // We assume it's configured for other parts of the app.
    if (!isSupabaseStorageConfigured()) {
        // Return empty if blob isn't configured, so the app doesn't break.
        return NextResponse.json({ releases: [] });
    }

    try {
        const data = await readJsonFromStorage<{ releases?: unknown[] }>(BLOB_PATHNAME);
        if (!data) return NextResponse.json({ releases: [] });
        // Assuming the file format is { releases: Release[] }
        return NextResponse.json({ releases: data.releases || [] });

    } catch (error) {
        console.error("GET /api/publish-releases error:", error);
        return NextResponse.json({ error: "Failed to fetch release plan" }, { status: 500 });
    }
}

// POST handler to update the release plan
export async function POST(request: Request) {
    if (!isSupabaseStorageConfigured()) {
        return NextResponse.json({ error: 'Supabase storage is not configured on the server.' }, { status: 500 });
    }

    try {
        const { username, releases } = await request.json();

        // Security check: Only allow the specified admin user to update this file.
        if (username !== ADMIN_USERNAME) {
            return NextResponse.json({ error: 'Unauthorized: You do not have permission to perform this action.' }, { status: 403 });
        }

        if (!Array.isArray(releases)) {
            return NextResponse.json({ error: 'Invalid payload: "releases" must be an array.' }, { status: 400 });
        }

        await writeJsonToStorage(BLOB_PATHNAME, { releases });

        return NextResponse.json({ success: true, message: 'Dock release plan updated successfully.' });

    } catch (error) {
        console.error("POST /api/publish-releases error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to update release plan: ${errorMessage}` }, { status: 500 });
    }
}
