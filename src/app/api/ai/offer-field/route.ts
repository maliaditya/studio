import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const OFFER_FIELDS = new Set([
  "name",
  "outcome",
  "audience",
  "deliverables",
  "valueStack",
  "timeline",
  "price",
  "format",
] as const);

type OfferFieldKey =
  | "name"
  | "outcome"
  | "audience"
  | "deliverables"
  | "valueStack"
  | "timeline"
  | "price"
  | "format";

const stripCodeFences = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const cleanRecoveredValue = (value: string) =>
  value
    .trim()
    .replace(/^["'`]+/, "")
    .replace(/["'`]+$/, "")
    .trim();

const parseValueFromResponse = (raw: string) => {
  const cleaned = stripCodeFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as Record<string, unknown> | string;
    if (typeof parsed === "string" && parsed.trim()) {
      return cleanRecoveredValue(parsed);
    }
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.value === "string" && parsed.value.trim()) {
        return cleanRecoveredValue(parsed.value);
      }
      if (typeof parsed.content === "string" && parsed.content.trim()) {
        return cleanRecoveredValue(parsed.content);
      }
      if (typeof parsed.text === "string" && parsed.text.trim()) {
        return cleanRecoveredValue(parsed.text);
      }

      const entries = Object.entries(parsed);
      if (entries.length === 1) {
        const [key, value] = entries[0];
        if (typeof key === "string" && key.trim()) {
          if (typeof value === "number" || typeof value === "boolean" || value === null) {
            return cleanRecoveredValue(key);
          }
        }
      }
    }
  } catch {
    // Fall back to plain text below.
  }

  const malformedObjectMatch = cleaned.match(/^\{\s*"([\s\S]+)"\s*:\s*-?\d+(?:\.\d+)?\s*\}$/);
  if (malformedObjectMatch?.[1]) {
    return cleanRecoveredValue(malformedObjectMatch[1].replace(/\\"/g, '"'));
  }

  return cleanRecoveredValue(cleaned);
};

const fieldInstructions = (field: OfferFieldKey) => {
  if (field === "name") return "Return only the offer name. One line only. No prefix, suffix, quotes, explanation, or category label.";
  if (field === "outcome") return "Return only the outcome content for this field. Use 3 to 5 short bullet points, one per line. Do not include headings, labels, pricing, deliverables, audience, or the offer name unless absolutely necessary inside a bullet.";
  if (field === "audience") return "Return only the audience content for this field. Use 3 to 5 short bullet points, one per line, describing the best-fit audience segments and who this is useful for. Do not include headings, labels, pricing, deliverables, or the offer name.";
  if (field === "deliverables") return "Return only the deliverables for this field. Use concise bullet points, one per line. Each line must be a concrete client-facing deliverable. Do not include headings like Offer or Description and do not include pricing, audience, or timeline.";
  if (field === "valueStack") return "Return only the value stack for this field. Use concise bullet points, one per line, focused on what is included, support, bonuses, or strategic extras. Do not include headings, labels, offer title, description, pricing, or timeline.";
  if (field === "timeline") return "Return only a short delivery timeline string such as 'Delivered in 5 working days'. No bullets, no heading, no extra sentence.";
  if (field === "price") return "Return only a practical pricing string such as '$1,500 fixed' or '$3,000-$5,000 depending on scope'. No bullets, no heading, no explanation.";
  return "Return only the format or delivery content for this field. Use 3 to 5 short bullet points, one per line, describing the delivery format and channels such as Notion, GitHub, Loom, workshops, async review, or calls. Do not include headings, labels, pricing, timeline, or deliverables.";
};

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    const body = await request.json().catch(() => ({}));
    const field = typeof body?.field === "string" ? body.field.trim() : "";
    const specialization = body?.specialization ?? null;
    const currentOffer = body?.currentOffer ?? {};
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!OFFER_FIELDS.has(field as OfferFieldKey)) {
      return NextResponse.json({ error: "Valid offer field is required." }, { status: 400 });
    }
    if (!specialization || typeof specialization !== "object") {
      return NextResponse.json({ error: "Specialization context is required." }, { status: 400 });
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

    const systemPrompt = [
      "You generate one offer field for a strategy app.",
      "Use the specialization data, micro-skills, curiosities, offer types, and current offer draft to infer the best answer.",
      "Keep the answer practical, specific, and business-usable.",
      "Generate content for the requested field only. Do not generate a full offer, do not include other field content, and do not add headings or labels.",
      "Use simple plain-text output. When points are requested, format them as one bullet per line using '- '.",
      "Never include wrappers like 'Offer:', 'Description:', 'Audience:', 'Deliverables:', or markdown headings.",
      "Return strict JSON with exactly this shape: {\"value\":\"...\"}.",
      fieldInstructions(field as OfferFieldKey),
    ].join(" ");

    const userPrompt = JSON.stringify(
      {
        task: "Generate a single offer field value.",
        field,
        specialization,
        currentOffer,
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
        {
          error: "AI provider call failed.",
          details: aiResponse.details || "Provider call failed.",
        },
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
        error: "Unable to generate the offer field.",
        details: message,
      },
      { status: 500 }
    );
  }
}
