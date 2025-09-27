"use client";

import { Document, Page, pdfjs } from "react-pdf";
import * as pdfjsWorker from "pdfjs-dist/build/pdf.worker.entry";

// Set the worker
pdfjs.GlobalWorkerOptions.workerSrc = pdfjsWorker;

export default function PdfViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div style={{ width: "100%", height: "100%" }}>
      <Document file={fileUrl}>
        <Page pageNumber={1} />
      </Document>
    </div>
  );
}
