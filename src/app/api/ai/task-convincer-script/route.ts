import { NextResponse } from "next/server";

import { runChatWithProvider } from "@/lib/ai/providerRouter";
import {
  buildTaskConvincerFallback,
  buildTaskConvincerPrompt,
} from "@/lib/taskConvincer";
import type { TaskBciContext, TaskBciModel } from "@/lib/taskBci";
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
      bci?: TaskBciModel | null;
      aiConfig?: AiRequestConfig | null;
    };

    const context = body?.context;
    if (!context || !String(context.taskName || "").trim()) {
      return NextResponse.json({ error: "Task context is required." }, { status: 400 });
    }

    const bci = body?.bci || null;
    const fallback = buildTaskConvincerFallback(context, bci);
    const aiConfig = body?.aiConfig || null;

    if (!canUseAi(aiConfig)) {
      return NextResponse.json({
        script: fallback,
        meta: {
          usedFallback: true,
          reason: "ai_unavailable",
          provider: aiConfig?.provider || "none",
          model: aiConfig?.model || "",
        },
      });
    }

    const prompt = buildTaskConvincerPrompt(context, bci);
    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        {
          role: "system",
          content:
            "Generate plain text only. Use the requested section headings. Do not return markdown code fences or JSON.",
        },
        { role: "user", content: prompt },
      ],
      { temperature: 0.45 }
    );

    const script = String(aiResponse.content || "").trim();

    return NextResponse.json({
      script: script || fallback,
      meta: {
        usedFallback: !script,
        provider: aiResponse.provider || aiConfig?.provider || "none",
        model: aiResponse.model || aiConfig?.model || "",
        reason: script ? null : aiResponse.error || "empty_ai_payload",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate task convincer script.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
