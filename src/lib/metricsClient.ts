"use client";

type DesktopAuthHttpBridge = {
  request: (payload: {
    url: string;
    method: string;
    headers?: Record<string, string>;
    body?: string;
  }) => Promise<{ success: boolean; ok?: boolean; status?: number; data?: unknown; error?: string }>;
};

const isDesktopRuntime = () => typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);

const resolveMetricsBase = (): string => {
  if (typeof window === "undefined") return "";
  const desktopBase = (window as any)?.studioDesktop?.authBaseUrl;
  if (typeof desktopBase === "string" && desktopBase.trim().length > 0) return desktopBase.trim();
  const fromEnv = process.env.NEXT_PUBLIC_AUTH_BASE_URL || "";
  return fromEnv.trim();
};

const buildMetricsUrl = (path: string): string => {
  const base = resolveMetricsBase();
  if (!base) return path;
  return new URL(path, base.endsWith("/") ? base : `${base}/`).toString();
};

export const sendMetricsRequest = async <T = unknown>(
  path: string,
  body?: Record<string, unknown>
): Promise<{ ok: boolean; status: number; data: T | null }> => {
  const url = buildMetricsUrl(path);
  const base = resolveMetricsBase();
  const shouldUseDesktopProxy =
    isDesktopRuntime() &&
    Boolean(base) &&
    typeof window !== "undefined" &&
    !url.startsWith(window.location.origin);

  if (shouldUseDesktopProxy) {
    const bridge = (window as any)?.studioDesktop?.authHttp as DesktopAuthHttpBridge | undefined;
    if (!bridge?.request) {
      return { ok: false, status: 500, data: null };
    }
    const proxied = await bridge.request({
      url,
      method: body ? "POST" : "GET",
      headers: body ? { "Content-Type": "application/json" } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    return {
      ok: Boolean(proxied?.ok),
      status: Number(proxied?.status || 0),
      data: ((proxied?.data || null) as T | null),
    };
  }

  const response = await fetch(url, {
    method: body ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    credentials: "include",
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = (await response.json().catch(() => null)) as T | null;
  return { ok: response.ok, status: response.status, data };
};

export const trackEngagementMetric = async (username: string, dateIso?: string) => {
  return sendMetricsRequest("/api/metrics/engagement", {
    username: username.trim().toLowerCase(),
    date: dateIso || new Date().toISOString(),
  });
};

export const trackSupportMetric = async (
  event: "support_page_view" | "support_cta_click" | "donation_intent",
  channel?: "buymeacoffee" | "upi" | "razorpay",
  amountUsd?: number
) => {
  const payload: Record<string, unknown> = {
    event,
    channel,
  };
  if (typeof amountUsd === "number" && Number.isFinite(amountUsd)) {
    payload.amountUsd = amountUsd;
  }

  return sendMetricsRequest("/api/metrics/support-event", {
    ...payload,
  });
};
