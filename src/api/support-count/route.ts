
import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BLOB_PATHNAME = 'support-count.json';

// GET handler to fetch the current count
export async function GET() {
    // Silently return 0 if blob storage is not configured, so the app doesn't break.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ count: 0 });
    }

    try {
        const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
        // If the file doesn't exist, the count is 0.
        if (blobs.length === 0 || blobs[0]?.pathname !== BLOB_PATHNAME) {
            return NextResponse.json({ count: 0 });
        }

        const response = await fetch(blobs[0].url);
        if (!response.ok) {
            throw new Error(`Failed to download count data. Status: ${response.status}`);
        }
        const textData = await response.text();
        if (!textData) {
            return NextResponse.json({ count: 0 });
        }
        const data = JSON.parse(textData);
        return NextResponse.json({ count: data.count || 0 });

    } catch (error) {
        console.error("GET /api/support-count error:", error);
        return NextResponse.json({ error: "Failed to fetch count" }, { status: 500 });
    }
}

// POST handler to increment the count
export async function POST() {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Vercel Blob is not configured on the server.' }, { status: 500 });
    }
    
    let currentCount = 0;
    try {
        const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
        if (blobs.length > 0 && blobs[0]?.pathname === BLOB_PATHNAME) {
            const response = await fetch(blobs[0].url);
            if (response.ok) {
                const textData = await response.text();
                // Handle case where blob is empty but exists
                if (textData) {
                  const data = JSON.parse(textData);
                  currentCount = data.count || 0;
                }
            }
        }
    } catch (error) {
        // Log the error but proceed, assuming count is 0 if reading fails.
        console.error("POST /api/support-count (read) error:", error);
    }

    const newCount = currentCount + 1;

    try {
        await put(BLOB_PATHNAME, JSON.stringify({ count: newCount }), {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
        });
        return NextResponse.json({ count: newCount });
    } catch (error) {
        console.error("POST /api/support-count (write) error:", error);
        return NextResponse.json({ error: "Failed to update count" }, { status: 500 });
    }
}
