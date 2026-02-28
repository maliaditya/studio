"use client";
import { createClient } from "@supabase/supabase-js";

type SupabasePdfConfig = {
  url?: string;
  anonKey?: string;
  bucket?: string;
  serviceRoleKey?: string;
};

const resolveBucket = (cfg?: SupabasePdfConfig) => cfg?.bucket || "pdfs";

export function buildPdfObjectPath(username: string, resourceId: string): string {
  return `${username.toLowerCase()}/${resourceId}.pdf`;
}

export async function uploadPdfToSupabase(username: string, resourceId: string, blob: Blob, cfg?: SupabasePdfConfig): Promise<string> {
  const normalizedUsername = username.toLowerCase();
  const bucket = resolveBucket(cfg);
  const objectPath = buildPdfObjectPath(username, resourceId);
  const clientKey = cfg?.serviceRoleKey || cfg?.anonKey;

  if (cfg?.url && clientKey) {
    const supabase = createClient(cfg.url, clientKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Try direct client upload first (works when bucket policies allow anon uploads).
    const directUpload = await supabase.storage
      .from(bucket)
      .upload(objectPath, blob, {
        upsert: true,
        contentType: blob.type || "application/pdf",
        cacheControl: "3600",
      });
    if (!directUpload.error) {
      return objectPath;
    }

    // Fallback to server-issued signed upload URL (requires service role key on server).
    const signResponse = await fetch("/api/pdf-storage", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({
        action: "signed-upload-url",
        username: normalizedUsername,
        resourceId,
        bucket,
        supabaseUrl: cfg.url,
        supabaseServiceRoleKey: cfg.serviceRoleKey,
      }),
    });
    const signResult = await signResponse.json().catch(() => ({}));
    if (!signResponse.ok || !signResult?.token || !signResult?.path || !signResult?.bucket) {
      throw new Error(
        `Direct upload failed: ${directUpload.error.message}. Signed upload init failed (${signResponse.status}): ${String(
          signResult?.error || "Failed to prepare PDF upload."
        )}`
      );
    }

    const { error } = await supabase.storage
      .from(String(signResult.bucket))
      .uploadToSignedUrl(String(signResult.path), String(signResult.token), blob, {
        contentType: blob.type || "application/pdf",
        cacheControl: "3600",
      });

    if (error) {
      throw new Error(`Direct upload failed: ${directUpload.error.message}. Signed upload failed: ${error.message}`);
    }

    return objectPath;
  }

  const formData = new FormData();
  formData.append("action", "upload");
  formData.append("username", normalizedUsername);
  formData.append("resourceId", resourceId);
  formData.append("bucket", bucket);
  if (cfg?.url) formData.append("supabaseUrl", cfg.url);
  if (cfg?.serviceRoleKey) formData.append("supabaseServiceRoleKey", cfg.serviceRoleKey);
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
  return objectPath;
}

export async function downloadPdfFromSupabase(username: string, resourceId: string, cfg?: SupabasePdfConfig): Promise<Blob | null> {
  const clientKey = cfg?.serviceRoleKey || cfg?.anonKey;
  if (cfg?.url && clientKey) {
    const supabase = createClient(cfg.url, clientKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.storage
      .from(resolveBucket(cfg))
      .download(buildPdfObjectPath(username, resourceId));
    if (!error && data) return data;
  }

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
      supabaseServiceRoleKey: cfg?.serviceRoleKey,
    }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(`Init failed (${response.status}): ${String(result?.error || "Failed to initialize Supabase PDF storage.")}`);
  }
}
