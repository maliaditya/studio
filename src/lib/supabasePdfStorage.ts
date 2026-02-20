"use client";

type SupabasePdfConfig = {
  url?: string;
  anonKey?: string;
  bucket?: string;
};

const resolveBucket = (cfg?: SupabasePdfConfig) => cfg?.bucket || "pdfs";

export function buildPdfObjectPath(username: string, resourceId: string): string {
  return `${username.toLowerCase()}/${resourceId}.pdf`;
}

export async function uploadPdfToSupabase(username: string, resourceId: string, blob: Blob, cfg?: SupabasePdfConfig): Promise<string> {
  const formData = new FormData();
  formData.append("action", "upload");
  formData.append("username", username.toLowerCase());
  formData.append("resourceId", resourceId);
  formData.append("bucket", resolveBucket(cfg));
  if (cfg?.url) formData.append("supabaseUrl", cfg.url);
  formData.append("file", blob, `${resourceId}.pdf`);

  const response = await fetch("/api/pdf-storage", {
    method: "POST",
    credentials: "include",
    body: formData,
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Upload failed (${response.status}): ${String(result?.error || "Failed to upload PDF.")}`);
  }
  return buildPdfObjectPath(username, resourceId);
}

export async function downloadPdfFromSupabase(username: string, resourceId: string, cfg?: SupabasePdfConfig): Promise<Blob | null> {
  const params = new URLSearchParams({
    username: username.toLowerCase(),
    resourceId,
    bucket: resolveBucket(cfg),
  });
  if (cfg?.url) params.set("supabaseUrl", cfg.url);
  const response = await fetch(`/api/pdf-storage?${params.toString()}`, {
    method: "GET",
    credentials: "include",
  });
  if (!response.ok) return null;
  return await response.blob();
}

export async function initSupabasePdfStorage(username: string, cfg?: SupabasePdfConfig): Promise<void> {
  const response = await fetch("/api/pdf-storage", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({
      action: "init",
      username: username.toLowerCase(),
      bucket: resolveBucket(cfg),
      supabaseUrl: cfg?.url,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Init failed (${response.status}): ${String(result?.error || "Failed to initialize Supabase PDF storage.")}`);
  }
}
