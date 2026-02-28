import type { AiProvider, AiRequestConfig } from "@/types/ai";

export const DEFAULT_OLLAMA_MODEL = "gemma3:4b";
export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";
export const DEFAULT_OLLAMA_BASE_URL = "http://127.0.0.1:11434";
export const DEFAULT_OPENAI_BASE_URL = "https://api.openai.com";
export const DEFAULT_AI_TIMEOUT_MS = 45000;

export type NormalizedAiSettings = {
  provider: AiProvider;
  model: string;
  ollamaBaseUrl: string;
  openaiApiKey: string;
  openaiBaseUrl: string;
  requestTimeoutMs: number;
};

export const normalizeAiSettings = (
  ai: Partial<AiRequestConfig> | undefined,
  isDesktopRuntime: boolean
): NormalizedAiSettings => {
  const provider: AiProvider = ai?.provider || (isDesktopRuntime ? "ollama" : "openai");
  const fallbackModel = provider === "ollama" ? DEFAULT_OLLAMA_MODEL : DEFAULT_OPENAI_MODEL;
  return {
    provider,
    model: (ai?.model || fallbackModel).trim(),
    ollamaBaseUrl: (ai?.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL).trim(),
    openaiApiKey: (ai?.openaiApiKey || "").trim(),
    openaiBaseUrl: (ai?.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL).trim(),
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
    requestTimeoutMs: normalized.requestTimeoutMs,
  };
};
