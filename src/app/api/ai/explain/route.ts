import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider, type ChatMessage } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const history = Array.isArray(body?.history) ? body.history : [];
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text) {
      return NextResponse.json({ error: "Selected text is required." }, { status: 400 });
    }

    const aiConfig = getAiConfigFromSettings(
      {
        ai: {
          provider: aiConfigInput.provider,
          model: aiConfigInput.model,
          ollamaBaseUrl: aiConfigInput.ollamaBaseUrl,
          openaiApiKey: aiConfigInput.openaiApiKey,
          openaiBaseUrl: aiConfigInput.openaiBaseUrl,
          requestTimeoutMs: aiConfigInput.requestTimeoutMs,
        },
      },
      isDesktopRuntime
    );
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

    const systemPrompt =
      "You explain technical text clearly and briefly. Use markdown. Use **bold** for key terms and --- for section separators when needed.";
    const userPrompt = question
      ? `Context: ${context}\n\nSelected text:\n${text}\n\nUser question:\n${question}\n\nAnswer the user question based on the selected text.`
      : context
      ? `Context: ${context}\n\nSelected text:\n${text}\n\nExplain this selected text in a clear way.`
      : `Selected text:\n${text}\n\nExplain this selected text in a clear way.`;

    const normalizedHistory: ChatMessage[] = history
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-8)
      .map((m: any) => ({ role: m.role, content: String(m.content).trim() }));

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        ...normalizedHistory,
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1 }
    );
    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: `${aiResponse.provider === "openai" ? "OpenAI" : "Ollama"} call failed (model ${aiResponse.model || aiConfig.model}).`,
          details: aiResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }
    const explanation = aiResponse.content?.trim();

    if (!explanation) {
      return NextResponse.json({ error: "Provider returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ explanation, model: aiResponse.model, provider: aiResponse.provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to get AI explanation.",
        details: message,
      },
      { status: 500 }
    );
  }
}
