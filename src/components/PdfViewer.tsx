
"use client";

import { Document, Page, pdfjs } from "react-pdf";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

// Set worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Document file={fileUrl}>
        <Page pageNumber={1} />
      </Document>
    </div>
  );
}
