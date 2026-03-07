"use client";

import type { AiRequestConfig } from "@/types/ai";

export type SpeechPrefs = {
  voiceURI?: string;
  rate?: number;
  pitch?: number;
};

export type CloudTtsVoice = {
  id: string;
  provider: "openai" | "kokoro";
  name: string;
  lang: string;
  voiceURI: string;
};

const PREFS_KEY = "studio_tts_prefs_v1";
const CLOUD_VOICE_PREFIX = "cloud:openai:";
const KOKORO_VOICE_PREFIX = "cloud:kokoro:";
const OPENAI_TTS_VOICES = [
  "alloy",
  "ash",
  "ballad",
  "coral",
  "echo",
  "fable",
  "nova",
  "onyx",
  "sage",
  "shimmer",
  "verse",
] as const;

const NATURAL_HINTS = [
  "natural",
  "neural",
  "online",
  "enhanced",
  "aria",
  "jenny",
  "guy",
  "sara",
  "siri",
  "google",
  "microsoft",
];

export const cleanSpeechText = (text: string) =>
  text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    .replace(/[>#*_~-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

export const getOpenAiCloudVoices = (aiConfig?: Partial<AiRequestConfig>): CloudTtsVoice[] => {
  if (!aiConfig?.openaiApiKey?.trim()) return [];
  return OPENAI_TTS_VOICES.map((id) => ({
    id,
    provider: "openai",
    name: `OpenAI ${id[0].toUpperCase()}${id.slice(1)}`,
    lang: "multi",
    voiceURI: `${CLOUD_VOICE_PREFIX}${id}`,
  }));
};

export const getKokoroLocalVoices = (enabled: boolean): CloudTtsVoice[] => {
  if (!enabled) return [];
  const defaults = ["af_sarah", "am_adam", "bf_emma", "bm_george"];
  return defaults.map((id) => ({
    id,
    provider: "kokoro",
    name: `Kokoro ${id}`,
    lang: "multi",
    voiceURI: `${KOKORO_VOICE_PREFIX}${id}`,
  }));
};

export const parseCloudVoiceURI = (voiceURI?: string): CloudTtsVoice | null => {
  if (!voiceURI) return null;
  if (voiceURI.startsWith(CLOUD_VOICE_PREFIX)) {
    const id = voiceURI.slice(CLOUD_VOICE_PREFIX.length).trim().toLowerCase();
    if (!id) return null;
    return {
      id,
      provider: "openai",
      name: `OpenAI ${id[0].toUpperCase()}${id.slice(1)}`,
      lang: "multi",
      voiceURI: `${CLOUD_VOICE_PREFIX}${id}`,
    };
  }
  if (voiceURI.startsWith(KOKORO_VOICE_PREFIX)) {
    const id = voiceURI.slice(KOKORO_VOICE_PREFIX.length).trim().toLowerCase();
    if (!id) return null;
    return {
      id,
      provider: "kokoro",
      name: `Kokoro ${id}`,
      lang: "multi",
      voiceURI: `${KOKORO_VOICE_PREFIX}${id}`,
    };
  }
  return null;
};

const scoreVoice = (voice: SpeechSynthesisVoice) => {
  const name = `${voice.name} ${voice.voiceURI}`.toLowerCase();
  const isEnglish = /^en([-_]|$)/i.test(voice.lang);
  let score = 0;
  if (isEnglish) score += 15;
  if (voice.default) score += 5;
  for (const hint of NATURAL_HINTS) {
    if (name.includes(hint)) score += 10;
  }
  return score;
};

export const pickBestVoice = (
  voices: SpeechSynthesisVoice[],
  preferredVoiceURI?: string
) => {
  if (!voices.length) return null;
  if (preferredVoiceURI) {
    const preferred = voices.find((v) => v.voiceURI === preferredVoiceURI);
    if (preferred) return preferred;
  }
  return [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a))[0] ?? null;
};

export const loadSpeechPrefs = (): SpeechPrefs => {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SpeechPrefs;
    return {
      voiceURI: typeof parsed.voiceURI === "string" ? parsed.voiceURI : undefined,
      rate: typeof parsed.rate === "number" ? parsed.rate : undefined,
      pitch: typeof parsed.pitch === "number" ? parsed.pitch : undefined,
    };
  } catch {
    return {};
  }
};

export const saveSpeechPrefs = (prefs: SpeechPrefs) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // ignore storage issues
  }
};
