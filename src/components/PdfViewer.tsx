"use client";

import { Document, Page, pdfjs } from "react-pdf";

// Set worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Document file={fileUrl}>
        <Page pageNumber={1} />
      </Document>
    </div>
  );
}
