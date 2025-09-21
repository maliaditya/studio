"use client";

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useSearchParams } from 'next/navigation';
import { MindMapViewer } from '@/components/MindMapViewer';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

function MindMapPageContent() {
    const searchParams = useSearchParams();
    const viewFromQuery = searchParams.get('view');
    
    // Determine the default view based on the query parameter.
    const defaultView = viewFromQuery === 'strategic' ? 'Strategic Overview' : '';

    return (
        <Dialog open={true}>
            <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
                <DialogHeader className="p-4 border-b">
                    <DialogTitle>Mind Map</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <MindMapViewer defaultView={defaultView} />
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default function MindMapPage() {
    return (
        <AuthGuard>
            <MindMapPageContent />
        </AuthGuard>
    )
}