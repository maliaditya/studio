"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AuthGuard } from "@/components/AuthGuard";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle2, RefreshCw, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { fetchAppConfig, saveAppConfig, type AppConfigPayload } from "@/lib/appConfigClient";
import { getAccessToken } from "@/lib/localAuth";

const ADMIN_USERS = (() => {
  const fromEnv = (process.env.NEXT_PUBLIC_ADMIN_USERNAMES || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  return fromEnv.length > 0 ? fromEnv : ["lonewolf"];
})();

function AdminConfigPageContent() {
  const { currentUser, setSettings } = useAuth();
  const { toast } = useToast();
  const [config, setConfig] = useState<AppConfigPayload | null>(null);
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [supabaseStorageBucket, setSupabaseStorageBucket] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = useMemo(() => {
    const username = currentUser?.username?.trim().toLowerCase() || "";
    return ADMIN_USERS.includes(username);
  }, [currentUser?.username]);

  const loadConfig = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAppConfig();
      setConfig(data);
      setSupabaseUrl(data.supabaseUrl || "");
      setSupabaseAnonKey(data.supabaseAnonKey || "");
      setSupabaseStorageBucket(data.supabaseStorageBucket || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load config.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isAdmin) return;
    void loadConfig();
  }, [isAdmin]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const username = (currentUser?.username || "").trim().toLowerCase();
      const accessToken = username ? getAccessToken(username) : null;
      const payload = await saveAppConfig(
        {
          supabaseUrl: supabaseUrl.trim(),
          supabaseAnonKey: supabaseAnonKey.trim(),
          supabaseStorageBucket: supabaseStorageBucket.trim() || null,
        },
        accessToken
      );
      setConfig(payload);
      setSettings((prev) => ({
        ...prev,
        supabaseUrl: payload.supabaseUrl || prev.supabaseUrl,
        supabaseAnonKey: payload.supabaseAnonKey || prev.supabaseAnonKey,
        supabasePdfBucket: payload.supabaseStorageBucket || prev.supabasePdfBucket,
      }));
      toast({ title: "Saved", description: "Supabase config updated for all apps." });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save config.";
      setError(message);
      toast({ title: "Save Failed", description: message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

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

  return (
    <div className="container mx-auto space-y-6 p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">App Config</h1>
          <p className="text-sm text-muted-foreground">
            Update public Supabase settings used by web and desktop apps.
          </p>
        </div>
        <div className="flex items-end gap-2">
          <Button variant="outline" onClick={() => void loadConfig()} disabled={loading}>
            <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button onClick={handleSave} disabled={saving || loading}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? "Saving..." : "Save"}
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

      <Card>
        <CardHeader>
          <CardTitle>Supabase Public Config</CardTitle>
          <CardDescription>Only public keys are stored here. Service role keys stay server-only.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase URL</label>
            <Input
              value={supabaseUrl}
              onChange={(event) => setSupabaseUrl(event.target.value)}
              placeholder="https://YOUR_PROJECT.supabase.co"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase Anon Key</label>
            <Input
              type="password"
              value={supabaseAnonKey}
              onChange={(event) => setSupabaseAnonKey(event.target.value)}
              placeholder="sb_publishable_..."
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Supabase Storage Bucket</label>
            <Input
              value={supabaseStorageBucket}
              onChange={(event) => setSupabaseStorageBucket(event.target.value)}
              placeholder="dock-data"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Status</CardTitle>
          <CardDescription>Configuration source and last update timestamp.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center justify-between">
            <span>Storage Configured</span>
            <span className="flex items-center gap-2 text-foreground">
              {config?.storageConfigured === false ? (
                <>
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Not configured
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                  Ready
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>Source</span>
            <span className="text-foreground">{config?.source || "unknown"}</span>
          </div>
          <div className="flex items-center justify-between">
            <span>Last Updated</span>
            <span className="text-foreground">
              {config?.updatedAt ? new Date(config.updatedAt).toLocaleString() : "N/A"}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function AdminConfigPage() {
  return (
    <AuthGuard>
      <AdminConfigPageContent />
    </AuthGuard>
  );
}
