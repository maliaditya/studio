import type { Domain, ShivPath } from "@/lib/shiv/types";

export type ShivObsEvent = {
  ts: string;
  question: string;
  mode: "curated" | "open";
  path: ShivPath;
  handlerId: string | null;
  confidence: number;
  latencyMs: number;
  usedDomains: Domain[];
  provider?: string;
  model?: string;
  relevancePassed?: boolean;
  groundingPassed?: boolean;
  sttMs?: number;
  ttsMs?: number;
  llmMs?: number;
};

const MAX_EVENTS = 500;
const events: ShivObsEvent[] = [];

export const trackShivEvent = (event: ShivObsEvent) => {
  events.push(event);
  if (events.length > MAX_EVENTS) {
    events.splice(0, events.length - MAX_EVENTS);
  }
};

export const getShivObservabilitySnapshot = () => {
  const total = events.length;
  const byMode = {
    curated: events.filter((e) => e.mode === "curated").length,
    open: events.filter((e) => e.mode === "open").length,
  };
  const byPath = {
    deterministic: events.filter((e) => e.path === "deterministic").length,
    ai_fallback: events.filter((e) => e.path === "ai_fallback").length,
    clarify: events.filter((e) => e.path === "clarify").length,
  };
  const avgLatencyMs = total ? Math.round(events.reduce((a, b) => a + b.latencyMs, 0) / total) : 0;
  const p95LatencyMs = total
    ? [...events]
        .map((e) => e.latencyMs)
        .sort((a, b) => a - b)[Math.max(0, Math.floor(total * 0.95) - 1)]
    : 0;
  const failureRate =
    total === 0 ? 0 : events.filter((e) => e.path === "clarify" && e.confidence < 0.5).length / total;

  const modeQuality = {
    curated: {
      avgLatencyMs:
        byMode.curated === 0
          ? 0
          : Math.round(events.filter((e) => e.mode === "curated").reduce((a, b) => a + b.latencyMs, 0) / byMode.curated),
      avgConfidence:
        byMode.curated === 0
          ? 0
          : Number(
              (
                events.filter((e) => e.mode === "curated").reduce((a, b) => a + Number(b.confidence || 0), 0) /
                byMode.curated
              ).toFixed(3)
            ),
    },
    open: {
      avgLatencyMs:
        byMode.open === 0
          ? 0
          : Math.round(events.filter((e) => e.mode === "open").reduce((a, b) => a + b.latencyMs, 0) / byMode.open),
      avgConfidence:
        byMode.open === 0
          ? 0
          : Number(
              (
                events.filter((e) => e.mode === "open").reduce((a, b) => a + Number(b.confidence || 0), 0) / byMode.open
              ).toFixed(3)
            ),
    },
  };

  const clarifyRateCurated =
    byMode.curated === 0
      ? 0
      : events.filter((e) => e.mode === "curated" && e.path === "clarify").length / byMode.curated;
  const recommendMode = clarifyRateCurated > 0.35 ? "open" : "curated";

  return {
    total,
    byMode,
    byPath,
    avgLatencyMs,
    p95LatencyMs,
    failureRate,
    modeQuality,
    recommendMode,
    clarifyRateCurated,
    latest: events.slice(-80).reverse(),
  };
};
