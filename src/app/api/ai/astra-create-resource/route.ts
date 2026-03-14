import { NextResponse } from "next/server";

import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type AstraCreateMode = "habit" | "mechanism";

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

const toText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const sanitizeState = (value: unknown) => {
  const state = toText(value);
  const allowed = new Set(["Health", "Wealth", "Relations", "Meaning", "Creativity", "Contribution"]);
  return allowed.has(state) ? state : "";
};

const sanitizeFramework = (value: unknown): "positive" | "negative" => {
  const normalized = toText(value).toLowerCase();
  return normalized === "positive" ? "positive" : "negative";
};

const buildSystemPrompt = (mode: AstraCreateMode) => {
  if (mode === "habit") {
    return `You create Dock habit cards from a user description.
Return strict JSON only. No markdown. No commentary.
Use this exact shape:
{
  "name": "string",
  "state": "Health|Wealth|Relations|Meaning|Creativity|Contribution|",
  "triggerAction": "string",
  "negativeResponseText": "string",
  "positiveResponseText": "string",
  "summary": "short sentence"
}
Rules:
- Keep fields concise and practical.
- Leave unknown fields as empty strings.
- "negativeResponseText" is the current/undesired response.
- "positiveResponseText" is the replacement/better response.
- "summary" should briefly describe what was created.`;
  }

  return `You create Dock mechanism cards from a user description.
Return strict JSON only. No markdown. No commentary.
Use this exact shape:
{
  "name": "string",
  "mechanismFramework": "positive|negative",
  "triggerAction": "string",
  "mechanismText": "string",
  "benefit": "string",
  "reward": "string",
  "conditionVisualize": "string",
  "conditionAction": "string",
  "lawPremise": "string",
  "lawOutcome": "string",
  "emotionOrImage": "string",
  "summary": "short sentence"
}
Rules:
- Keep fields concise and practical.
- Leave unknown fields as empty strings.
- "mechanismText" is the internal cause/effect line after "It causes ... internally."
- For positive mechanisms, "benefit" is the enabling outcome and "reward" is the positive feeling/image result.
- For negative mechanisms, "reward" is what the mechanism blocks and "benefit" is the cost/consequence.
- "summary" should briefly describe what was created.`;
};

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";

    const mode = body?.mode === "habit" || body?.mode === "mechanism" ? body.mode : null;
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!mode) {
      return NextResponse.json({ error: "Mode is required." }, { status: 400 });
    }
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
        { role: "system", content: buildSystemPrompt(mode) },
        { role: "user", content: prompt },
      ],
      { format: "json", temperature: 0.2 }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: "Failed to create Astra resource draft.",
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

    if (mode === "habit") {
      return NextResponse.json({
        draft: {
          name: toText(parsed.name) || "New Habit",
          state: sanitizeState(parsed.state),
          triggerAction: toText(parsed.triggerAction),
          negativeResponseText: toText(parsed.negativeResponseText),
          positiveResponseText: toText(parsed.positiveResponseText),
          summary: toText(parsed.summary) || "Created a habit card draft.",
        },
        provider: aiResponse.provider,
        model: aiResponse.model,
      });
    }

    return NextResponse.json({
      draft: {
        name: toText(parsed.name) || "New Mechanism",
        mechanismFramework: sanitizeFramework(parsed.mechanismFramework),
        triggerAction: toText(parsed.triggerAction),
        mechanismText: toText(parsed.mechanismText),
        benefit: toText(parsed.benefit),
        reward: toText(parsed.reward),
        conditionVisualize: toText(parsed.conditionVisualize),
        conditionAction: toText(parsed.conditionAction),
        lawPremise: toText(parsed.lawPremise),
        lawOutcome: toText(parsed.lawOutcome),
        emotionOrImage: toText(parsed.emotionOrImage),
        summary: toText(parsed.summary) || "Created a mechanism card draft.",
      },
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to create Astra resource draft.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
