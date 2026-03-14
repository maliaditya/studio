import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { buildShivQuery, resolveShivAnswer } from "@/lib/shiv";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import { toPlainText } from "@/lib/shiv/normalize";
import { trackShivEvent } from "@/lib/shiv/observability";
import { buildShivIndex } from "@/lib/shiv/indexBuilder";
import { retrieveEvidence } from "@/lib/shiv/retriever";
import type { ShivAnswerMeta } from "@/lib/shiv";
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

const buildReplyLanguageInstruction = (value: unknown) => {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "auto";
  switch (normalized) {
    case "english":
      return "Respond in English.";
    case "hindi":
      return "Respond in Hindi using Devanagari script.";
    case "hinglish":
      return "Respond in Hinglish: Hindi phrasing written in English letters (Roman script), natural and conversational.";
    default:
      return "Match the user's language automatically. If the user writes in Hindi using English letters, reply in natural Hinglish. If the user writes in Hindi in Devanagari, reply in Devanagari Hindi. If the user writes in English, reply in English.";
  }
};

export async function POST(request: Request) {
  try {
    const startedAt = Date.now();
    const body = await request.json().catch(() => ({}));
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";

    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const history = Array.isArray(body?.history) ? body.history : [];
    const appContext = (body?.appContext || {}) as Record<string, unknown>;
    const openMode = Boolean(body?.openMode);
    const replyLanguageInstruction = buildReplyLanguageInstruction(body?.replyLanguage);
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!question) {
      return NextResponse.json({ error: "Question is required." }, { status: 400 });
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

    const shivV2Enabled = process.env.SHIV_V2 !== "0";
    if (!shivV2Enabled) {
      return NextResponse.json(
        {
          error: "SHIV_V2 is disabled. Set SHIV_V2=1 to enable Ask Astra pipeline.",
        },
        { status: 503 }
      );
    }

    const query = buildShivQuery(question, history, appContext);

    if (openMode) {
      const missingConfigError = validateProviderConfig(aiConfig);
      if (missingConfigError) {
        return NextResponse.json({ error: missingConfigError }, { status: 400 });
      }

      const queryForOpen = buildShivQuery(question, history, appContext);
      const index = buildShivIndex(appContext);
      const retrieved = retrieveEvidence(queryForOpen, index);
      const evidenceBundle = retrieved.global.slice(0, 12).map((item, idx) => ({
        eid: `E${idx + 1}`,
        name: item.name,
        domain: item.domain,
        text: String(item.text || "").slice(0, 600),
        score: Number(item.score || 0),
      }));

      const messages = [
        {
          role: "system" as const,
          content:
            `You are Astra for Dock app. Open chat mode is enabled. Answer naturally and helpfully in plain text only. Use evidence when relevant, but you may answer general questions too. Do not dump JSON/metadata (eid/domain/payload/field names) unless user explicitly asks for debug structure. Answer directly first in short form. ${replyLanguageInstruction}`,
        },
        ...history
          .filter((message: any) => message && (message.role === "user" || message.role === "assistant") && typeof message.content === "string")
          .slice(-8)
          .map((message: any) => ({ role: message.role, content: String(message.content) })),
        {
          role: "user" as const,
          content: `Question: ${question}\n\nTop app evidence:\n${JSON.stringify(evidenceBundle, null, 2)}`,
        },
      ];

      const result = await runChatWithProvider(aiConfig, messages, { temperature: 0.4 });
      if (!result.ok) {
        return NextResponse.json(
          {
            error: "Unable to get Astra answer.",
            details: String(result.details || "AI provider call failed."),
          },
          { status: 502 }
        );
      }

      const answer = toPlainText(result.content || "");
      const latencyMs = Date.now() - startedAt;
      trackShivEvent({
        ts: new Date().toISOString(),
        question,
        mode: "open",
        path: "ai_fallback",
        handlerId: "open.free_chat",
        confidence: 0.8,
        latencyMs,
        usedDomains: [],
        provider: result.provider,
        model: result.model,
        relevancePassed: true,
        groundingPassed: true,
      });
      return NextResponse.json({
        answer: answer || "I could not generate a response.",
        provider: result.provider || "local",
        model: result.model || "shiv-open-chat",
        meta: {
          path: "ai_fallback",
          handlerId: "open.free_chat",
          confidence: 0.8,
          matchedEntities: [],
          usedDomains: [],
          guards: {
            relevance: { passed: true },
            grounding: { passed: true },
          },
        } satisfies ShivAnswerMeta,
      });
    }

    const missingConfigError = validateProviderConfig(aiConfig);
    if (missingConfigError && aiConfig.provider !== "none") {
      return NextResponse.json({ error: missingConfigError }, { status: 400 });
    }

    const decision = await resolveShivAnswer(query, appContext, aiConfig, {
      languageInstructionOverride: replyLanguageInstruction,
    });
    const latencyMs = Date.now() - startedAt;

    const meta: ShivAnswerMeta = {
      path: decision.path,
      handlerId: decision.handlerId,
      confidence: decision.confidence,
      matchedEntities: decision.evidence.slice(0, 8).map((item) => ({ id: item.id, name: item.name })),
      usedDomains: decision.usedDomains,
      guards: decision.guards,
    };

    if (process.env.SHIV_V2_SHADOW === "1") {
      console.info("[shiv-v2][shadow]", {
        question,
        path: meta.path,
        handlerId: meta.handlerId,
        confidence: meta.confidence,
        usedDomains: meta.usedDomains,
      });
    }

    trackShivEvent({
      ts: new Date().toISOString(),
      question,
      mode: "curated",
      path: decision.path,
      handlerId: decision.handlerId,
      confidence: decision.confidence,
      latencyMs,
      usedDomains: decision.usedDomains,
      provider: decision.provider,
      model: decision.model,
      relevancePassed: decision.guards?.relevance?.passed,
      groundingPassed: decision.guards?.grounding?.passed,
    });

    return NextResponse.json({
      answer: decision.answer,
      provider: decision.provider || "local",
      model: decision.model || (decision.path === "deterministic" ? "shiv-v2-deterministic" : "shiv-v2-clarify"),
      meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to get Astra answer.",
        details: message,
      },
      { status: 500 }
    );
  }
}
