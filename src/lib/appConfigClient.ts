"use client";

export type AppConfigPayload = {
  supabaseUrl: string | null;
  supabaseAnonKey: string | null;
  supabaseStorageBucket: string | null;
  desktopPlanPriceInr: number | null;
  updatedAt?: string | null;
  source?: "db" | "env";
  storageConfigured?: boolean;
};

const resolveCloudBase = () => {
  if (typeof window === "undefined") return "";
  const desktopBase = (window as any)?.studioDesktop?.authBaseUrl;
  if (typeof desktopBase === "string" && desktopBase.trim().length > 0) return desktopBase.trim();
  const fromEnv = process.env.NEXT_PUBLIC_AUTH_BASE_URL || "";
  return fromEnv.trim();
};

const shouldUseDesktopProxy = (url: string, cloudBase: string) =>
  Boolean((window as any)?.studioDesktop?.isDesktop) &&
  Boolean(cloudBase) &&
  typeof window !== "undefined" &&
  !url.startsWith(window.location.origin);

const requestJson = async <T>(
  url: string,
  init: { method: string; headers?: Record<string, string>; body?: string },
  useProxy: boolean
): Promise<{ ok: boolean; status: number; data: T | null }> => {
  if (useProxy) {
    const bridge = (window as any)?.studioDesktop?.authHttp;
    if (!bridge?.request) {
      throw new Error("Desktop cloud proxy is unavailable.");
    }
    const proxied = await bridge.request({
      url,
      method: init.method,
      headers: init.headers,
      body: init.body,
    });
    if (!proxied?.success) {
      throw new Error(proxied?.error || "Failed to call cloud config API.");
    }
    return { ok: Boolean(proxied.ok), status: Number(proxied.status || 0), data: (proxied.data as T) ?? null };
  }

  const response = await fetch(url, {
    method: init.method,
    headers: init.headers,
    credentials: "include",
    cache: "no-store",
    body: init.body,
  });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, data };
};

export async function fetchAppConfig(): Promise<AppConfigPayload> {
  const cloudBase = resolveCloudBase();
  const localUrl = "/api/app-config";
  const url = cloudBase ? `${cloudBase.replace(/\/$/, "")}/api/app-config` : localUrl;
  const useProxy = shouldUseDesktopProxy(url, cloudBase);
  const result = await requestJson<AppConfigPayload>(url, { method: "GET" }, useProxy);
  if (!result.ok || !result.data) {
    throw new Error("Failed to load app configuration.");
  }
  return result.data;
}

export async function saveAppConfig(
  payload: {
    supabaseUrl: string;
    supabaseAnonKey: string;
    supabaseStorageBucket?: string | null;
    desktopPlanPriceInr: number;
  },
  accessToken?: string | null
): Promise<AppConfigPayload> {
  const cloudBase = resolveCloudBase();
  const localUrl = "/api/app-config";
  const url = cloudBase ? `${cloudBase.replace(/\/$/, "")}/api/app-config` : localUrl;
  const useProxy = shouldUseDesktopProxy(url, cloudBase);
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;
  const result = await requestJson<AppConfigPayload>(
    url,
    {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    },
    useProxy
  );
  if (!result.ok || !result.data) {
    const error = (result.data as any)?.error || "Failed to save app configuration.";
    throw new Error(error);
  }
  return result.data;
}
