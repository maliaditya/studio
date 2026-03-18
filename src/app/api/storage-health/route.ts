import { NextResponse } from "next/server";
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from "@/lib/supabaseStorageServer";

export const dynamic = "force-dynamic";

const mask = (value?: string) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (trimmed.length <= 8) return "****";
  return `${trimmed.slice(0, 4)}****${trimmed.slice(-4)}`;
};

export async function GET(request: Request) {
  const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || "dock-data";
  const { searchParams } = new URL(request.url);
  const probe = searchParams.get("probe") === "1";

  let probeResult: { ok: boolean; error?: string } | null = null;
  if (probe) {
    try {
      const probePath = "_health/ping.json";
      await writeJsonToStorage(probePath, { ok: true, at: new Date().toISOString() });
      const readBack = await readJsonFromStorage<any>(probePath);
      if (!readBack?.ok) {
        probeResult = { ok: false, error: "Probe write succeeded but read returned empty." };
      } else {
        probeResult = { ok: true };
      }
    } catch (error) {
      probeResult = { ok: false, error: error instanceof Error ? error.message : "Unknown probe error" };
    }
  }

  return NextResponse.json({
    configured: isSupabaseStorageConfigured(),
    supabaseUrlPresent: Boolean(supabaseUrl.trim()),
    serviceRoleKeyPresent: Boolean(serviceRoleKey.trim()),
    bucket,
    supabaseUrlMasked: mask(supabaseUrl),
    serviceRoleKeyMasked: mask(serviceRoleKey),
    probe: probeResult,
  });
}
