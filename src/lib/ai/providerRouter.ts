import {
  DEFAULT_AI_TIMEOUT_MS,
  DEFAULT_OLLAMA_BASE_URL,
  DEFAULT_OPENAI_BASE_URL,
} from "@/lib/ai/config";
import type { AiRequestConfig } from "@/types/ai";

export type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

type ChatOptions = {
  format?: "json";
  temperature?: number;
};

export type ProviderChatResult = {
  ok: boolean;
  content: string;
  details?: string;
  provider: AiRequestConfig["provider"];
  model: string;
};

const withTimeout = async (
  timeoutMs: number,
  run: (signal: AbortSignal) => Promise<Response>
) => {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.max(1000, timeoutMs || DEFAULT_AI_TIMEOUT_MS));
  try {
    return await run(controller.signal);
  } finally {
    clearTimeout(timeout);
  }
};

export async function callOllamaChat(
  config: AiRequestConfig,
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ProviderChatResult> {
  const baseUrl = (config.ollamaBaseUrl || DEFAULT_OLLAMA_BASE_URL).trim();
  const model = (config.model || "").trim();
  if (!model) {
    return {
      ok: false,
      content: "",
      details: "Ollama model is required.",
      provider: "ollama",
      model: "",
    };
  }

  try {
    const response = await withTimeout(config.requestTimeoutMs || DEFAULT_AI_TIMEOUT_MS, (signal) =>
      fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          stream: false,
          format: options?.format,
          messages,
          options: typeof options?.temperature === "number" ? { temperature: options.temperature } : undefined,
        }),
        signal,
      })
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return { ok: false, content: "", details, provider: "ollama", model };
    }

    const data = (await response.json()) as { message?: { content?: string } };
    return {
      ok: true,
      content: data?.message?.content?.trim() || "",
      provider: "ollama",
      model,
    };
  } catch (error) {
    return {
      ok: false,
      content: "",
      details: error instanceof Error ? error.message : "Unknown Ollama error",
      provider: "ollama",
      model,
    };
  }
}

export async function callOpenAIChat(
  config: AiRequestConfig,
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ProviderChatResult> {
  const model = (config.model || "").trim();
  const apiKey = (config.openaiApiKey || "").trim();
  const baseUrl = (config.openaiBaseUrl || DEFAULT_OPENAI_BASE_URL).trim();
  if (!apiKey) {
    return {
      ok: false,
      content: "",
      details: "OpenAI API key is required.",
      provider: "openai",
      model,
    };
  }
  if (!model) {
    return {
      ok: false,
      content: "",
      details: "OpenAI model is required.",
      provider: "openai",
      model: "",
    };
  }

  try {
    const response = await withTimeout(config.requestTimeoutMs || DEFAULT_AI_TIMEOUT_MS, (signal) =>
      fetch(`${baseUrl.replace(/\/+$/, "")}/v1/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature: typeof options?.temperature === "number" ? options.temperature : undefined,
          response_format: options?.format === "json" ? { type: "json_object" } : undefined,
        }),
        signal,
      })
    );

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return { ok: false, content: "", details, provider: "openai", model };
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content?.trim() || "";
    return { ok: true, content, provider: "openai", model };
  } catch (error) {
    return {
      ok: false,
      content: "",
      details: error instanceof Error ? error.message : "Unknown OpenAI error",
      provider: "openai",
      model,
    };
  }
}

export async function runChatWithProvider(
  config: AiRequestConfig,
  messages: ChatMessage[],
  options?: ChatOptions
): Promise<ProviderChatResult> {
  if (config.provider === "openai") {
    return callOpenAIChat(config, messages, options);
  }
  return callOllamaChat(config, messages, options);
}

