
"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import { getPdf } from "@/lib/audioDB";
import type { Resource } from "@/types/workout";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

pdfjs.GlobalWorkerOptions.workerSrc = require('pdfjs-dist/build/pdf.worker.min.mjs');


interface PdfViewerProps {
  resource: Resource | null;
}

export default function PdfViewer({ resource }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [scale, setScale] = useState(2);

  useEffect(() => {
    async function loadPdf() {
      if (resource?.hasLocalPdf && resource.id) {
        setIsLoading(true);
        try {
          const pdfBlob = await getPdf(resource.id);
          setFile(pdfBlob);
        } catch (error) {
          console.error("Failed to load PDF from IndexedDB", error);
          setFile(null);
        } finally {
          setIsLoading(false);
        }
      } else {
        setFile(null);
        setIsLoading(false);
      }
    }
    loadPdf();
    // Reset state when resource changes
    setNumPages(null);
    setPageNumber(1);
    setScale(2);
  }, [resource]);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setPageNumber(1);
  }

  function goToPrevPage() {
    setPageNumber((prev) => (prev > 1 ? prev - 1 : prev));
  }

  function goToNextPage() {
    setPageNumber((prev) => (prev < (numPages ?? 1) ? prev + 1 : prev));
  }

  function zoomIn() {
    setScale(prev => Math.min(prev + 0.2, 5)); // Max zoom 5x
  }

  function zoomOut() {
    setScale(prev => Math.max(prev - 0.2, 0.5)); // Min zoom 0.5x
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
        <Loader2 className="h-8 w-8 animate-spin mb-4" />
        <p>Loading PDF...</p>
      </div>
    );
  }
  
  if (!file) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <p>Could not load PDF file.</p>
        </div>
    );
  }


  return (
    <div className="text-center h-full flex flex-col">
      <div className="flex-grow overflow-auto">
        <Document file={file} onLoadSuccess={onDocumentLoadSuccess}>
          <Page pageNumber={pageNumber} scale={scale} />
        </Document>
      </div>

      {numPages && (
        <div className="mt-4 flex-shrink-0 flex items-center justify-center gap-4 border-t pt-4">
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Previous
          </button>
          
          <div className="flex items-center gap-2">
            <button onClick={zoomOut} disabled={scale <= 0.5} className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <ZoomOut className="h-4 w-4" />
                <VisuallyHidden>Zoom Out</VisuallyHidden>
            </button>
            <span className="text-sm font-medium w-20">
                Page {pageNumber} of {numPages}
            </span>
            <button onClick={zoomIn} disabled={scale >= 5} className="p-2 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
                <ZoomIn className="h-4 w-4" />
                <VisuallyHidden>Zoom In</VisuallyHidden>
            </button>
          </div>

          <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
