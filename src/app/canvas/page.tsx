
"use client";

import React from 'react';
import { useRouter } from 'next/navigation';

export default function CanvasRedirectPage() {
    const router = useRouter();
    React.useEffect(() => {
        router.replace('/mind');
    }, [router]);

    return (
        <div className="flex h-screen items-center justify-center">
            <p>Redirecting to the new Mind page...</p>
        </div>
    );
}
