"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Download, ExternalLink, HardDrive, Play, RefreshCw, Sparkles, Square, TerminalSquare, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

const DISMISS_KEY = "dock.desktop-readiness.dismissed.v2";
const SEEN_KEY = "dock.desktop-readiness.seen.v1";
const DEFAULT_XTTS_BASE_URL = "http://127.0.0.1:8020";

function getReadinessIssueSignature(
  status: DesktopEnvironmentStatus | null,
  microphone: MicrophoneStatus
): string {
  if (!status) return "unknown";

  const issues: string[] = [];
  if (!status.docker.running) issues.push("docker");
  if (!status.ollama.healthy) issues.push("ollama");
  if (status.ollama.configuredModel && !status.ollama.hasConfiguredModel) issues.push("ollama-model");
  if (!status.kokoro.healthy) issues.push("kokoro");
  if (!status.stt.healthy) issues.push("stt");
  if (microphone === "denied") issues.push("microphone");

  return issues.length > 0 ? issues.join("|") : "ok";
}

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
  actions,
}: {
  label: string;
  ok: boolean;
  value: string;
  note: string;
  progress?: number;
  actions?: Array<{
    key: string;
    label: string;
    icon: React.ReactNode;
    onClick: () => void;
    disabled?: boolean;
  }>;
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
      {actions && actions.length > 0 ? (
        <TooltipProvider delayDuration={150}>
          <div className="mt-3 flex items-center justify-end gap-1.5">
            {actions.map((action) => (
              <Tooltip key={action.key}>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    onClick={action.onClick}
                    disabled={action.disabled}
                  >
                    {action.icon}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{action.label}</p>
                </TooltipContent>
              </Tooltip>
            ))}
          </div>
        </TooltipProvider>
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
  const [isStoppingKokoro, setIsStoppingKokoro] = useState(false);
  const [isStartingXtts, setIsStartingXtts] = useState(false);
  const [isStoppingXtts, setIsStoppingXtts] = useState(false);
  const [isInstallingXtts, setIsInstallingXtts] = useState(false);
  const [isStartingStt, setIsStartingStt] = useState(false);
  const [isStoppingStt, setIsStoppingStt] = useState(false);

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
        xttsBaseUrl: (settings.xttsTtsBaseUrl || "http://127.0.0.1:8020").trim(),
        sttBaseUrl: (settings.localSttBaseUrl || "http://127.0.0.1:9890").trim(),
      });
      setStatus(nextStatus || null);
      const resolvedXttsBaseUrl = String(nextStatus?.xtts?.baseUrl || "").trim();
      if (resolvedXttsBaseUrl && resolvedXttsBaseUrl !== (settings.xttsTtsBaseUrl || "").trim()) {
        setSettings((prev) => ({ ...prev, xttsTtsBaseUrl: resolvedXttsBaseUrl }));
      }
      const resolvedSttBaseUrl = String(nextStatus?.stt?.baseUrl || "").trim();
      if (resolvedSttBaseUrl && resolvedSttBaseUrl !== (settings.localSttBaseUrl || "").trim()) {
        setSettings((prev) => ({ ...prev, localSttBaseUrl: resolvedSttBaseUrl }));
      }
    } finally {
      setIsRefreshing(false);
    }
  }, [isDesktopRuntime, setSettings, settings.ai?.model, settings.ai?.ollamaBaseUrl, settings.kokoroTtsBaseUrl, settings.localSttBaseUrl, settings.xttsTtsBaseUrl]);

  useEffect(() => {
    if (!isDesktopRuntime) return;
    void refreshStatus();
  }, [isDesktopRuntime, refreshStatus]);

  useEffect(() => {
    if (!isDesktopRuntime) return;
    const kokoroWarming = Boolean(status?.kokoro?.warming && !status?.kokoro?.healthy);
    const xttsWarming = Boolean(status?.xtts?.warming && !status?.xtts?.healthy);
    if (!isSttWarming(status) && !isStartingStt && !isStartingKokoro && !isStartingXtts && !kokoroWarming && !xttsWarming) return;
    const timer = window.setInterval(() => {
      void refreshStatus();
    }, 5000);
    return () => {
      window.clearInterval(timer);
    };
  }, [isDesktopRuntime, isStartingKokoro, isStartingStt, isStartingXtts, refreshStatus, status]);

  const score = status ? getDesktopReadinessScore(status, microphone) : 0;
  const readinessLabel = getDesktopReadinessStatusLabel(score);
  const fallbackMessages = status ? getDesktopFallbackMessages(status, microphone) : [];
  const isXttsBridgeSupported = Boolean(status && Object.prototype.hasOwnProperty.call(status, "xtts"));
  const xttsNeedsRecreate = Boolean(status?.xtts?.error?.includes("needs to be recreated"));
  const xttsCanRecreate = Boolean(status?.xtts?.healthy && status?.xtts?.running);
  const kokoroUpgradeAvailable = Boolean(status?.kokoro?.upgradeAvailable);

  const canStartKokoro = isDesktopRuntime && (!status?.kokoro?.healthy || kokoroUpgradeAvailable);
  const resolvedXttsBaseUrl = (settings.xttsTtsBaseUrl || DEFAULT_XTTS_BASE_URL).trim();
  const canStartXtts = isDesktopRuntime && isXttsBridgeSupported && (!status?.xtts?.healthy || xttsNeedsRecreate || xttsCanRecreate);
  const canStartStt = isDesktopRuntime && !status?.stt?.healthy;
  const sttWarming = isSttWarming(status);
  const kokoroWarming = Boolean(status?.kokoro?.warming && !status?.kokoro?.healthy);
  const xttsWarming = Boolean(status?.xtts?.warming && !status?.xtts?.healthy);

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
          forceRecreate: kokoroUpgradeAvailable,
        });
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, kokoroTtsBaseUrl: String(result.baseUrl) }));
      }
    } finally {
      setIsStartingKokoro(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus, setSettings, settings.kokoroTtsBaseUrl, kokoroUpgradeAvailable]);

  const startXtts = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.startServer || !isXttsBridgeSupported) return;
    setIsStartingXtts(true);
    try {
        const result = await bridge.xtts.startServer({
          baseUrl: resolvedXttsBaseUrl,
          forceRecreate: xttsNeedsRecreate || xttsCanRecreate,
        });
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, xttsTtsBaseUrl: String(result.baseUrl) }));
      }
    } catch {
      // stale desktop process may not have XTTS IPC yet; keep the dialog usable
    } finally {
      setIsStartingXtts(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, isXttsBridgeSupported, refreshStatus, resolvedXttsBaseUrl, setSettings, xttsCanRecreate, xttsNeedsRecreate]);

  const installXtts = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.install || !isXttsBridgeSupported) return;
    setIsInstallingXtts(true);
    try {
      await bridge.xtts.install({});
    } catch {
      // stale desktop process may not have XTTS install IPC yet; keep the dialog usable
    } finally {
      setIsInstallingXtts(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, isXttsBridgeSupported, refreshStatus]);

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

  const stopKokoro = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.kokoro?.stopServer) return;
    setIsStoppingKokoro(true);
    try {
      await bridge.kokoro.stopServer({});
    } finally {
      setIsStoppingKokoro(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus]);

  const stopXtts = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.stopServer) return;
    setIsStoppingXtts(true);
    try {
      await bridge.xtts.stopServer({});
    } finally {
      setIsStoppingXtts(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus]);

  const stopStt = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.stt?.stopServer) return;
    setIsStoppingStt(true);
    try {
      await bridge.stt.stopServer({});
    } finally {
      setIsStoppingStt(false);
      void refreshStatus();
    }
  }, [isDesktopRuntime, refreshStatus]);

  const openLogs = useCallback(async () => {
    const bridge = (window as any)?.studioDesktop;
    const target = status?.logFilePath || status?.userDataPath;
    if (!bridge?.desktop?.openPath || !target) return;
    await bridge.desktop.openPath({ path: target });
  }, [status?.logFilePath, status?.userDataPath]);

  const providerSummary = useMemo(() => {
    const provider = settings.ai?.provider || "none";
    const model = settings.ai?.model || "";
    if (provider === "none") return "AI provider not configured";
    return `${provider}${model ? ` | ${model}` : ""}`;
  }, [settings.ai?.model, settings.ai?.provider]);

  const dockerActions = useMemo(() => {
    const actions: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = [];
    if (!status?.docker?.running) {
      actions.push({
        key: "start-docker",
        label: isStartingDocker ? "Starting Docker..." : "Start Docker",
        icon: isStartingDocker ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />,
        onClick: () => void startDocker(),
        disabled: isStartingDocker,
      });
    }
    actions.push({
      key: "docker-site",
      label: "Open Docker download",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: () => openExternal("https://www.docker.com/products/docker-desktop/"),
    });
    return actions;
  }, [isStartingDocker, startDocker, status?.docker?.running]);

  const ollamaActions = useMemo(() => ([
    {
      key: "ollama-site",
      label: "Open Ollama download",
      icon: <ExternalLink className="h-3.5 w-3.5" />,
      onClick: () => openExternal("https://ollama.com/download"),
    },
  ]), []);

  const kokoroActions = useMemo(() => {
    const actions: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = [];
    if (canStartKokoro) {
      actions.push({
        key: "start-kokoro",
        label: isStartingKokoro
          ? (kokoroUpgradeAvailable ? "Upgrading Kokoro..." : "Starting Kokoro...")
          : (kokoroUpgradeAvailable ? "Upgrade Kokoro to GPU" : "Start Kokoro"),
        icon: isStartingKokoro ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : kokoroUpgradeAvailable ? <Wrench className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />,
        onClick: () => void startKokoro(),
        disabled: isStartingKokoro,
      });
    }
    if (status?.kokoro?.running && status?.kokoro?.managed) {
      actions.push({
        key: "stop-kokoro",
        label: isStoppingKokoro ? "Stopping Kokoro..." : "Stop Kokoro",
        icon: isStoppingKokoro ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />,
        onClick: () => void stopKokoro(),
        disabled: isStoppingKokoro,
      });
    }
    return actions;
  }, [canStartKokoro, isStartingKokoro, isStoppingKokoro, kokoroUpgradeAvailable, startKokoro, status?.kokoro?.managed, status?.kokoro?.running, stopKokoro]);

  const xttsActions = useMemo(() => {
    const actions: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = [];
    if (canStartXtts) {
      actions.push({
        key: "start-xtts",
        label: isStartingXtts || xttsWarming
          ? ((xttsNeedsRecreate || xttsCanRecreate) ? "Recreating XTTS..." : "Starting XTTS...")
          : ((xttsNeedsRecreate || xttsCanRecreate) ? "Recreate XTTS" : "Start XTTS"),
        icon: isStartingXtts || xttsWarming ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : ((xttsNeedsRecreate || xttsCanRecreate) ? <Wrench className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />),
        onClick: () => void startXtts(),
        disabled: isStartingXtts,
      });
    }
    if (status?.xtts?.running && status?.xtts?.managed) {
      actions.push({
        key: "stop-xtts",
        label: isStoppingXtts ? "Stopping XTTS..." : "Stop XTTS",
        icon: isStoppingXtts ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />,
        onClick: () => void stopXtts(),
        disabled: isStoppingXtts,
      });
    }
    if (isXttsBridgeSupported) {
      actions.push({
        key: "install-xtts",
        label: isInstallingXtts ? "Installing XTTS..." : "Install XTTS",
        icon: isInstallingXtts ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />,
        onClick: () => void installXtts(),
        disabled: isInstallingXtts,
      });
    }
    return actions;
  }, [canStartXtts, installXtts, isInstallingXtts, isStartingXtts, isStoppingXtts, isXttsBridgeSupported, startXtts, status?.xtts?.managed, status?.xtts?.running, stopXtts, xttsCanRecreate, xttsNeedsRecreate, xttsWarming]);

  const sttActions = useMemo(() => {
    const actions: Array<{ key: string; label: string; icon: React.ReactNode; onClick: () => void; disabled?: boolean }> = [];
    if (canStartStt) {
      actions.push({
        key: "start-stt",
        label: isStartingStt || sttWarming ? "Starting STT..." : "Start STT",
        icon: isStartingStt || sttWarming ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />,
        onClick: () => void startStt(),
        disabled: isStartingStt,
      });
    }
    if (status?.stt?.running && status?.stt?.managed) {
      actions.push({
        key: "stop-stt",
        label: isStoppingStt ? "Stopping STT..." : "Stop STT",
        icon: isStoppingStt ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Square className="h-3.5 w-3.5" />,
        onClick: () => void stopStt(),
        disabled: isStoppingStt,
      });
    }
    return actions;
  }, [canStartStt, isStartingStt, isStoppingStt, startStt, status?.stt?.managed, status?.stt?.running, stopStt, sttWarming]);

  const safetyActions = useMemo(() => ([
    {
      key: "export-backup",
      label: "Export backup",
      icon: <HardDrive className="h-3.5 w-3.5" />,
      onClick: exportData,
    },
  ]), [exportData]);

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
            actions={dockerActions}
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
            actions={ollamaActions}
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
              note={kokoroUpgradeAvailable ? "GPU is available. Recreate Kokoro to switch from CPU to GPU." : status?.kokoro?.error || status?.kokoro?.baseUrl || "Used for higher-quality local read-aloud."}
              progress={kokoroWarming ? status?.kokoro?.warmingProgress : undefined}
              actions={kokoroActions}
            />
          <StatusRow
            label="XTTS v2"
            ok={Boolean(status?.xtts?.healthy)}
            value={
              status?.xtts?.healthy
                ? `running${status?.xtts?.mode ? ` (${status.xtts.mode})` : status?.xtts?.backend ? ` (${status.xtts.backend})` : ""}`
                : !isXttsBridgeSupported
                ? "unavailable"
                : xttsWarming
                ? "warming up"
                : "offline"
            }
            note={status?.xtts?.error || (!isXttsBridgeSupported ? "Restart desktop app to enable XTTS controls." : status?.xtts?.baseUrl || resolvedXttsBaseUrl)}
            progress={xttsWarming ? status?.xtts?.warmingProgress : undefined}
            actions={xttsActions}
          />
          <StatusRow
            label="Local STT"
            ok={Boolean(status?.stt?.healthy)}
            value={
              status?.stt?.healthy
                ? `running${status?.stt?.mode ? ` (${status.stt.mode})` : status?.stt?.backend ? ` (${status.stt.backend})` : ""}`
                : sttWarming
                ? "warming up"
                : "offline"
            }
            note={status?.stt?.error || status?.stt?.baseUrl || "Used for microphone transcription and voice chat."}
            progress={sttWarming ? status?.stt?.warmingProgress : undefined}
            actions={sttActions}
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
            actions={safetyActions}
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
        <Button variant="outline" size="sm" onClick={() => void openLogs()}>
          <TerminalSquare className="mr-2 h-3.5 w-3.5" />
          Open logs
        </Button>
      </div>
    </div>
  );
}

export function DesktopReadinessDialog() {
  const isDesktopRuntime =
    typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const [open, setOpen] = useState(false);
  const [manualOpen, setManualOpen] = useState(false);
  const [hasSeenPrompt, setHasSeenPrompt] = useState(false);
  const [lastIssueSignature, setLastIssueSignature] = useState<string | null>(null);
  const [currentIssueSignature, setCurrentIssueSignature] = useState<string>("unknown");
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
      xttsBaseUrl: (settings.xttsTtsBaseUrl || "http://127.0.0.1:8020").trim(),
      sttBaseUrl: (settings.localSttBaseUrl || "http://127.0.0.1:9890").trim(),
    });
    return { microphone, status };
  }, [isDesktopRuntime, settings.ai?.model, settings.ai?.ollamaBaseUrl, settings.kokoroTtsBaseUrl, settings.localSttBaseUrl, settings.xttsTtsBaseUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setHasSeenPrompt(localStorage.getItem(SEEN_KEY) === "1");
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOpen = () => {
      setManualOpen(true);
      setOpen(true);
    };
    window.addEventListener("open-desktop-readiness-dialog", handleOpen as EventListener);
    return () => {
      window.removeEventListener("open-desktop-readiness-dialog", handleOpen as EventListener);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const runCheck = async () => {
      const result = await fetchEnvironmentStatus();
      if (!result) return;
      const { microphone, status } = result;
      if (cancelled) return;

      const issueSignature = getReadinessIssueSignature(status, microphone);
      setCurrentIssueSignature(issueSignature);

      const shouldOpenForIssue =
        issueSignature !== "ok" &&
        issueSignature !== "unknown" &&
        hasSeenPrompt &&
        lastIssueSignature === "ok" &&
        shouldShowDesktopReadinessPrompt(status, microphone);

      if (shouldOpenForIssue) {
        setManualOpen(false);
        setOpen(true);
      }

      if (!hasSeenPrompt && typeof window !== "undefined") {
        localStorage.setItem(SEEN_KEY, "1");
        setHasSeenPrompt(true);
      }

      setLastIssueSignature(issueSignature);
    };

    void runCheck();
    const timer = window.setInterval(() => {
      void runCheck();
    }, 12000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [fetchEnvironmentStatus, hasSeenPrompt, lastIssueSignature]);

  if (!isDesktopRuntime) return null;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setManualOpen(false);
        }
      }}
    >
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
              localStorage.setItem(SEEN_KEY, "1");
              setHasSeenPrompt(true);
              setOpen(false);
            }}
          >
            Review later
          </Button>
          <Button
            onClick={() => {
              localStorage.setItem(DISMISS_KEY, String(Date.now()));
              localStorage.setItem(SEEN_KEY, "1");
              setHasSeenPrompt(true);
              setLastIssueSignature(currentIssueSignature);
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
