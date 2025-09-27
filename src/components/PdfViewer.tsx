
"use client";

import { useState, useEffect } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import pdfWorker from "pdfjs-dist/legacy/build/pdf.worker.entry";
import { Loader2 } from "lucide-react";
import { getPdf } from "@/lib/audioDB";
import type { Resource } from "@/types/workout";

pdfjs.GlobalWorkerOptions.workerSrc = pdfWorker;


interface PdfViewerProps {
  resource: Resource | null;
  scale?: number;
}

export default function PdfViewer({ resource, scale = 1.2 }: PdfViewerProps) {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [file, setFile] = useState<Blob | null>(null);
  const [isLoading, setIsLoading] = useState(true);

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

      {numPages && numPages > 1 && (
        <div className="mt-4 flex-shrink-0 flex items-center justify-center gap-4 border-t pt-4">
          <button onClick={goToPrevPage} disabled={pageNumber <= 1} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Previous
          </button>
          <span className="text-sm font-medium">
            Page {pageNumber} of {numPages}
          </span>
          <button onClick={goToNextPage} disabled={pageNumber >= numPages} className="px-3 py-1 rounded-md border bg-background hover:bg-muted disabled:opacity-50">
            Next
          </button>
        </div>
      )}
    </div>
  );
}
