import { createClient } from "@supabase/supabase-js";
import { DESKTOP_PLAN_PRICE_INR, normalizeDesktopPlanPriceInr } from '@/lib/desktopAccess';
import {
  createDefaultDesktopPlanCatalog,
  getFeaturedDesktopPlan,
  getDesktopPlanFinalPriceInr,
  normalizeDesktopPlanCatalog,
  type DesktopPlanCatalog,
} from '@/lib/desktopPlans';

export type AppConfigRecord = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseStorageBucket: string | null;
  desktopPlanPriceInr: number;
  desktopPlans: DesktopPlanCatalog;
  updatedAt: string | null;
};

const CONFIG_TABLE = "app_config";
const CONFIG_ID = "default";
const CONFIG_SELECT = 'id, supabase_url, supabase_anon_key, supabase_storage_bucket, desktop_price_inr, desktop_plans, updated_at';
const CONFIG_SELECT_LEGACY = 'id, supabase_url, supabase_anon_key, supabase_storage_bucket, updated_at';

const getSupabaseUrl = () => process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const getServiceRoleKey = () => process.env.SUPABASE_SERVICE_ROLE_KEY || "";

export const isAppConfigStorageConfigured = () => Boolean(getSupabaseUrl() && getServiceRoleKey());

const getAdminClient = () => {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  if (!url || !key) {
    throw new Error("Supabase server credentials are missing. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
};

const describeDbError = (error: unknown): string => {
  if (error instanceof Error) {
    return error.message || String(error);
  }
  if (error && typeof error === 'object') {
    const record = error as Record<string, unknown>;
    const parts = [record.message, record.details, record.hint, record.code]
      .map((value) => (typeof value === 'string' ? value.trim() : ''))
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' | ');
    try {
      const serialized = JSON.stringify(record);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Fall through.
    }
    return String(record);
  }
  return String(error || '');
};

const isMissingConfigColumnError = (error: unknown, columnName: string) => {
  const lower = describeDbError(error).toLowerCase();
  return lower.includes(columnName.toLowerCase()) && (lower.includes('column') || lower.includes('schema cache'));
};

const toRecord = (row: any): AppConfigRecord => ({
  supabaseUrl: row?.supabase_url ?? null,
  supabaseAnonKey: row?.supabase_anon_key ?? null,
  supabaseStorageBucket: row?.supabase_storage_bucket ?? null,
  desktopPlanPriceInr: normalizeDesktopPlanPriceInr(row?.desktop_price_inr, DESKTOP_PLAN_PRICE_INR),
  desktopPlans: normalizeDesktopPlanCatalog(row?.desktop_plans, normalizeDesktopPlanPriceInr(row?.desktop_price_inr, DESKTOP_PLAN_PRICE_INR)),
  updatedAt: row?.updated_at ?? null,
});

export async function readAppConfigFromDb(): Promise<AppConfigRecord | null> {
  const client = getAdminClient();
  let result = await client.from(CONFIG_TABLE).select(CONFIG_SELECT).eq('id', CONFIG_ID).maybeSingle();

  if (result.error && (isMissingConfigColumnError(result.error, 'desktop_price_inr') || isMissingConfigColumnError(result.error, 'desktop_plans'))) {
    result = await client.from(CONFIG_TABLE).select(CONFIG_SELECT_LEGACY).eq('id', CONFIG_ID).maybeSingle();
  }

  if (result.error) {
    throw new Error(describeDbError(result.error) || "Failed to read app config.");
  }
  if (!result.data) return null;
  return toRecord(result.data);
}

export async function upsertAppConfig(payload: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseStorageBucket?: string | null;
  desktopPlanPriceInr: number;
  desktopPlans?: DesktopPlanCatalog | null;
}): Promise<AppConfigRecord> {
  const client = getAdminClient();
  const now = new Date().toISOString();
  const desktopPlans = normalizeDesktopPlanCatalog(payload.desktopPlans, payload.desktopPlanPriceInr);
  const featuredPlan = getFeaturedDesktopPlan(desktopPlans);
  const { data, error } = await client
    .from(CONFIG_TABLE)
    .upsert(
      {
        id: CONFIG_ID,
        supabase_url: payload.supabaseUrl,
        supabase_anon_key: payload.supabaseAnonKey,
        supabase_storage_bucket: payload.supabaseStorageBucket ?? null,
        desktop_price_inr: getDesktopPlanFinalPriceInr(featuredPlan),
        desktop_plans: desktopPlans,
        updated_at: now,
      },
      { onConflict: "id" }
    )
    .select(CONFIG_SELECT)
    .single();

  if (error) {
    if (isMissingConfigColumnError(error, 'desktop_price_inr') || isMissingConfigColumnError(error, 'desktop_plans')) {
      throw new Error('App config table is missing desktop pricing columns. Run docs/app-config.sql in Supabase SQL Editor before saving plans from admin.');
    }
    throw new Error(describeDbError(error) || "Failed to save app config.");
  }
  return toRecord(data);
}

export async function readConfiguredDesktopPlanPriceInr(): Promise<number> {
  if (!isAppConfigStorageConfigured()) return DESKTOP_PLAN_PRICE_INR;
  try {
    const config = await readAppConfigFromDb();
    return normalizeDesktopPlanPriceInr(config?.desktopPlanPriceInr, DESKTOP_PLAN_PRICE_INR);
  } catch {
    return DESKTOP_PLAN_PRICE_INR;
  }
}

export async function readConfiguredDesktopPlanCatalog(): Promise<DesktopPlanCatalog> {
  if (!isAppConfigStorageConfigured()) return createDefaultDesktopPlanCatalog(DESKTOP_PLAN_PRICE_INR);
  try {
    const config = await readAppConfigFromDb();
    return normalizeDesktopPlanCatalog(config?.desktopPlans, config?.desktopPlanPriceInr || DESKTOP_PLAN_PRICE_INR);
  } catch {
    return createDefaultDesktopPlanCatalog(DESKTOP_PLAN_PRICE_INR);
  }
}
