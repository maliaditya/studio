export type AiProvider = "none" | "ollama" | "openai" | "perplexity" | "anthropic";

export interface AiRequestConfig {
  provider: AiProvider;
  model: string;
  ollamaBaseUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  perplexityApiKey?: string;
  perplexityBaseUrl?: string;
  anthropicApiKey?: string;
  anthropicBaseUrl?: string;
  requestTimeoutMs?: number;
}
