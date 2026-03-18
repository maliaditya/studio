import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { Offer } from "@/types/workout";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type GeneratedOfferPayload = {
  offerType?: string;
  offer?: Partial<Offer>;
};

const stripCodeFences = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const normalizeOffer = (input: Partial<Offer> | null | undefined) => {
  const source = input || {};
  return {
    name: String(source.name || "").trim(),
    outcome: String(source.outcome || "").trim(),
    audience: String(source.audience || "").trim(),
    deliverables: String(source.deliverables || "").trim(),
    valueStack: String(source.valueStack || "").trim(),
    timeline: String(source.timeline || "").trim(),
    price: String(source.price || "").trim(),
    format: String(source.format || "").trim(),
  };
};

const parseOffers = (raw: string) => {
  const cleaned = stripCodeFences(raw);
  const parsed = JSON.parse(cleaned) as { offers?: GeneratedOfferPayload[] };
  const offers = Array.isArray(parsed?.offers) ? parsed.offers : [];
  return offers
    .map((entry) => ({
      offerType: String(entry?.offerType || "").trim(),
      offer: normalizeOffer(entry?.offer),
    }))
    .filter((entry) => entry.offer.name || entry.offer.outcome || entry.offer.audience);
};

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    const body = await request.json().catch(() => ({}));
    const specialization = body?.specialization ?? null;
    const offerTypes = Array.isArray(body?.offerTypes) ? body.offerTypes.filter((item: unknown) => typeof item === "string" && item.trim()) : [];
    const currentOffers = Array.isArray(body?.currentOffers) ? body.currentOffers : [];
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!specialization || typeof specialization !== "object") {
      return NextResponse.json({ error: "Specialization context is required." }, { status: 400 });
    }
    if (offerTypes.length === 0) {
      return NextResponse.json({ error: "At least one offer type is required." }, { status: 400 });
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
      return NextResponse.json({ error: "OpenAI API key is required when provider is OpenAI." }, { status: 400 });
    }
    if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
      return NextResponse.json({ error: "Ollama base URL is required when provider is Ollama." }, { status: 400 });
    }
    if (aiConfig.provider === "perplexity" && !aiConfig.perplexityApiKey) {
      return NextResponse.json({ error: "Perplexity API key is required when provider is Perplexity." }, { status: 400 });
    }
    if (aiConfig.provider === "anthropic" && !aiConfig.anthropicApiKey) {
      return NextResponse.json({ error: "Anthropic API key is required when provider is Anthropic." }, { status: 400 });
    }

    const systemPrompt = [
      "You generate multiple offers for a specialization in a strategy app.",
      "Create one distinct offer for each requested offer type.",
      "Each offer must match the offer type and specialization context.",
      "Make each offer practical, client-friendly, and meaningfully different from the others.",
      "Use simple plain-text output. For outcome, audience, deliverables, valueStack, and format use bullet-style lines with '- '.",
      "Return strict JSON with exactly this shape:",
      "{\"offers\":[{\"offerType\":\"...\",\"offer\":{\"name\":\"...\",\"outcome\":\"...\",\"audience\":\"...\",\"deliverables\":\"...\",\"valueStack\":\"...\",\"timeline\":\"...\",\"price\":\"...\",\"format\":\"...\"}}]}",
    ].join(" ");

    const userPrompt = JSON.stringify(
      {
        task: "Generate one complete offer for each selected offer type.",
        specialization,
        offerTypes,
        currentOffers,
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
      { temperature: 0.35, format: "json" }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: "AI provider call failed.", details: aiResponse.details || "Provider call failed." },
        { status: 502 }
      );
    }

    const offers = parseOffers(aiResponse.content || "");
    if (offers.length === 0) {
      return NextResponse.json({ error: "Provider returned no offers." }, { status: 502 });
    }

    return NextResponse.json({
      offers,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to generate offers from selected types.",
        details: message,
      },
      { status: 500 }
    );
  }
}
