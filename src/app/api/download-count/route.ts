import { list, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const BLOB_PATHNAME = "download-count.json";

const readCount = async (): Promise<number> => {
  const { blobs } = await list({ prefix: BLOB_PATHNAME, limit: 1 });
  if (blobs.length === 0 || blobs[0]?.pathname !== BLOB_PATHNAME) return 0;

  const response = await fetch(blobs[0].url, { cache: "no-store" });
  if (!response.ok) return 0;
  const textData = await response.text();
  if (!textData) return 0;

  const parsed = JSON.parse(textData) as { count?: number };
  return typeof parsed.count === "number" ? parsed.count : 0;
};

export async function GET() {
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
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
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return NextResponse.json({ error: "Vercel Blob is not configured on the server." }, { status: 500 });
  }

  let currentCount = 0;
  try {
    currentCount = await readCount();
  } catch (error) {
    console.error("POST /api/download-count (read) error:", error);
  }

  const nextCount = currentCount + 1;

  try {
    await put(BLOB_PATHNAME, JSON.stringify({ count: nextCount }), {
      access: "public",
      contentType: "application/json",
      addRandomSuffix: false,
    });
    return NextResponse.json({ count: nextCount });
  } catch (error) {
    console.error("POST /api/download-count (write) error:", error);
    return NextResponse.json({ error: "Failed to update download count" }, { status: 500 });
  }
}
