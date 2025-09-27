
"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/esm/Page/AnnotationLayer.css';
import 'react-pdf/dist/esm/Page/TextLayer.css';
import { getPdf } from '@/lib/audioDB';
import { Button } from './ui/button';
import { ChevronLeft, ChevronRight, Loader2, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Correctly set the worker path at the module level.
// This is the standard and most reliable method for Next.js.
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.js',
  import.meta.url,
).toString();


interface PdfViewerProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    resourceId: string | null;
}

export function PdfViewer({ isOpen, onOpenChange, resourceId }: PdfViewerProps) {
    const { toast } = useToast();
    const [file, setFile] = useState<Blob | null>(null);
    const [numPages, setNumPages] = useState<number>(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && resourceId) {
            setIsLoading(true);
            setError(null);
            setFile(null);
            setNumPages(0);
            setPageNumber(1);

            const fetchPdf = async () => {
                try {
                    const pdfBlob = await getPdf(resourceId);
                    if (pdfBlob) {
                        setFile(pdfBlob);
                    } else {
                        throw new Error('PDF data not found in local storage.');
                    }
                } catch (err) {
                    const message = err instanceof Error ? err.message : 'Could not load PDF.';
                    console.error(message);
                    setError(message);
                    toast({ title: "Error Loading PDF", description: message, variant: 'destructive' });
                } finally {
                    setIsLoading(false);
                }
            };
            fetchPdf();
        }
    }, [isOpen, resourceId, toast]);

    function onDocumentLoadSuccess({ numPages: nextNumPages }: { numPages: number }) {
        setNumPages(nextNumPages);
    }

    const goToPrevPage = () => setPageNumber(prev => Math.max(prev - 1, 1));
    const goToNextPage = () => setPageNumber(prev => Math.min(prev + 1, numPages));
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
                <DialogHeader className="p-4 border-b flex-shrink-0">
                    <DialogTitle>PDF Viewer</DialogTitle>
                </DialogHeader>
                <div className="flex-grow min-h-0 flex items-center justify-center bg-muted/30">
                    {isLoading && <Loader2 className="h-8 w-8 animate-spin" />}
                    {error && (
                        <div className="text-center text-destructive">
                            <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                            <p>{error}</p>
                        </div>
                    )}
                    {!isLoading && !error && file && (
                        <Document
                            file={file}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(err) => {
                                console.error('PDF Document Load Error:', err);
                                setError('Failed to load PDF document.');
                            }}
                            className="flex justify-center items-center h-full overflow-auto"
                            loading={<Loader2 className="h-6 w-6 animate-spin" />}
                        >
                            <Page 
                                pageNumber={pageNumber} 
                                width={800}
                                error={<p>Could not load page.</p>}
                                loading={<Loader2 className="h-6 w-6 animate-spin" />}
                            />
                        </Document>
                    )}
                </div>
                {numPages > 0 && (
                    <DialogFooter className="p-2 border-t flex-shrink-0">
                        <div className="flex items-center justify-center w-full">
                            <Button variant="ghost" size="icon" onClick={goToPrevPage} disabled={pageNumber <= 1}>
                                <ChevronLeft className="h-5 w-5" />
                            </Button>
                            <span className="text-sm font-medium">
                                Page {pageNumber} of {numPages}
                            </span>
                             <Button variant="ghost" size="icon" onClick={goToNextPage} disabled={pageNumber >= numPages}>
                                <ChevronRight className="h-5 w-5" />
                            </Button>
                        </div>
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
