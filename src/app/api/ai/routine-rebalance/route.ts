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

const clamp01 = (value: number, fallback = 0) =>
  Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;

const asNumber = (value: unknown, fallback = 0) => {
  const next = Number(value);
  return Number.isFinite(next) ? next : fallback;
};

const summarizeSlotPressure = (historical: any) => {
  const routineHistory = Array.isArray(historical?.routineHistory) ? historical.routineHistory : [];
  const slotMap = new Map<string, { scheduled: number; completed: number; missed: number; routines: number; workedMinutes: number }>();
  for (const slot of SLOT_ORDER) {
    slotMap.set(slot, { scheduled: 0, completed: 0, missed: 0, routines: 0, workedMinutes: 0 });
  }
  routineHistory.forEach((row: any) => {
    const slot = typeof row?.currentSlot === "string" && SLOT_ORDER.includes(row.currentSlot) ? row.currentSlot : null;
    if (!slot) return;
    const current = slotMap.get(slot);
    if (!current) return;
    current.scheduled += asNumber(row?.scheduled);
    current.completed += asNumber(row?.completed);
    current.missed += asNumber(row?.missed);
    current.routines += 1;
    current.workedMinutes += asNumber(row?.workedMinutes);
  });
  return SLOT_ORDER.map((slot) => {
    const current = slotMap.get(slot)!;
    const missRate = current.scheduled > 0 ? current.missed / current.scheduled : 0;
    return {
      slot,
      routines: current.routines,
      scheduled: current.scheduled,
      completed: current.completed,
      missed: current.missed,
      missRate: Number(missRate.toFixed(3)),
      workedMinutes: current.workedMinutes,
    };
  });
};

const buildEvidencePack = (baselineSuggestions: any[], historical: any, routines: any[]) => {
  const routineHistory = Array.isArray(historical?.routineHistory) ? historical.routineHistory : [];
  const slotPressure = summarizeSlotPressure(historical);
  const routineMap = new Map(
    routines
      .map((routine: any) => ({
        id: String(routine?.id || ""),
        details: String(routine?.details || ""),
        slot: String(routine?.slot || ""),
        cadence: String(routine?.cadence || ""),
      }))
      .filter((routine: any) => routine.id)
      .map((routine: any) => [routine.id, routine] as const)
  );
  const historyMap = new Map(
    routineHistory
      .map((row: any) => ({
        id: String(row?.id || ""),
        details: String(row?.details || ""),
        currentSlot: String(row?.currentSlot || ""),
        cadence: String(row?.cadence || ""),
        due: asNumber(row?.due),
        scheduled: asNumber(row?.scheduled),
        completed: asNumber(row?.completed),
        missed: asNumber(row?.missed),
        missRate: clamp01(asNumber(row?.missRate), 0),
        workedMinutes: asNumber(row?.workedMinutes),
      }))
      .filter((row: any) => row.id)
      .map((row: any) => [row.id, row] as const)
  );

  const retrievedCandidates = baselineSuggestions
    .map((item: any) => {
      const id = String(item?.id || "");
      if (!id) return null;
      const routine = routineMap.get(id);
      const historyRow = historyMap.get(id);
      const currentSlot = String(item?.currentSlot || historyRow?.currentSlot || routine?.slot || "");
      const slotStats = slotPressure.find((row) => row.slot === currentSlot);
      const suggestedSlot = String(item?.suggestedSlot || "");
      const targetStats = slotPressure.find((row) => row.slot === suggestedSlot);
      const missRate = clamp01(asNumber(item?.missRate, historyRow?.missRate), 0);
      const pressureDelta =
        slotStats && targetStats ? Number((slotStats.missRate - targetStats.missRate).toFixed(3)) : 0;
      const score =
        missRate * 0.45 +
        clamp01(asNumber(item?.confidence), 0.5) * 0.2 +
        Math.max(0, pressureDelta) * 0.2 +
        Math.min(1, asNumber(item?.missed, historyRow?.missed) / Math.max(1, asNumber(item?.due, historyRow?.scheduled))) * 0.15;
      return {
        id,
        details: routine?.details || historyRow?.details || "",
        action: item?.action === "stagger" ? "stagger" : "move_slot",
        currentSlot,
        suggestedSlot,
        cadence: routine?.cadence || historyRow?.cadence || "",
        due: asNumber(item?.due, historyRow?.due),
        scheduled: asNumber(historyRow?.scheduled),
        completed: asNumber(historyRow?.completed),
        missed: asNumber(item?.missed, historyRow?.missed),
        missRate: Number(missRate.toFixed(3)),
        baselineConfidence: clamp01(asNumber(item?.confidence), 0.5),
        slotMissRate: slotStats?.missRate ?? null,
        targetSlotMissRate: targetStats?.missRate ?? null,
        pressureDelta,
        baselineReason: String(item?.reason || ""),
        score: Number(score.toFixed(4)),
      };
    })
    .filter((row): row is NonNullable<typeof row> => !!row)
    .sort((a, b) => b.score - a.score);

  const topHistoricalRoutines = Array.from(historyMap.values())
    .sort((a, b) => {
      const missDiff = b.missRate - a.missRate;
      if (Math.abs(missDiff) > 0.001) return missDiff;
      return b.missed - a.missed;
    })
    .slice(0, 12);

  return {
    totals: historical?.totals || {},
    slotPressure,
    candidateCount: retrievedCandidates.length,
    retrievedCandidates: retrievedCandidates.slice(0, 10),
    topHistoricalRoutines,
  };
};

const buildGenerationPrompt = (evidencePack: ReturnType<typeof buildEvidencePack>) => `Task:
Refine routine rebalance suggestions for better execution consistency using retrieved evidence only.

Process:
1. Read the slot pressure summary.
2. Use the retrieved candidates as your primary evidence set.
3. Cross-check against top historical routine failures before changing action or slot.
4. Prefer conservative changes with clear evidence.

Rules:
- Only use routine IDs from retrievedCandidates.
- Prefer "move_slot" when evidence shows slot mismatch or pressure mismatch.
- Use "stagger" only when workload/cadence pressure is the dominant issue.
- For move_slot, suggestedSlot must be one of: ${SLOT_ORDER.join(", ")}.
- confidence must be between 0 and 1.
- Include an evidenceSummary field with short evidence references.
- Return JSON only. No markdown.

Expected JSON:
{
  "suggestions": [
    {
      "id": "routine_id",
      "action": "move_slot",
      "suggestedSlot": "Dawn",
      "confidence": 0.74,
      "reason": "short reason",
      "impact": "short impact",
      "evidenceSummary": "missRate 1.0, current slot pressure 0.82, target slot pressure 0.18"
    }
  ]
}

Evidence:
${JSON.stringify(evidencePack)}`;

const buildEvaluationPrompt = (suggestions: any[], evidencePack: ReturnType<typeof buildEvidencePack>) => `Task:
Evaluate the candidate rebalance suggestions against the retrieved evidence pack.

For each suggestion:
- verify the routine exists in retrievedCandidates
- verify the suggestedSlot is allowed
- check whether the reason is actually supported by evidence
- downgrade or reject weak suggestions

Return JSON only:
{
  "accepted": [
    {
      "id": "routine_id",
      "action": "move_slot",
      "suggestedSlot": "Dawn",
      "confidence": 0.72,
      "reason": "short reason",
      "impact": "short impact",
      "verdict": "accept",
      "supportScore": 0.81
    }
  ],
  "rejected": [
    {
      "id": "routine_id",
      "verdict": "reject",
      "reason": "unsupported by retrieved evidence"
    }
  ]
}

Suggestions:
${JSON.stringify(suggestions)}

Evidence:
${JSON.stringify(evidencePack)}`;

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
      "You are a strict planning assistant. Use retrieval, evidence-based reasoning, and conservative evaluation. Return only JSON.";
    const evidencePack = buildEvidencePack(baselineSuggestions, historical, routines);
    const userPrompt = buildGenerationPrompt(evidencePack);

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

    if (suggestions.length > 0) {
      const evaluationPrompt = buildEvaluationPrompt(suggestions, evidencePack);
      const evaluationPass = await runChatWithProvider(
        aiConfig,
        [
          { role: "system", content: systemPrompt },
          { role: "user", content: evaluationPrompt },
        ],
        { format: "json", temperature: 0.05 }
      );
      if (evaluationPass.ok && evaluationPass.content) {
        const parsedEvaluation = parseJsonSafe(extractJson(evaluationPass.content));
        const accepted = Array.isArray(parsedEvaluation.value?.accepted) ? parsedEvaluation.value.accepted : [];
        const acceptedMap = new Map(
          accepted
            .map((item: any) => {
              const id = String(item?.id || "").trim();
              if (!id) return null;
              return [
                id,
                {
                  action: item?.action === "stagger" ? "stagger" : "move_slot",
                  suggestedSlot: String(item?.suggestedSlot || "").trim(),
                  confidence: clamp01(asNumber(item?.confidence), 0.65),
                  reason: String(item?.reason || "").trim(),
                  impact: String(item?.impact || "").trim(),
                  supportScore: clamp01(asNumber(item?.supportScore), 0.6),
                },
              ] as const;
            })
            .filter((entry): entry is readonly [string, { action: "move_slot" | "stagger"; suggestedSlot: string; confidence: number; reason: string; impact: string; supportScore: number }] => !!entry)
        );

        suggestions = suggestions
          .map((suggestion) => {
            const acceptedSuggestion = acceptedMap.get(suggestion.id);
            if (!acceptedSuggestion) return null;
            const nextSuggestedSlot =
              acceptedSuggestion.action === "move_slot" &&
              SLOT_ORDER.includes(acceptedSuggestion.suggestedSlot as (typeof SLOT_ORDER)[number])
                ? acceptedSuggestion.suggestedSlot
                : suggestion.suggestedSlot;
            if (acceptedSuggestion.action === "move_slot" && !nextSuggestedSlot) return null;
            return {
              ...suggestion,
              action: acceptedSuggestion.action,
              suggestedSlot: nextSuggestedSlot,
              confidence: clamp01((suggestion.confidence + acceptedSuggestion.confidence + acceptedSuggestion.supportScore) / 3, suggestion.confidence),
              reason: acceptedSuggestion.reason || suggestion.reason,
              impact: acceptedSuggestion.impact || suggestion.impact,
            };
          })
          .filter((item): item is NonNullable<typeof item> => !!item);
      }
    }

    if (!directParse.value) {
      // Soft-fail: keep UI usable even when model ignores strict JSON formatting.
      return NextResponse.json({
        suggestions: [],
        model: firstPass.model,
        provider: firstPass.provider,
        contextStats: {
          candidateCount: evidencePack.candidateCount,
          retrievedCandidates: evidencePack.retrievedCandidates.length,
          topHistoricalRoutines: evidencePack.topHistoricalRoutines.length,
        },
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

    return NextResponse.json({
      suggestions,
      model: firstPass.model,
      provider: firstPass.provider,
      contextStats: {
        candidateCount: evidencePack.candidateCount,
        retrievedCandidates: evidencePack.retrievedCandidates.length,
        topHistoricalRoutines: evidencePack.topHistoricalRoutines.length,
      },
    });
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
