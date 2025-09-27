
"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { getPdf } from "@/lib/audioDB";
import type { Resource } from "@/types/workout";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { ScrollArea } from "./ui/scroll-area";
import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

const Document = dynamic(() => import("react-pdf").then((mod) => mod.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then((mod) => mod.Page), { ssr: false });


interface PdfViewerProps {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    resource: Resource | null;
}

export function PdfViewer({ isOpen, onOpenChange, resource }: PdfViewerProps) {
    const [fileUrl, setFileUrl] = useState<string | null>(null);
    const [numPages, setNumPages] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && resource && resource.hasLocalPdf) {
            setLoading(true);
            setError(null);
            setFileUrl(null);

            getPdf(resource.id).then(blob => {
                if (blob) {
                    setFileUrl(URL.createObjectURL(blob));
                } else {
                    setError("Could not find the stored PDF file.");
                }
            }).catch(err => {
                console.error("Failed to load PDF from DB:", err);
                setError("Failed to load the PDF from local storage.");
            }).finally(() => {
                setLoading(false);
            });

        } else if (isOpen && resource && resource.link) { // Fallback for external links
            setFileUrl(resource.link);
            setLoading(false);
        }

        return () => {
            if (fileUrl && fileUrl.startsWith('blob:')) {
                URL.revokeObjectURL(fileUrl);
            }
        };
    }, [isOpen, resource]);

    function onDocumentLoadSuccess({ numPages }: { numPages: number }): void {
        setNumPages(numPages);
    }

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle>{resource?.name || "PDF Viewer"}</DialogTitle>
                    <DialogDescription>
                        {resource?.pdfFileName || "Loading document..."}
                    </DialogDescription>
                </DialogHeader>
                <div className="flex-grow min-h-0">
                    <ScrollArea className="h-full">
                        {loading && (
                             <div className="flex h-full w-full items-center justify-center">
                                <Loader2 className="h-8 w-8 animate-spin" />
                            </div>
                        )}
                        {error && <p className="text-destructive text-center">{error}</p>}
                        {fileUrl && !error && (
                             <Document file={fileUrl} onLoadSuccess={onDocumentLoadSuccess} loading={<div className="flex h-full w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
                                {Array.from(new Array(numPages || 0), (el, index) => (
                                    <Page 
                                        key={`page_${index + 1}`} 
                                        pageNumber={index + 1}
                                        renderTextLayer={false}
                                        renderAnnotationLayer={false}
                                    />
                                ))}
                            </Document>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

export default PdfViewer;
