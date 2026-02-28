export type AiProvider = "ollama" | "openai";

export interface AiRequestConfig {
  provider: AiProvider;
  model: string;
  ollamaBaseUrl?: string;
  openaiApiKey?: string;
  openaiBaseUrl?: string;
  requestTimeoutMs?: number;
}

