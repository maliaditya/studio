"use client";

import { useEffect, useMemo, useState } from "react";

type Snapshot = {
  total: number;
  byMode: { curated: number; open: number };
  byPath: { deterministic: number; ai_fallback: number; clarify: number };
  avgLatencyMs: number;
  p95LatencyMs: number;
  failureRate: number;
  modeQuality: {
    curated: { avgLatencyMs: number; avgConfidence: number };
    open: { avgLatencyMs: number; avgConfidence: number };
  };
  recommendMode: "open" | "curated";
  clarifyRateCurated: number;
  latest: Array<{
    ts: string;
    question: string;
    mode: "curated" | "open";
    path: string;
    handlerId: string | null;
    confidence: number;
    latencyMs: number;
    sttMs?: number;
    llmMs?: number;
    ttsMs?: number;
  }>;
};

export default function ShivObservabilityPage() {
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const res = await fetch("/api/ai/shiv-observability", { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(String(data?.error || "Failed to load Shiv observability."));
        if (mounted) {
          setSnapshot(data);
          setError("");
        }
      } catch (e) {
        if (mounted) setError(e instanceof Error ? e.message : "Unknown error");
      }
    };
    void load();
    const timer = window.setInterval(() => void load(), 3000);
    return () => {
      mounted = false;
      window.clearInterval(timer);
    };
  }, []);

  const latestRows = useMemo(() => (snapshot?.latest || []).slice(0, 30), [snapshot]);

  return (
    <div className="mx-auto max-w-6xl p-6">
      <h1 className="text-2xl font-semibold">Shiv Observability</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Local metrics for retrieval quality, fallback behavior, and voice latency budget.
      </p>

      {error ? <div className="mt-4 rounded border border-destructive/40 p-3 text-sm text-destructive">{error}</div> : null}

      <div className="mt-6 grid gap-3 md:grid-cols-4">
        <Metric label="Total Queries" value={String(snapshot?.total || 0)} />
        <Metric label="Avg Latency" value={`${snapshot?.avgLatencyMs || 0} ms`} />
        <Metric label="P95 Latency" value={`${snapshot?.p95LatencyMs || 0} ms`} />
        <Metric label="Failure Rate" value={`${((snapshot?.failureRate || 0) * 100).toFixed(1)}%`} />
      </div>

      <div className="mt-6 grid gap-3 md:grid-cols-2">
        <Metric label="Curated Mode" value={`${snapshot?.byMode?.curated || 0} queries`} sub={`conf ${snapshot?.modeQuality?.curated?.avgConfidence || 0}`} />
        <Metric label="Open Mode" value={`${snapshot?.byMode?.open || 0} queries`} sub={`conf ${snapshot?.modeQuality?.open?.avgConfidence || 0}`} />
      </div>

      <div className="mt-3 rounded border p-3 text-sm">
        Recommendation: <span className="font-semibold">{snapshot?.recommendMode || "curated"}</span>
        <span className="ml-2 text-muted-foreground">
          (curated clarify rate {(Number(snapshot?.clarifyRateCurated || 0) * 100).toFixed(1)}%)
        </span>
      </div>

      <div className="mt-6 overflow-auto rounded border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted/50 text-xs text-muted-foreground">
            <tr>
              <th className="px-3 py-2">Time</th>
              <th className="px-3 py-2">Mode</th>
              <th className="px-3 py-2">Path</th>
              <th className="px-3 py-2">Handler</th>
              <th className="px-3 py-2">Latency</th>
              <th className="px-3 py-2">Voice Budget</th>
              <th className="px-3 py-2">Question</th>
            </tr>
          </thead>
          <tbody>
            {latestRows.map((row, idx) => (
              <tr key={`${row.ts}-${idx}`} className="border-t border-border/60">
                <td className="px-3 py-2">{new Date(row.ts).toLocaleTimeString()}</td>
                <td className="px-3 py-2">{row.mode}</td>
                <td className="px-3 py-2">{row.path}</td>
                <td className="px-3 py-2">{row.handlerId || "-"}</td>
                <td className="px-3 py-2">{row.latencyMs} ms</td>
                <td className="px-3 py-2">
                  {row.sttMs || row.llmMs || row.ttsMs
                    ? `stt ${row.sttMs || 0} | llm ${row.llmMs || 0} | tts ${row.ttsMs || 0}`
                    : "-"}
                </td>
                <td className="max-w-[24rem] truncate px-3 py-2" title={row.question}>
                  {row.question}
                </td>
              </tr>
            ))}
            {!latestRows.length ? (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                  No events yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded border p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
      {sub ? <div className="text-xs text-muted-foreground">{sub}</div> : null}
    </div>
  );
}
