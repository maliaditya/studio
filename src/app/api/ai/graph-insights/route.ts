import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import { parseJsonWithRecovery } from "@/lib/jsonRecovery";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type GraphPayload = {
  nodeCount: number;
  edgeCount: number;
  nodes: Array<{ id: string; label: string; type: string; degree: number }>;
  edges: Array<{ source: string; target: string; type: string }>;
  structuralFindings?: {
    hubs?: Array<{ label: string; degree: number }>;
    looseEnds?: string[];
    disconnectedClusters?: number;
    systemGaps?: string[];
  };
};

const stripCodeFences = (value: string) =>
  value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonObject = (value: string): string | null => {
  const start = value.indexOf("{");
  const end = value.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  return value.slice(start, end + 1);
};

const tryParseInsightsPayload = (value: string) => {
  const normalized = stripCodeFences(value);
  try {
    return parseJsonWithRecovery<{
      overview?: string;
      clusters?: Array<{ label?: string; summary?: string; nodeLabels?: string[] }>;
      leverageNodes?: Array<{ label?: string; reason?: string }>;
      blindSpots?: string[];
      nextActions?: string[];
    }>(normalized);
  } catch {
    const extracted = extractJsonObject(normalized);
    if (!extracted) return null;
    try {
      return parseJsonWithRecovery<{
        overview?: string;
        clusters?: Array<{ label?: string; summary?: string; nodeLabels?: string[] }>;
        leverageNodes?: Array<{ label?: string; reason?: string }>;
        blindSpots?: string[];
        nextActions?: string[];
      }>(extracted);
    } catch {
      return null;
    }
  }
};

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    if (!isDesktopRuntime) {
      return NextResponse.json(
        { error: "Desktop-only endpoint. Use the Electron desktop client." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const graph = (body?.graph || {}) as Partial<GraphPayload>;
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      return NextResponse.json({ error: "Graph nodes are required." }, { status: 400 });
    }

    const aiConfig = getAiConfigFromSettings(
      {
        ai: {
          provider: aiConfigInput.provider,
          model: aiConfigInput.model,
          ollamaBaseUrl: aiConfigInput.ollamaBaseUrl,
          openaiApiKey: aiConfigInput.openaiApiKey,
          openaiBaseUrl: aiConfigInput.openaiBaseUrl,
          perplexityApiKey: aiConfigInput.perplexityApiKey,
          perplexityBaseUrl: aiConfigInput.perplexityBaseUrl,
          anthropicApiKey: aiConfigInput.anthropicApiKey,
          anthropicBaseUrl: aiConfigInput.anthropicBaseUrl,
          requestTimeoutMs: aiConfigInput.requestTimeoutMs,
        },
      },
      true
    );

    if (aiConfig.provider === "none") {
      return NextResponse.json(
        { error: "AI provider is not set. Choose a provider in Settings > AI Settings." },
        { status: 400 }
      );
    }

    const systemPrompt = [
      "You analyze a personal knowledge/workflow graph and return structured strategic insights.",
      "Be concrete, not motivational.",
      "Infer clusters, leverage points, blind spots, and practical next actions from the graph structure.",
      "Return strict JSON only. No markdown fences.",
    ].join(" ");

    const schema = {
      overview: "string",
      clusters: [{ label: "string", summary: "string", nodeLabels: ["string"] }],
      leverageNodes: [{ label: "string", reason: "string" }],
      blindSpots: ["string"],
      nextActions: ["string"],
    };

    const userPrompt = [
      "Analyze this graph payload.",
      `Expected JSON schema: ${JSON.stringify(schema)}`,
      "Constraints:",
      "- overview: 2-4 sentences",
      "- clusters: max 4",
      "- leverageNodes: max 4",
      "- blindSpots: max 5",
      "- nextActions: max 5",
      "- nodeLabels inside clusters should use labels from the graph when possible",
      `Graph payload: ${JSON.stringify(graph)}`,
    ].join("\n\n");

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2 }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: "AI provider call failed.",
          details: aiResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }

    const rawContent = String(aiResponse.content || "");
    let parsed = tryParseInsightsPayload(rawContent);

    if (!parsed) {
      const repairResponse = await runChatWithProvider(
        aiConfig,
        [
          {
            role: "system",
            content:
              "Convert the following analysis into strict JSON only. Preserve meaning. Do not add markdown fences.",
          },
          {
            role: "user",
            content: [
              `Expected JSON schema: ${JSON.stringify(schema)}`,
              "Return valid JSON only.",
              rawContent,
            ].join("\n\n"),
          },
        ],
        { temperature: 0 }
      );

      if (repairResponse.ok) {
        parsed = tryParseInsightsPayload(String(repairResponse.content || ""));
      }
    }

    const content = stripCodeFences(rawContent);

    const insights = {
      overview: String(parsed?.overview || "").trim(),
      clusters: Array.isArray(parsed?.clusters)
        ? parsed!.clusters
            .map((item) => ({
              label: String(item?.label || "").trim(),
              summary: String(item?.summary || "").trim(),
              nodeLabels: Array.isArray(item?.nodeLabels)
                ? item!.nodeLabels.map((label) => String(label || "").trim()).filter(Boolean).slice(0, 6)
                : [],
            }))
            .filter((item) => item.label && item.summary)
            .slice(0, 4)
        : [],
      leverageNodes: Array.isArray(parsed?.leverageNodes)
        ? parsed!.leverageNodes
            .map((item) => ({
              label: String(item?.label || "").trim(),
              reason: String(item?.reason || "").trim(),
            }))
            .filter((item) => item.label && item.reason)
            .slice(0, 4)
        : [],
      blindSpots: Array.isArray(parsed?.blindSpots)
        ? parsed!.blindSpots.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
        : [],
      nextActions: Array.isArray(parsed?.nextActions)
        ? parsed!.nextActions.map((item) => String(item || "").trim()).filter(Boolean).slice(0, 5)
        : [],
    };

    if (!insights.overview) {
      return NextResponse.json(
        { error: "Provider returned an invalid graph analysis payload.", details: content.slice(0, 500) },
        { status: 502 }
      );
    }

    return NextResponse.json({
      insights,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { error: "Unable to generate AI graph insights.", details: message },
      { status: 500 }
    );
  }
}
