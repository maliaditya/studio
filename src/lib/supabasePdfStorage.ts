"use client";

import { getSupabaseClient } from "@/lib/supabaseClient";

type SupabasePdfConfig = {
  url?: string;
  anonKey?: string;
  bucket?: string;
};

const resolveBucket = (cfg?: SupabasePdfConfig) => cfg?.bucket || process.env.NEXT_PUBLIC_SUPABASE_PDF_BUCKET || "pdfs";

export function buildPdfObjectPath(username: string, resourceId: string): string {
  return `${username.toLowerCase()}/${resourceId}.pdf`;
}

export async function uploadPdfToSupabase(username: string, resourceId: string, blob: Blob, cfg?: SupabasePdfConfig): Promise<string> {
  const client = getSupabaseClient(cfg?.url, cfg?.anonKey);
  const bucketName = resolveBucket(cfg);
  const objectPath = buildPdfObjectPath(username, resourceId);

  const { error } = await client.storage
    .from(bucketName)
    .upload(objectPath, blob, {
      upsert: true,
      contentType: blob.type || "application/pdf",
      cacheControl: "3600",
    });
  if (error) throw error;

  const { data } = client.storage.from(bucketName).getPublicUrl(objectPath);
  return data.publicUrl;
}

export async function downloadPdfFromSupabase(username: string, resourceId: string, cfg?: SupabasePdfConfig): Promise<Blob | null> {
  const client = getSupabaseClient(cfg?.url, cfg?.anonKey);
  const bucketName = resolveBucket(cfg);
  const objectPath = buildPdfObjectPath(username, resourceId);
  const { data, error } = await client.storage.from(bucketName).download(objectPath);
  if (error) return null;
  return data || null;
}
