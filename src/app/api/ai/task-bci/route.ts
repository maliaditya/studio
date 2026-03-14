import { NextResponse } from "next/server";

import { runChatWithProvider } from "@/lib/ai/providerRouter";
import {
  buildTaskBciFallback,
  buildTaskBciPrompt,
  parseTaskBciPayload,
  type TaskBciContext,
} from "@/lib/taskBci";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const canUseAi = (config: AiRequestConfig | null) => {
  if (!config || config.provider === "none") return false;
  if (config.provider === "openai") return Boolean(config.openaiApiKey);
  if (config.provider === "ollama") return Boolean(config.ollamaBaseUrl);
  if (config.provider === "perplexity") return Boolean(config.perplexityApiKey);
  if (config.provider === "anthropic") return Boolean(config.anthropicApiKey);
  return false;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      context?: TaskBciContext;
      aiConfig?: AiRequestConfig | null;
    };

    const context = body?.context;
    if (!context || !String(context.taskName || "").trim()) {
      return NextResponse.json({ error: "Task context is required." }, { status: 400 });
    }

    const fallback = buildTaskBciFallback(context);
    const aiConfig = body?.aiConfig || null;

    if (!canUseAi(aiConfig)) {
      return NextResponse.json({
        bci: fallback,
        meta: {
          usedFallback: true,
          reason: "ai_unavailable",
          provider: aiConfig?.provider || "none",
          model: aiConfig?.model || "",
        },
      });
    }

    const prompt = buildTaskBciPrompt(context);
    const aiResponse = await runChatWithProvider(
      aiConfig!,
      [
        {
          role: "system",
          content: "You generate strict JSON only. No markdown. No prose outside the JSON object.",
        },
        { role: "user", content: prompt },
      ],
      { format: "json", temperature: 0.2 }
    );

    let model = null;
    if (aiResponse.ok && aiResponse.content) {
      try {
        model = parseTaskBciPayload(aiResponse.content);
      } catch {
        model = null;
      }
    }

    return NextResponse.json({
      bci: model || fallback,
      meta: {
        usedFallback: !model,
        provider: aiResponse.provider || aiConfig?.provider || "none",
        model: aiResponse.model || aiConfig?.model || "",
        reason: model ? null : aiResponse.error || "invalid_ai_payload",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to generate task BCI.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
