"use client";

import { useCallback, useEffect, useRef, useState, type MutableRefObject } from "react";
import type { AppState, ExcalidrawElement } from "@excalidraw/excalidraw";
import { getAudio, storeAudio } from "@/lib/audioDB";
import { safeSetLocalStorageItem } from "@/lib/safeStorage";

const RECORDING_STORAGE_KEY_PREFIX = "canvas-recordings:";
const LEGACY_RECORDING_STORAGE_KEY_PREFIX = "canvas-recording:";
const AUDIO_KEY_PREFIX = "canvas-recording-audio:";
const RECORDING_VERSION = 2;
const RECORDING_SAMPLE_MS = 160;

export type CanvasRecordingFrame = {
  t: number;
  elements: ExcalidrawElement[];
  appState?: Pick<AppState, "viewBackgroundColor" | "gridSize">;
};

export type CanvasRecording = {
  version: number;
  createdAt: number;
  durationMs: number;
  frames: CanvasRecordingFrame[];
  audioKey?: string;
  audioMimeType?: string;
};

export type CanvasRecordingEntry = CanvasRecording & {
  id: string;
  name: string;
  skippedFrameIndices?: number[];
};

type CanvasRecordingStore = {
  version: number;
  recordings: CanvasRecordingEntry[];
  activeId?: string;
};

type AudioMeta = { key: string; mimeType: string } | null;

type ToastFn = (args: { title: string; description?: string; variant?: "default" | "destructive" }) => void;

type Params = {
  canvasId?: string | null;
  excalidrawAPIRef: MutableRefObject<any | null>;
  toast: ToastFn;
};

const getRecordingStorageKey = (canvasId: string) => `${RECORDING_STORAGE_KEY_PREFIX}${canvasId}`;
const getLegacyRecordingStorageKey = (canvasId: string) => `${LEGACY_RECORDING_STORAGE_KEY_PREFIX}${canvasId}`;

const cloneElements = (elements: readonly ExcalidrawElement[]) => {
  return JSON.parse(JSON.stringify(elements)) as ExcalidrawElement[];
};

const buildFingerprint = (elements: readonly ExcalidrawElement[]) => {
  const ids = elements.map((element) => {
    const version = (element as any).version ?? 0;
    const nonce = (element as any).versionNonce ?? 0;
    const deleted = (element as any).isDeleted ? 1 : 0;
    return `${element.id}:${version}:${nonce}:${deleted}`;
  });
  return `${elements.length}|${ids.join("|")}`;
};

const migrateLegacy = (value: any): CanvasRecordingStore | null => {
  if (!value) return null;
  if (Array.isArray(value.recordings)) {
    return value as CanvasRecordingStore;
  }
  if (Array.isArray(value.frames)) {
    const entry: CanvasRecordingEntry = {
      id: `rec_${Date.now()}`,
      name: "Recording 1",
      version: value.version || 1,
      createdAt: value.createdAt || Date.now(),
      durationMs: value.durationMs || 0,
      frames: value.frames || [],
      audioKey: value.audioKey,
      audioMimeType: value.audioMimeType,
    };
    return {
      version: RECORDING_VERSION,
      recordings: [entry],
      activeId: entry.id,
    };
  }
  return null;
};

export function useCanvasRecording({ canvasId, excalidrawAPIRef, toast }: Params) {
  const [recordings, setRecordings] = useState<CanvasRecordingEntry[]>([]);
  const [activeRecordingId, setActiveRecordingId] = useState<string | null>(null);
  const [recording, setRecording] = useState<CanvasRecordingEntry | null>(null);
  const [hasRecording, setHasRecording] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(0);
  const [playbackTimeMs, setPlaybackTimeMs] = useState(0);
  const [playbackFrameIndex, setPlaybackFrameIndex] = useState<number | null>(null);
  const playbackSpeedRef = useRef(0);
  const playbackElapsedRef = useRef(0);
  const playbackLastTickRef = useRef<number | null>(null);

  const isRecordingRef = useRef(false);
  const isPlayingRef = useRef(false);
  const framesRef = useRef<CanvasRecordingFrame[]>([]);
  const recordStartRef = useRef(0);
  const lastRecordTsRef = useRef(0);
  const lastFingerprintRef = useRef<string | null>(null);

  const audioRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioStopPromiseRef = useRef<Promise<AudioMeta> | null>(null);
  const audioStopResolveRef = useRef<((meta: AudioMeta) => void) | null>(null);
  const audioUrlRef = useRef<string | null>(null);
  const audioElementRef = useRef<HTMLAudioElement | null>(null);

  const saveStore = useCallback(
    (next: CanvasRecordingStore) => {
      if (!canvasId || typeof window === "undefined") return;
      try {
        safeSetLocalStorageItem(getRecordingStorageKey(canvasId), JSON.stringify(next));
      } catch (e) {
        console.error("Failed to save canvas recordings", e);
      }
    },
    [canvasId]
  );

  const loadRecording = useCallback(() => {
    if (!canvasId || typeof window === "undefined") {
      setRecordings([]);
      setActiveRecordingId(null);
      setRecording(null);
      setHasRecording(false);
      return;
    }
    try {
      let raw = localStorage.getItem(getRecordingStorageKey(canvasId));
      if (!raw) {
        const legacyRaw = localStorage.getItem(getLegacyRecordingStorageKey(canvasId));
        if (legacyRaw) {
          raw = legacyRaw;
          try {
            localStorage.removeItem(getLegacyRecordingStorageKey(canvasId));
          } catch {
            // ignore cleanup errors
          }
        }
      }
      if (!raw) {
        setRecordings([]);
        setActiveRecordingId(null);
        setRecording(null);
        setHasRecording(false);
        return;
      }
      const parsed = migrateLegacy(JSON.parse(raw));
      if (!parsed || !Array.isArray(parsed.recordings)) {
        setRecordings([]);
        setActiveRecordingId(null);
        setRecording(null);
        setHasRecording(false);
        return;
      }
      const list = parsed.recordings || [];
      const activeId = parsed.activeId && list.some((r) => r.id === parsed.activeId)
        ? parsed.activeId
        : list[0]?.id || null;
      const active = activeId ? list.find((r) => r.id === activeId) || null : null;
      setRecordings(list);
      setActiveRecordingId(activeId);
      setRecording(active);
      setHasRecording(list.length > 0);
      saveStore({ version: RECORDING_VERSION, recordings: list, activeId: activeId || undefined });
    } catch {
      setRecordings([]);
      setActiveRecordingId(null);
      setRecording(null);
      setHasRecording(false);
    }
  }, [canvasId, saveStore]);

  useEffect(() => {
    loadRecording();
  }, [loadRecording]);

  const cleanupAudio = useCallback(() => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.src = "";
    }
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current);
      audioUrlRef.current = null;
    }
    audioElementRef.current = null;
  }, []);

  const stopPlayback = useCallback(() => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setPlaybackTimeMs(0);
    setPlaybackFrameIndex(null);
    playbackElapsedRef.current = 0;
    playbackLastTickRef.current = null;
    cleanupAudio();
  }, [cleanupAudio]);

  const pushFrame = useCallback((elements: readonly ExcalidrawElement[], appState?: AppState, forceTime?: number) => {
    const now = performance.now();
    const t = typeof forceTime === "number" ? forceTime : Math.max(0, now - recordStartRef.current);
    const snapshot = cloneElements(elements);
    framesRef.current.push({
      t,
      elements: snapshot,
      appState: appState
        ? {
            viewBackgroundColor: appState.viewBackgroundColor,
            gridSize: appState.gridSize,
          }
        : undefined,
    });
  }, []);

  const startRecording = useCallback(async () => {
    if (!canvasId) return;
    if (isRecordingRef.current || isPlayingRef.current) return;

    const api = excalidrawAPIRef.current;
    const initialElements: readonly ExcalidrawElement[] = api?.getSceneElements?.() || [];
    const initialAppState: AppState | undefined = api?.getAppState?.();

    framesRef.current = [];
    lastRecordTsRef.current = 0;
    lastFingerprintRef.current = null;
    recordStartRef.current = performance.now();

    pushFrame(initialElements, initialAppState, 0);
    lastFingerprintRef.current = buildFingerprint(initialElements);

    setIsRecording(true);
    isRecordingRef.current = true;

    if (typeof window === "undefined") return;
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast({ title: "Mic unavailable", description: "Voice recording is not supported in this browser." });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioRecorderRef.current = recorder;
      audioChunksRef.current = [];
      audioStopPromiseRef.current = new Promise<AudioMeta>((resolve) => {
        audioStopResolveRef.current = resolve;
      });

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const chunks = audioChunksRef.current;
        audioChunksRef.current = [];
        if (!canvasId || chunks.length === 0) {
          audioStopResolveRef.current?.(null);
          audioStopResolveRef.current = null;
          return;
        }
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });
        const key = `${AUDIO_KEY_PREFIX}${canvasId}:${Date.now()}`;
        try {
          await storeAudio(key, blob);
          audioStopResolveRef.current?.({ key, mimeType: blob.type });
        } catch (e) {
          console.error("Failed to store recording audio", e);
          audioStopResolveRef.current?.(null);
        }
        audioStopResolveRef.current = null;
      };

      recorder.start();
    } catch (e) {
      console.error("Failed to start audio recording", e);
      toast({ title: "Mic permission denied", description: "Recording will continue without audio." });
    }
  }, [canvasId, excalidrawAPIRef, pushFrame, toast]);

  const stopRecording = useCallback(
    async (name?: string) => {
      if (!isRecordingRef.current) return null;
      isRecordingRef.current = false;
      setIsRecording(false);

      let audioMeta: AudioMeta = null;
      const recorder = audioRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
        if (audioStopPromiseRef.current) {
          audioMeta = await audioStopPromiseRef.current;
        }
      }

      audioRecorderRef.current = null;
      audioStopPromiseRef.current = null;

      const frames = framesRef.current.slice();
      const durationMs = frames.length > 0 ? frames[frames.length - 1].t : 0;
      const nextId = `rec_${Date.now()}`;
      const nextName = (name && name.trim()) || `Recording ${recordings.length + 1}`;
      const payload: CanvasRecordingEntry = {
        id: nextId,
        name: nextName,
        version: RECORDING_VERSION,
        createdAt: Date.now(),
        durationMs,
        frames,
        audioKey: audioMeta?.key,
        audioMimeType: audioMeta?.mimeType,
      };

      const nextList = [...recordings, payload];
      setRecordings(nextList);
      setActiveRecordingId(payload.id);
      setRecording(payload);
      setHasRecording(nextList.length > 0);
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: payload.id });
      return payload;
    },
    [recordings, saveStore]
  );

  const renameRecording = useCallback(
    (id: string, name: string) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const nextList = recordings.map((entry) => (entry.id === id ? { ...entry, name: trimmed } : entry));
      setRecordings(nextList);
      if (recording?.id === id) {
        setRecording({ ...recording, name: trimmed });
      }
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: activeRecordingId || undefined });
      return true;
    },
    [recordings, recording, activeRecordingId, saveStore]
  );

  const selectRecording = useCallback(
    (id: string) => {
      const match = recordings.find((entry) => entry.id === id);
      if (!match) return;
      setActiveRecordingId(id);
      setRecording(match);
      saveStore({ version: RECORDING_VERSION, recordings, activeId: id });
    },
    [recordings, saveStore]
  );

  const handleRecordingChange = useCallback(
    (elements: readonly ExcalidrawElement[], appState: AppState) => {
      if (!isRecordingRef.current) return;
      const now = performance.now();
      if (now - lastRecordTsRef.current < RECORDING_SAMPLE_MS) return;
      const fingerprint = buildFingerprint(elements);
      if (fingerprint === lastFingerprintRef.current) return;
      lastFingerprintRef.current = fingerprint;
      lastRecordTsRef.current = now;
      pushFrame(elements, appState);
    },
    [pushFrame]
  );

  const playRecording = useCallback(async () => {
    if (!recording || recording.frames.length === 0) return;
    if (!excalidrawAPIRef.current || isPlayingRef.current || isRecordingRef.current) return;

    const api = excalidrawAPIRef.current;
    const frames = recording.frames;
    const skipped = new Set(recording.skippedFrameIndices || []);
    let frameIndex = 0;
    playbackElapsedRef.current = 0;
    playbackLastTickRef.current = performance.now();

    isPlayingRef.current = true;
    setIsPlaying(true);

    cleanupAudio();
    if (recording.audioKey) {
      try {
        const blob = await getAudio(recording.audioKey);
        if (blob) {
          const url = URL.createObjectURL(blob);
          audioUrlRef.current = url;
          const audio = new Audio(url);
          const rate = playbackSpeedRef.current === 0 ? 1 : playbackSpeedRef.current;
          audio.playbackRate = Math.max(0.5, Math.min(3, rate));
          audioElementRef.current = audio;
          void audio.play();
        }
      } catch (e) {
        console.error("Failed to load recording audio", e);
      }
    }

    api.updateScene({ elements: [], appState: frames[0]?.appState || undefined });

    const tick = (now: number) => {
      if (!isPlayingRef.current) return;
      const lastTick = playbackLastTickRef.current ?? now;
      const speed = playbackSpeedRef.current === 0 ? 1 : playbackSpeedRef.current;
      const delta = Math.max(0, now - lastTick);
      playbackElapsedRef.current += delta * speed;
      playbackLastTickRef.current = now;
      const elapsed = playbackElapsedRef.current;
      setPlaybackTimeMs(elapsed);
      while (frameIndex < frames.length && frames[frameIndex].t <= elapsed) {
        if (!skipped.has(frameIndex)) {
          api.updateScene({ elements: frames[frameIndex].elements, appState: frames[frameIndex].appState || undefined });
        }
        setPlaybackFrameIndex(frameIndex);
        frameIndex += 1;
      }
      if (frameIndex >= frames.length) {
        stopPlayback();
        return;
      }
      requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
  }, [recording, excalidrawAPIRef, cleanupAudio, stopPlayback]);

  useEffect(() => {
    playbackSpeedRef.current = playbackSpeed;
    if (audioElementRef.current) {
      const rate = playbackSpeed === 0 ? 1 : playbackSpeed;
      audioElementRef.current.playbackRate = Math.max(0.5, Math.min(3, rate));
    }
  }, [playbackSpeed]);

  const cutRecording = useCallback(
    (startMs: number, endMs: number) => {
      if (!recording || recording.frames.length === 0) return false;
      const safeStart = Math.max(0, Math.min(startMs, endMs));
      const safeEnd = Math.max(0, Math.max(startMs, endMs));
      if (safeEnd <= safeStart) return false;

      const kept = recording.frames.filter((frame) => frame.t < safeStart || frame.t > safeEnd);
      if (kept.length === 0) return false;

      const cutDuration = safeEnd - safeStart;
      const shifted = kept.map((frame) => {
        if (frame.t > safeEnd) {
          return { ...frame, t: Math.max(0, frame.t - cutDuration) };
        }
        return { ...frame };
      });
      shifted.sort((a, b) => a.t - b.t);

      const offset = shifted[0]?.t || 0;
      const normalized = shifted.map((frame) => ({ ...frame, t: frame.t - offset }));
      const durationMs = normalized.length > 0 ? normalized[normalized.length - 1].t : 0;

      const nextEntry: CanvasRecordingEntry = {
        ...recording,
        frames: normalized,
        durationMs,
        audioKey: undefined,
        audioMimeType: undefined,
      };

      const nextList = recordings.map((entry) => (entry.id === recording.id ? nextEntry : entry));
      setRecordings(nextList);
      setRecording(nextEntry);
      setHasRecording(nextList.length > 0);
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: recording.id });
      return true;
    },
    [recording, recordings, saveStore]
  );

  const deleteFrames = useCallback(
    (indices: number[]) => {
      if (!recording || recording.frames.length === 0) return false;
      const removeSet = new Set(indices.filter((i) => Number.isInteger(i)));
      if (removeSet.size === 0) return false;
      const kept = recording.frames.filter((_, idx) => !removeSet.has(idx));
      if (kept.length === 0) return false;
      kept.sort((a, b) => a.t - b.t);
      const offset = kept[0]?.t || 0;
      const normalized = kept.map((frame) => ({ ...frame, t: Math.max(0, frame.t - offset) }));
      const durationMs = normalized.length > 0 ? normalized[normalized.length - 1].t : 0;

      const nextEntry: CanvasRecordingEntry = {
        ...recording,
        frames: normalized,
        durationMs,
        audioKey: undefined,
        audioMimeType: undefined,
        skippedFrameIndices: undefined,
      };

      const nextList = recordings.map((entry) => (entry.id === recording.id ? nextEntry : entry));
      setRecordings(nextList);
      setRecording(nextEntry);
      setHasRecording(nextList.length > 0);
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: recording.id });
      return true;
    },
    [recording, recordings, saveStore]
  );

  const toggleSkippedFrames = useCallback(
    (indices: number[]) => {
      if (!recording) return false;
      const current = new Set(recording.skippedFrameIndices || []);
      if (indices.length === 0) return false;
      const shouldUnskip = indices.every((idx) => current.has(idx));
      indices.forEach((idx) => {
        if (shouldUnskip) current.delete(idx);
        else current.add(idx);
      });
      const nextEntry: CanvasRecordingEntry = {
        ...recording,
        skippedFrameIndices: current.size > 0 ? Array.from(current) : undefined,
      };
      const nextList = recordings.map((entry) => (entry.id === recording.id ? nextEntry : entry));
      setRecordings(nextList);
      setRecording(nextEntry);
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: recording.id });
      return true;
    },
    [recording, recordings, saveStore]
  );

  const deleteRecording = useCallback(
    (id: string) => {
      if (!recordings.length) return false;
      const nextList = recordings.filter((entry) => entry.id !== id);
      if (nextList.length === recordings.length) return false;
      const nextActiveId = nextList[0]?.id || null;
      const nextActive = nextActiveId ? nextList.find((entry) => entry.id === nextActiveId) || null : null;
      setRecordings(nextList);
      setActiveRecordingId(nextActiveId);
      setRecording(nextActive);
      setHasRecording(nextList.length > 0);
      saveStore({ version: RECORDING_VERSION, recordings: nextList, activeId: nextActiveId || undefined });
      return true;
    },
    [recordings, saveStore]
  );

  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      const recorder = audioRecorderRef.current;
      if (recorder && recorder.state !== "inactive") {
        recorder.stop();
      }
      stopPlayback();
    };
  }, [stopPlayback]);

  useEffect(() => {
    if (!canvasId) {
      stopPlayback();
    }
  }, [canvasId, stopPlayback]);

  return {
    recording,
    recordings,
    activeRecordingId,
    hasRecording,
    isRecording,
    isPlaying,
    playbackSpeed,
    setPlaybackSpeed,
    playbackTimeMs,
    playbackFrameIndex,
    startRecording,
    stopRecording,
    renameRecording,
    selectRecording,
    playRecording,
    stopPlayback,
    handleRecordingChange,
    reloadRecording: loadRecording,
    cutRecording,
    deleteFrames,
    toggleSkippedFrames,
    deleteRecording,
  };
}
