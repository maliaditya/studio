"use client";

import React, { useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, CheckCircle2, RefreshCw } from "lucide-react";
import { getAccessToken } from "@/lib/localAuth";

type MonetizationSummary = {
  month: string | null;
  mau: number;
  d30RetentionPercent: number;
  supportPageViews: number;
  supportCtaClicks: number;
  donationIntentCount: number;
  donationFunnelConversionPercent: number;
  monthlyDonationRevenueUsd: number;
  storageConfigured?: boolean;
};

const ADMIN_USERS = (() => {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_USERNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : ["lonewolf"];
})();

const resolveCloudBase = () => {
  if (typeof window === "undefined") return "";
  const desktopBase = (window as any)?.studioDesktop?.authBaseUrl;
  if (typeof desktopBase === "string" && desktopBase.trim().length > 0) return desktopBase.trim();
  const fromEnv = process.env.NEXT_PUBLIC_AUTH_BASE_URL || "";
  return fromEnv.trim();
};

const toMonthInputValue = (date: Date) => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
};

const monthLabel = (month: string | null) => {
  if (!month) return "N/A";
  const [yearStr, monthStr] = month.split("-");
  const year = Number(yearStr);
  const monthIndex = Number(monthStr) - 1;
  const dt = new Date(Date.UTC(year, monthIndex, 1));
  return dt.toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" });
};

function MetricStatusRow({
  label,
  current,
  threshold,
  suffix = "",
  prefix = "",
}: {
  label: string;
  current: number;
  threshold: number;
  suffix?: string;
  prefix?: string;
}) {
  const passed = current >= threshold;
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">Target: {prefix}{threshold}{suffix}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-semibold">{prefix}{current}{suffix}</span>
        <Badge variant={passed ? "default" : "secondary"}>{passed ? "Pass" : "Below"}</Badge>
      </div>
    </div>
  );
}

function AdminMonetizationPageContent() {
  const { currentUser } = useAuth();
  const [month, setMonth] = useState<string>(toMonthInputValue(new Date()));
  const [summary, setSummary] = useState<MonetizationSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const username = currentUser?.username?.trim().toLowerCase() || "";
    return ADMIN_USERS.includes(username);
  }, [currentUser?.username]);

  const fetchSummary = async (monthKey: string) => {
    setLoading(true);
    setError(null);
    try {
      const username = (currentUser?.username || "").trim().toLowerCase();
      const accessToken = username ? getAccessToken(username) : null;
      const cloudBase = resolveCloudBase();
      const localUrl = `/api/metrics/monetization-summary?month=${encodeURIComponent(monthKey)}`;
      const url = cloudBase ? `${cloudBase.replace(/\/$/, "")}/api/metrics/monetization-summary?month=${encodeURIComponent(monthKey)}` : localUrl;
      const shouldUseDesktopProxy =
        Boolean((window as any)?.studioDesktop?.isDesktop) &&
        Boolean(cloudBase) &&
        typeof window !== "undefined" &&
        !url.startsWith(window.location.origin);

      let ok = false;
      let payload: (MonetizationSummary & { error?: string }) | null = null;

      if (shouldUseDesktopProxy) {
        const bridge = (window as any)?.studioDesktop?.authHttp;
        if (!bridge?.request) {
          throw new Error("Desktop cloud proxy is unavailable.");
        }
        const proxied = await bridge.request({
          url,
          method: "GET",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        if (!proxied?.success) {
          throw new Error(proxied?.error || "Failed to call cloud metrics API.");
        }
        ok = Boolean(proxied.ok);
        payload = (proxied.data || null) as MonetizationSummary & { error?: string };
      } else {
        const response = await fetch(url, {
          cache: "no-store",
          credentials: "include",
          headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
        });
        ok = response.ok;
        payload = (await response.json()) as MonetizationSummary & { error?: string };
      }

      if (!ok || !payload) {
        throw new Error(payload?.error || "Failed to load monetization summary.");
      }
      setSummary(payload);
      setLastUpdated(new Date().toLocaleString());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load monetization summary.");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (!isAdmin) return;
    void fetchSummary(month);
  }, [isAdmin, month]);

  if (!isAdmin) {
    return (
      <div className="container mx-auto p-6">
        <Card className="border-destructive/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Access Denied
            </CardTitle>
            <CardDescription>This page is restricted to admin users.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const gate1 = (summary?.mau || 0) >= 1500;
  const gate2 = (summary?.donationFunnelConversionPercent || 0) >= 1;
  const gate3 = (summary?.monthlyDonationRevenueUsd || 0) >= 1000;
  const gate4 = (summary?.d30RetentionPercent || 0) >= 25;
  const passedCount = [gate1, gate2, gate3, gate4].filter(Boolean).length;

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Monetization Admin</h1>
          <p className="text-sm text-muted-foreground">Stage 1 metrics for donation-only to pricing transition.</p>
        </div>
        <div className="flex items-end gap-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Month</label>
            <Input
              type="month"
              value={month}
              onChange={(event) => setMonth(event.target.value)}
              className="w-[180px]"
            />
          </div>
          <Button variant="outline" onClick={() => void fetchSummary(month)} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive/40">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardDescription>Month</CardDescription>
            <CardTitle>{monthLabel(summary?.month || month)}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Last updated: {lastUpdated || "Not loaded"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Gate Status</CardDescription>
            <CardTitle>{passedCount}/4 thresholds passed</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge variant={passedCount === 4 ? "default" : "secondary"}>
              {passedCount === 4 ? "Pricing-ready signal" : "Continue donations stage"}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Storage</CardDescription>
            <CardTitle>{summary?.storageConfigured === false ? "Not configured" : "Configured"}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-muted-foreground">
            Requires server `BLOB_READ_WRITE_TOKEN`.
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Current Metrics</CardTitle>
          <CardDescription>Targets must be met for 2 consecutive months before pricing rollout.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <MetricStatusRow label="MAU" current={summary?.mau || 0} threshold={1500} />
          <MetricStatusRow label="Support Conversion" current={summary?.donationFunnelConversionPercent || 0} threshold={1} suffix="%" />
          <MetricStatusRow label="Monthly Donation Revenue" current={summary?.monthlyDonationRevenueUsd || 0} threshold={1000} prefix={"$"} />
          <MetricStatusRow label="D30 Retention" current={summary?.d30RetentionPercent || 0} threshold={25} suffix="%" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Funnel Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Support Page Views</p>
            <p className="text-2xl font-semibold">{summary?.supportPageViews || 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Support CTA Clicks</p>
            <p className="text-2xl font-semibold">{summary?.supportCtaClicks || 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Donation Intents</p>
            <p className="text-2xl font-semibold">{summary?.donationIntentCount || 0}</p>
          </div>
        </CardContent>
      </Card>

      {passedCount === 4 && (
        <Card className="border-emerald-500/40 bg-emerald-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
              Stage Signal Achieved
            </CardTitle>
            <CardDescription>
              All thresholds passed for this month. Confirm a second consecutive month before enabling pricing.
            </CardDescription>
          </CardHeader>
        </Card>
      )}
    </div>
  );
}

export default function AdminMonetizationPage() {
  return (
    <AuthGuard>
      <AdminMonetizationPageContent />
    </AuthGuard>
  );
}
