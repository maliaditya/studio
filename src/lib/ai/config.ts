import type { AiProvider, AiRequestConfig } from "@/types/ai";

export const DEFAULT_OLLAMA_MODEL = "gemma3:4b";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_PERPLEXITY_MODEL = "sonar";
export const DEFAULT_ANTHROPIC_MODEL = "claude-3-5-sonnet-latest";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
export const DEFAULT_PERPLEXITY_BASE_URL = "https://api.perplexity.ai";
export const DEFAULT_ANTHROPIC_BASE_URL = "https://api.anthropic.com";
export const DEFAULT_AI_TIMEOUT_MS = 45000;

export type NormalizedAiSettings = {
  provider: AiProvider;
  model: string;
  ollamaBaseUrl: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  perplexityApiKey: string;
  perplexityBaseUrl: string;
  anthropicApiKey: string;
  anthropicBaseUrl: string;
  requestTimeoutMs: number;
};

export const normalizeAiSettings = (
  ai: Partial<AiRequestConfig> | undefined,
  isDesktopRuntime: boolean
): NormalizedAiSettings => {
  const provider: AiProvider = ai?.provider || "none";
  const fallbackModel = (() => {
    if (provider === "ollama") return DEFAULT_OLLAMA_MODEL;
    if (provider === "openai") return DEFAULT_OPENAI_MODEL;
    if (provider === "perplexity") return DEFAULT_PERPLEXITY_MODEL;
    if (provider === "anthropic") return DEFAULT_ANTHROPIC_MODEL;
    return "";
  })();
  return {
    provider,
    model: (ai?.model || fallbackModel).trim(),
    ollamaBaseUrl: (ai?.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL).trim(),
    openaiApiKey: (ai?.openaiApiKey || "").trim(),
    openaiBaseUrl: (ai?.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL).trim(),
    perplexityApiKey: (ai?.perplexityApiKey || "").trim(),
    perplexityBaseUrl: (ai?.perplexityBaseUrl || DEFAULT_PERPLEXITY_BASE_URL).trim(),
    anthropicApiKey: (ai?.anthropicApiKey || "").trim(),
    anthropicBaseUrl: (ai?.anthropicBaseUrl || DEFAULT_ANTHROPIC_BASE_URL).trim(),
    requestTimeoutMs: Math.max(5000, Number(ai?.requestTimeoutMs || DEFAULT_AI_TIMEOUT_MS)),
  };
};

export const getAiConfigFromSettings = (
  settings: { ai?: Partial<AiRequestConfig> } | undefined,
  isDesktopRuntime: boolean
): AiRequestConfig => {
  const normalized = normalizeAiSettings(settings?.ai, isDesktopRuntime);
  return {
    provider: normalized.provider,
    model: normalized.model,
    ollamaBaseUrl: normalized.ollamaBaseUrl,
    openaiApiKey: normalized.openaiApiKey,
    openaiBaseUrl: normalized.openaiBaseUrl,
    perplexityApiKey: normalized.perplexityApiKey,
    perplexityBaseUrl: normalized.perplexityBaseUrl,
    anthropicApiKey: normalized.anthropicApiKey,
    anthropicBaseUrl: normalized.anthropicBaseUrl,
    requestTimeoutMs: normalized.requestTimeoutMs,
  };
};
