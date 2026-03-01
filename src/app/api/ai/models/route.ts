import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const withTimeout = async (
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<Response>
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs || 20000));
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
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
      isDesktopRuntime
    );

    if (aiConfig.provider === "none") {
      return NextResponse.json({ provider: "none", models: [] });
    }

    if (aiConfig.provider === "ollama") {
      const response = await withTimeout(aiConfig.requestTimeoutMs || 20000, (signal) =>
        fetch(`${(aiConfig.ollamaBaseUrl || "").replace(/\/+$/, "")}/api/tags`, { signal })
      );
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        return NextResponse.json(
          { error: "Failed to fetch Ollama models.", details, provider: "ollama" },
          { status: 502 }
        );
      }
      const data = (await response.json()) as { models?: Array<{ name?: string; model?: string }> };
      const models = Array.from(
        new Set(
          (data?.models || [])
            .map((m) => String(m.name || m.model || "").trim())
            .filter(Boolean)
        )
      ).sort((a, b) => a.localeCompare(b));
      return NextResponse.json({ provider: "ollama", models });
    }

    if (aiConfig.provider === "perplexity") {
      if (!aiConfig.perplexityApiKey) {
        return NextResponse.json(
          { error: "Perplexity API key is required when provider is Perplexity." },
          { status: 400 }
        );
      }
      const response = await withTimeout(aiConfig.requestTimeoutMs || 20000, (signal) =>
        fetch(`${(aiConfig.perplexityBaseUrl || "https://api.perplexity.ai").replace(/\/+$/, "")}/models`, {
          headers: { Authorization: `Bearer ${aiConfig.perplexityApiKey}` },
          signal,
        })
      );
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        return NextResponse.json(
          { error: "Failed to fetch Perplexity models.", details, provider: "perplexity" },
          { status: 502 }
        );
      }
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = Array.from(new Set((data?.data || []).map((m) => String(m.id || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
      return NextResponse.json({ provider: "perplexity", models });
    }

    if (aiConfig.provider === "anthropic") {
      if (!aiConfig.anthropicApiKey) {
        return NextResponse.json(
          { error: "Anthropic API key is required when provider is Anthropic." },
          { status: 400 }
        );
      }
      const response = await withTimeout(aiConfig.requestTimeoutMs || 20000, (signal) =>
        fetch(`${(aiConfig.anthropicBaseUrl || "https://api.anthropic.com").replace(/\/+$/, "")}/v1/models`, {
          headers: {
            "x-api-key": aiConfig.anthropicApiKey,
            "anthropic-version": "2023-06-01",
          },
          signal,
        })
      );
      if (!response.ok) {
        const details = await response.text().catch(() => "");
        return NextResponse.json(
          { error: "Failed to fetch Anthropic models.", details, provider: "anthropic" },
          { status: 502 }
        );
      }
      const data = (await response.json()) as { data?: Array<{ id?: string }> };
      const models = Array.from(new Set((data?.data || []).map((m) => String(m.id || "").trim()).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b));
      return NextResponse.json({ provider: "anthropic", models });
    }

    if (!aiConfig.openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required when provider is OpenAI." },
        { status: 400 }
      );
    }
    const response = await withTimeout(aiConfig.requestTimeoutMs || 20000, (signal) =>
      fetch(`${(aiConfig.openaiBaseUrl || "https://api.openai.com").replace(/\/+$/, "")}/v1/models`, {
        headers: { Authorization: `Bearer ${aiConfig.openaiApiKey}` },
        signal,
      })
    );
    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return NextResponse.json(
        { error: "Failed to fetch OpenAI models.", details, provider: "openai" },
        { status: 502 }
      );
    }
    const data = (await response.json()) as { data?: Array<{ id?: string }> };
    const models = Array.from(new Set((data?.data || []).map((m) => String(m.id || "").trim()).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b));
    return NextResponse.json({ provider: "openai", models });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to fetch models.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
