"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, HardDrive, RefreshCw, Sparkles, TerminalSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import {
  type DesktopEnvironmentStatus,
  type MicrophoneStatus,
  getConfiguredOllamaBaseUrl,
  getConfiguredOllamaModel,
  getDesktopFallbackMessages,
  getDesktopReadinessScore,
  getDesktopReadinessStatusLabel,
  getMicrophoneStatus,
  shouldShowDesktopReadinessPrompt,
} from "@/lib/desktopReadiness";

const DISMISS_KEY = "dock.desktop-readiness.dismissed.v1";

const openExternal = (url: string) => {
  if (typeof window === "undefined") return;
  window.open(url, "_blank", "noopener,noreferrer");
};

function statusTone(ok: boolean) {
  return ok ? "text-emerald-400" : "text-amber-300";
}

function isSttWarming(status: DesktopEnvironmentStatus | null) {
  const stt = status?.stt;
  if (!stt || stt.healthy) return false;
  return Boolean(
    (stt as any).warming ||
      (stt.running && stt.backend === "docker") ||
      /warming|downloading|starting/i.test(String(stt.error || ""))
  );
}

function StatusRow({
  label,
  ok,
  value,
  note,
  progress,
}: {
  label: string;
  ok: boolean;
  value: string;
  note: string;
  progress?: number;
}) {
  return (
    <div className="rounded-lg border border-border/60 bg-muted/20 p-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-medium">{label}</div>
        <div className={`text-xs font-medium ${statusTone(ok)}`}>{value}</div>
      </div>
      <div className="mt-1 text-xs text-muted-foreground">{note}</div>
      {typeof progress === "number" && progress > 0 ? (
        <div className="mt-3 space-y-1">
          <Progress value={progress} className="h-1.5" />
          <div className="text-[11px] text-muted-foreground">{progress}% of expected startup window</div>
        </div>
      ) : null}
    </div>
  );
}

function DesktopReadinessPanel({
  compact = false,
}: {
  compact?: boolean;
}) {
  const { settings, setSettings, exportData } = useAuth();
  const isDesktopRuntime =
    typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const [status, setStatus] = useState<DesktopEnvironmentStatus | null>(null);
  const [microphone, setMicrophone] = useState<MicrophoneStatus>("unknown");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isStartingDocker, setIsStartingDocker] = useState(false);
  const [isStartingKokoro, setIsStartingKokoro] = useState(false);
  const [isStartingStt, setIsStartingStt] = useState(false);

  const backupConfigured = Boolean(
    (settings.githubToken || "").trim() &&
      (settings.githubOwner || "").trim() &&
      (settings.githubRepo || "").trim()
  );

  const refreshStatus = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.environmentStatus) return;
    setIsRefreshing(true);
    try {
      const nextMicrophone = await getMicrophoneStatus();
      setMicrophone(nextMicrophone);
      const nextStatus = await bridge.desktop.environmentStatus({
        ollamaBaseUrl: getConfiguredOllamaBaseUrl(settings.ai?.ollamaBaseUrl),
        ollamaModel: getConfiguredOllamaModel(settings.ai?.model),
        kokoroBaseUrl: (settings.kokoroTtsBaseUrl || "http://127.0.0.1:8880").trim(),
        sttBaseUrl: (settings.localSttBaseUrl || "http://127.0.0.1:9890").trim(),
      });
      setStatus(nextStatus || null);
      const resolvedSttBaseUrl = String(nextStatus?.stt?.baseUrl || "").trim();
      if (resolvedSttBaseUrl && resolvedSttBaseUrl !== (settings.localSttBaseUrl || "").trim()) {
        setSettings((prev) => ({ ...prev, localSttBaseUrl: resolvedSttBaseUrl }));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isDesktopRuntime, setSettings, settings.ai?.model, settings.ai?.ollamaBaseUrl, settings.kokoroTtsBaseUrl, settings.localSttBaseUrl]);

  useEffect(() => {
    if (!isDesktopRuntime) return;
    void refreshStatus();
  }, [isDesktopRuntime, refreshStatus]);

  useEffect(() => {
    if (!isDesktopRuntime) return;
    const kokoroWarming = Boolean(status?.kokoro?.warming && !status?.kokoro?.healthy);
    if (!isSttWarming(status) && !isStartingStt && !isStartingKokoro && !kokoroWarming) return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 5000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isDesktopRuntime, isStartingKokoro, isStartingStt, refreshStatus, status]);

  const score = status ? getDesktopReadinessScore(status, microphone) : 0;
  const readinessLabel = getDesktopReadinessStatusLabel(score);
  const fallbackMessages = status ? getDesktopFallbackMessages(status, microphone) : [];

  const canStartKokoro = isDesktopRuntime && !status?.kokoro?.healthy;
  const canStartStt = isDesktopRuntime && !status?.stt?.healthy;
  const sttWarming = isSttWarming(status);
  const kokoroWarming = Boolean(status?.kokoro?.warming && !status?.kokoro?.healthy);

  const providerSummary = useMemo(() => {
    const provider = settings.ai?.provider || "none";
    const model = settings.ai?.model || "";
    if (provider === "none") return "AI provider not configured";
    return `${provider}${model ? ` | ${model}` : ""}`;
  }, [settings.ai?.model, settings.ai?.provider]);

  const startDocker = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.startDocker) return;
    setIsStartingDocker(true);
    try {
      await bridge.desktop.startDocker({ waitMs: 70000 });
    } finally {
      setIsStartingDocker(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus]);

  const startKokoro = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.kokoro?.startServer) return;
    setIsStartingKokoro(true);
    try {
      const result = await bridge.kokoro.startServer({
        baseUrl: (settings.kokoroTtsBaseUrl || "http://127.0.0.1:8880").trim(),
      });
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, kokoroTtsBaseUrl: String(result.baseUrl) }));
      }
    } finally {
      setIsStartingKokoro(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus, setSettings, settings.kokoroTtsBaseUrl]);

  const startStt = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.stt?.startServer) return;
    setIsStartingStt(true);
    try {
      const result = await bridge.stt.startServer({
        baseUrl: (settings.localSttBaseUrl || "http://127.0.0.1:9890").trim(),
      });
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, localSttBaseUrl: String(result.baseUrl) }));
      }
    } finally {
      setIsStartingStt(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus, setSettings, settings.localSttBaseUrl]);

  const openLogs = useCallback(async () => {
    const bridge = (window as any)?.studioDesktop;
    const target = status?.logFilePath || status?.userDataPath;
    if (!bridge?.desktop?.openPath || !target) return;
    await bridge.desktop.openPath({ path: target });
  }, [status?.logFilePath, status?.userDataPath]);

  if (!isDesktopRuntime) return null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-400/20 bg-emerald-500/5 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Sparkles className="h-4 w-4 text-emerald-300" />
              Desktop Readiness
            </div>
            <div className="mt-1 text-sm text-muted-foreground">
              DOCK is a desktop operating system for planning, execution, review, and local-first AI assistance.
            </div>
          </div>
          <Badge variant="outline" className="border-emerald-400/30 bg-emerald-500/10 text-emerald-200">
            {readinessLabel}
          </Badge>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <div className="rounded-lg border border-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Readiness score</div>
            <div className="mt-1 text-2xl font-semibold">{score}%</div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">AI provider</div>
            <div className="mt-1 text-sm font-medium">{providerSummary}</div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Backup status</div>
            <div className="mt-1 text-sm font-medium">{backupConfigured ? "Configured" : "Not configured"}</div>
          </div>
          <div className="rounded-lg border border-white/10 p-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">Runtime</div>
            <div className="mt-1 text-sm font-medium">{status?.platform || "desktop"}</div>
          </div>
        </div>
        <div className="mt-3">
          <Progress value={score} className="h-2" />
        </div>
      </div>

      {!compact ? (
        <div className="grid gap-3 md:grid-cols-2">
          <StatusRow
            label="Docker Desktop"
            ok={Boolean(status?.docker?.running)}
            value={status?.docker?.running ? "running" : status?.docker?.installed ? "installed only" : "missing"}
            note={status?.docker?.error || status?.docker?.version || "Required for managed Kokoro and STT."}
          />
          <StatusRow
            label="Ollama"
            ok={Boolean(status?.ollama?.healthy && (status?.ollama?.hasConfiguredModel || status?.ollama?.models?.length))}
            value={
              status?.ollama?.healthy
                ? status?.ollama?.hasConfiguredModel
                  ? "server + model ready"
                  : "server ready, model missing"
                : status?.ollama?.installed
                ? "installed only"
                : "missing"
            }
            note={
              status?.ollama?.healthy
                ? `${status?.ollama?.models?.length || 0} model(s) detected at ${status?.ollama?.baseUrl || getConfiguredOllamaBaseUrl(settings.ai?.ollamaBaseUrl)}.`
                : status?.ollama?.error || "Required for local AI generation."
            }
          />
          <StatusRow
            label="Kokoro TTS"
            ok={Boolean(status?.kokoro?.healthy)}
            value={
              status?.kokoro?.healthy
                ? `running${status?.kokoro?.mode ? ` (${status.kokoro.mode})` : ""}`
                : kokoroWarming
                ? "warming up"
                : "offline"
            }
            note={status?.kokoro?.error || status?.kokoro?.baseUrl || "Used for higher-quality local read-aloud."}
            progress={kokoroWarming ? status?.kokoro?.warmingProgress : undefined}
          />
          <StatusRow
            label="Local STT"
            ok={Boolean(status?.stt?.healthy)}
            value={
              status?.stt?.healthy
                ? `running${status?.stt?.backend ? ` (${status.stt.backend})` : ""}`
                : sttWarming
                ? "warming up"
                : "offline"
            }
            note={status?.stt?.error || status?.stt?.baseUrl || "Used for microphone transcription and voice chat."}
            progress={sttWarming ? status?.stt?.warmingProgress : undefined}
          />
          <StatusRow
            label="Microphone permission"
            ok={microphone === "granted" || microphone === "prompt"}
            value={microphone}
            note="Voice chat and speech-to-text need microphone access."
          />
          <StatusRow
            label="Data safety"
            ok={backupConfigured}
            value={backupConfigured ? "backup configured" : "local only"}
            note="Public launch needs a clear export/backup path, not only local browser storage."
          />
        </div>
      ) : null}

      <div className="rounded-xl border border-border/60 bg-muted/20 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <AlertTriangle className="h-4 w-4 text-amber-300" />
          Fallback behavior
        </div>
        <div className="mt-3 space-y-2 text-sm text-muted-foreground">
          {fallbackMessages.map((message) => (
            <div key={message} className="flex items-start gap-2">
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 text-emerald-300" />
              <span>{message}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button variant="outline" size="sm" onClick={() => void refreshStatus()} disabled={isRefreshing}>
          <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
          Refresh
        </Button>
        {!status?.docker?.running ? (
          <Button variant="outline" size="sm" onClick={() => void startDocker()} disabled={isStartingDocker}>
            {isStartingDocker ? "Starting Docker..." : "Start Docker"}
          </Button>
        ) : null}
        {canStartKokoro ? (
          <Button variant="outline" size="sm" onClick={() => void startKokoro()} disabled={isStartingKokoro}>
            {isStartingKokoro ? "Starting Kokoro..." : "Start Kokoro"}
          </Button>
        ) : null}
        {canStartStt ? (
          <Button variant="outline" size="sm" onClick={() => void startStt()} disabled={isStartingStt}>
            {isStartingStt || sttWarming ? "Starting STT..." : "Start STT"}
          </Button>
        ) : null}
        <Button variant="outline" size="sm" onClick={exportData}>
          <HardDrive className="mr-2 h-3.5 w-3.5" />
          Export backup
        </Button>
        <Button variant="outline" size="sm" onClick={() => void openLogs()}>
          <TerminalSquare className="mr-2 h-3.5 w-3.5" />
          Open logs
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openExternal("https://www.docker.com/products/docker-desktop/")}>
          Docker
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={() => openExternal("https://ollama.com/download")}>
          Ollama
          <ExternalLink className="ml-2 h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}

export function DesktopReadinessDialog() {
  const isDesktopRuntime =
    typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const [open, setOpen] = useState(false);
  const { settings } = useAuth();
  const fetchEnvironmentStatus = useCallback(async () => {
    if (!isDesktopRuntime) return null;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.environmentStatus) return null;
    const microphone = await getMicrophoneStatus();
    const status = await bridge.desktop.environmentStatus({
      ollamaBaseUrl: getConfiguredOllamaBaseUrl(settings.ai?.ollamaBaseUrl),
      ollamaModel: getConfiguredOllamaModel(settings.ai?.model),
      kokoroBaseUrl: (settings.kokoroTtsBaseUrl || "http://127.0.0.1:8880").trim(),
      sttBaseUrl: (settings.localSttBaseUrl || "http://127.0.0.1:9890").trim(),
    });
    return { microphone, status };
  }, [isDesktopRuntime, settings.ai?.model, settings.ai?.ollamaBaseUrl, settings.kokoroTtsBaseUrl, settings.localSttBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      const result = await fetchEnvironmentStatus();
      if (!result) return;
      const { microphone, status } = result;
      if (cancelled) return;

      const shouldOpen = shouldShowDesktopReadinessPrompt(status, microphone);
      if (shouldOpen) {
        setOpen(true);
        return;
      }

      const dismissed = typeof window !== "undefined" ? localStorage.getItem(DISMISS_KEY) : "1";
      if (!dismissed) {
        setOpen(true);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [fetchEnvironmentStatus]);

  useEffect(() => {
    if (!open) return;

    let cancelled = false;
    const checkIfResolved = async () => {
      const result = await fetchEnvironmentStatus();
      if (!result || cancelled) return;
      const { microphone, status } = result;
      if (!shouldShowDesktopReadinessPrompt(status, microphone)) {
        setOpen(false);
      }
    };

    void checkIfResolved();
    const timer = window.setInterval(() => {
      void checkIfResolved();
    }, 4000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [open, fetchEnvironmentStatus]);

  if (!isDesktopRuntime) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Desktop Setup and Launch Readiness</DialogTitle>
          <DialogDescription>
            This is the first-run environment check for the desktop app. It verifies the local AI stack, fallback behavior, data safety, and diagnostics.
          </DialogDescription>
        </DialogHeader>
        <DesktopReadinessPanel />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setOpen(false);
            }}
          >
            Review later
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              setOpen(false);
            }}
          >
            Dismiss
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export { DesktopReadinessPanel };
