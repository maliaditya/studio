import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const validateAudioFile = (value: unknown) => {
  if (!(value instanceof File)) return "Audio file is required.";
  if (value.size <= 0) return "Audio file is empty.";
  return null;
};

const normalizeSttBaseUrl = (rawBaseUrl: string) => {
  const trimmed = String(rawBaseUrl || "").trim().replace(/\/+$/, "");
  if (!trimmed) return "";
  // Allow users/settings to paste endpoint URLs; normalize back to host base.
  return trimmed
    .replace(/\/transcribe$/i, "")
    .replace(/\/v1\/audio\/transcriptions$/i, "");
};

const summarizeHttpError = (status: number, endpoint: string, body: string) => {
  const text = String(body || "").replace(/\s+/g, " ").trim();
  const looksHtml = /<!doctype html|<html/i.test(text);
  if (looksHtml) {
    return `Local STT endpoint returned ${status} at ${endpoint}. Check Local STT Base URL in settings.`;
  }
  const short = text.slice(0, 220);
  return short || `Local STT endpoint returned ${status} at ${endpoint}.`;
};

const transcribeViaLocalService = async (file: File, localBaseUrl: string) => {
  const base = normalizeSttBaseUrl(localBaseUrl);
  const endpoints = [`${base}/transcribe`, `${base}/v1/audio/transcriptions`, `${base}/asr`];
  let lastError = "";
  let firstStrongError = "";
  for (const endpoint of endpoints) {
    const form = new FormData();
    // Support common local STT servers expecting "audio", "file", or "audio_file".
    form.append("audio", file, file.name || "speech.webm");
    form.append("file", file, file.name || "speech.webm");
    form.append("audio_file", file, file.name || "speech.webm");
    // onerahmet/openai-whisper-asr-webservice expects task/language/output optionally.
    form.append("task", "transcribe");
    form.append("language", "en");
    form.append("output", "json");
    // Bias for stable, cleaner transcriptions on local whisper servers.
    form.append("temperature", "0");
    form.append("best_of", "5");
    form.append("beam_size", "5");
    const response = await fetch(endpoint, {
      method: "POST",
      body: form,
    });

    if (!response.ok) {
      const details = await response.text().catch(() => "");
      const message = summarizeHttpError(response.status, endpoint, details);
      lastError = message;
      // Prefer non-404 failures (like 500 on /transcribe) over fallback endpoint 404 noise.
      if (!firstStrongError && response.status !== 404) {
        firstStrongError = message;
      }
      continue;
    }

    const rawBody = await response.text().catch(() => "");
    let parsedJson: Record<string, unknown> | null = null;
    try {
      parsedJson = rawBody ? (JSON.parse(rawBody) as Record<string, unknown>) : null;
    } catch {
      parsedJson = null;
    }

    const transcription = Array.isArray(parsedJson?.transcription) ? parsedJson?.transcription : null;
    const joinedTranscription = transcription
      ? transcription
          .map((item) => String((item as Record<string, unknown>)?.text || "").trim())
          .filter(Boolean)
          .join(" ")
      : "";
    const plainText = rawBody.trim();
    const text = String(
      parsedJson?.text ||
        parsedJson?.transcript ||
        joinedTranscription ||
        // Some local STT services return plain text instead of JSON.
        (!/^\s*[{[]/.test(plainText) ? plainText : "")
    ).trim();
    if (text) {
      return { ok: true as const, text };
    }
    lastError = "Local STT returned empty transcript.";
  }

  return {
    ok: false as const,
    details: firstStrongError || lastError || "Local STT did not return a transcript.",
  };
};

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const audio = formData.get("audio");
    const localSttBaseUrlFromRequest = String(formData.get("localSttBaseUrl") || "").trim();
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";

    const validationError = validateAudioFile(audio);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const localSttBaseUrl =
      localSttBaseUrlFromRequest ||
      process.env.LOCAL_STT_BASE_URL ||
      process.env.STT_LOCAL_BASE_URL ||
      (isDesktopRuntime ? "http://127.0.0.1:9890" : "") ||
      "";
    if (!localSttBaseUrl) {
      return NextResponse.json(
        {
          error: "Speech transcription failed.",
          details: "Local STT base URL is not configured. Set Local STT Server URL in settings.",
        },
        { status: 502 }
      );
    }

    if (localSttBaseUrl) {
      const localResult = await transcribeViaLocalService(audio as File, localSttBaseUrl);
      if (localResult.ok) {
        return NextResponse.json({
          text: localResult.text,
          provider: "local-stt",
          model: "local",
        });
      }
      return NextResponse.json(
        {
          error: "Speech transcription failed.",
          details: localResult.details || "Local STT server is unavailable.",
        },
        { status: 502 }
      );
    }

    return NextResponse.json(
      {
        error: "Speech transcription failed.",
        details: "Local STT server is unavailable.",
      },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      {
        error: "Unable to transcribe speech.",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
