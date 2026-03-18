
import { NextResponse } from 'next/server';
import type { Resource, ResourceFolder } from '@/types/workout';
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from '@/lib/supabaseStorageServer';

export const dynamic = 'force-dynamic';

interface ShareFolderPayload {
  folder: ResourceFolder;
  allResources: Resource[];
  childFolders: ResourceFolder[];
  username: string;
}

// POST handler to create or update a shared folder's public data
export async function POST(request: Request) {
    if (!isSupabaseStorageConfigured()) {
        return NextResponse.json({ error: 'Supabase storage is not configured on the server.' }, { status: 500 });
    }

    try {
        const { folder, allResources, childFolders = [], username } = await request.json() as ShareFolderPayload;

        if (!folder || !folder.id || !username) {
            return NextResponse.json({ error: 'Invalid folder data or username provided.' }, { status: 400 });
        }
        
        const blobPathname = `shared/folders/${folder.id}.json`;

        // --- Logic to include all linked resources ---
        const sharedFolderIds = new Set([folder.id, ...childFolders.map(f => f.id)]);
        const resourcesInSharedFolders = allResources.filter(r => sharedFolderIds.has(r.folderId));

        const finalResourcesMap = new Map<string, Resource>();
        resourcesInSharedFolders.forEach(r => finalResourcesMap.set(r.id, r));

        const queue = [...resourcesInSharedFolders];
        const visited = new Set<string>(queue.map(r => r.id));

        while(queue.length > 0) {
            const currentResource = queue.shift();
            if (currentResource && currentResource.points) {
                for (const point of currentResource.points) {
                    if (point.type === 'card' && point.resourceId && !visited.has(point.resourceId)) {
                        const linkedResource = allResources.find(r => r.id === point.resourceId);
                        if (linkedResource) {
                            visited.add(linkedResource.id);
                            finalResourcesMap.set(linkedResource.id, linkedResource);
                            queue.push(linkedResource);
                        }
                    }
                }
            }
        }
        // --- End of new logic ---

        const dataToStore = JSON.stringify({ 
            folder, 
            resources: Array.from(finalResourcesMap.values()), 
            childFolders, 
            sharedAt: new Date().toISOString(), 
            sharedBy: username 
        }, null, 2);

        await writeJsonToStorage(blobPathname, JSON.parse(dataToStore));

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

    if (!isSupabaseStorageConfigured()) {
        // Silently fail for public fetching if not configured
        return NextResponse.json({ error: "Service not configured" }, { status: 503 });
    }

    if (!folderId) {
        return NextResponse.json({ error: 'Folder ID is required.' }, { status: 400 });
    }

    const blobPathname = `shared/folders/${folderId}.json`;

    try {
        const data = await readJsonFromStorage<any>(blobPathname);
        if (!data) {
            return NextResponse.json({ error: "Shared folder not found." }, { status: 404 });
        }
        return NextResponse.json(data);

    } catch (error) {
        console.error(`GET /api/share/folder error for ID ${folderId}:`, error);
        return NextResponse.json({ error: "Failed to fetch shared folder data." }, { status: 500 });
    }
}
