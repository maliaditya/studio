"use client";

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { MindMapViewer } from '@/components/MindMapViewer';

function MindMapPageContent() {
    const searchParams = useSearchParams();
    const viewFromQuery = searchParams.get('view');
    
    // Determine the default view based on the query parameter.
    const defaultView = viewFromQuery === 'strategic' ? 'Strategic Overview' : '';

    return <MindMapViewer defaultView={defaultView} />;
}

export default function MindMapPage() {
    return (
        <AuthGuard>
            <MindMapPageContent />
        </AuthGuard>
    )
}
