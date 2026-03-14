import { NextResponse } from "next/server";

import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const validateProviderConfig = (aiConfig: AiRequestConfig): string | null => {
  if (aiConfig.provider === "none") {
    return "AI provider is not set. Choose a provider in Settings > AI Settings.";
  }
  if (aiConfig.provider === "openai" && !aiConfig.openaiApiKey) {
    return "OpenAI API key is required when provider is OpenAI.";
  }
  if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
    return "Ollama base URL is required when provider is Ollama.";
  }
  if (aiConfig.provider === "perplexity" && !aiConfig.perplexityApiKey) {
    return "Perplexity API key is required when provider is Perplexity.";
  }
  if (aiConfig.provider === "anthropic" && !aiConfig.anthropicApiKey) {
    return "Anthropic API key is required when provider is Anthropic.";
  }
  return null;
};

const extractJsonObject = (raw: string): Record<string, unknown> | null => {
  const text = String(raw || "").trim();
  if (!text) return null;
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    return parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
};

const toText = (value: unknown) => (typeof value === "string" ? value.trim() : "");

const sanitizeExternalState = (value: unknown) => {
  const allowed = new Set(["Health", "Wealth", "Relations", "Meaning", "Creativity", "Contribution"]);
  const text = toText(value);
  return allowed.has(text) ? text : "";
};

const sanitizeCoreNeed = (value: unknown) => {
  const allowed = new Set(["Autonomy", "Competence", "Relatedness"]);
  const text = toText(value);
  return allowed.has(text) ? text : "";
};

const sanitizeConfidence = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(1, value));
  }
  const parsed = Number(toText(value));
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : null;
};

const buildSystemPrompt = () => `You are a diagnostic engine for human problems.

Your task is to analyze the user's issue and convert it into this framework:

1. User Issue
2. External State
3. Bothering
4. Gap
5. Core Need
6. Action Type
7. Expected Outcome
8. Dynamic Reply
9. Confidence
10. Alternative State
11. Alternative Gap
12. Status
13. FollowUpPrompt

Rules:
- External State must be one of: Health, Wealth, Relations, Meaning, Creativity, Contribution
- Core Need must be one of: Autonomy, Competence, Relatedness
- Bothering = what is wrong in plain language
- Gap = the missing condition that must be present for the bothering to reduce
- Action Type = the behavior category needed to fix the gap
- Expected Outcome = the likely positive result if the action is taken
- Dynamic Reply must sound natural, grounded, and personalized
- Do not be robotic
- If the user input is a greeting, a capability question, a vague prompt, or not an actual personal issue, do NOT force a diagnosis.
- In that case, set status to "needs_issue" and ask the user to describe a real issue, discomfort, stuck point, or unmet need.
- Return strict JSON only. No markdown. No prose outside JSON.

Use these core mappings as the default interpretation:
- Health -> Autonomy + Competence. Health is about the ability to control and maintain your body.
- Wealth -> Competence + Autonomy. Wealth is about using skills to gain resources and independence.
- Meaning -> Autonomy + Relatedness. Meaning is about choosing a purpose that connects you to something larger.
- Creativity -> Autonomy + Competence. Creativity is about freedom plus skill to produce new things.
- Contribution -> Competence + Relatedness. Contribution is about using ability to help.
- Relations -> Relatedness + Autonomy. Relations is about connection, trust, reciprocity, and the ability to relate without losing yourself.

When selecting the single Core Need field:
- Pick the dominant need from the mapped pair that best explains the current gap.
- Use the other mapped need only as a secondary influence in the Dynamic Reply if useful.

Reasoning rules:
- If the issue is about money, earning, work value, career stability -> likely Wealth
- If the issue is about building, expressing, creating, implementing ideas -> likely Creativity
- If the issue is about loneliness, conflict, rejection, relationships -> likely Relations
- If the issue is about direction, emptiness, purposelessness -> likely Meaning
- If the issue is about helping, usefulness, impact, service -> likely Contribution
- If the issue is about body, illness, fatigue, sleep, fitness -> likely Health

Core need mapping rules:
- If the gap is about freedom, ownership, choice, direction -> Autonomy
- If the gap is about skill, understanding, ability, capability -> Competence
- If the gap is about connection, belonging, helping, trust, support -> Relatedness

Return JSON with this exact shape:
{
  "userIssue": "string",
  "externalState": "Health|Wealth|Relations|Meaning|Creativity|Contribution",
  "bothering": "string",
  "gap": "string",
  "coreNeed": "Autonomy|Competence|Relatedness",
  "actionType": "string",
  "expectedOutcome": "string",
  "dynamicReply": "string",
  "confidence": 0.0,
  "alternativeState": "string",
  "alternativeGap": "string",
  "status": "diagnosed|needs_issue",
  "followUpPrompt": "string"
}`;

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required." }, { status: 400 });
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
      isDesktopRuntime
    );

    const invalid = validateProviderConfig(aiConfig);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: buildSystemPrompt() },
        { role: "user", content: prompt },
      ],
      { format: "json", temperature: 0.2 }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to analyze issue with Astra.",
          details: aiResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }

    const parsed = extractJsonObject(aiResponse.content || "");
    if (!parsed) {
      return NextResponse.json(
        {
          error: "Provider returned invalid JSON.",
          details: String(aiResponse.content || "").slice(0, 400),
        },
        { status: 502 }
      );
    }

    return NextResponse.json({
      draft: {
        userIssue: toText(parsed.userIssue) || prompt,
        externalState: sanitizeExternalState(parsed.externalState),
        bothering: toText(parsed.bothering),
        gap: toText(parsed.gap),
        coreNeed: sanitizeCoreNeed(parsed.coreNeed),
        actionType: toText(parsed.actionType),
        expectedOutcome: toText(parsed.expectedOutcome),
        dynamicReply: toText(parsed.dynamicReply),
        confidence: sanitizeConfidence(parsed.confidence),
        alternativeState: toText(parsed.alternativeState),
        alternativeGap: toText(parsed.alternativeGap),
        status: toText(parsed.status) === "needs_issue" ? "needs_issue" : "diagnosed",
        followUpPrompt: toText(parsed.followUpPrompt),
      },
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to analyze issue with Astra.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
