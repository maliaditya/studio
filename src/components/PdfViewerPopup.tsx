
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut, GripVertical, X } from "lucide-react";
import { getPdf } from "@/lib/audioDB";
import type { Resource } from "@/types/workout";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from "@/contexts/AuthContext";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

export default function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState, settings, setSettings } = useAuth();
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scale, setScale] = useState(1.5);

    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef({ x: 0, width: 0 });
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'pdf-viewer-popup',
        disabled: isResizing,
    });

    useEffect(() => {
        if (pdfViewerState?.resource?.hasLocalPdf && pdfViewerState.resource.id) {
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
        } else {
            setFile(null);
            setIsLoading(false);
        }
    }, [pdfViewerState?.resource]);

    const handleResizeMouseDown = (e: React.MouseEvent) => {
        e.stopPropagation();
        setIsResizing(true);
        resizeStartRef.current = {
            x: e.clientX,
            width: pdfViewerState?.size?.width || 1024,
        };
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing || !pdfViewerState) return;
        const dx = e.clientX - resizeStartRef.current.x;
        const newWidth = Math.max(500, resizeStartRef.current.width + dx);
        setPdfViewerState(prev => prev ? { ...prev, size: { ...prev.size, width: newWidth } } : null);
    }, [isResizing, pdfViewerState, setPdfViewerState]);
    
    const handleMouseUp = useCallback(() => {
        if (isResizing) {
            setIsResizing(false);
            if (pdfViewerState?.size?.width) {
              setSettings(prev => ({...prev, pdfViewerWidth: pdfViewerState.size.width}));
            }
        }
    }, [isResizing, pdfViewerState?.size?.width, setSettings]);
    
    useEffect(() => {
        if (isResizing) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        } else {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        }
        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isResizing, handleMouseMove, handleMouseUp]);


    if (!pdfViewerState || !pdfViewerState.isOpen) return null;
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: pdfViewerState.position.y,
        left: pdfViewerState.position.x,
        width: `${pdfViewerState.size?.width || 1024}px`,
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
    
    const resource = pdfViewerState.resource;

    return (
        <div ref={setNodeRef} style={style}>
            <Card className="h-[90vh] shadow-2xl border-2 border-primary/30 flex flex-col relative">
                <CardHeader 
                    className="p-2 border-b flex flex-row items-center justify-between"
                >
                    <div 
                        className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-grow min-w-0"
                        {...attributes}
                        {...listeners}
                    >
                       <GripVertical className="h-5 w-5 text-muted-foreground/50 flex-shrink-0" />
                       <CardTitle className="text-base truncate" title={resource?.name}>{resource?.name}</CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        {numPages && (
                            <>
                                <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.max(1, p - 1))} disabled={pageNumber <= 1}>Prev</Button>
                                <span className="text-sm text-muted-foreground">Page {pageNumber} of {numPages}</span>
                                <Button variant="outline" size="sm" onClick={() => setPageNumber(p => Math.min(numPages, p + 1))} disabled={pageNumber >= numPages}>Next</Button>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomOut}><ZoomOut className="h-4 w-4" /></Button>
                                <Button variant="outline" size="icon" className="h-9 w-9" onClick={zoomIn}><ZoomIn className="h-4 w-4" /></Button>
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
                 <div
                    onMouseDown={handleResizeMouseDown}
                    className="absolute right-0 top-0 h-full w-2 cursor-ew-resize z-10"
                />
            </Card>
        </div>
    );
}
