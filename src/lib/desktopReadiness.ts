import { DEFAULT_OLLAMA_BASE_URL, DEFAULT_OLLAMA_MODEL } from "@/lib/ai/config";

export type DesktopServiceCheck = {
  healthy: boolean;
  running?: boolean;
  warming?: boolean;
  warmingProgress?: number;
  warmingStartedAt?: number;
  installed?: boolean;
  managed?: boolean;
  mode?: string | null;
  backend?: string;
  version?: string;
  error?: string;
  baseUrl?: string;
  details?: string[];
};

export type DesktopEnvironmentStatus = {
  platform: string;
  isPackaged: boolean;
  userDataPath?: string;
  logFilePath?: string;
  docker: DesktopServiceCheck;
  ollama: DesktopServiceCheck & {
    models: string[];
    configuredModel?: string;
    hasConfiguredModel?: boolean;
  };
  kokoro: DesktopServiceCheck;
  xtts: DesktopServiceCheck;
  stt: DesktopServiceCheck;
};

export type MicrophoneStatus =
  | "granted"
  | "prompt"
  | "denied"
  | "unsupported"
  | "unknown";

export async function getMicrophoneStatus(): Promise<MicrophoneStatus> {
  if (typeof window === "undefined" || typeof navigator === "undefined") return "unknown";
  try {
    const permissions = (navigator as Navigator & {
      permissions?: {
        query: (descriptor: { name: string }) => Promise<{ state: string }>;
      };
    }).permissions;
    if (!permissions?.query) return "unsupported";
    const result = await permissions.query({ name: "microphone" });
    if (result.state === "granted" || result.state === "prompt" || result.state === "denied") {
      return result.state;
    }
    return "unknown";
  } catch {
    return "unsupported";
  }
}

export function getDesktopFallbackMessages(status: DesktopEnvironmentStatus, microphone: MicrophoneStatus): string[] {
  const notes: string[] = [];
  if (!status.docker.running) {
    notes.push("Without Docker, managed Kokoro and local STT auto-start will stay offline.");
  }
  if (!status.ollama.healthy) {
    notes.push("Without Ollama, local AI generation will not work. Cloud providers can still be used if configured.");
  } else if (status.ollama.configuredModel && !status.ollama.hasConfiguredModel) {
    notes.push(`Configured Ollama model "${status.ollama.configuredModel}" is missing. Pull it before relying on local AI.`);
  }
  if (!status.kokoro.healthy) {
    notes.push("Read-aloud will fall back to system/browser voices when Kokoro is unavailable.");
  }
  if (!status.stt.healthy) {
    notes.push("Microphone transcription will fall back to non-local paths only if a cloud AI provider is configured.");
  }
  if (status.xtts?.baseUrl && !status.xtts.healthy) {
    notes.push("XTTS voice cloning is configured but offline. Cloned local voice playback will be unavailable until XTTS is running.");
  }
  if (microphone === "denied") {
    notes.push("Microphone access is blocked. Voice chat and transcription will fail until permission is re-enabled.");
  }
  if (notes.length === 0) {
    notes.push("Core desktop AI services are available. The app can run in full local-first mode.");
  }
  return notes;
}

export function getDesktopReadinessScore(status: DesktopEnvironmentStatus, microphone: MicrophoneStatus): number {
  let score = 0;
  if (status.docker.running) score += 25;
  if (status.ollama.healthy) score += 25;
  if (status.ollama.hasConfiguredModel || (!status.ollama.configuredModel && status.ollama.models.length > 0)) score += 15;
  if (status.kokoro.healthy) score += 15;
  if (status.stt.healthy) score += 15;
  if (microphone === "granted" || microphone === "prompt") score += 5;
  return Math.max(0, Math.min(100, score));
}

export function getDesktopReadinessStatusLabel(score: number): string {
  if (score >= 90) return "Ready";
  if (score >= 65) return "Almost ready";
  if (score >= 35) return "Limited local AI";
  return "App can still run";
}

export function shouldShowDesktopReadinessPrompt(
  status: DesktopEnvironmentStatus | null,
  microphone: MicrophoneStatus
): boolean {
  if (!status) return false;
  if (microphone === "denied") return true;
  return false;
}

export function getConfiguredOllamaBaseUrl(value?: string): string {
  return String(value || "").trim() || DEFAULT_OLLAMA_BASE_URL;
}

export function getConfiguredOllamaModel(value?: string): string {
  return String(value || "").trim() || DEFAULT_OLLAMA_MODEL;
}
