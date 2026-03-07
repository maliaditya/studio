import { getAiConfigFromSettings } from "@/lib/ai/config";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const DEFAULT_OPENAI_TTS_MODEL = "gpt-4o-mini-tts";

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice.trim().toLowerCase() : "alloy";
    const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "openai";
    const kokoroBaseUrlInput = typeof body?.kokoroBaseUrl === "string" ? body.kokoroBaseUrl.trim() : "";
    const speedInput = Number(body?.speed);
    const speed = Number.isFinite(speedInput) ? Math.min(1.5, Math.max(0.5, speedInput)) : 1;
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text) {
      return Response.json({ error: "Text is required." }, { status: 400 });
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

    let response: Response;
    if (provider === "kokoro") {
      if (!isDesktopRuntime) {
        return Response.json({ error: "Kokoro TTS is desktop-only." }, { status: 403 });
      }
      let kokoroBaseUrl = kokoroBaseUrlInput.replace(/\/+$/, "");
      if (!kokoroBaseUrl) {
        return Response.json({ error: "Kokoro base URL is required." }, { status: 400 });
      }
      let parsedBaseUrl;
      try {
        parsedBaseUrl = new URL(kokoroBaseUrl);
      } catch {
        return Response.json({ error: "Invalid Kokoro base URL." }, { status: 400 });
      }
      if (!["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname)) {
        return Response.json(
          { error: "Kokoro base URL must use localhost or 127.0.0.1." },
          { status: 400 }
        );
      }
      kokoroBaseUrl = `${parsedBaseUrl.protocol}//${parsedBaseUrl.hostname}:${parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80")}`;
      response = await fetch(`${kokoroBaseUrl}/v1/audio/speech`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "kokoro",
          voice,
          input: text,
          format: "mp3",
          speed,
        }),
      });
    } else {
      if (!aiConfig.openaiApiKey) {
        return Response.json(
          { error: "OpenAI API key is required for OpenAI cloud TTS." },
          { status: 400 }
        );
      }
      const baseUrl = (aiConfig.openaiBaseUrl || "https://api.openai.com").replace(/\/+$/, "");
      response = await fetch(`${baseUrl}/v1/audio/speech`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${aiConfig.openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: DEFAULT_OPENAI_TTS_MODEL,
          voice,
          input: text,
          format: "mp3",
          speed,
        }),
      });
    }

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      return Response.json(
        { error: `${provider === "kokoro" ? "Kokoro" : "OpenAI"} TTS request failed.`, details: details || response.statusText },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: "Unable to synthesize speech.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
