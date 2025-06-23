
import { get } from '@vercel/edge-config';
import { NextResponse } from 'next/server';

/**
 * GET /api/edge-config?username=<username>&item=<item>
 * Fetches a specific data blob (e.g., 'main' or 'logs') for a user.
 */
export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const item = searchParams.get('item') || 'main'; // Default to 'main'

    if (!process.env.EDGE_CONFIG) {
        return NextResponse.json({ error: 'Edge Config connection string is not configured on the server.' }, { status: 500 });
    }

    if (!username) {
        return NextResponse.json({ error: 'Username is required.' }, { status: 400 });
    }

    // Construct the key based on the item type
    const key = item === 'logs' ? `${username}_logs` : username;

    try {
        const userData = await get(key);
        return NextResponse.json({ data: userData });
    } catch (error) {
        console.error(`Edge Config read error for user ${username}, item ${item}:`, error);
        return NextResponse.json({ error: 'Failed to read data from Edge Config.' }, { status: 500 });
    }
}


/**
 * POST /api/edge-config
 * Updates a user's data blob in Vercel Edge Config.
 * Expects { username, data, item }, where item is 'main' or 'logs'.
 */
export async function POST(request: Request) {
    const { username, data, item } = await request.json();
    const itemType = item || 'main';

    const edgeConfigConnectionString = process.env.EDGE_CONFIG;
    const vercelApiToken = process.env.VERCEL_API_TOKEN;

    if (!edgeConfigConnectionString || !vercelApiToken) {
        return NextResponse.json({ error: 'Server is not configured for Vercel API access. Check EDGE_CONFIG and VERCEL_API_TOKEN environment variables.' }, { status: 500 });
    }

    if (!username || data === undefined) {
        return NextResponse.json({ error: 'Username and data payload are required.' }, { status: 400 });
    }
    
    const key = itemType === 'logs' ? `${username}_logs` : username;

    try {
        const edgeConfigId = new URL(edgeConfigConnectionString).pathname.split('/')[1];

        if (!edgeConfigId) {
            throw new Error('Could not parse Edge Config ID from connection string.');
        }

        const vercelApiUrl = `https://api.vercel.com/v1/edge-config/${edgeConfigId}/items`;

        const response = await fetch(vercelApiUrl, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${vercelApiToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                items: [
                    {
                        operation: 'upsert',
                        key: key,
                        value: data,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Vercel API error:', errorData);
            throw new Error(errorData.error?.message || `Failed to update Edge Config for item: ${itemType}`);
        }

        return NextResponse.json({ success: true, message: `Data chunk '${itemType}' synced to cloud.` });

    } catch (error) {
        console.error('Error in POST /api/edge-config:', error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred.';
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
