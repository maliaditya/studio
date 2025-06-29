
import { list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BLOB_PATHNAME = 'lifeos-releases.json';

export async function GET() {
    // This is a public endpoint, but the `list` function requires a token.
    // We assume it's configured for other parts of the app.
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        // Return empty if blob isn't configured, so the app doesn't break.
        return NextResponse.json({ releases: [] });
    }

    try {
        const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
        
        if (blobs.length === 0 || blobs[0]?.pathname !== BLOB_PATHNAME) {
            return NextResponse.json({ releases: [] });
        }

        const response = await fetch(blobs[0].url);
        if (!response.ok) {
            throw new Error(`Failed to download release plan. Status: ${response.status}`);
        }
        
        const textData = await response.text();
        if (!textData) {
            return NextResponse.json({ releases: [] });
        }
        
        const data = JSON.parse(textData);
        // Assuming the file format is { releases: Release[] }
        return NextResponse.json({ releases: data.releases || [] });

    } catch (error) {
        console.error("GET /api/lifeos-releases error:", error);
        return NextResponse.json({ error: "Failed to fetch release plan" }, { status: 500 });
    }
}
