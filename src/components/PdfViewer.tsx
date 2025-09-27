"use client";

import dynamic from "next/dynamic";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/esm/Page/AnnotationLayer.css";
import "react-pdf/dist/esm/Page/TextLayer.css";

// Dynamically import components with SSR disabled
const Document = dynamic(() => import("react-pdf").then(mod => mod.Document), { ssr: false });
const Page = dynamic(() => import("react-pdf").then(mod => mod.Page), { ssr: false });

// Set worker from CDN
pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export function PdfViewer({ fileUrl }: { fileUrl: string }) {
  return (
    <div style={{ width: "100%", height: "100%", overflow: "auto" }}>
      <Document file={fileUrl}>
        <Page pageNumber={1} />
      </Document>
    </div>
  );
}

export default PdfViewer;
