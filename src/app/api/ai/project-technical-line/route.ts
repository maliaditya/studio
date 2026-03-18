import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const stripCodeFences = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const parseValueFromResponse = (raw: string) => {
  const cleaned = stripCodeFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown> | string;
    if (typeof parsed === "string") return parsed.trim();
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.value === "string") return parsed.value.trim();
      if (typeof parsed.content === "string") return parsed.content.trim();
      if (typeof parsed.text === "string") return parsed.text.trim();
    }
  } catch {
    return cleaned.trim();
  }
  return cleaned.trim();
};

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    const body = await request.json().catch(() => ({}));
    const line = typeof body?.line === "string" ? body.line.trim() : "";
    const sectionTitle = typeof body?.sectionTitle === "string" ? body.sectionTitle.trim() : "";
    const projectName = typeof body?.projectName === "string" ? body.projectName.trim() : "";
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!line) {
      return NextResponse.json({ error: "Line text is required." }, { status: 400 });
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

    if (aiConfig.provider === "none") {
      return NextResponse.json(
        { error: "AI provider is not set. Choose a provider in Settings > AI Settings." },
        { status: 400 }
      );
    }

    const systemPrompt = [
      "You rewrite one technical detail line for a project popup.",
      "Preserve the original meaning and factual content.",
      "Improve the tone, grammar, clarity, and casing.",
      "Keep it concise, professional, and natural.",
      "Do not add new claims, technologies, architecture, or outcomes not present in the source line.",
      "Return exactly one polished line only.",
      "Do not return bullets, labels, headings, quotation marks, or multiple options.",
      'Return strict JSON with exactly this shape: {"value":"..."}',
    ].join(" ");

    const userPrompt = JSON.stringify(
      {
        task: "Rewrite one technical detail line in a better tone.",
        projectName,
        sectionTitle,
        line,
      },
      null,
      2
    );

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.3, format: "json" }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: "AI provider call failed.", details: aiResponse.details || "Provider call failed." },
        { status: 502 }
      );
    }

    const value = parseValueFromResponse(aiResponse.content || "");
    if (!value) {
      return NextResponse.json({ error: "Provider returned an empty value." }, { status: 502 });
    }

    return NextResponse.json({
      value,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to rephrase the technical detail line.",
        details: message,
      },
      { status: 500 }
    );
  }
}
