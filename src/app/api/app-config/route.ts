import { NextResponse } from "next/server";
import { getSessionUserFromRequest } from "@/lib/serverSession";
import { verifyAccessToken } from "@/lib/authTokens";
import { isAppConfigStorageConfigured, readAppConfigFromDb, upsertAppConfig } from "@/lib/appConfigServer";
import { isAdminUsername } from "@/lib/adminUsers";
import { DESKTOP_PLAN_PRICE_INR, normalizeDesktopPlanPriceInr } from '@/lib/desktopAccess';
import { createDefaultDesktopPlanCatalog, getDesktopPlanFinalPriceInr, getFeaturedDesktopPlan, normalizeDesktopPlanCatalog } from '@/lib/desktopPlans';
import { createDefaultSetupSupportPlanCatalog, normalizeSetupSupportPlanCatalog } from '@/lib/setupSupportPlans';

export const dynamic = "force-dynamic";

const readEnvFallback = () => {
  const desktopPlanPriceInr = normalizeDesktopPlanPriceInr(process.env.NEXT_PUBLIC_DESKTOP_PLAN_PRICE_INR, DESKTOP_PLAN_PRICE_INR);
  const desktopPlans = createDefaultDesktopPlanCatalog(desktopPlanPriceInr);
  const setupSupportPlans = createDefaultSetupSupportPlanCatalog();
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || null,
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null,
    supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET || null,
    desktopPlanPriceInr,
    desktopPlans,
    setupSupportPlans,
  };
};

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
        readError: null,
      });
    }
  } catch (error) {
    console.error("GET /api/app-config failed to read DB:", error);
    const message = error instanceof Error ? error.message : 'Failed to read app config from database.';
    return NextResponse.json({
      ...fallback,
      source: "env",
      updatedAt: null,
      storageConfigured,
      readError: process.env.NODE_ENV === 'production' ? 'Failed to read app config from database.' : message,
    });
  }

  return NextResponse.json({
    ...fallback,
    source: "env",
    updatedAt: null,
    storageConfigured,
    readError: null,
  });
}

export async function POST(request: Request) {
  const sessionUser = getSessionUserFromRequest(request);
  const authHeader = request.headers.get("authorization") || "";
  const bearerToken = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : "";
  const tokenPayload = bearerToken ? verifyAccessToken(bearerToken) : null;
  const tokenUser = tokenPayload?.sub?.trim().toLowerCase() || null;
  const effectiveUser = sessionUser || tokenUser;

  if (!isAdminUsername(effectiveUser)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 403 });
  }

  if (!isAppConfigStorageConfigured()) {
    return NextResponse.json({ error: "Supabase server storage is not configured." }, { status: 500 });
  }

  const payload = await request.json().catch(() => ({}));
  const supabaseUrl = String(payload?.supabaseUrl || "").trim();
  const supabaseAnonKey = String(payload?.supabaseAnonKey || "").trim();
  const supabaseStorageBucket = String(payload?.supabaseStorageBucket || "").trim() || null;
  const desktopPlans = normalizeDesktopPlanCatalog(payload?.desktopPlans, normalizeDesktopPlanPriceInr(payload?.desktopPlanPriceInr, DESKTOP_PLAN_PRICE_INR));
  const setupSupportPlans = normalizeSetupSupportPlanCatalog(payload?.setupSupportPlans);
  const desktopPlanPriceInr = getDesktopPlanFinalPriceInr(getFeaturedDesktopPlan(desktopPlans));

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Supabase URL and anon key are required." }, { status: 400 });
  }
  if (!Number.isFinite(desktopPlanPriceInr) || desktopPlanPriceInr < 0) {
    return NextResponse.json({ error: 'Desktop featured plan price must be a zero-or-higher whole-number INR amount.' }, { status: 400 });
  }

  try {
    const saved = await upsertAppConfig({
      supabaseUrl,
      supabaseAnonKey,
      supabaseStorageBucket,
      desktopPlanPriceInr,
      desktopPlans,
      setupSupportPlans,
    });
    return NextResponse.json({
      ...saved,
      source: "db",
      storageConfigured: true,
    });
  } catch (error) {
    console.error("POST /api/app-config error:", error);
    const message = error instanceof Error ? error.message : 'Failed to save app config.';
    return NextResponse.json(
      { error: process.env.NODE_ENV === 'production' ? 'Failed to save app config.' : message },
      { status: 500 }
    );
  }
}
