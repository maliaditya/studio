import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/serverSession";
import { verifyAccessToken } from "@/lib/authTokens";
import { isAppConfigStorageConfigured, readAppConfigFromDb, upsertAppConfig } from "@/lib/appConfigServer";

export const dynamic = "force-dynamic";

const getAdminUsernames = (): string[] => {
  const fromEnv = (process.env.ADMIN_USERNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  if (fromEnv.length > 0) return fromEnv;
  return ["lonewolf"];
};

const readEnvFallback = () => ({
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null,
  supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || null,
});

export async function GET() {
  const fallback = readEnvFallback();
  const storageConfigured = isAppConfigStorageConfigured();

  if (!storageConfigured) {
    return NextResponse.json({
      ...fallback,
      source: "env",
      updatedAt: null,
      storageConfigured,
    });
  }

  try {
    const stored = await readAppConfigFromDb();
    if (stored) {
      return NextResponse.json({
        ...stored,
        source: "db",
        storageConfigured: true,
      });
    }
  } catch (error) {
    console.error("GET /api/app-config failed to read DB:", error);
  }

  return NextResponse.json({
    ...fallback,
    source: "env",
    updatedAt: null,
    storageConfigured,
  });
}

export async function POST(request: Request) {
  const sessionUser = getSessionUserFromRequest(request);
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  const effectiveUser = sessionUser || tokenUser;
  const admins = getAdminUsernames();

  if (!effectiveUser || !admins.includes(effectiveUser)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (!isAppConfigStorageConfigured()) {
    return NextResponse.json({ error: "Supabase server storage is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => ({}));
  const supabaseUrl = String(payload?.supabaseUrl || "").trim();
  const supabaseAnonKey = String(payload?.supabaseAnonKey || "").trim();
  const supabaseStorageBucket = String(payload?.supabaseStorageBucket || "").trim() || null;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase URL and anon key are required." }, { status: 400 });
  }

  try {
    const saved = await upsertAppConfig({
      supabaseUrl,
      supabaseAnonKey,
      supabaseStorageBucket,
    });
    return NextResponse.json({
      ...saved,
      source: "db",
      storageConfigured: true,
    });
  } catch (error) {
    console.error("POST /api/app-config error:", error);
    return NextResponse.json({ error: "Failed to save app config." }, { status: 500 });
  }
}
