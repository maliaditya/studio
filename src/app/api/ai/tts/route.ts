import { getAiConfigFromSettings } from "@/lib/ai/config";
import type { AiRequestConfig } from "@/types/ai";
import { promises as fs } from "fs";
import os from "os";
import path from "path";

export const dynamic = "force-dynamic";

const DEFAULT_OPENAI_TTS_MODEL = "gpt-4o-mini-tts";
const XTTS_DOCKER_SPEAKER_DIR = process.env.ELECTRON_XTTS_SPEAKER_DIR || "/app/voices";
const XTTS_DOCKER_OUTPUT_DIR = process.env.ELECTRON_XTTS_OUTPUT_DIR || "/app/output";
const XTTS_SPEAKER_HOST_DIR =
  process.env.ELECTRON_XTTS_SPEAKER_HOST_DIR ||
  (process.env.APPDATA ? path.join(process.env.APPDATA, "nextn", "xtts-voices") : path.join(os.tmpdir(), "nextn", "xtts-voices"));
const XTTS_OUTPUT_HOST_DIR =
  process.env.ELECTRON_XTTS_OUTPUT_HOST_DIR ||
  (process.env.APPDATA ? path.join(process.env.APPDATA, "nextn", "xtts-output") : path.join(os.tmpdir(), "nextn", "xtts-output"));

const normalizeLocalBaseUrl = (input: string, label: string) => {
  const trimmed = input.replace(/\/+$/, "");
  if (!trimmed) {
    throw new Error(`${label} base URL is required.`);
  }
  let parsedBaseUrl: URL;
  try {
    parsedBaseUrl = new URL(trimmed);
  } catch {
    throw new Error(`Invalid ${label} base URL.`);
  }
  if (!["127.0.0.1", "localhost"].includes(parsedBaseUrl.hostname)) {
    throw new Error(`${label} base URL must use localhost or 127.0.0.1.`);
  }
  return `${parsedBaseUrl.protocol}//${parsedBaseUrl.hostname}:${parsedBaseUrl.port || (parsedBaseUrl.protocol === "https:" ? "443" : "80")}`;
};

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findAppManagedXttsSample = async (voice: string) => {
  const trimmedVoice = String(voice || "").trim();
  if (!trimmedVoice) return "";
  const safeVoice = trimmedVoice.replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  const patterns = [
    new RegExp(`^xtts-${escapeRegExp(safeVoice)}-sample\\.(wav|mp3|m4a|ogg|webm)$`, "i"),
    new RegExp(`^${escapeRegExp(safeVoice)}\\.(wav|mp3|m4a|ogg|webm)$`, "i"),
  ];
  try {
    const entries = await fs.readdir(XTTS_SPEAKER_HOST_DIR, { withFileTypes: true });
    const match = entries.find((entry) => entry.isFile() && patterns.some((pattern) => pattern.test(entry.name)));
    return match ? path.posix.join(XTTS_DOCKER_SPEAKER_DIR, match.name) : "";
  } catch {
    return "";
  }
};

const requestXttsAudio = async ({
  baseUrl,
  text,
  voice,
  speed,
  language,
  speakerWavPath,
}: {
  baseUrl: string;
  text: string;
  voice: string;
  speed: number;
  language: string;
  speakerWavPath: string;
}) => {
  const resolvedSpeakerWavPath = speakerWavPath || (await findAppManagedXttsSample(voice));
  const normalizedLanguage = language || "en";
  const normalizedSpeakerWavPath = resolvedSpeakerWavPath
    ? resolvedSpeakerWavPath.startsWith("/app/")
      ? resolvedSpeakerWavPath
      : path.posix.join(XTTS_DOCKER_SPEAKER_DIR, path.basename(resolvedSpeakerWavPath))
    : "";
  const speakerReference = normalizedSpeakerWavPath || voice;
  const attempts: { label: string; response: Response | null }[] = [];
  const xttsSettingsPayload = {
    temperature: 0.75,
    speed,
    length_penalty: 1,
    repetition_penalty: 10,
    top_p: 0.85,
    top_k: 50,
    enable_text_splitting: true,
  };

  if (!speakerReference) {
    return Response.json(
      {
        error: "XTTS speaker reference is required.",
        details: "Provide a voice sample path or choose a valid XTTS speaker.",
      },
      { status: 400 }
    );
  }

  if (!normalizedSpeakerWavPath && /^(my_voice|custom|clone|voice)$/i.test(String(voice || "").trim())) {
    return Response.json(
      {
        error: "XTTS voice sample is missing.",
        details: "This XTTS setup needs a saved voice sample for custom cloned voices. Open Settings, record or choose the sample, then save it again.",
      },
      { status: 400 }
    );
  }

  const xttsSettingsResponse = await fetch(`${baseUrl}/set_tts_settings`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(xttsSettingsPayload),
  }).catch(() => null);
  if (!xttsSettingsResponse?.ok) {
    attempts.push({ label: "POST /set_tts_settings", response: xttsSettingsResponse });
  }

  const outputFileName = `tts-${Date.now()}-${Math.random().toString(36).slice(2)}.wav`;
  const outputPath = path.posix.join(XTTS_DOCKER_OUTPUT_DIR, outputFileName);
  const outputHostPath = path.join(XTTS_OUTPUT_HOST_DIR, outputFileName);
  await fs.mkdir(XTTS_OUTPUT_HOST_DIR, { recursive: true }).catch(() => undefined);
  await fs.unlink(outputHostPath).catch(() => undefined);
  const fileResponse = await fetch(`${baseUrl}/tts_to_file`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      language: normalizedLanguage,
      speaker_wav: speakerReference,
      file_name_or_path: outputPath,
    }),
  }).catch(() => null);
  attempts.push({ label: "POST /tts_to_file", response: fileResponse });
  if (fileResponse?.ok) {
    try {
      const payload = await fileResponse.json().catch(() => ({}));
      const resolvedOutputPath =
        typeof payload?.output_path === "string" && payload.output_path.trim()
          ? payload.output_path.trim()
          : outputPath;
      const resolvedHostPath = path.join(XTTS_OUTPUT_HOST_DIR, path.basename(resolvedOutputPath));
      for (let attempt = 0; attempt < 20; attempt += 1) {
        try {
          const audioBuffer = await fs.readFile(resolvedHostPath);
          await fs.unlink(resolvedHostPath).catch(() => undefined);
          return new Response(audioBuffer, {
            status: 200,
            headers: {
              "Content-Type": "audio/wav",
              "Cache-Control": "no-store",
            },
          });
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 250));
        }
      }
      return Response.json(
        {
          error: "XTTS generated audio but the desktop app could not find the output file.",
          details: `Expected file at ${resolvedHostPath}`,
        },
        { status: 502 }
      );
    } catch (error) {
      return Response.json(
        {
          error: "XTTS generated audio but the desktop app could not read it back from disk.",
          details: error instanceof Error ? error.message : "Unknown XTTS file read error.",
        },
        { status: 502 }
      );
    }
  }

  const nativeResponse = await fetch(`${baseUrl}/tts_to_audio/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      language: normalizedLanguage,
      speaker_wav: speakerReference,
    }),
  }).catch(() => null);
  attempts.push({ label: "POST /tts_to_audio/", response: nativeResponse });
  if (nativeResponse?.ok) return nativeResponse;

  const clonePayload = {
    text,
    language: normalizedLanguage,
    speaker_wav: normalizedSpeakerWavPath || undefined,
    speaker: normalizedSpeakerWavPath ? undefined : voice,
  };

  const directResponse = await fetch(`${baseUrl}/api/tts`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(clonePayload),
  }).catch(() => null);
  attempts.push({ label: "POST /api/tts", response: directResponse });
  if (directResponse?.ok) return directResponse;

  const compatResponse = await fetch(`${baseUrl}/v1/audio/speech`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "xtts-v2",
      voice,
      input: text,
      speed,
      language: language || "en",
      speaker_wav: normalizedSpeakerWavPath || undefined,
      format: "mp3",
    }),
  }).catch(() => null);
  attempts.push({ label: "POST /v1/audio/speech", response: compatResponse });
  if (compatResponse?.ok) return compatResponse;

  const details = [];
  for (const attempt of attempts) {
    if (!attempt.response) continue;
    const body = await attempt.response.text().catch(() => "");
    if (body) {
      details.push(`${attempt.label}: ${body}`);
    } else if (!attempt.response.ok) {
      details.push(`${attempt.label}: ${attempt.response.status} ${attempt.response.statusText}`.trim());
    }
  }

  const unsupportedLanguageDetail = details.find((entry) => /language .* not supported|supported languages are/i.test(entry));
  if (unsupportedLanguageDetail) {
    return Response.json(
      {
        error: "XTTS language is not supported by the current server.",
        details: unsupportedLanguageDetail,
      },
      { status: 502 }
    );
  }

  if (
    !normalizedSpeakerWavPath &&
    details.some((entry) => /speaker .* not found/i.test(entry))
  ) {
    return Response.json(
      {
        error: "XTTS custom voice is not configured.",
        details: "A custom XTTS voice was selected, but no saved voice sample is available. Open Settings and save the XTTS voice sample again.",
      },
      { status: 502 }
    );
  }

  if (
    resolvedSpeakerWavPath &&
    (/^[a-zA-Z]:\\/.test(resolvedSpeakerWavPath) || /^[a-zA-Z]:\//.test(resolvedSpeakerWavPath)) &&
    details.some((entry) => /speaker|wav|file|not found|no such file|errno/i.test(entry))
  ) {
    return Response.json(
      {
        error: "XTTS could not access the local voice sample.",
        details:
          "This XTTS Docker image needs a built-in speaker id or a sample file path that exists inside the container. Re-save the voice sample from Settings so it is placed into the app-managed XTTS voice folder.",
      },
      { status: 502 }
    );
  }

  if (
    normalizedSpeakerWavPath.startsWith(XTTS_DOCKER_SPEAKER_DIR) &&
    details.some((entry) => /speaker .* not found|no such file|not found/i.test(entry))
  ) {
    return Response.json(
      {
        error: "XTTS could not find the mounted voice sample.",
        details:
          "The current XTTS container does not have the app-managed voice folder mounted, or the saved sample was not re-created there. Restart XTTS from the app, then record and save the voice sample again.",
      },
      { status: 502 }
    );
  }

  return Response.json(
    {
      error: "XTTS server did not accept the request.",
      details: details.join(" | ") || "No XTTS endpoint accepted the synthesis request.",
    },
    { status: 502 }
  );
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const voice = typeof body?.voice === "string" ? body.voice.trim().toLowerCase() : "alloy";
    const provider = typeof body?.provider === "string" ? body.provider.trim().toLowerCase() : "openai";
    const kokoroBaseUrlInput = typeof body?.kokoroBaseUrl === "string" ? body.kokoroBaseUrl.trim() : "";
    const xttsBaseUrlInput = typeof body?.xttsBaseUrl === "string" ? body.xttsBaseUrl.trim() : "";
    const xttsSpeakerWavPath = typeof body?.xttsSpeakerWavPath === "string" ? body.xttsSpeakerWavPath.trim() : "";
    const xttsLanguage = typeof body?.xttsLanguage === "string" ? body.xttsLanguage.trim() : "en";
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
      try {
        const kokoroBaseUrl = normalizeLocalBaseUrl(kokoroBaseUrlInput, "Kokoro");
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
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Invalid Kokoro base URL." }, { status: 400 });
      }
    } else if (provider === "xtts") {
      if (!isDesktopRuntime) {
        return Response.json({ error: "XTTS is desktop-only." }, { status: 403 });
      }
      try {
        const xttsBaseUrl = normalizeLocalBaseUrl(xttsBaseUrlInput, "XTTS");
        response = await requestXttsAudio({
          baseUrl: xttsBaseUrl,
          text,
          voice,
          speed,
          language: xttsLanguage,
          speakerWavPath: xttsSpeakerWavPath,
        });
      } catch (error) {
        return Response.json({ error: error instanceof Error ? error.message : "Invalid XTTS base URL." }, { status: 400 });
      }
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
        { error: `${provider === "kokoro" ? "Kokoro" : provider === "xtts" ? "XTTS" : "OpenAI"} TTS request failed.`, details: details || response.statusText },
        { status: 502 }
      );
    }

    const audioBuffer = await response.arrayBuffer();
    return new Response(audioBuffer, {
      status: 200,
      headers: {
        "Content-Type": response.headers.get("content-type") || "audio/mpeg",
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
