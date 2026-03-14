import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import {
  buildPdfFlashcardPromptPackage,
  buildPdfFlashcardRegenerationPromptPackage,
  buildPdfFlashcardRepairPromptPackage,
  type PdfFlashcardHighlightInput,
  type PdfFlashcardRetryAttempt,
  type PdfFlashcardTaskContextInput,
  type PdfFlashcardTopicInput,
  validatePdfFlashcardPayload,
} from "@/lib/ai/pdfFlashcards";
import { runChatWithProvider, type ChatMessage } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const validateProviderConfig = (aiConfig: AiRequestConfig) => {
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

const buildFailureDetails = (attempts: PdfFlashcardRetryAttempt[]) => {
  const latestAttempt = attempts[attempts.length - 1] || null;
  return {
    category: latestAttempt?.result.category || "retry_exhaustion",
    reasons: latestAttempt?.result.reasons || ["Flashcard output validation failed after retries."],
    attempts: attempts.map((attempt) => ({
      stage: attempt.stage,
      category: attempt.result.category,
      reasons: attempt.result.reasons,
      rawPreview: attempt.rawContent.slice(0, 500),
    })),
  };
};

const callPromptPackage = async (
  aiConfig: AiRequestConfig,
  prompt: { systemPrompt: string; userPrompt: string },
  temperature: number
) =>
  runChatWithProvider(
    aiConfig,
    [
      { role: "system", content: prompt.systemPrompt } satisfies ChatMessage,
      { role: "user", content: prompt.userPrompt } satisfies ChatMessage,
    ],
    { temperature, format: "json" }
  );

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    const body = await request.json().catch(() => ({}));
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;
    const highlights: PdfFlashcardHighlightInput[] = Array.isArray(body?.highlights)
      ? body.highlights
          .map((entry: any) => ({
            highlightId: String(entry?.highlightId || "").trim(),
            pageNumber: Number(entry?.pageNumber),
            text: String(entry?.text || "").trim(),
            createdAt: String(entry?.createdAt || "").trim(),
          }))
          .filter(
            (entry: PdfFlashcardHighlightInput) =>
              entry.highlightId &&
              entry.text &&
              Number.isFinite(entry.pageNumber) &&
              entry.pageNumber > 0
          )
      : [];

    const taskContext: PdfFlashcardTaskContextInput = {
      taskName: String(body?.taskContext?.taskName || "").trim(),
      definitionId: String(body?.taskContext?.definitionId || "").trim(),
      activityType: String(body?.taskContext?.activityType || "").trim(),
      specializationId: String(body?.taskContext?.specializationId || "").trim(),
      specializationName: String(body?.taskContext?.specializationName || "").trim(),
      bookName: String(body?.taskContext?.bookName || "").trim(),
      pdfResourceId: String(body?.taskContext?.pdfResourceId || "").trim(),
      pdfResourceName: String(body?.taskContext?.pdfResourceName || "").trim(),
    };

    const existingTopics: PdfFlashcardTopicInput[] = Array.isArray(body?.topicTable?.topics)
      ? body.topicTable.topics
          .map((topic: any) => ({
            id: String(topic?.id || "").trim(),
            name: String(topic?.name || "").trim(),
            normalizedName: String(topic?.normalizedName || "").trim(),
          }))
          .filter((topic: PdfFlashcardTopicInput) => topic.id && topic.name)
      : [];

    if (highlights.length === 0) {
      return NextResponse.json({ error: "At least one highlight is required." }, { status: 400 });
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

    const providerConfigError = validateProviderConfig(aiConfig);
    if (providerConfigError) {
      return NextResponse.json({ error: providerConfigError }, { status: 400 });
    }

    const validTopicIds = new Set(existingTopics.map((topic) => topic.id));
    const attempts: PdfFlashcardRetryAttempt[] = [];

    const primaryPrompt = buildPdfFlashcardPromptPackage({
      taskContext,
      highlights,
      existingTopics,
    });
    const primaryResponse = await callPromptPackage(aiConfig, primaryPrompt, 0.1);
    if (!primaryResponse.ok) {
      return NextResponse.json(
        {
          error: "AI provider call failed.",
          details: primaryResponse.details || "Provider call failed.",
          failureCategory: "provider_failure",
        },
        { status: 502 }
      );
    }

    const primaryValidation = validatePdfFlashcardPayload({
      rawContent: String(primaryResponse.content || ""),
      highlights,
      validTopicIds,
    });
    attempts.push({
      stage: "generate",
      rawContent: String(primaryResponse.content || ""),
      result: primaryValidation,
    });

    if (primaryValidation.ok) {
      return NextResponse.json({
        candidates: primaryValidation.candidates,
        provider: primaryResponse.provider,
        model: primaryResponse.model,
      });
    }

    const repairPrompt = buildPdfFlashcardRepairPromptPackage({
      taskContext,
      highlights,
      existingTopics,
      previousRawOutput: String(primaryResponse.content || ""),
      validationResult: primaryValidation,
    });
    const repairResponse = await callPromptPackage(aiConfig, repairPrompt, 0);
    if (repairResponse.ok) {
      const repairValidation = validatePdfFlashcardPayload({
        rawContent: String(repairResponse.content || ""),
        highlights,
        validTopicIds,
      });
      attempts.push({
        stage: "repair",
        rawContent: String(repairResponse.content || ""),
        result: repairValidation,
      });

      if (repairValidation.ok) {
        return NextResponse.json({
          candidates: repairValidation.candidates,
          provider: repairResponse.provider,
          model: repairResponse.model,
        });
      }
    } else {
      attempts.push({
        stage: "repair",
        rawContent: "",
        result: {
          ok: false,
          category: "retry_exhaustion",
          candidates: [],
          reasons: [repairResponse.details || "Repair call failed."],
          candidateFailures: [],
          rawContent: "",
        },
      });
    }

    const regeneratePrompt = buildPdfFlashcardRegenerationPromptPackage({
      taskContext,
      highlights,
      existingTopics,
      priorAttempts: attempts,
    });
    const regenerateResponse = await callPromptPackage(aiConfig, regeneratePrompt, 0);
    if (regenerateResponse.ok) {
      const regenerateValidation = validatePdfFlashcardPayload({
        rawContent: String(regenerateResponse.content || ""),
        highlights,
        validTopicIds,
      });
      attempts.push({
        stage: "regenerate",
        rawContent: String(regenerateResponse.content || ""),
        result: regenerateValidation,
      });

      if (regenerateValidation.ok) {
        return NextResponse.json({
          candidates: regenerateValidation.candidates,
          provider: regenerateResponse.provider,
          model: regenerateResponse.model,
        });
      }
    } else {
      attempts.push({
        stage: "regenerate",
        rawContent: "",
        result: {
          ok: false,
          category: "retry_exhaustion",
          candidates: [],
          reasons: [regenerateResponse.details || "Final regeneration call failed."],
          candidateFailures: [],
          rawContent: "",
        },
      });
    }

    const failureDetails = buildFailureDetails(attempts);
    return NextResponse.json(
      {
        error: "Provider returned an invalid flashcard payload.",
        details: failureDetails.reasons.join(" | "),
        failureCategory: failureDetails.category,
        validationReasons: failureDetails.reasons,
        attempts: failureDetails.attempts,
      },
      { status: 502 }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to generate PDF flashcards.",
        details: message,
      },
      { status: 500 }
    );
  }
}
