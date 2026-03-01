import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type AiSuggestion = {
  id: string;
  routineId?: string;
  routine_id?: string;
  details?: string;
  title?: string;
  name?: string;
  action: "move_slot" | "stagger";
  suggestedSlot?: string;
  suggested_slot?: string;
  targetSlot?: string;
  toSlot?: string;
  targetRule?: {
    type: "daily" | "weekly" | "custom";
    repeatInterval?: number;
    repeatUnit?: "day" | "week" | "month";
  };
  confidence?: number;
  reason?: string;
  impact?: string;
};
type IndexSuggestion = {
  index: number;
  action?: "move_slot" | "stagger";
  suggestedSlot?: string;
  confidence?: number;
  reason?: string;
  impact?: string;
  targetRule?: {
    type: "daily" | "weekly" | "custom";
    repeatInterval?: number;
    repeatUnit?: "day" | "week" | "month";
  };
};

const SLOT_ORDER = ["Late Night", "Dawn", "Morning", "Afternoon", "Evening", "Night"] as const;

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
};

const parseJsonSafe = (raw: string): { value: any | null; error?: string } => {
  try {
    return { value: JSON.parse(raw) };
  } catch (error) {
    return { value: null, error: error instanceof Error ? error.message : "Invalid JSON" };
  }
};

const normalizeText = (value: unknown) =>
  String(value || "")
    .toLowerCase()
    .replace(/[^\w]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    if (desktopHeader !== "1") {
      return NextResponse.json(
        { error: "Desktop-only endpoint. Use the Electron desktop client." },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const baselineSuggestions = Array.isArray(body?.baselineSuggestions) ? body.baselineSuggestions : [];
    const historical = body?.historical ?? {};
    const routines = Array.isArray(body?.routines) ? body.routines : [];
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;
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
    if (aiConfig.provider === "openai" && !aiConfig.openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required when provider is OpenAI." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
      return NextResponse.json(
        { error: "Ollama base URL is required when provider is Ollama." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "perplexity" && !aiConfig.perplexityApiKey) {
      return NextResponse.json(
        { error: "Perplexity API key is required when provider is Perplexity." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "anthropic" && !aiConfig.anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API key is required when provider is Anthropic." },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You are a strict planning assistant. Improve routine rebalance suggestions from historical completion and workload data. Return only JSON.";

    const userPrompt = `Task:
Refine routine rebalance suggestions for better execution consistency.
Use historical data and existing algorithm suggestions. Keep suggestions conservative.

Rules:
- Only use routine IDs from the provided routines list.
- Prefer "move_slot" when slot mismatch/pressure is clear.
- Use "stagger" only when routine is consistently overloaded.
- For move_slot, suggestedSlot must be one of: ${SLOT_ORDER.join(", ")}.
- confidence must be between 0 and 1.
- Try to provide suggestions for as many routines as possible.
- Do not include markdown. Output valid JSON only.

Expected JSON shape:
{
  "suggestions": [
    {
      "id": "routine_id",
      "action": "move_slot" | "stagger",
      "suggestedSlot": "Evening",
      "targetRule": { "type":"custom","repeatInterval":2,"repeatUnit":"day" },
      "confidence": 0.72,
      "reason": "short reason",
      "impact": "short impact"
    }
  ]
}

Data:
${JSON.stringify({
  baselineSuggestions,
  historical,
  routines,
  routineCatalog: routines.map((r: any) => ({ id: r.id, details: r.details })),
})}`;

    const firstPass = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { format: "json", temperature: 0.1 }
    );
    if (!firstPass.ok) {
      return NextResponse.json(
        {
          error: `${firstPass.provider === "openai" ? "OpenAI" : firstPass.provider === "ollama" ? "Ollama" : firstPass.provider === "perplexity" ? "Perplexity" : firstPass.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${firstPass.model || aiConfig.model}).`,
          details: firstPass.details || "",
        },
        { status: 502 }
      );
    }
    const content = firstPass.content;
    if (!content) {
      return NextResponse.json({ error: "Ollama returned an empty response." }, { status: 502 });
    }

    const jsonText = extractJson(content);
    const directParse = parseJsonSafe(jsonText);
    const parsed = (directParse.value || {}) as {
      suggestions?: AiSuggestion[];
      recommendation?: AiSuggestion[];
      recommendations?: AiSuggestion[];
      data?: { suggestions?: AiSuggestion[] };
    };
    const rawSuggestions =
      (Array.isArray(parsed?.suggestions) && parsed.suggestions) ||
      (Array.isArray(parsed?.recommendations) && parsed.recommendations) ||
      (Array.isArray(parsed?.recommendation) && parsed.recommendation) ||
      (Array.isArray(parsed?.data?.suggestions) && parsed.data.suggestions) ||
      (Array.isArray(directParse.value) ? (directParse.value as AiSuggestion[]) : []);

    const routineRows = routines
      .map((r: any) => ({
        id: String(r?.id || ""),
        details: String(r?.details || ""),
      }))
      .filter((r: { id: string; details: string }) => r.id);
    const idToRoutine = new Map(routineRows.map((r: { id: string; details: string }) => [r.id, r] as const));
    const detailsToId = new Map(
      routineRows.map((r: { id: string; details: string }) => [normalizeText(r.details), r.id] as const)
    );
    let suggestions = rawSuggestions
      .map((s) => {
        if (!s) return null;
        const explicitId = String(s.id || s.routineId || s.routine_id || "").trim();
        const byDetailsKey = normalizeText(s.details || s.title || s.name || "");
        const resolvedId =
          (explicitId && idToRoutine.has(explicitId) ? explicitId : "") ||
          (byDetailsKey ? detailsToId.get(byDetailsKey) || "" : "");
        if (!resolvedId) return null;
        const action: "move_slot" | "stagger" = s.action === "stagger" ? "stagger" : "move_slot";
        const confidence = Number.isFinite(s.confidence) ? Math.max(0, Math.min(1, Number(s.confidence))) : 0.65;
        const slotCandidate = s.suggestedSlot || s.suggested_slot || s.targetSlot || s.toSlot;
        const suggestedSlot =
          typeof slotCandidate === "string" && SLOT_ORDER.includes(slotCandidate as (typeof SLOT_ORDER)[number])
            ? slotCandidate
            : undefined;
        const targetRule = s.targetRule;
        return {
          id: resolvedId,
          action,
          suggestedSlot,
          targetRule,
          confidence,
          reason: String(s.reason || "AI suggests this adjustment based on historical mismatch."),
          impact: String(s.impact || "Expected improvement in consistency and execution fit."),
        };
      })
      .filter((s): s is NonNullable<typeof s> => !!s);

    if (!directParse.value) {
      // Soft-fail: keep UI usable even when model ignores strict JSON formatting.
      return NextResponse.json({
        suggestions: [],
        model: firstPass.model,
        provider: firstPass.provider,
        warning: `Model returned non-JSON response; ignored. ${directParse.error || ""}`.trim(),
      });
    }

    if (suggestions.length === 0 && baselineSuggestions.length > 0) {
      const indexedCandidates = baselineSuggestions
        .map((s: any, index: number) => ({
          index,
          id: String(s?.id || ""),
          action: s?.action === "stagger" ? "stagger" : "move_slot",
          currentSlot: String(s?.currentSlot || ""),
          suggestedSlot: String(s?.suggestedSlot || ""),
          confidence: Number(s?.confidence || 0.6),
          missRate: Number(s?.missRate || 0),
          due: Number(s?.due || 0),
          details: routines.find((r: any) => String(r?.id || "") === String(s?.id || ""))?.details || "",
        }))
        .filter((c: any) => c.id);

      const secondPrompt = `Select best routine rebalance candidates from provided indexed options.
Return JSON only:
{
  "selected": [
    {
      "index": 0,
      "action": "move_slot" | "stagger",
      "suggestedSlot": "Evening",
      "confidence": 0.74,
      "reason": "short reason",
      "impact": "short impact",
      "targetRule": { "type":"custom","repeatInterval":2,"repeatUnit":"day" }
    }
  ]
}
Rules:
- Use only provided indexes.
- Try to select across the full candidate list where reasonable.
- If action is move_slot, suggestedSlot must be one of: ${SLOT_ORDER.join(", ")}.
- Return empty selected array if no good candidate.

Candidates:
${JSON.stringify(indexedCandidates)}`;

      const secondPass = await runChatWithProvider(
        aiConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: secondPrompt },
        ],
        { format: "json", temperature: 0.1 }
      );
      if (secondPass.ok && secondPass.content) {
        const parsedSecond = parseJsonSafe(extractJson(secondPass.content));
        const selected =
          (Array.isArray(parsedSecond.value?.selected) ? (parsedSecond.value.selected as IndexSuggestion[]) : []) || [];
        const mapped = selected
          .map((item) => {
            const base = indexedCandidates.find((c: any) => c.index === Number(item?.index));
            if (!base) return null;
            const action: "move_slot" | "stagger" =
              item?.action === "stagger" || base.action === "stagger" ? "stagger" : "move_slot";
            const slotCandidate = item?.suggestedSlot || base.suggestedSlot;
            const suggestedSlot =
              typeof slotCandidate === "string" && SLOT_ORDER.includes(slotCandidate as (typeof SLOT_ORDER)[number])
                ? slotCandidate
                : undefined;
            if (action === "move_slot" && !suggestedSlot) return null;
            return {
              id: base.id,
              action,
              suggestedSlot,
              targetRule: item?.targetRule,
              confidence: Number.isFinite(item?.confidence)
                ? Math.max(0, Math.min(1, Number(item.confidence)))
                : Math.max(0.55, Math.min(0.95, Number(base.confidence || 0.65))),
              reason: String(item?.reason || "AI selected this candidate from historical trend."),
              impact: String(item?.impact || "Expected consistency improvement from this adjustment."),
            };
          })
          .filter((s): s is NonNullable<typeof s> => !!s);

        if (mapped.length > 0) {
          suggestions = mapped;
        }
      }
    }

    return NextResponse.json({ suggestions, model: firstPass.model, provider: firstPass.provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to generate AI routine rebalance suggestions.",
        details: message,
      },
      { status: 500 }
    );
  }
}
