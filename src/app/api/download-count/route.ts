import { NextResponse } from "next/server";
import { isSupabaseStorageConfigured, readJsonFromStorage, writeJsonToStorage } from "@/lib/supabaseStorageServer";

export const dynamic = "force-dynamic";

const BLOB_PATHNAME = "download-count.json";

const readCount = async (): Promise<number> => {
  const parsed = await readJsonFromStorage<{ count?: number }>(BLOB_PATHNAME);
  if (!parsed) return 0;
  return typeof parsed.count === "number" ? parsed.count : 0;
};

export async function GET() {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({ count: 0 });
  }

  try {
    const count = await readCount();
    return NextResponse.json({ count });
  } catch (error) {
    console.error("GET /api/download-count error:", error);
    return NextResponse.json({ error: "Failed to fetch download count" }, { status: 500 });
  }
}

export async function POST() {
  if (!isSupabaseStorageConfigured()) {
    return NextResponse.json({ error: "Supabase storage is not configured on the server." }, { status: 500 });
  }

  let currentCount = 0;
  try {
    currentCount = await readCount();
  } catch (error) {
    console.error("POST /api/download-count (read) error:", error);
  }

  const nextCount = currentCount + 1;

  try {
    await writeJsonToStorage(BLOB_PATHNAME, { count: nextCount });
    return NextResponse.json({ count: nextCount });
  } catch (error) {
    console.error("POST /api/download-count (write) error:", error);
    return NextResponse.json({ error: "Failed to update download count" }, { status: 500 });
  }
}
