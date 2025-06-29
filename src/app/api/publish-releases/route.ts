
import { put, list } from '@vercel/blob';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
const BLOB_PATHNAME = 'lifeos-releases.json';
const ADMIN_USERNAME = "Lonewolf";

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
        console.error("GET /api/publish-releases error:", error);
        return NextResponse.json({ error: "Failed to fetch release plan" }, { status: 500 });
    }
}

// POST handler to update the release plan
export async function POST(request: Request) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Vercel Blob is not configured on the server.' }, { status: 500 });
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

        const dataToStore = JSON.stringify({ releases }, null, 2);

        await put(BLOB_PATHNAME, dataToStore, {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
        });

        return NextResponse.json({ success: true, message: 'Life OS release plan updated successfully.' });

    } catch (error) {
        console.error("POST /api/publish-releases error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to update release plan: ${errorMessage}` }, { status: 500 });
    }
}
