"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;
let cachedKey = "";

export function getSupabaseClient(urlOverride?: string, anonKeyOverride?: string): SupabaseClient {
  const url = urlOverride || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = anonKeyOverride || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const nextCacheKey = `${url || ""}::${anonKey || ""}`;
  if (client && cachedKey === nextCacheKey) return client;

  if (!url || !anonKey) {
    throw new Error("Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.");
  }

  client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  cachedKey = nextCacheKey;
  return client;
}
