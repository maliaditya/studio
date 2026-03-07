import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import {
  MAX_ALIASES_PER_TASK,
  getStaticTaskAliasMap,
  mergeTaskAliasMaps,
  normalizeTaskAliasMap,
  sanitizeGeneratedTaskAliases,
} from "@/lib/shiv/taskAliases";
import { normalizeText, toPlainText } from "@/lib/shiv/normalize";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

type RoutineTask = { id?: string; details?: string };

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

const extractJsonObject = (raw: string): Record<string, unknown> | null => {
  const text = String(raw || "").trim();
  if (!text) return null;
  const firstBrace = text.indexOf("{");
  const lastBrace = text.lastIndexOf("}");
  if (firstBrace < 0 || lastBrace <= firstBrace) return null;
  const candidate = text.slice(firstBrace, lastBrace + 1);
  try {
    const parsed = JSON.parse(candidate);
    if (parsed && typeof parsed === "object") return parsed as Record<string, unknown>;
    return null;
  } catch {
    return null;
  }
};

const buildCanonicalRoutineNames = (routineTasks: RoutineTask[]) => {
  const byNorm = new Map<string, string>();
  for (const task of routineTasks) {
    const raw = String(task?.details || "").trim();
    if (!raw) continue;
    const norm = normalizeText(raw);
    if (!norm) continue;
    if (!byNorm.has(norm)) byNorm.set(norm, raw);
  }
  return Array.from(byNorm.values());
};

export async function POST(request: Request) {
  try {
    if (process.env.SHIV_ALIAS_REFRESH === "0") {
      return NextResponse.json(
        { error: "Synonym refresh is disabled. Set SHIV_ALIAS_REFRESH=1 to enable." },
        { status: 503 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";

    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;
    const routineTasks = (Array.isArray(body?.routineTasks) ? body.routineTasks : []) as RoutineTask[];
    const existingTaskAliases = (body?.existingTaskAliases || {}) as Record<string, unknown>;

    const canonicalTasks = buildCanonicalRoutineNames(routineTasks);
    if (canonicalTasks.length === 0) {
      return NextResponse.json({ error: "No routine tasks found to generate synonyms." }, { status: 400 });
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

    const invalid = validateProviderConfig(aiConfig);
    if (invalid) {
      return NextResponse.json({ error: invalid }, { status: 400 });
    }

    const staticAliases = getStaticTaskAliasMap();
    const mergedExisting = mergeTaskAliasMaps(staticAliases, normalizeTaskAliasMap(existingTaskAliases));

    const systemPrompt = `You are an assistant that generates synonym aliases for routine task names.
Return strict JSON only with this shape:
{
  "taskAliases": {
    "<task name>": ["alias1", "alias2"]
  }
}
Rules:
- English only.
- Keep aliases short and user-query friendly.
- Include typo variants and natural phrase variants.
- Do not output any task not in the provided routine task list.
- Max 12 aliases per task.
- Do not include markdown, comments, or prose.`;

    const userPrompt = `Routine task names:\n${JSON.stringify(canonicalTasks, null, 2)}\n\nCurrent alias map (preserve and extend):\n${JSON.stringify(
      mergedExisting,
      null,
      2
    )}`;

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { format: "json", temperature: 0.1 }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: "Synonym generation failed.",
          details: aiResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }

    const parsed = extractJsonObject(aiResponse.content || "");
    const generatedMap = (parsed?.taskAliases || {}) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        {
          error: "Provider returned invalid JSON for synonym generation.",
          details: toPlainText(aiResponse.content || "").slice(0, 280),
        },
        { status: 502 }
      );
    }

    const sanitizedGenerated = sanitizeGeneratedTaskAliases(generatedMap, canonicalTasks, MAX_ALIASES_PER_TASK);
    const merged = mergeTaskAliasMaps(mergedExisting, sanitizedGenerated, MAX_ALIASES_PER_TASK);
    const updatedKeys = Object.keys(sanitizedGenerated);

    if (process.env.SHIV_ALIAS_REFRESH_SHADOW === "1") {
      console.info("[shiv-alias-refresh]", {
        tasks: canonicalTasks.length,
        updatedKeys,
        provider: aiResponse.provider,
        model: aiResponse.model,
      });
    }

    return NextResponse.json({
      taskAliases: merged,
      generatedFor: canonicalTasks.length,
      updatedKeys,
      provider: aiResponse.provider,
      model: aiResponse.model,
      meta: {
        refreshedAt: new Date().toISOString(),
        cappedAt: MAX_ALIASES_PER_TASK,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to refresh Shiv task synonyms.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
