
"use client";

import React, { useState, useEffect, useRef } from 'react';
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut, GripVertical, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getPdf } from '@/lib/audioDB';
import type { Resource } from '@/types/workout';
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { DndContext } from '@dnd-kit/core';
import type { DragEndEvent } from 'dnd-kit';
import { ScrollArea } from './ui/scroll-area';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState } = useAuth();
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scale, setScale] = useState(1.5);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'pdf-viewer-popup',
    });

    useEffect(() => {
        if (!pdfViewerState || !pdfViewerState.resource?.hasLocalPdf || !pdfViewerState.resource.id) {
            setFile(null);
            setIsLoading(false);
            return;
        }

        setIsLoading(true);
        getPdf(pdfViewerState.resource.id)
            .then(blob => {
                setFile(blob);
            })
            .catch(err => {
                console.error("Failed to load PDF:", err);
                setFile(null);
            })
            .finally(() => setIsLoading(false));
        
        setNumPages(null);
        setPageNumber(1);
        setScale(1.5);
    }, [pdfViewerState?.resource]);
    
    const handleDragEnd = (event: DragEndEvent) => {
        const { delta } = event;
        if (pdfViewerState) {
            setPdfViewerState(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    position: {
                        x: prev.position.x + delta.x,
                        y: prev.position.y + delta.y,
                    },
                }
            });
        }
    };

    if (!pdfViewerState || !pdfViewerState.isOpen || !pdfViewerState.resource) return null;
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: pdfViewerState.position.y,
        left: pdfViewerState.position.x,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        zIndex: 100,
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
    }
    
    function zoomIn() {
        setScale(prev => Math.min(prev + 0.2, 5));
    }

    function zoomOut() {
        setScale(prev => Math.max(prev - 0.2, 0.5));
    }

    return (
        <DndContext onDragEnd={handleDragEnd}>
            <div ref={setNodeRef} style={style}>
                <Card className="w-[800px] h-[90vh] shadow-2xl border-2 border-primary/30 flex flex-col">
                    <CardHeader 
                        className="p-2 border-b flex flex-row items-center justify-between"
                    >
                        <div 
                            className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-grow"
                            {...attributes}
                            {...listeners}
                        >
                           <GripVertical className="h-5 w-5 text-muted-foreground/50" />
                           <CardTitle className="text-base truncate">{pdfViewerState.resource.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-2">
                            {numPages && (
                                <>
                                    <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Prev</Button>
                                    <span className="text-sm text-muted-foreground">Page {pageNumber} of {numPages}</span>
                                    <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</Button>
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
                                    <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
                                </>
                            )}
                            <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setPdfViewerState(prev => (prev ? {...prev, isOpen: false} : null))}>
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent className="p-0 flex-grow min-h-0">
                        <ScrollArea className="h-full">
                           {isLoading ? (
                               <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                   <Loader2 className="h-8 w-8 animate-spin mb-4" />
                                   <p>Loading PDF...</p>
                               </div>
                           ) : file ? (
                               <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
                                   <Page pageNumber={pageNumber} scale={scale} />
                               </Document>
                           ) : (
                               <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                                   <p>Could not load PDF file.</p>
                               </div>
                           )}
                        </ScrollArea>
                    </CardContent>
                </Card>
            </div>
        </DndContext>
    );
}
