import { createClient } from "@supabase/supabase-js";

export type AppConfigRecord = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseStorageBucket: string | null;
  updatedAt: string | null;
};

const CONFIG_TABLE = "app_config";
const CONFIG_ID = "default";

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

const toRecord = (row: any): AppConfigRecord => ({
  supabaseUrl: row?.supabase_url ?? null,
  supabaseAnonKey: row?.supabase_anon_key ?? null,
  supabaseStorageBucket: row?.supabase_storage_bucket ?? null,
  updatedAt: row?.updated_at ?? null,
});

export async function readAppConfigFromDb(): Promise<AppConfigRecord | null> {
  const client = getAdminClient();
  const { data, error } = await client
    .from(CONFIG_TABLE)
    .select("id, supabase_url, supabase_anon_key, supabase_storage_bucket, updated_at")
    .eq("id", CONFIG_ID)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || "Failed to read app config.");
  }
  if (!data) return null;
  return toRecord(data);
}

export async function upsertAppConfig(payload: {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseStorageBucket?: string | null;
}): Promise<AppConfigRecord> {
  const client = getAdminClient();
  const now = new Date().toISOString();
  const { data, error } = await client
    .from(CONFIG_TABLE)
    .upsert(
      {
        id: CONFIG_ID,
        supabase_url: payload.supabaseUrl,
        supabase_anon_key: payload.supabaseAnonKey,
        supabase_storage_bucket: payload.supabaseStorageBucket ?? null,
        updated_at: now,
      },
      { onConflict: "id" }
    )
    .select("id, supabase_url, supabase_anon_key, supabase_storage_bucket, updated_at")
    .single();

  if (error) {
    throw new Error(error.message || "Failed to save app config.");
  }
  return toRecord(data);
}
