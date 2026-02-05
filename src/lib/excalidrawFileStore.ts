"use client";

import { getExcalidrawFile, storeExcalidrawFile, type ExcalidrawFileRecord } from "@/lib/audioDB";

export type ExcalidrawFileMeta = {
  mimeType: string;
  created?: number;
  lastRetrieved?: number;
};

export type ExcalidrawFilesMetaMap = Record<string, ExcalidrawFileMeta>;

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, data] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+);base64/.exec(header);
  const mimeType = mimeMatch ? mimeMatch[1] : "application/octet-stream";
  const binary = atob(data);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mimeType });
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read blob as data URL."));
    reader.readAsDataURL(blob);
  });
}

export async function saveExcalidrawFiles(
  canvasId: string,
  files: Record<string, any>
): Promise<ExcalidrawFilesMetaMap> {
  const meta: ExcalidrawFilesMetaMap = {};
  const entries = Object.entries(files || {});

  for (const [fileId, file] of entries) {
    if (!file) continue;
    const dataUrl: string | undefined = file.dataURL;
    const mimeType = file.mimeType || "application/octet-stream";

    if (dataUrl) {
      const blob = dataUrlToBlob(dataUrl);
      const record: ExcalidrawFileRecord = {
        blob,
        mimeType,
        created: file.created,
        lastRetrieved: file.lastRetrieved,
      };
      await storeExcalidrawFile(`${canvasId}:${fileId}`, record);
    }

    meta[fileId] = {
      mimeType,
      created: file.created,
      lastRetrieved: file.lastRetrieved,
    };
  }

  return meta;
}

export async function loadExcalidrawFiles(
  canvasId: string,
  filesMeta: ExcalidrawFilesMetaMap | undefined
): Promise<Record<string, any>> {
  if (!filesMeta) return {};
  const files: Record<string, any> = {};
  const entries = Object.entries(filesMeta);

  for (const [fileId, meta] of entries) {
    const record = await getExcalidrawFile(`${canvasId}:${fileId}`);
    if (!record) continue;
    const dataURL = await blobToDataUrl(record.blob);
    files[fileId] = {
      id: fileId,
      dataURL,
      mimeType: record.mimeType || meta.mimeType,
      created: meta.created,
      lastRetrieved: meta.lastRetrieved,
    };
  }

  return files;
}
