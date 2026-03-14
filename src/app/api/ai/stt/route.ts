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

const TECHNICAL_STT_CORRECTIONS: Array<[RegExp, string]> = [
  [/\bopen jail\b/gi, "OpenGL"],
  [/\bopen g l\b/gi, "OpenGL"],
  [/\bopengl\b/gi, "OpenGL"],
  [/\bvulcan\b/gi, "Vulkan"],
  [/\bcuda\b/gi, "CUDA"],
  [/\bcuber\b/gi, "CUDA"],
  [/\bqueue d a\b/gi, "QDA"],
  [/\bkan ban\b/gi, "kanban"],
  [/\bshaders\b/gi, "shaders"],
  [/\bshader\b/gi, "shader"],
  [/\bweb g l\b/gi, "WebGL"],
  [/\btype script\b/gi, "TypeScript"],
  [/\bjava script\b/gi, "JavaScript"],
  [/\bnext j s\b/gi, "Next.js"],
  [/\bn p m\b/gi, "npm"],
  [/\bapi\b/gi, "API"],
  [/\bg p u\b/gi, "GPU"],
  [/\bc p u\b/gi, "CPU"],
];

const applyTechnicalCorrections = (input: string) => {
  let next = String(input || "").trim();
  for (const [pattern, replacement] of TECHNICAL_STT_CORRECTIONS) {
    next = next.replace(pattern, replacement as string);
  }
  return next.replace(/\s+/g, " ").trim();
};

const extractSegmentStats = (parsedJson: Record<string, unknown> | null) => {
  const segments = Array.isArray(parsedJson?.segments) ? parsedJson.segments : [];
  const stats = segments.reduce(
    (acc, segment) => {
      const item = (segment || {}) as Record<string, unknown>;
      const noSpeechProb = Number(item.no_speech_prob);
      const avgLogprob = Number(item.avg_logprob);
      const compressionRatio = Number(item.compression_ratio);
      const text = String(item.text || "").trim();
      if (Number.isFinite(noSpeechProb)) {
        acc.noSpeechProbSum += noSpeechProb;
        acc.noSpeechProbCount += 1;
      }
      if (Number.isFinite(avgLogprob)) {
        acc.avgLogprobSum += avgLogprob;
        acc.avgLogprobCount += 1;
      }
      if (Number.isFinite(compressionRatio)) {
        acc.compressionRatioMax = Math.max(acc.compressionRatioMax, compressionRatio);
      }
      if (text) {
        acc.segmentCount += 1;
      }
      return acc;
    },
    {
      noSpeechProbSum: 0,
      noSpeechProbCount: 0,
      avgLogprobSum: 0,
      avgLogprobCount: 0,
      compressionRatioMax: 0,
      segmentCount: 0,
    }
  );

  return {
    avgNoSpeechProb:
      stats.noSpeechProbCount > 0 ? stats.noSpeechProbSum / stats.noSpeechProbCount : null,
    avgLogprob:
      stats.avgLogprobCount > 0 ? stats.avgLogprobSum / stats.avgLogprobCount : null,
    compressionRatioMax: stats.compressionRatioMax || null,
    segmentCount: stats.segmentCount,
  };
};

const looksLikeLowConfidenceTranscript = (text: string, parsedJson: Record<string, unknown> | null) => {
  const normalized = String(text || "").trim().toLowerCase();
  if (!normalized) {
    return { reject: true, reason: "Local STT returned empty transcript." };
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  const uniqueWords = new Set(words);
  const stats = extractSegmentStats(parsedJson);
  const topLevelNoSpeechProb = Number((parsedJson as any)?.no_speech_prob);
  const topLevelAvgLogprob = Number((parsedJson as any)?.avg_logprob);
  const noSpeechProb = Number.isFinite(topLevelNoSpeechProb) ? topLevelNoSpeechProb : stats.avgNoSpeechProb;
  const avgLogprob = Number.isFinite(topLevelAvgLogprob) ? topLevelAvgLogprob : stats.avgLogprob;

  if (Number.isFinite(noSpeechProb as number) && (noSpeechProb as number) >= 0.72) {
    return { reject: true, reason: "Local STT detected mostly no-speech audio." };
  }

  if (Number.isFinite(avgLogprob as number) && (avgLogprob as number) <= -1.1) {
    return { reject: true, reason: "Local STT returned low-confidence transcript." };
  }

  if (Number.isFinite(stats.compressionRatioMax as number) && (stats.compressionRatioMax as number) >= 2.6) {
    return { reject: true, reason: "Local STT returned unstable transcript." };
  }

  const fillerOnly = /^(hello|hi|okay|ok|alright|all right|hmm|hm|uh|um|huh|yeah|yep|nope|thanks?)\.?$/i.test(normalized);
  if (fillerOnly) {
    return { reject: true, reason: "Local STT returned filler-only transcript." };
  }

  if (words.length >= 4 && uniqueWords.size <= 2) {
    return { reject: true, reason: "Local STT returned repetitive low-confidence transcript." };
  }

  return { reject: false, reason: "" };
};

const buildSttForms = (file: File) => {
  const baseEntries: Array<[string, string | File]> = [
    ["audio", file],
    ["file", file],
    ["audio_file", file],
    ["task", "transcribe"],
    ["language", "en"],
    ["temperature", "0"],
    ["best_of", "5"],
    ["beam_size", "5"],
  ];

  const advanced = new FormData();
  baseEntries.forEach(([key, value]) => {
    if (value instanceof File) {
      advanced.append(key, value, value.name || "speech.webm");
    } else {
      advanced.append(key, value);
    }
  });
  advanced.append("output", "verbose_json");
  advanced.append("response_format", "verbose_json");
  advanced.append("condition_on_previous_text", "false");
  advanced.append("vad_filter", "true");
  advanced.append("word_timestamps", "false");
  advanced.append("no_speech_threshold", "0.6");

  const minimal = new FormData();
  baseEntries.forEach(([key, value]) => {
    if (value instanceof File) {
      minimal.append(key, value, value.name || "speech.webm");
    } else {
      minimal.append(key, value);
    }
  });
  minimal.append("output", "json");
  minimal.append("response_format", "json");

  return [advanced, minimal];
};

const transcribeViaLocalService = async (file: File, localBaseUrl: string) => {
  const base = normalizeSttBaseUrl(localBaseUrl);
  const endpoints = [`${base}/transcribe`, `${base}/v1/audio/transcriptions`, `${base}/asr`];
  let lastError = "";
  let firstStrongError = "";
  for (const endpoint of endpoints) {
    for (const form of buildSttForms(file)) {
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
        const correctedText = applyTechnicalCorrections(text);
        const qualityCheck = looksLikeLowConfidenceTranscript(correctedText, parsedJson);
        if (qualityCheck.reject) {
          lastError = qualityCheck.reason;
          continue;
        }
        return {
          ok: true as const,
          text: correctedText,
          metadata: extractSegmentStats(parsedJson),
        };
      }
      lastError = "Local STT returned empty transcript.";
    }
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
          metadata: localResult.metadata || null,
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
