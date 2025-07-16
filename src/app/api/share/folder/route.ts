
import { put, head } from '@vercel/blob';
import { NextResponse } from 'next/server';
import type { Resource, ResourceFolder } from '@/types/workout';

export const dynamic = 'force-dynamic';

interface ShareFolderPayload {
  folder: ResourceFolder;
  resources: Resource[];
  childFolders: ResourceFolder[];
  username: string;
}

// POST handler to create or update a shared folder's public data
export async function POST(request: Request) {
    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        return NextResponse.json({ error: 'Vercel Blob is not configured on the server.' }, { status: 500 });
    }

    try {
        const { folder, resources, childFolders, username } = await request.json() as ShareFolderPayload;

        if (!folder || !folder.id || !username) {
            return NextResponse.json({ error: 'Invalid folder data or username provided.' }, { status: 400 });
        }
        
        const blobPathname = `shared/folders/${folder.id}.json`;

        const dataToStore = JSON.stringify({ folder, resources, childFolders, sharedAt: new Date().toISOString(), sharedBy: username }, null, 2);

        await put(blobPathname, dataToStore, {
            access: 'public',
            contentType: 'application/json',
            addRandomSuffix: false,
        });

        // After putting, we can construct the public URL for the page
        const publicUrl = `/p/${folder.id}`;

        return NextResponse.json({ success: true, message: 'Folder is now public.', publicUrl });

    } catch (error) {
        console.error("POST /api/share/folder error:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: `Failed to share folder: ${errorMessage}` }, { status: 500 });
    }
}

// GET handler to retrieve a shared folder's public data
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    if (!process.env.BLOB_READ_WRITE_TOKEN) {
        // Silently fail for public fetching if not configured
        return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }

    if (!folderId) {
        return NextResponse.json({ error: 'Folder ID is required.' }, { status: 400 });
    }

    const blobPathname = `shared/folders/${folderId}.json`;

    try {
        const blob = await head(blobPathname);
        
        const response = await fetch(blob.url);
        if (!response.ok) {
            throw new Error(`Failed to download shared folder data. Status: ${response.status}`);
        }
        
        const data = await response.json();
        return NextResponse.json(data);

    } catch (error) {
         if (error instanceof Error && error.message.includes('404')) {
            return NextResponse.json({ error: "Shared folder not found." }, { status: 404 });
        }
        console.error(`GET /api/share/folder error for ID ${folderId}:`, error);
        return NextResponse.json({ error: "Failed to fetch shared folder data." }, { status: 500 });
    }
}
