
import { NextResponse } from 'next/server';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';
const BLOB_PATHNAME = 'support-count.json';

// GET handler to fetch the current count
export async function GET() {
    // Silently return 0 if storage is not configured, so the app doesn't break.
    if (!isSupabaseStorageConfigured()) {
        return NextResponse.json({ count: 0 });
    }

    try {
        const data = await readJsonFromStorage<{ count?: number }>(BLOB_PATHNAME);
        return NextResponse.json({ count: data?.count || 0 });

    } catch (error) {
        console.error("GET /api/support-count error:", error);
        return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
    }
}

// POST handler to increment the count
export async function POST() {
    if (!isSupabaseStorageConfigured()) {
        return NextResponse.json({ error: 'Supabase storage is not configured on the server.' }, { status: 500 });
    }
    
    let currentCount = 0;
    try {
        const data = await readJsonFromStorage<{ count?: number }>(BLOB_PATHNAME);
        currentCount = data?.count || 0;
    } catch (error) {
        // Log the error but proceed, assuming count is 0 if reading fails.
        console.error("POST /api/support-count (read) error:", error);
    }

    const newCount = currentCount + 1;

    try {
        await writeJsonToStorage(BLOB_PATHNAME, { count: newCount });
        return NextResponse.json({ count: newCount });
    } catch (error) {
        console.error("POST /api/support-count (write) error:", error);
        return NextResponse.json({ error: "Failed to update count" }, { status: 500 });
    }
}
