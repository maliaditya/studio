
"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut, GripVertical, X, Upload } from "lucide-react";
import { getPdfForResource, storePdf } from "@/lib/audioDB";
import { downloadPdfFromSupabase, uploadPdfToSupabase } from "@/lib/supabasePdfStorage";
import type { Resource } from "@/types/workout";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import { useDraggable } from '@dnd-kit/core';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from "@/contexts/AuthContext";

pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;

export default function PdfViewerPopup() {
    const { pdfViewerState, setPdfViewerState, settings, setSettings, setResources, currentUser } = useAuth();
    const [numPages, setNumPages] = useState<number | null>(null);
    const [pageNumber, setPageNumber] = useState(1);
    const [file, setFile] = useState<Blob | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [scale, setScale] = useState(1.5);

    const [isResizing, setIsResizing] = useState(false);
    const resizeStartRef = useRef({ x: 0, width: 0 });
    const pdfUploadInputRef = useRef<HTMLInputElement>(null);
    
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: 'pdf-viewer-popup',
        disabled: isResizing,
    });

    useEffect(() => {
        const load = async () => {
            const resource = pdfViewerState?.resource;
            if (!resource?.id) {
                setFile(null);
                setIsLoading(false);
                return;
            }
            setIsLoading(true);
            try {
                const local = await getPdfForResource(resource.id, resource.pdfFileName);
                if (local.blob) {
                    setFile(local.blob);
                } else if (currentUser?.username) {
                    const remote = await downloadPdfFromSupabase(currentUser.username, resource.id, {
                        url: settings.supabaseUrl,
                        anonKey: settings.supabaseAnonKey,
                        bucket: settings.supabasePdfBucket,
                    });
                    if (remote) {
                        await storePdf(resource.id, remote);
                        setResources(prev => prev.map(r => r.id === resource.id ? { ...r, hasLocalPdf: true } : r));
                        setFile(remote);
                    } else {
                        setFile(null);
                    }
                } else {
                    setFile(null);
                }
            } catch (err) {
                console.error("Failed to load PDF:", err);
                setFile(null);
            } finally {
                setIsLoading(false);
            }

            setNumPages(null);
            const lastOpenedPage = settings.pdfLastOpenedPageByResourceId?.[resource.id] || 1;
            setPageNumber(Math.max(1, lastOpenedPage));
            setScale(1.5);
        };
        void load();
    }, [pdfViewerState?.resource, settings.pdfLastOpenedPageByResourceId, currentUser?.username, setResources]);

    useEffect(() => {
        const resourceId = pdfViewerState?.resource?.id;
        if (!resourceId || !numPages) return;
        setSettings((prev) => {
            const currentMap = prev.pdfLastOpenedPageByResourceId || {};
            const nextPage = Math.min(Math.max(1, pageNumber), numPages);
            if (currentMap[resourceId] === nextPage) return prev;
            return {
                ...prev,
                pdfLastOpenedPageByResourceId: {
                    ...currentMap,
                    [resourceId]: nextPage,
                },
            };
        });
    }, [numPages, pageNumber, pdfViewerState?.resource?.id, setSettings]);

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

    const handlePdfUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        const resource = pdfViewerState?.resource;
        if (!file || !resource) return;

        try {
            await storePdf(resource.id, file);
            if (currentUser?.username) {
                await uploadPdfToSupabase(currentUser.username, resource.id, file, {
                    url: settings.supabaseUrl,
                    anonKey: settings.supabaseAnonKey,
                    bucket: settings.supabasePdfBucket,
                });
            }
            setResources(prev => prev.map(r => 
                r.id === resource.id ? { ...r, hasLocalPdf: true, pdfFileName: file.name } : r
            ));
            // Trigger a re-render/reload in the popup
            setPdfViewerState(prev => prev ? { ...prev, resource: { ...resource, hasLocalPdf: true, pdfFileName: file.name } } : null);
        } catch (error) {
            console.error("Failed to store PDF:", error);
        }
    };


    if (!pdfViewerState || !pdfViewerState.isOpen) return null;
    
    const style: React.CSSProperties = {
        position: 'fixed',
        top: pdfViewerState.position.y,
        left: pdfViewerState.position.x,
        width: `${pdfViewerState.size?.width || 1024}px`,
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        willChange: 'transform',
        // Keep PDF above canvas/resource popups (z-[160]).
        zIndex: 180,
    };

    function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
        setNumPages(numPages);
        setPageNumber((prev) => Math.min(Math.max(1, prev), numPages));
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
            <input type="file" ref={pdfUploadInputRef} onChange={handlePdfUpload} accept=".pdf" className="hidden" />
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
                               <p className="mb-4">No PDF attached to this resource.</p>
                               <Button onClick={() => pdfUploadInputRef.current?.click()}>
                                   <Upload className="mr-2 h-4 w-4"/> Upload PDF
                               </Button>
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
