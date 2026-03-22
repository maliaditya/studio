import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider, type ChatMessage } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";
import { parseJsonWithRecovery } from "@/lib/jsonRecovery";
import { renderAsciiTree, sanitizeBlueprint, type DiagramBlueprint } from "@/lib/renderAsciiTree";
import { normalizeDiagramLabels } from "@/lib/normalizeDiagramLabels";

export const dynamic = "force-dynamic";

const extractJsonPayload = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : raw;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return candidate.slice(first, last + 1);
  }
  return candidate;
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text) {
      return NextResponse.json({ error: "Explanation text is required." }, { status: 400 });
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
    const aiConfigWithTimeout: AiRequestConfig = {
      ...aiConfig,
      requestTimeoutMs: Math.max(aiConfig.requestTimeoutMs || 0, 90000),
    };

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

    const trimmedText = text.length > 3000 ? `${text.slice(0, 3000)}…` : text;

    const plannerPrompt =
      "You are a diagram planner.\n\n" +
      "Extract the following content into a strict JSON blueprint.\n\n" +
      "Return this schema exactly:\n" +
      "{\n" +
      "  \"type\": \"hierarchy\",\n" +
      "  \"root\": {\n" +
      "    \"label\": \"string\",\n" +
      "    \"children\": [\n" +
      "      {\n" +
      "        \"label\": \"string\",\n" +
      "        \"children\": [ ... ]\n" +
      "      }\n" +
      "    ]\n" +
      "  }\n" +
      "}\n\n" +
      "Rules:\n" +
      "- Do not explain\n" +
      "- Do not summarize in paragraphs\n" +
      "- Keep labels short\n" +
      "- Preserve hierarchy\n" +
      "- Infer the central concept as the root\n" +
      "- Group semantically (not in paragraph order)\n" +
      "- Avoid filler wrapper nodes like Description, Purpose, Process, Phase, Value, Impact\n" +
      "- Avoid one-child wrapper chains; use direct semantic phrases\n" +
      "- Keep the tree shallow and readable\n" +
      "- Every node should be meaningful on its own\n" +
      "- Output valid JSON only\n\n" +
      "Content:\n" +
      (context ? `Context: ${context}\n\n` : "") +
      trimmedText;

    const plannerMessages: ChatMessage[] = [
      { role: "system", content: "You output valid JSON only." },
      { role: "user", content: plannerPrompt },
    ];

    const plannerResponse = await runChatWithProvider(aiConfigWithTimeout, plannerMessages, { temperature: 0.1 });
    if (!plannerResponse.ok) {
      return NextResponse.json(
        {
          error: `${plannerResponse.provider === "openai" ? "OpenAI" : plannerResponse.provider === "ollama" ? "Ollama" : plannerResponse.provider === "perplexity" ? "Perplexity" : plannerResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${plannerResponse.model || aiConfig.model}).`,
          details: plannerResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }

    const plannerRaw = plannerResponse.content?.trim();
    if (!plannerRaw) {
      return NextResponse.json({ error: "Provider returned an empty blueprint." }, { status: 502 });
    }

    let blueprint: DiagramBlueprint | null = null;
    try {
      const extracted = extractJsonPayload(plannerRaw);
      const parsed = parseJsonWithRecovery(extracted);
      blueprint = sanitizeBlueprint(parsed);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      return NextResponse.json(
        {
          error: "Failed to parse diagram blueprint JSON.",
          details: message,
        },
        { status: 502 }
      );
    }

    if (!blueprint) {
      return NextResponse.json(
        {
          diagramText: "Diagram error: planner JSON did not match the expected hierarchy schema.",
          blueprint: null,
          model: plannerResponse.model,
          provider: plannerResponse.provider,
        },
        { status: 200 }
      );
    }

    const normalizedBlueprint = normalizeDiagramLabels(blueprint);
    const diagramText = renderAsciiTree(normalizedBlueprint);
    return NextResponse.json({
      diagramText,
      blueprint: normalizedBlueprint,
      model: plannerResponse.model,
      provider: plannerResponse.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to create diagram.",
        details: message,
      },
      { status: 500 }
    );
  }
}
