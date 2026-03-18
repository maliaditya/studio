
"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Dialog,
  DialogHeader,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy, Trash2, RefreshCw, Github, HardDrive, Sparkles, Mic, Square, Play, Save, RotateCcw, Loader2 } from 'lucide-react';
import type { Activity, ActivityType, WorkoutSchedulingMode, WidgetVisibility, SlotName, HolidayEntry } from '@/types/workout';
import { initSupabasePdfStorage } from '@/lib/supabasePdfStorage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Progress } from './ui/progress';
import { normalizeAiSettings, getAiConfigFromSettings, DEFAULT_OPENAI_MODEL, DEFAULT_OLLAMA_MODEL, DEFAULT_PERPLEXITY_MODEL, DEFAULT_ANTHROPIC_MODEL } from '@/lib/ai/config';
import type { AiProvider } from '@/types/ai';
import { DesktopReadinessPanel } from '@/components/DesktopReadinessDialog';

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

const WIDGET_NAMES: { id: keyof WidgetVisibility, label: string }[] = [
  { id: 'agenda', label: 'Agenda Widget' },
  { id: 'smartLogging', label: 'Smart Logging Prompts' },
  { id: 'pistons', label: 'Pistons of Intention' },
  { id: 'mindset', label: 'Mindset Categories' },
  { id: 'activityDistribution', label: 'Activity Distribution' },
  { id: 'favorites', label: 'Favorite Cards' },
  { id: 'topPriorities', label: 'Top Priorities' },
  { id: 'goals', label: 'Goals Widget' },
  { id: 'brainHacks', label: 'Brain Hacks' },
  { id: 'ruleEquations', label: 'Rule Equations' },
  { id: 'visualizationTechniques', label: 'Visualization Techniques' },
  { id: 'spacedRepetition', label: 'Spaced Repetition Queue' },
];

const SLOT_NAMES: SlotName[] = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
const LOCAL_STORAGE_BUDGET_BYTES = 5 * 1024 * 1024; // Practical browser limit target for localStorage.
const USER_SCOPED_KEY_PREFIXES = ['lifeos_data_', 'lifeos_ui_state_', 'lifeos_data_ref_'];
const DEFAULT_XTTS_BASE_URL = 'http://127.0.0.1:8020';
const XTTS_SAMPLE_SCRIPT = `Hello. This is my voice sample for XTTS v2.
I am speaking clearly at a natural pace.
This recording will be used as the reference voice for Astra.`;

const downmixToMono = (buffer: AudioBuffer) => {
  const { numberOfChannels, length } = buffer;
  if (numberOfChannels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(length);
  for (let channel = 0; channel < numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < length; index += 1) {
      mono[index] += input[index] / numberOfChannels;
    }
  }
  return mono;
};

const resampleMonoChannel = (samples: Float32Array, sourceRate: number, targetRate: number) => {
  if (sourceRate === targetRate) return samples;
  const ratio = sourceRate / targetRate;
  const nextLength = Math.max(1, Math.round(samples.length / ratio));
  const next = new Float32Array(nextLength);
  for (let index = 0; index < nextLength; index += 1) {
    const sourceIndex = index * ratio;
    const lower = Math.floor(sourceIndex);
    const upper = Math.min(samples.length - 1, lower + 1);
    const mix = sourceIndex - lower;
    next[index] = samples[lower] * (1 - mix) + samples[upper] * mix;
  }
  return next;
};

const encodeMonoWav = (samples: Float32Array, sampleRate: number) => {
  const bytesPerSample = 2;
  const blockAlign = bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * bytesPerSample;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let index = 0; index < value.length; index += 1) {
      view.setUint8(offset + index, value.charCodeAt(index));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(offset, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
    offset += 2;
  }
  return new Blob([buffer], { type: 'audio/wav' });
};

const convertBlobToWav = async (blob: Blob) => {
  const AudioContextCtor =
    typeof window !== 'undefined'
      ? window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      : undefined;
  if (!AudioContextCtor) {
    throw new Error('Audio conversion is not supported in this runtime.');
  }
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContextCtor();
  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = downmixToMono(decoded);
    const resampled = resampleMonoChannel(mono, decoded.sampleRate, 24000);
    return encodeMonoWav(resampled, 24000);
  } finally {
    void audioContext.close().catch(() => undefined);
  }
};

type StorageHealthSnapshot = {
  totalBytes: number;
  lifeosBytes: number;
  totalKeys: number;
  lifeosKeys: number;
  usagePct: number;
  legacyUserKeys: string[];
  largestLifeosKeys: Array<{ key: string; bytes: number }>;
};

const formatBytes = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb / 1024).toFixed(2)} MB`;
};


export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const { currentUser, theme, setTheme, settings, setSettings, habitCards, schedule, setSchedule, recalculateAndFixTaskTypes, clearAllLocalFiles, syncCanvasImagesToGitHub, fetchCanvasImagesFromGitHub, syncAudioFilesToGitHub, fetchAudioFilesFromGitHub, syncPdfFilesToGitHub, fetchPdfFilesFromGitHub } = useAuth();
  const { toast } = useToast();

  const [isCopyModalOpen, setIsCopyModalOpen] = useState(false);
  const [specializationName, setSpecializationName] = useState('');
  const [copyType, setCopyType] = useState<'specialization' | 'micro-skills'>('specialization');
  const [storageHealth, setStorageHealth] = useState<StorageHealthSnapshot | null>(null);
  const [isRefreshingStorage, setIsRefreshingStorage] = useState(false);
  const [supabaseServiceRoleKey, setSupabaseServiceRoleKey] = useState('');
  const [isSupabaseSecretConfigured, setIsSupabaseSecretConfigured] = useState(false);
  const [isInitializingSupabase, setIsInitializingSupabase] = useState(false);
  const [availableAiModels, setAvailableAiModels] = useState<string[]>([]);
  const [isLoadingAiModels, setIsLoadingAiModels] = useState(false);
  const [aiModelsError, setAiModelsError] = useState<string | null>(null);
  const [isRefreshingLocalServerStatus, setIsRefreshingLocalServerStatus] = useState(false);
  const [isStartingKokoroFromSettings, setIsStartingKokoroFromSettings] = useState(false);
  const [isStoppingKokoroFromSettings, setIsStoppingKokoroFromSettings] = useState(false);
  const [isStartingXttsFromSettings, setIsStartingXttsFromSettings] = useState(false);
  const [isStoppingXttsFromSettings, setIsStoppingXttsFromSettings] = useState(false);
  const [isInstallingXttsFromSettings, setIsInstallingXttsFromSettings] = useState(false);
  const [isStartingSttFromSettings, setIsStartingSttFromSettings] = useState(false);
  const [isStoppingSttFromSettings, setIsStoppingSttFromSettings] = useState(false);
  const [kokoroServerStatus, setKokoroServerStatus] = useState<{
    healthy: boolean;
    running: boolean;
    mode?: string | null;
    baseUrl?: string;
    upgradeAvailable?: boolean;
  }>({ healthy: false, running: false, mode: null, baseUrl: settings.kokoroTtsBaseUrl || '' });
  const [sttServerStatus, setSttServerStatus] = useState<{
    healthy: boolean;
    running: boolean;
    managed?: boolean;
    backend?: string;
    error?: string;
    baseUrl?: string;
  }>({ healthy: false, running: false, managed: false, backend: '', error: '', baseUrl: settings.localSttBaseUrl || '' });
  const [xttsServerStatus, setXttsServerStatus] = useState<{
    healthy: boolean;
    running: boolean;
    managed?: boolean;
    backend?: string;
    mode?: string | null;
    error?: string;
    baseUrl?: string;
    warming?: boolean;
    details?: string[];
  }>({ healthy: false, running: false, managed: false, backend: '', mode: null, error: '', baseUrl: settings.xttsTtsBaseUrl || '' });
  const [isXttsBridgeSupported, setIsXttsBridgeSupported] = useState(true);
  const [isRecordingXttsSample, setIsRecordingXttsSample] = useState(false);
  const [isPlayingXttsSample, setIsPlayingXttsSample] = useState(false);
  const [isSavingXttsSample, setIsSavingXttsSample] = useState(false);
  const [xttsSampleBlob, setXttsSampleBlob] = useState<Blob | null>(null);
  const [xttsSampleUrl, setXttsSampleUrl] = useState<string>('');
  const xttsNeedsRecreate = Boolean(xttsServerStatus.error?.includes('needs to be recreated'));
  const xttsCanRecreate = Boolean(xttsServerStatus.healthy && xttsServerStatus.running);
  const isDesktopRuntime =
    typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);
  const xttsSampleRecorderRef = React.useRef<MediaRecorder | null>(null);
  const xttsSampleStreamRef = React.useRef<MediaStream | null>(null);
  const xttsSampleChunksRef = React.useRef<BlobPart[]>([]);
  const xttsSampleAudioRef = React.useRef<HTMLAudioElement | null>(null);

  // State for GitHub settings inputs
  const [localSettings, setLocalSettings] = useState(settings);
  const [newHolidayDate, setNewHolidayDate] = useState('');
  const [newHolidayName, setNewHolidayName] = useState('');
  const [isHolidayAstraOpen, setIsHolidayAstraOpen] = useState(false);
  const [holidayCountry, setHolidayCountry] = useState('India');
  const [holidayCustomCountry, setHolidayCustomCountry] = useState('');
  const [holidayGenError, setHolidayGenError] = useState<string | null>(null);
  const [isGeneratingHolidays, setIsGeneratingHolidays] = useState(false);
  const [generatedHolidays, setGeneratedHolidays] = useState<HolidayEntry[]>([]);
  const holidayYear = new Date().getFullYear();
  const resolvedAiSettings = useMemo(
    () => normalizeAiSettings(settings.ai, isDesktopRuntime),
    [settings.ai, isDesktopRuntime]
  );
  const modelOptions = useMemo(() => {
    const current = resolvedAiSettings.model?.trim();
    if (!current) return availableAiModels;
    if (availableAiModels.includes(current)) return availableAiModels;
    return [current, ...availableAiModels];
  }, [availableAiModels, resolvedAiSettings.model]);

  const refreshLocalServerStatus = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.environmentStatus) return;

    setIsRefreshingLocalServerStatus(true);
    try {
      const kokoroBaseUrl = (settings.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim();
      const xttsBaseUrl = (settings.xttsTtsBaseUrl || DEFAULT_XTTS_BASE_URL).trim();
      const sttBaseUrl = (settings.localSttBaseUrl || 'http://127.0.0.1:9890').trim();
      const nextStatus = await bridge.desktop.environmentStatus({
        kokoroBaseUrl,
        xttsBaseUrl,
        sttBaseUrl,
      });
      const kokoroResult = nextStatus?.kokoro || {};
      const xttsSupported = Object.prototype.hasOwnProperty.call(nextStatus || {}, 'xtts');
      const xttsResult = xttsSupported
        ? (nextStatus?.xtts || {})
        : { healthy: false, running: false, managed: false, backend: '', error: 'Restart desktop app to enable XTTS controls.', baseUrl: xttsBaseUrl };
      const sttResult = nextStatus?.stt || {};
      setIsXttsBridgeSupported(xttsSupported);

      setKokoroServerStatus({
        healthy: Boolean(kokoroResult?.healthy),
        running: Boolean(kokoroResult?.running),
        mode: kokoroResult?.mode || null,
        baseUrl: String(kokoroResult?.baseUrl || kokoroBaseUrl),
        upgradeAvailable: Boolean(kokoroResult?.upgradeAvailable),
      });
      setSttServerStatus({
        healthy: Boolean(sttResult?.healthy),
        running: Boolean(sttResult?.running),
        managed: Boolean(sttResult?.managed),
        backend: String(sttResult?.backend || ''),
        error: String(sttResult?.error || ''),
        baseUrl: String(sttResult?.baseUrl || sttBaseUrl),
      });
      setXttsServerStatus({
        healthy: Boolean(xttsResult?.healthy),
        running: Boolean(xttsResult?.running),
        managed: Boolean(xttsResult?.managed),
        backend: String(xttsResult?.backend || ''),
        mode: xttsResult?.mode || null,
        error: String(xttsResult?.error || ''),
        baseUrl: String(xttsResult?.baseUrl || xttsBaseUrl),
        warming: Boolean(xttsResult?.warming),
        details: Array.isArray(xttsResult?.details) ? xttsResult.details.map((item: unknown) => String(item || '').trim()).filter(Boolean) : [],
      });
      const resolvedXttsBaseUrl = String(xttsResult?.baseUrl || '').trim();
      if (resolvedXttsBaseUrl && resolvedXttsBaseUrl !== (settings.xttsTtsBaseUrl || '').trim()) {
        setSettings((prev) => ({ ...prev, xttsTtsBaseUrl: resolvedXttsBaseUrl }));
      }

      const resolvedSttBaseUrl = String(sttResult?.baseUrl || '').trim();
      if (resolvedSttBaseUrl && resolvedSttBaseUrl !== (settings.localSttBaseUrl || '').trim()) {
        setSettings((prev) => ({ ...prev, localSttBaseUrl: resolvedSttBaseUrl }));
      }
    } catch {
      // keep last status on bridge failure
    } finally {
      setIsRefreshingLocalServerStatus(false);
    }
  }, [isDesktopRuntime, settings.kokoroTtsBaseUrl, settings.localSttBaseUrl, settings.xttsTtsBaseUrl, setSettings]);

  const handleStartKokoroFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.kokoro?.startServer) return;
    setIsStartingKokoroFromSettings(true);
    try {
        const result = await bridge.kokoro.startServer({
          baseUrl: (settings.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim(),
          forceRecreate: Boolean(kokoroServerStatus.upgradeAvailable),
        });
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to start Kokoro.'));
      }
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, kokoroTtsBaseUrl: String(result.baseUrl) }));
      }
      toast({
        title: 'Kokoro running',
        description: String(result?.mode ? `Mode: ${result.mode}` : 'Server started.'),
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'Kokoro start failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStartingKokoroFromSettings(false);
    }
  }, [isDesktopRuntime, refreshLocalServerStatus, setSettings, settings.kokoroTtsBaseUrl, toast, kokoroServerStatus.upgradeAvailable]);

  const handleStartSttFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.stt?.startServer) return;
    setIsStartingSttFromSettings(true);
    try {
      const result = await bridge.stt.startServer({
        baseUrl: (settings.localSttBaseUrl || 'http://127.0.0.1:9890').trim(),
      });
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to start local STT server.'));
      }
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, localSttBaseUrl: String(result.baseUrl) }));
      }
      toast({
        title: 'Local STT running',
        description: String(result?.managed ? 'Managed STT process started.' : 'Connected to existing STT server.'),
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'STT start failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStartingSttFromSettings(false);
    }
  }, [isDesktopRuntime, refreshLocalServerStatus, setSettings, settings.localSttBaseUrl, toast]);

  const handleStopKokoroFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.kokoro?.stopServer) return;
    setIsStoppingKokoroFromSettings(true);
    try {
      const result = await bridge.kokoro.stopServer({});
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to stop Kokoro.'));
      }
      toast({
        title: 'Kokoro stopped',
        description: 'Managed Kokoro service was stopped.',
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'Kokoro stop failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStoppingKokoroFromSettings(false);
    }
  }, [isDesktopRuntime, refreshLocalServerStatus, toast]);

  const handleStopXttsFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.stopServer || !isXttsBridgeSupported) return;
    setIsStoppingXttsFromSettings(true);
    try {
      const result = await bridge.xtts.stopServer({});
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to stop XTTS.'));
      }
      toast({
        title: 'XTTS stopped',
        description: 'Managed XTTS service was stopped.',
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'XTTS stop failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStoppingXttsFromSettings(false);
    }
  }, [isDesktopRuntime, isXttsBridgeSupported, refreshLocalServerStatus, toast]);

  const handleStopSttFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.stt?.stopServer) return;
    setIsStoppingSttFromSettings(true);
    try {
      const result = await bridge.stt.stopServer({});
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to stop local STT server.'));
      }
      toast({
        title: 'Local STT stopped',
        description: 'Managed STT service was stopped.',
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'STT stop failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStoppingSttFromSettings(false);
    }
  }, [isDesktopRuntime, refreshLocalServerStatus, toast]);

  const handleStartXttsFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.startServer || !isXttsBridgeSupported) {
      toast({
        title: 'Restart required',
        description: 'Restart the desktop app to enable XTTS controls in the Electron main process.',
        variant: 'destructive',
      });
      return;
    }
    setIsStartingXttsFromSettings(true);
    try {
        const result = await bridge.xtts.startServer({
          baseUrl: (settings.xttsTtsBaseUrl || DEFAULT_XTTS_BASE_URL).trim(),
          forceRecreate: xttsNeedsRecreate || xttsCanRecreate,
        });
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to start XTTS.'));
      }
      if (result?.baseUrl) {
        setSettings((prev) => ({ ...prev, xttsTtsBaseUrl: String(result.baseUrl) }));
      }
      toast({
        title: 'XTTS running',
        description: String(result?.managed ? 'Managed XTTS process started.' : 'Connected to existing XTTS server.'),
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'XTTS start failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsStartingXttsFromSettings(false);
    }
  }, [isDesktopRuntime, isXttsBridgeSupported, refreshLocalServerStatus, setSettings, settings.xttsTtsBaseUrl, toast, xttsCanRecreate, xttsNeedsRecreate]);

  const handleInstallXttsFromSettings = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.xtts?.install || !isXttsBridgeSupported) {
      toast({
        title: 'Restart required',
        description: 'Restart the desktop app to enable XTTS installer controls in the Electron main process.',
        variant: 'destructive',
      });
      return;
    }
    setIsInstallingXttsFromSettings(true);
    try {
      const result = await bridge.xtts.install({});
      if (!result?.success) {
        throw new Error(String(result?.error || 'Failed to install XTTS.'));
      }
      toast({
        title: 'XTTS installed',
        description: 'XTTS dependencies were installed. You can start XTTS now.',
      });
      await refreshLocalServerStatus();
    } catch (error) {
      toast({
        title: 'XTTS install failed',
        description: error instanceof Error ? error.message : 'Unknown error',
        variant: 'destructive',
      });
    } finally {
      setIsInstallingXttsFromSettings(false);
    }
  }, [isDesktopRuntime, isXttsBridgeSupported, refreshLocalServerStatus, toast]);

  const cleanupXttsSampleRecording = useCallback(() => {
    if (xttsSampleRecorderRef.current && xttsSampleRecorderRef.current.state !== 'inactive') {
      try {
        xttsSampleRecorderRef.current.stop();
      } catch {
        // ignore
      }
    }
    xttsSampleRecorderRef.current = null;
    if (xttsSampleStreamRef.current) {
      xttsSampleStreamRef.current.getTracks().forEach((track) => track.stop());
      xttsSampleStreamRef.current = null;
    }
    setIsRecordingXttsSample(false);
  }, []);

  const handleStartXttsSampleRecording = useCallback(async () => {
    if (isRecordingXttsSample || typeof window === 'undefined' || typeof navigator === 'undefined' || typeof MediaRecorder === 'undefined') {
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      xttsSampleStreamRef.current = stream;
      xttsSampleChunksRef.current = [];
      const mimeType = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg']
        .find((type) => {
          try {
            return MediaRecorder.isTypeSupported(type);
          } catch {
            return false;
          }
        });
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      xttsSampleRecorderRef.current = recorder;
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          xttsSampleChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const nextBlob = new Blob(xttsSampleChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        xttsSampleChunksRef.current = [];
        setXttsSampleBlob(nextBlob);
        setIsRecordingXttsSample(false);
      };
      recorder.onerror = () => {
        cleanupXttsSampleRecording();
        toast({
          title: 'Voice sample recording failed',
          description: 'Could not record the XTTS voice sample.',
          variant: 'destructive',
        });
      };
      recorder.start();
      setIsRecordingXttsSample(true);
    } catch (error) {
      toast({
        title: 'Microphone unavailable',
        description: error instanceof Error ? error.message : 'Could not access the microphone.',
        variant: 'destructive',
      });
    }
  }, [cleanupXttsSampleRecording, isRecordingXttsSample, toast]);

  const handleStopXttsSampleRecording = useCallback(() => {
    const recorder = xttsSampleRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
    if (xttsSampleStreamRef.current) {
      xttsSampleStreamRef.current.getTracks().forEach((track) => track.stop());
      xttsSampleStreamRef.current = null;
    }
    setIsRecordingXttsSample(false);
  }, []);

  const handleResetXttsSample = useCallback(() => {
    if (xttsSampleAudioRef.current) {
      xttsSampleAudioRef.current.pause();
      xttsSampleAudioRef.current.currentTime = 0;
      xttsSampleAudioRef.current = null;
    }
    setIsPlayingXttsSample(false);
    setXttsSampleBlob(null);
  }, []);

  const handlePlayXttsSample = useCallback(() => {
    if (!xttsSampleUrl) return;
    if (xttsSampleAudioRef.current && isPlayingXttsSample) {
      xttsSampleAudioRef.current.pause();
      xttsSampleAudioRef.current.currentTime = 0;
      xttsSampleAudioRef.current = null;
      setIsPlayingXttsSample(false);
      return;
    }
    const audio = new Audio(xttsSampleUrl);
    xttsSampleAudioRef.current = audio;
    audio.onended = () => {
      xttsSampleAudioRef.current = null;
      setIsPlayingXttsSample(false);
    };
    audio.onerror = () => {
      xttsSampleAudioRef.current = null;
      setIsPlayingXttsSample(false);
    };
    setIsPlayingXttsSample(true);
    void audio.play().catch(() => {
      xttsSampleAudioRef.current = null;
      setIsPlayingXttsSample(false);
    });
  }, [isPlayingXttsSample, xttsSampleUrl]);

  const handleSaveXttsSample = useCallback(async () => {
    if (!xttsSampleBlob || !isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.saveAudioFile) return;
    setIsSavingXttsSample(true);
    try {
      const wavBlob = xttsSampleBlob.type === 'audio/wav' ? xttsSampleBlob : await convertBlobToWav(xttsSampleBlob);
      const buffer = await wavBlob.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      let binary = '';
      for (let index = 0; index < bytes.length; index += 1) {
        binary += String.fromCharCode(bytes[index]);
      }
      const result = await bridge.desktop.saveAudioFile({
        base64: btoa(binary),
        defaultFileName: `xtts-${(settings.xttsVoiceName || 'my_voice').trim() || 'my_voice'}-sample.wav`,
        target: 'xtts-sample',
      });
      if (result?.success && result?.filePath) {
        setSettings((prev) => ({
          ...prev,
          xttsVoiceSamplePath: String(result.xttsSpeakerPath || result.filePath),
        }));
        toast({
          title: 'Voice sample saved',
          description: String(result.filePath),
        });
      }
    } catch (error) {
      const fallbackUrl = URL.createObjectURL(xttsSampleBlob);
      const link = document.createElement('a');
      link.href = fallbackUrl;
      link.download = `xtts-${(settings.xttsVoiceName || 'my_voice').trim() || 'my_voice'}-sample.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fallbackUrl);
      toast({
        title: 'Downloaded sample instead',
        description:
          error instanceof Error && /desktop:save-audio-file/i.test(error.message)
            ? 'The desktop process needs a restart to enable direct save-path support. The sample was downloaded instead.'
            : 'Direct save failed, so the sample was downloaded instead.',
      });
    } finally {
      setIsSavingXttsSample(false);
    }
  }, [isDesktopRuntime, settings.xttsVoiceName, setSettings, toast, xttsSampleBlob]);

  useEffect(() => {
    if (!xttsSampleBlob) {
      if (xttsSampleUrl) {
        URL.revokeObjectURL(xttsSampleUrl);
      }
      setXttsSampleUrl('');
      return;
    }
    const nextUrl = URL.createObjectURL(xttsSampleBlob);
    if (xttsSampleUrl) {
      URL.revokeObjectURL(xttsSampleUrl);
    }
    setXttsSampleUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [xttsSampleBlob]);

  useEffect(() => () => {
    cleanupXttsSampleRecording();
    if (xttsSampleAudioRef.current) {
      xttsSampleAudioRef.current.pause();
      xttsSampleAudioRef.current = null;
    }
    if (xttsSampleUrl) {
      URL.revokeObjectURL(xttsSampleUrl);
    }
  }, [cleanupXttsSampleRecording, xttsSampleUrl]);

  // Drag state for non-modal popup
  const popupRef = React.useRef<HTMLDivElement | null>(null);
  const dragState = React.useRef<{ dragging: boolean; startX: number; startY: number; origLeft: number; origTop: number } | null>(null);

  const startDrag = (e: React.PointerEvent) => {
    const el = popupRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      startX: e.clientX,
      startY: e.clientY,
      origLeft: rect.left,
      origTop: rect.top,
    };
    (e.target as HTMLElement).setPointerCapture?.((e as any).pointerId);
    window.addEventListener('pointermove', onDragMove);
    window.addEventListener('pointerup', onDragEnd);
  };

  const onDragMove = (ev: PointerEvent) => {
    const state = dragState.current;
    const el = popupRef.current;
    if (!state || !state.dragging || !el) return;
    const dx = ev.clientX - state.startX;
    const dy = ev.clientY - state.startY;
    el.style.left = `${state.origLeft + dx}px`;
    el.style.top = `${state.origTop + dy}px`;
    el.style.right = 'auto';
    el.style.transform = 'none';
  };

  const onDragEnd = (ev: PointerEvent) => {
    const state = dragState.current;
    if (state) state.dragging = false;
    try {
      window.removeEventListener('pointermove', onDragMove);
      window.removeEventListener('pointerup', onDragEnd);
    } catch (e) {}
  };

  
  const defaultFileName = useMemo(() => {
    if (!currentUser?.username) return 'lifeos_backup.json';
    const date = new Date().toISOString().split('T')[0];
    return `lifeos_backup_${currentUser.username}_${date}.json`;
  }, [currentUser]);


  useEffect(() => {
    if (isOpen) {
      setLocalSettings({
          ...settings,
          githubPath: settings.githubPath || defaultFileName,
      });
      setSupabaseServiceRoleKey(settings.supabaseServiceRoleKey || '');

      if (isDesktopRuntime) {
        setIsSupabaseSecretConfigured(!!settings.supabaseServiceRoleKey);
      } else if (currentUser?.username) {
        fetch(`/api/supabase-secret?username=${currentUser.username.toLowerCase()}`, { credentials: 'include' })
          .then(async (res) => {
            const json = await res.json().catch(() => ({}));
            if (res.ok) setIsSupabaseSecretConfigured(!!json?.configured);
          })
          .catch(() => setIsSupabaseSecretConfigured(false));
      }
    }
  }, [isOpen, settings, defaultFileName, currentUser?.username, isDesktopRuntime]);

  const handleModalOpenChange = (open: boolean) => {
    onOpenChange(open);
    if (!open) {
      // Diagnostic + stronger blur: log active element and blur any contentEditable inputs
      setTimeout(() => {
        try {
          const active = document.activeElement as HTMLElement | null;
          console.debug('[SettingsModal] handleModalOpenChange closing, activeElement:', {
            tag: active?.tagName,
            id: active?.id,
            class: active?.className,
            isContentEditable: active?.isContentEditable,
          });

          if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
            try { active.blur(); } catch (e) { /* ignore */ }
          }

          // Blur any remaining contentEditable elements in the document
          try {
            const editables = Array.from(document.querySelectorAll('[contenteditable]')) as HTMLElement[];
            editables.forEach((el) => {
              if (el.isContentEditable) {
                try {
                  el.blur();
                  console.debug('[SettingsModal] blurred contentEditable element', { tag: el.tagName, id: el.id, class: el.className });
                } catch (e) { /* ignore */ }
              }
            });
          } catch (e) {
            /* ignore */
          }

          // If body somehow became editable, ensure it's not and blur it too
          try {
            if (document.body.isContentEditable) {
              document.body.contentEditable = 'false';
              try { (document.body as HTMLElement).blur(); } catch (e) {}
              console.debug('[SettingsModal] body was contentEditable; cleared and blurred');
            }
          } catch (e) {}

          // focus a neutral element (body) to reset caret; preserve previous tabindex
          const prevTab = document.body.getAttribute('tabindex');
          document.body.setAttribute('tabindex', '-1');
          try { (document.body as HTMLElement).focus(); } catch (e) {}
          if (prevTab === null) document.body.removeAttribute('tabindex');
          else document.body.setAttribute('tabindex', prevTab);

          console.debug('[SettingsModal] post-close activeElement:', document.activeElement?.tagName);
          // Defensive check: if some overlay element is still covering the viewport
          try {
            const testPoints = [
              { x: window.innerWidth / 2, y: window.innerHeight / 2 },
              { x: 10, y: 10 },
              { x: window.innerWidth - 10, y: 10 },
            ];
            testPoints.forEach(({ x, y }) => {
              const top = document.elementsFromPoint(x, y)[0] as HTMLElement | undefined;
              if (top && top !== document.body && top !== document.documentElement) {
                const style = window.getComputedStyle(top);
                const z = parseInt(style.zIndex || '0', 10) || 0;
                const name = top.tagName;
                console.debug('[SettingsModal] top element at', x, y, { name, id: top.id, class: top.className, z });
                if (z >= 40 || /overlay|backdrop|portal|radix|dialog/i.test(top.className || '')) {
                  try {
                    // temporarily disable pointer events on the blocking element
                    (top as HTMLElement).style.pointerEvents = 'none';
                    console.debug('[SettingsModal] disabled pointer events on', { name, id: top.id, class: top.className });
                    // restore after short delay
                    setTimeout(() => {
                      try { top.style.pointerEvents = ''; } catch (e) {}
                    }, 1000);
                  } catch (e) {}
                }
              }
            });
          } catch (e) {}
        } catch (e) {
          console.error('[SettingsModal] error during close blur diagnostic', e);
        }
      }, 0);
    }
  };

  const handleLocalSettingChange = (key: keyof typeof settings, value: any) => {
    setLocalSettings(prev => ({...prev, [key]: value}));
  };

  const refreshStorageHealth = React.useCallback(() => {
    if (typeof window === 'undefined') return;
    try {
      setIsRefreshingStorage(true);
      const username = currentUser?.username?.trim().toLowerCase() || '';
      let totalBytes = 0;
      let lifeosBytes = 0;
      let lifeosKeys = 0;
      const lifeosEntries: Array<{ key: string; bytes: number }> = [];

      for (let i = 0; i < localStorage.length; i += 1) {
        const key = localStorage.key(i);
        if (!key) continue;
        const value = localStorage.getItem(key) || '';
        const size = new Blob([key]).size + new Blob([value]).size;
        totalBytes += size;

        if (key.startsWith('lifeos_')) {
          lifeosBytes += size;
          lifeosKeys += 1;
          lifeosEntries.push({ key, bytes: size });
        }
      }

      const legacyUserKeys: string[] = [];
      if (username) {
        USER_SCOPED_KEY_PREFIXES.forEach((prefix) => {
          const canonicalKey = `${prefix}${username}`;
          const canonicalValue = localStorage.getItem(canonicalKey);
          if (canonicalValue === null) return;

          for (let i = 0; i < localStorage.length; i += 1) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix) || key === canonicalKey) continue;
            const suffix = key.slice(prefix.length);
            if (suffix.trim().toLowerCase() === username) {
              legacyUserKeys.push(key);
            }
          }
        });
      }

      lifeosEntries.sort((a, b) => b.bytes - a.bytes);
      setStorageHealth({
        totalBytes,
        lifeosBytes,
        totalKeys: localStorage.length,
        lifeosKeys,
        usagePct: Math.min(100, (totalBytes / LOCAL_STORAGE_BUDGET_BYTES) * 100),
        legacyUserKeys: Array.from(new Set(legacyUserKeys)),
        largestLifeosKeys: lifeosEntries.slice(0, 3),
      });
    } finally {
      setIsRefreshingStorage(false);
    }
  }, [currentUser?.username]);

  const clearLegacyUserStorageKeys = () => {
    if (!storageHealth || storageHealth.legacyUserKeys.length === 0) {
      toast({ title: 'No stale keys', description: 'No legacy duplicate user keys were found.' });
      return;
    }

    try {
      storageHealth.legacyUserKeys.forEach((key) => localStorage.removeItem(key));
      toast({
        title: 'Cleanup complete',
        description: `Removed ${storageHealth.legacyUserKeys.length} legacy localStorage key(s).`,
      });
      refreshStorageHealth();
    } catch (error) {
      toast({
        title: 'Cleanup failed',
        description: error instanceof Error ? error.message : 'Could not remove legacy keys.',
        variant: 'destructive',
      });
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    refreshStorageHealth();
  }, [isOpen, refreshStorageHealth]);

  useEffect(() => {
    if (!isOpen || !isDesktopRuntime) return;
    void refreshLocalServerStatus();
  }, [isOpen, isDesktopRuntime, refreshLocalServerStatus]);
  
  const handleGithubSettingsSave = async () => {
    setSettings(prev => ({
        ...prev,
        githubToken: localSettings.githubToken,
        githubOwner: localSettings.githubOwner,
        githubRepo: localSettings.githubRepo,
        githubPath: localSettings.githubPath,
        supabaseUrl: localSettings.supabaseUrl,
        supabaseAnonKey: localSettings.supabaseAnonKey,
        supabasePdfBucket: localSettings.supabasePdfBucket,
        supabaseServiceRoleKey: localSettings.supabaseServiceRoleKey,
    }));

    if (!currentUser?.username) {
        toast({ title: "Error", description: "You must be logged in to save GitHub settings.", variant: "destructive" });
        return;
    }

    try {
        const response = await fetch('/api/github-settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
                username: currentUser.username,
                githubToken: localSettings.githubToken,
                githubOwner: localSettings.githubOwner,
                githubRepo: localSettings.githubRepo,
                githubPath: localSettings.githubPath,
                supabaseUrl: localSettings.supabaseUrl,
                supabaseAnonKey: localSettings.supabaseAnonKey,
                supabasePdfBucket: localSettings.supabasePdfBucket,
            }),
        });
        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Failed to save settings.');
        }
        toast({ title: "Sync Settings Saved", description: "GitHub + Supabase settings were saved for this user." });
    } catch (error) {
        console.error("Failed to save GitHub settings to cloud:", error);
        toast({ title: "Save Failed", description: error instanceof Error ? error.message : "Could not save settings to the cloud.", variant: "destructive" });
    }
  };

  const handleSaveSupabaseServiceKey = async () => {
    if (!supabaseServiceRoleKey.trim()) {
      toast({ title: "Error", description: "Enter Supabase service role key.", variant: "destructive" });
      return;
    }
    if (isDesktopRuntime) {
      const nextKey = supabaseServiceRoleKey.trim();
      setLocalSettings(prev => ({ ...prev, supabaseServiceRoleKey: nextKey }));
      setSettings(prev => ({ ...prev, supabaseServiceRoleKey: nextKey }));
      setIsSupabaseSecretConfigured(true);
      toast({ title: "Saved", description: "Supabase service key saved locally on this desktop app." });
      return;
    }
    if (!currentUser?.username) {
      toast({ title: "Error", description: "You must be logged in to save the service key.", variant: "destructive" });
      return;
    }
    try {
      const response = await fetch('/api/supabase-secret', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          username: currentUser.username,
          supabaseServiceRoleKey: supabaseServiceRoleKey.trim(),
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to save service key.');
      setSupabaseServiceRoleKey('');
      setIsSupabaseSecretConfigured(true);
      toast({ title: "Saved", description: "Supabase service key saved securely on server." });
    } catch (error) {
      toast({ title: "Save Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    }
  };

  const handleInitSupabaseStorage = async () => {
    if (!currentUser?.username) {
      toast({ title: "Error", description: "You must be logged in.", variant: "destructive" });
      return;
    }
    if (!localSettings.supabaseUrl?.trim()) {
      toast({ title: "Missing URL", description: "Enter and save Supabase URL first.", variant: "destructive" });
      return;
    }
    try {
      setIsInitializingSupabase(true);
      await initSupabasePdfStorage(currentUser.username, {
        url: localSettings.supabaseUrl,
        bucket: localSettings.supabasePdfBucket || 'pdfs',
        serviceRoleKey: isDesktopRuntime ? (supabaseServiceRoleKey.trim() || localSettings.supabaseServiceRoleKey) : undefined,
      });
      toast({ title: "Initialized", description: "Supabase PDF bucket is ready." });
    } catch (error) {
      toast({ title: "Init Failed", description: error instanceof Error ? error.message : "Unknown error", variant: "destructive" });
    } finally {
      setIsInitializingSupabase(false);
    }
  };

  const handleSettingChange = (key: keyof typeof settings, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  const handleAddHoliday = () => {
    const dateValue = newHolidayDate.trim();
    const nameValue = newHolidayName.trim() || 'Holiday';
    if (!dateValue) return;
    setSettings(prev => {
      const entries = (prev.holidays || []).map((entry) => (
        typeof entry === 'string'
          ? { date: entry, name: '' }
          : { date: entry.date, name: entry.name || '' }
      ));
      let updated = false;
      const next = entries.map((entry) => {
        if (entry.date !== dateValue) return entry;
        updated = true;
        return { ...entry, name: nameValue };
      });
      if (!updated) {
        next.push({ date: dateValue, name: nameValue });
      }
      next.sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, holidays: next };
    });
    setNewHolidayDate('');
    setNewHolidayName('');
  };
  const handleRemoveHoliday = (dateKey: string) => {
    setSettings(prev => ({
      ...prev,
      holidays: (prev.holidays || []).filter((entry) => (
        typeof entry === 'string' ? entry !== dateKey : entry?.date !== dateKey
      )),
    }));
  };
  const holidayEntries = useMemo(() => {
    return (settings.holidays || [])
      .map((entry) => (
        typeof entry === 'string'
          ? { date: entry, name: '' }
          : { date: entry.date, name: entry.name || '' }
      ))
      .filter((entry) => entry.date);
  }, [settings.holidays]);

  const extractJsonArray = (raw: string) => {
    const text = String(raw || '').trim();
    const start = text.indexOf('[');
    const end = text.lastIndexOf(']');
    if (start === -1 || end === -1 || end <= start) return null;
    const slice = text.slice(start, end + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  };

  const handleGenerateHolidays = useCallback(async () => {
    const chosen = (holidayCustomCountry.trim() || holidayCountry).trim();
    if (!chosen) {
      setHolidayGenError('Pick a country or type one to continue.');
      return;
    }
    setIsGeneratingHolidays(true);
    setHolidayGenError(null);
    setGeneratedHolidays([]);
    try {
      const year = holidayYear;
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const response = await fetch('/api/ai/ask-shiv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          question: `Generate a national public holiday list for ${chosen} for the year ${year}. Return ONLY a valid JSON array. Each item must be {"date":"YYYY-MM-DD","name":"Holiday name"}. Do not include any extra text.`,
          history: [],
          aiConfig,
          openMode: true,
          replyLanguage: String(settings?.astraReplyLanguage || 'auto').trim().toLowerCase(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to generate holidays.'));
      }
      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      const parsed = extractJsonArray(answer);
      if (!Array.isArray(parsed)) {
        throw new Error('Astra response did not include a valid JSON array.');
      }
      const normalized = parsed
        .map((item) => ({
          date: String(item?.date || '').trim(),
          name: String(item?.name || '').trim(),
        }))
        .filter((item) => item.date);
      if (normalized.length === 0) {
        throw new Error('No holidays were returned.');
      }
      setGeneratedHolidays(normalized);
    } catch (error) {
      setHolidayGenError(error instanceof Error ? error.message : 'Failed to generate holidays.');
    } finally {
      setIsGeneratingHolidays(false);
    }
  }, [holidayCountry, holidayCustomCountry, holidayYear, isDesktopRuntime, settings]);

  const handleApplyGeneratedHolidays = useCallback(() => {
    if (generatedHolidays.length === 0) return;
    setSettings((prev) => {
      const existing = (prev.holidays || []).map((entry) => (
        typeof entry === 'string'
          ? { date: entry, name: '' }
          : { date: entry.date, name: entry.name || '' }
      ));
      const byDate = new Map(existing.map((entry) => [entry.date, entry]));
      generatedHolidays.forEach((entry) => {
        if (!entry.date) return;
        byDate.set(entry.date, { date: entry.date, name: entry.name || byDate.get(entry.date)?.name || '' });
      });
      const next = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
      return { ...prev, holidays: next };
    });
    setIsHolidayAstraOpen(false);
    setHolidayGenError(null);
    toast({ title: 'Holidays updated', description: 'Astra holiday list merged into your settings.' });
  }, [generatedHolidays, setSettings, toast]);
  const handleBrowseXttsSample = useCallback(async () => {
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.browseFile) return;
    try {
      const result = await bridge.desktop.browseFile({
        title: 'Select XTTS voice sample',
        target: 'xtts-sample',
        filters: [
          { name: 'Audio', extensions: ['wav', 'mp3', 'm4a', 'ogg', 'webm'] },
        ],
      });
      if (!result?.success || !result?.filePath) return;
      setSettings((prev) => ({
        ...prev,
        xttsVoiceSamplePath: String(result.xttsSpeakerPath || result.filePath),
      }));
      toast({
        title: 'Voice sample ready',
        description: 'The selected sample was copied into the XTTS voice folder.',
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not open file picker.';
      const description = message.includes("No handler registered for 'desktop:browse-file'")
        ? 'The desktop app needs a full restart before Browse is available.'
        : message;
      toast({
        title: 'Browse failed',
        description,
        variant: 'destructive',
      });
    }
  }, [isDesktopRuntime, setSettings, toast]);
  const handleAiSettingChange = (key: keyof NonNullable<typeof settings.ai>, value: string | number) => {
    setSettings((prev) => {
      const normalized = normalizeAiSettings(prev.ai, isDesktopRuntime);
      if (key === 'provider' && value === 'none') {
        return {
          ...prev,
          ai: {
            ...normalized,
            provider: 'none',
            model: '',
          },
        };
      }
      return {
        ...prev,
        ai: {
          ...normalized,
          [key]: value,
        },
      };
    });
  };

  const loadAvailableAiModels = useCallback(async () => {
    if (resolvedAiSettings.provider === 'none') {
      setAvailableAiModels([]);
      setAiModelsError(null);
      return;
    }
    try {
      setIsLoadingAiModels(true);
      setAiModelsError(null);
      const response = await fetch('/api/ai/models', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          aiConfig: resolvedAiSettings,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to load models.'));
      }
      const list = Array.isArray(result?.models) ? result.models.map((m: any) => String(m)).filter(Boolean) : [];
      setAvailableAiModels(list);
    } catch (error) {
      setAvailableAiModels([]);
      setAiModelsError(error instanceof Error ? error.message : 'Failed to load models.');
    } finally {
      setIsLoadingAiModels(false);
    }
  }, [isDesktopRuntime, resolvedAiSettings]);
  useEffect(() => {
    if (!isOpen) return;
    void loadAvailableAiModels();
  }, [
    isOpen,
    resolvedAiSettings.provider,
    resolvedAiSettings.ollamaBaseUrl,
    resolvedAiSettings.openaiBaseUrl,
    resolvedAiSettings.openaiApiKey,
    loadAvailableAiModels,
  ]);

  const handleWidgetVisibilityChange = (widgetId: keyof WidgetVisibility, isVisible: boolean) => {
    handleSettingChange('widgetVisibility', {
        ...settings.widgetVisibility,
        [widgetId]: isVisible,
    });
  };

  const handleDefaultHabitChange = (activityType: ActivityType, habitId: string) => {
    const newHabitId = habitId === 'none' ? null : habitId;

    const newDefaultHabitLinks = {
        ...settings.defaultHabitLinks,
        [activityType]: newHabitId,
    };
    handleSettingChange('defaultHabitLinks', newDefaultHabitLinks);

    setSchedule(currentSchedule => {
      const updatedSchedule = { ...currentSchedule };
      
      Object.keys(updatedSchedule).forEach(dateKey => {
        const daySchedule = { ...updatedSchedule[dateKey] };
        let dayWasModified = false;

        Object.keys(daySchedule).forEach(slotName => {
          const activities = (daySchedule[slotName] as Activity[]) || [];

          if (Array.isArray(activities)) {
            let slotWasModified = false;
            const updatedActivities = activities.map(act => {
              if (act.type === activityType && !act.completed) {
                const newHabits = newHabitId ? [newHabitId] : [];
                if (JSON.stringify(act.habitEquationIds || []) !== JSON.stringify(newHabits)) {
                  slotWasModified = true;
                  return { ...act, habitEquationIds: newHabits };
                }
              }
              return act;
            });

            if (slotWasModified) {
              daySchedule[slotName as SlotName] = updatedActivities;
              dayWasModified = true;
            }
          }
        });
        
        if (dayWasModified) {
          updatedSchedule[dateKey] = daySchedule;
        }
      });

      return updatedSchedule;
    });

    toast({
        title: "Default Habit Updated",
        description: `All scheduled '${activityType}' tasks have been updated.`,
    });
  };


  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
        title: "Theme Changed",
        description: `Switched to the new theme.`,
    });
  };

  const handleResetLandingPage = () => {
    localStorage.removeItem('dock_hide_landing_page');
    toast({
      title: "Preference Reset",
      description: "The landing page will now be shown on your next visit.",
    });
  };

  const handleOpenCopyModal = (type: 'specialization' | 'micro-skills') => {
    setCopyType(type);
    setIsCopyModalOpen(true);
  };

  const handleCopyTemplate = () => {
    const isMicro = copyType === 'micro-skills';
    const topicName = specializationName.trim() || `[YOUR ${isMicro ? 'MICRO-SKILL CLUSTER' : 'SPECIALIZATION'} NAME]`;
    const template = {
      name: isMicro ? undefined : topicName,
      microSkills: isMicro ? [{
        "name": "Vertex, Edge, Face editing",
        "curiosities": [
          {
            "name": "Mastering Component-Level Edits",
            "description": "Learn the fundamentals of manipulating mesh components.",
            "link": "",
            "estimatedDuration": 240,
            "objectives": [
              {
                "name": "Efficiently Use Basic Transform Tools",
                "description": "Understand how to use Move, Rotate, and Scale on vertices, edges, and faces.",
                "link": "",
                "estimatedDuration": 120,
                "visualizations": [
                  {
                    "name": "Practical Application: Model a Simple Chair",
                    "description": "Create a basic chair model using only component transformations.",
                    "link": "",
                    "estimatedDuration": 60,
                    "resourceCards": [
                      {
                        "name": "Elements",
                        "points": [
                          { "type": "text", "text": "Vertex: A single point in 3D space." },
                          { "type": "text", "text": "Edge: A line connecting two vertices." },
                          { "type": "text", "text": "Face: A flat surface enclosed by edges." }
                        ]
                      },
                      {
                        "name": "Tools",
                        "points": [
                          { "type": "text", "text": "Move Tool (G-key): Repositions selected components." },
                          { "type": "text", "text": "Rotate Tool (R-key): Rotates components around a pivot." },
                          { "type": "text", "text": "Scale Tool (S-key): Resizes components relative to a pivot." },
                          { "type": "code", "text": "import bpy; bpy.ops.transform.translate(value=(1, 0, 0))" }
                        ]
                      },
                      {
                        "name": "Patterns",
                        "points": [
                          { "type": "markdown", "text": "A **Markdown** formatted note with `code` snippets and [links](https://example.com)." }
                        ]
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }] : [],
      skillAreas: isMicro ? undefined : [
        {
          "name": "Name of Skill Area 1",
          "purpose": "A brief description of what this skill area is for.",
          "microSkills": [
            {
              "name": "Name of Micro-Skill 1.1",
              "curiosities": [
                {
                  "name": "Curiosity Name (e.g., Learn CUDA Basics)",
                  "description": "Optional description for the curiosity.",
                  "link": "https://example.com/resource",
                  "estimatedDuration": 120,
                  "objectives": [
                    {
                      "name": "Objective Name (e.g., Understand Memory Management)",
                      "description": "Optional description.",
                      "link": "",
                      "estimatedDuration": 60,
                      "visualizations": [
                        {
                          "name": "Visualization Task (e.g., Code a simple kernel)",
                          "description": "Specific, loggable task.",
                          "link": "",
                          "estimatedDuration": 30,
                          "resourceCards": [
                            {
                              "name": "Elements",
                              "points": [
                                { "type": "text", "text": "Core Concept 1 (e.g. Vertex, Edge, Face)" },
                                { "type": "text", "text": "Core Concept 2 (e.g. Component, State, Prop)" }
                              ]
                            },
                            {
                              "name": "Tools",
                              "points": [
                                { "type": "text", "text": "Tool or operation (e.g. Extrude, Bevel)" },
                                { "type": "code", "text": "printf('Hello, World!');" }
                              ]
                            },
                            {
                              "name": "Patterns",
                              "points": [
                                { "type": "markdown", "text": "A **Markdown** formatted note with `code` snippets and [links](https://example.com)." }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    
    const finalTemplate = isMicro ? template.microSkills : template;
    const roleText = isMicro
        ? "Your task is to take a cluster of related micro-skills and break them down into a comprehensive, hierarchical learning plan."
        : "Your task is to take a high-level technical specialization and break it down into a comprehensive, hierarchical learning plan.";
    const goalText = isMicro 
        ? `Generate a single, valid JSON array that represents a complete learning path for the micro-skill cluster: **\`${topicName}\`**.`
        : `Generate a single, valid JSON object that represents a complete learning path for the specialization: **\`${topicName}\`**.`;

    const fullPrompt = [
      `AI Prompt for Generating a Comprehensive ${isMicro ? 'Micro-Skill Cluster' : 'Specialization'} JSON`,
      `Role: ${roleText}`,
      `Goal: ${goalText}`,
      'Crucial Instructions: Follow the JSON schema and provide detailed entries.',
      'Example JSON:',
      JSON.stringify(finalTemplate, null, 2),
    ].join('\n\n');

    try { navigator.clipboard.writeText(fullPrompt); } catch (e) { console.debug('clipboard write failed', e); }
    toast({
      title: "Prompt Copied!",
      description: `The AI prompt for "${specializationName}" has been copied.`,
    });
    setSpecializationName('');
    setIsCopyModalOpen(false);
  };
  
  const activityTypesForHabitLinking: ActivityType[] = ['workout', 'upskill', 'deepwork', 'planning', 'tracking', 'branding', 'lead-generation', 'mindset', 'nutrition'];

  const handleRemoveRoutine = (routineToRemove: Activity) => {
    const newRoutines = (settings.routines || []).filter(r => 
        !(r.details === routineToRemove.details && r.type === routineToRemove.type && r.slot === routineToRemove.slot)
    );
    handleSettingChange('routines', newRoutines);
    toast({ title: 'Routine Task Removed', description: `"${routineToRemove.details}" will no longer be carried forward.` });
  };


  return (
    <>
      {isOpen && (
        <div
          ref={popupRef}
          role="dialog"
          aria-label="Settings Popup"
          className="fixed z-50"
          style={{ left: 'calc(50% - 360px)', top: '80px' }}
        >
          <div
            id="settings-popup"
            className="w-[720px] max-w-[95vw] grid gap-4 border bg-background p-6 shadow-lg sm:rounded-lg"
            style={{ touchAction: 'none' }}
          >
            <div
              id="settings-popup-header"
              className="flex items-center justify-between cursor-move -mx-6 -mt-6 px-6 pt-4 pb-2"
              onPointerDown={(e) => startDrag(e)}
            >
              <div>
                <h3 className="text-lg font-semibold">Application Settings</h3>
                <p className="text-sm text-muted-foreground">Manage your application preferences here. Changes are saved automatically.</p>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => handleModalOpenChange(false)}>Close</Button>
              </div>
            </div>
            <div className="flex-grow min-h-0 overflow-hidden">
              <ScrollArea className="h-[60vh] pr-4">
                <div className="space-y-6 py-4">
                  <div className="space-y-4 rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <Label className="text-base">Theme</Label>
                      <p className="text-sm text-muted-foreground">
                        Select a visual theme for the application.
                      </p>
                    </div>
                    <RadioGroup
                      value={theme}
                      onValueChange={handleThemeChange}
                      className="grid grid-cols-3 gap-4"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="default" id="theme-default" />
                        <Label htmlFor="theme-default" className="font-normal">Default</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="matrix" id="theme-matrix" />
                        <Label htmlFor="theme-matrix" className="font-normal">Matrix</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="ad-dark" id="theme-ad-dark" />
                        <Label htmlFor="theme-ad-dark" className="font-normal">Ad Dark</Label>
                      </div>
                    </RadioGroup>
                  </div>
                  
                  <Accordion type="multiple" className="w-full space-y-4">
                   <AccordionItem value="item-github" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                      <div className="space-y-0.5 text-left">
                        <Label className="text-base flex items-center gap-2"><Github /> GitHub Sync</Label>
                        <p className="text-sm text-muted-foreground">Sync your local data with a GitHub repository.</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-4 border-t">
                          <div className="space-y-1">
                            <Label htmlFor="github-token">Personal Access Token (PAT)</Label>
                            <Input id="github-token" type="password" placeholder="ghp_..." value={localSettings.githubToken || ''} onChange={(e) => handleLocalSettingChange('githubToken', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="github-owner">Repository Owner</Label>
                            <Input id="github-owner" placeholder="e.g., your-username" value={localSettings.githubOwner || ''} onChange={(e) => handleLocalSettingChange('githubOwner', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="github-repo">Repository Name</Label>
                            <Input id="github-repo" placeholder="e.g., lifeos-backup" value={localSettings.githubRepo || ''} onChange={(e) => handleLocalSettingChange('githubRepo', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="github-path">File Path in Repo</Label>
                            <Input id="github-path" placeholder="e.g., backup.json" value={localSettings.githubPath || ''} onChange={(e) => handleLocalSettingChange('githubPath', e.target.value)} />
                          </div>
                          <Separator />
                          <div className="space-y-1">
                            <Label htmlFor="supabase-url">Supabase URL</Label>
                            <Input id="supabase-url" placeholder="https://YOUR_PROJECT.supabase.co" value={localSettings.supabaseUrl || ''} onChange={(e) => handleLocalSettingChange('supabaseUrl', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="supabase-anon-key">Supabase Anon Key</Label>
                            <Input id="supabase-anon-key" type="password" placeholder="sb_publishable_..." value={localSettings.supabaseAnonKey || ''} onChange={(e) => handleLocalSettingChange('supabaseAnonKey', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="supabase-bucket">Supabase PDF Bucket</Label>
                            <Input id="supabase-bucket" placeholder="pdfs" value={localSettings.supabasePdfBucket || ''} onChange={(e) => handleLocalSettingChange('supabasePdfBucket', e.target.value)} />
                          </div>
                          <div className="space-y-1">
                            <Label htmlFor="supabase-service-role">
                              {isDesktopRuntime ? 'Supabase Service Role Key (Desktop local only)' : 'Supabase Service Role Key (Server-only)'}
                            </Label>
                            <Input id="supabase-service-role" type="password" placeholder="sb_secret_..." value={supabaseServiceRoleKey} onChange={(e) => setSupabaseServiceRoleKey(e.target.value)} />
                            <p className="text-xs text-muted-foreground">
                              {isDesktopRuntime
                                ? (isSupabaseSecretConfigured ? 'Service key configured locally on this desktop app.' : 'No local service key saved yet.')
                                : (isSupabaseSecretConfigured ? 'Service key configured on server.' : 'No service key saved yet.')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <Button onClick={handleGithubSettingsSave}>Save Sync Settings</Button>
                            <Button variant="secondary" onClick={handleSaveSupabaseServiceKey}>Save Service Key</Button>
                            <Button variant="outline" onClick={handleInitSupabaseStorage} disabled={isInitializingSupabase}>{isInitializingSupabase ? 'Initializing...' : 'Init Supabase Storage'}</Button>
                            <Button variant="secondary" onClick={syncCanvasImagesToGitHub}>Upload Canvas Images</Button>
                            <Button variant="outline" onClick={fetchCanvasImagesFromGitHub}>Fetch Canvas Images</Button>
                            <Button variant="secondary" onClick={syncAudioFilesToGitHub}>Upload Audio</Button>
                            <Button variant="outline" onClick={fetchAudioFilesFromGitHub}>Fetch Audio</Button>
                            <Button variant="secondary" onClick={syncPdfFilesToGitHub}>Upload PDFs</Button>
                            <Button variant="outline" onClick={fetchPdfFilesFromGitHub}>Fetch PDFs</Button>
                          </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-ai" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                      <div className="space-y-0.5 text-left">
                        <Label className="text-base flex items-center gap-2"><Sparkles className="h-4 w-4" /> AI Settings</Label>
                        <p className="text-sm text-muted-foreground">Choose provider/model for AI enhancements.</p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-4 pt-4 border-t">
                        {isDesktopRuntime ? <DesktopReadinessPanel compact /> : null}
                        <div className="space-y-1">
                          <Label htmlFor="ai-provider">Provider</Label>
                          <Select
                            value={resolvedAiSettings.provider}
                            onValueChange={(value) => handleAiSettingChange('provider', value as AiProvider)}
                          >
                            <SelectTrigger id="ai-provider">
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              <SelectItem value="ollama">Local (Ollama)</SelectItem>
                              <SelectItem value="openai">OpenAI API</SelectItem>
                              <SelectItem value="perplexity">Perplexity API</SelectItem>
                              <SelectItem value="anthropic">Anthropic API</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        {resolvedAiSettings.provider === 'none' ? (
                          <p className="text-xs text-muted-foreground">
                            AI is disabled by default. Choose a provider to enable AI features.
                          </p>
                        ) : (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="ai-model">Model</Label>
                              <div className="flex items-center gap-2">
                                {modelOptions.length > 0 ? (
                                  <Select
                                    value={resolvedAiSettings.model}
                                    onValueChange={(value) => handleAiSettingChange('model', value)}
                                  >
                                    <SelectTrigger id="ai-model" className="flex-1">
                                      <SelectValue placeholder="Select model" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {modelOptions.map((model) => (
                                        <SelectItem key={model} value={model}>{model}</SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    id="ai-model"
                                    className="flex-1"
                                    placeholder={
                                      resolvedAiSettings.provider === 'ollama'
                                        ? DEFAULT_OLLAMA_MODEL
                                        : resolvedAiSettings.provider === 'perplexity'
                                        ? DEFAULT_PERPLEXITY_MODEL
                                        : resolvedAiSettings.provider === 'anthropic'
                                        ? DEFAULT_ANTHROPIC_MODEL
                                        : DEFAULT_OPENAI_MODEL
                                    }
                                    value={resolvedAiSettings.model}
                                    onChange={(e) => handleAiSettingChange('model', e.target.value)}
                                  />
                                )}
                                <Button type="button" variant="outline" size="icon" onClick={() => void loadAvailableAiModels()} disabled={isLoadingAiModels}>
                                  <RefreshCw className={`h-4 w-4 ${isLoadingAiModels ? 'animate-spin' : ''}`} />
                                </Button>
                              </div>
                              {availableAiModels.length > 0 ? (
                                <p className="text-xs text-muted-foreground">
                                  {availableAiModels.length} available model{availableAiModels.length === 1 ? '' : 's'} detected.
                                </p>
                              ) : null}
                              {aiModelsError ? <p className="text-xs text-destructive">{aiModelsError}</p> : null}
                            </div>
                          </>
                        )}
                        {resolvedAiSettings.provider === 'ollama' ? (
                          <div className="space-y-1">
                            <Label htmlFor="ai-ollama-base-url">Ollama Base URL</Label>
                            <Input
                              id="ai-ollama-base-url"
                              placeholder="http://127.0.0.1:11434"
                              value={resolvedAiSettings.ollamaBaseUrl}
                              onChange={(e) => handleAiSettingChange('ollamaBaseUrl', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              {isDesktopRuntime ? 'Uses local Ollama server on this desktop app.' : 'Use this only if your web app can reach your Ollama endpoint.'}
                            </p>
                          </div>
                        ) : resolvedAiSettings.provider === 'openai' ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="ai-openai-key">OpenAI API Key</Label>
                              <Input
                                id="ai-openai-key"
                                type="password"
                                placeholder="sk-..."
                                value={resolvedAiSettings.openaiApiKey}
                                onChange={(e) => handleAiSettingChange('openaiApiKey', e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">Key stored in browser on this device.</p>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="ai-openai-base-url">OpenAI Base URL (optional)</Label>
                              <Input
                                id="ai-openai-base-url"
                                placeholder="https://api.openai.com"
                                value={resolvedAiSettings.openaiBaseUrl}
                                onChange={(e) => handleAiSettingChange('openaiBaseUrl', e.target.value)}
                              />
                            </div>
                          </>
                        ) : resolvedAiSettings.provider === 'perplexity' ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="ai-perplexity-key">Perplexity API Key</Label>
                              <Input
                                id="ai-perplexity-key"
                                type="password"
                                placeholder="pplx-..."
                                value={resolvedAiSettings.perplexityApiKey || ''}
                                onChange={(e) => handleAiSettingChange('perplexityApiKey', e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">Key stored in browser on this device.</p>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="ai-perplexity-base-url">Perplexity Base URL (optional)</Label>
                              <Input
                                id="ai-perplexity-base-url"
                                placeholder="https://api.perplexity.ai"
                                value={resolvedAiSettings.perplexityBaseUrl || ''}
                                onChange={(e) => handleAiSettingChange('perplexityBaseUrl', e.target.value)}
                              />
                            </div>
                          </>
                        ) : resolvedAiSettings.provider === 'anthropic' ? (
                          <>
                            <div className="space-y-1">
                              <Label htmlFor="ai-anthropic-key">Anthropic API Key</Label>
                              <Input
                                id="ai-anthropic-key"
                                type="password"
                                placeholder="sk-ant-..."
                                value={resolvedAiSettings.anthropicApiKey || ''}
                                onChange={(e) => handleAiSettingChange('anthropicApiKey', e.target.value)}
                              />
                              <p className="text-xs text-muted-foreground">Key stored in browser on this device.</p>
                            </div>
                            <div className="space-y-1">
                              <Label htmlFor="ai-anthropic-base-url">Anthropic Base URL (optional)</Label>
                              <Input
                                id="ai-anthropic-base-url"
                                placeholder="https://api.anthropic.com"
                                value={resolvedAiSettings.anthropicBaseUrl || ''}
                                onChange={(e) => handleAiSettingChange('anthropicBaseUrl', e.target.value)}
                              />
                            </div>
                          </>
                        ) : null}
                        <div className="space-y-1">
                          <Label htmlFor="astra-reply-language">Astra Reply Language</Label>
                          <select
                            id="astra-reply-language"
                            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                            value={settings.astraReplyLanguage || 'auto'}
                            onChange={(e) => handleSettingChange('astraReplyLanguage', e.target.value as 'auto' | 'english' | 'hindi' | 'hinglish')}
                          >
                            <option value="auto">Auto</option>
                            <option value="english">English</option>
                            <option value="hindi">Hindi</option>
                            <option value="hinglish">Hinglish</option>
                          </select>
                          <p className="text-xs text-muted-foreground">
                            Controls the language/style Astra writes in. `Hinglish` means Hindi written in English letters.
                          </p>
                        </div>
                        {isDesktopRuntime ? (
                          <div className="space-y-2 rounded-md border border-border/60 p-3">
                            <Label htmlFor="kokoro-base-url">Kokoro Local TTS (Desktop only)</Label>
                            <Input
                              id="kokoro-base-url"
                              placeholder="http://127.0.0.1:8880"
                              value={settings.kokoroTtsBaseUrl || ''}
                              onChange={(e) => handleSettingChange('kokoroTtsBaseUrl', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Used by PDF read-aloud when selecting Kokoro provider voices.
                            </p>
                          </div>
                        ) : null}
                        {isDesktopRuntime ? (
                          <div className="space-y-2 rounded-md border border-border/60 p-3">
                            <Label htmlFor="xtts-base-url">XTTS v2 Local TTS (Desktop only)</Label>
                            <Input
                              id="xtts-base-url"
                              placeholder="http://127.0.0.1:8020"
                              value={settings.xttsTtsBaseUrl || ''}
                              onChange={(e) => handleSettingChange('xttsTtsBaseUrl', e.target.value)}
                            />
                            <div className="flex gap-2">
                              <Input
                                placeholder="Voice sample path, e.g. C:\\voices\\me.wav"
                                value={settings.xttsVoiceSamplePath || ''}
                                onChange={(e) => handleSettingChange('xttsVoiceSamplePath', e.target.value)}
                              />
                              <Button type="button" variant="outline" onClick={() => void handleBrowseXttsSample()}>
                                Browse
                              </Button>
                            </div>
                            <div className="space-y-2 rounded-md border border-border/60 bg-muted/20 p-3">
                              <div className="flex items-center justify-between gap-2">
                                <Label className="text-xs">Record voice sample</Label>
                                <div className="text-[11px] text-muted-foreground">
                                  {isRecordingXttsSample ? 'Recording...' : xttsSampleBlob ? 'Sample ready' : 'No sample recorded'}
                                </div>
                              </div>
                              <div className="rounded-md border border-border/60 bg-background/60 p-2 text-xs leading-5 text-muted-foreground whitespace-pre-line">
                                {XTTS_SAMPLE_SCRIPT}
                              </div>
                              <div className="flex flex-wrap gap-2">
                                {!isRecordingXttsSample ? (
                                  <Button type="button" variant="outline" size="sm" onClick={() => void handleStartXttsSampleRecording()}>
                                    <Mic className="mr-2 h-3.5 w-3.5" />
                                    Record voice
                                  </Button>
                                ) : (
                                  <Button type="button" variant="secondary" size="sm" onClick={handleStopXttsSampleRecording}>
                                    <Square className="mr-2 h-3.5 w-3.5" />
                                    Stop recording
                                  </Button>
                                )}
                                <Button type="button" variant="outline" size="sm" onClick={handlePlayXttsSample} disabled={!xttsSampleUrl}>
                                  <Play className="mr-2 h-3.5 w-3.5" />
                                  {isPlayingXttsSample ? 'Stop playback' : 'Play back'}
                                </Button>
                                <Button type="button" variant="outline" size="sm" onClick={handleResetXttsSample} disabled={!xttsSampleBlob}>
                                  <RotateCcw className="mr-2 h-3.5 w-3.5" />
                                  Reset
                                </Button>
                                <Button type="button" size="sm" onClick={() => void handleSaveXttsSample()} disabled={!xttsSampleBlob || isSavingXttsSample}>
                                  <Save className="mr-2 h-3.5 w-3.5" />
                                  {isSavingXttsSample ? 'Saving...' : 'Save sample'}
                                </Button>
                              </div>
                              <div className="text-[11px] text-muted-foreground">
                                Save will write the recording to disk and fill the XTTS voice sample path automatically.
                              </div>
                            </div>
                            <div className="grid gap-2 sm:grid-cols-2">
                              <Input
                                placeholder="Voice name"
                                value={settings.xttsVoiceName || ''}
                                onChange={(e) => handleSettingChange('xttsVoiceName', e.target.value)}
                              />
                              <Input
                                placeholder="Language code"
                                value={settings.xttsLanguage || ''}
                                onChange={(e) => handleSettingChange('xttsLanguage', e.target.value)}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Used for local voice cloning. If a sample path is set, XTTS uses that recording as the speaker reference.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desktop auto-start uses <code>ELECTRON_XTTS_START_COMMAND</code>. Default env base URL: <code>ELECTRON_XTTS_BASE_URL=http://127.0.0.1:8020</code>.
                            </p>
                          </div>
                        ) : null}
                        {isDesktopRuntime ? (
                          <div className="space-y-2 rounded-md border border-border/60 p-3">
                            <Label htmlFor="local-stt-base-url">Local STT Server (Desktop only)</Label>
                            <Input
                              id="local-stt-base-url"
                              placeholder="http://127.0.0.1:9000"
                              value={settings.localSttBaseUrl || ''}
                              onChange={(e) => handleSettingChange('localSttBaseUrl', e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">
                              Used by Shiv mic transcription before cloud fallback. Env fallback: <code>LOCAL_STT_BASE_URL=http://127.0.0.1:&lt;port&gt;</code>.
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Desktop auto-start uses Docker first; optional fallback command: <code>ELECTRON_STT_START_COMMAND</code>.
                            </p>
                          </div>
                        ) : null}
                        {isDesktopRuntime ? (
                          <div className="space-y-3 rounded-md border border-border/60 p-3">
                            <div className="flex items-center justify-between">
                              <Label className="text-sm">Local Server Status</Label>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void refreshLocalServerStatus()}
                                disabled={isRefreshingLocalServerStatus}
                              >
                                {isRefreshingLocalServerStatus ? 'Checking...' : 'Refresh'}
                              </Button>
                            </div>
                            <div className="grid gap-2 text-xs">
                                <div className="flex items-center justify-between rounded border border-border/60 px-2 py-1.5">
                                  <span className="text-muted-foreground">Kokoro</span>
                                  <span className={kokoroServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                                    {kokoroServerStatus.healthy
                                      ? `running${kokoroServerStatus.mode ? ` (${kokoroServerStatus.mode})` : ''}`
                                      : 'offline'}
                                  </span>
                                </div>
                                {kokoroServerStatus.upgradeAvailable ? (
                                  <div className="rounded border border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                                    GPU is available. Recreate Kokoro to switch from CPU to GPU.
                                  </div>
                                ) : null}
                              <div className="flex items-center justify-between rounded border border-border/60 px-2 py-1.5">
                                <span className="text-muted-foreground">Local STT</span>
                                <span className={sttServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                                  {sttServerStatus.healthy
                                    ? `running${sttServerStatus.mode ? ` (${sttServerStatus.mode})` : sttServerStatus.backend ? ` (${sttServerStatus.backend})` : sttServerStatus.managed ? ' (managed)' : ''}`
                                    : 'offline'}
                                </span>
                              </div>
                              <div className="flex items-center justify-between rounded border border-border/60 px-2 py-1.5">
                                <span className="text-muted-foreground">XTTS</span>
                                <span className={xttsServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                                  {xttsServerStatus.healthy
                                    ? `running${xttsServerStatus.mode ? ` (${xttsServerStatus.mode})` : xttsServerStatus.backend ? ` (${xttsServerStatus.backend})` : xttsServerStatus.managed ? ' (managed)' : ''}`
                                    : !isXttsBridgeSupported
                                    ? 'unavailable'
                                    : xttsServerStatus.warming
                                    ? 'warming'
                                    : 'offline'}
                                </span>
                              </div>
                              {!xttsServerStatus.healthy && (xttsServerStatus.error || xttsServerStatus.details?.length) ? (
                                <div className="rounded border border-border/60 px-2 py-1.5 text-[11px] text-muted-foreground">
                                  <div>{xttsServerStatus.error}</div>
                                  {xttsServerStatus.details?.slice(0, 2).map((detail) => (
                                    <div key={detail} className="mt-1 break-all">
                                      {detail}
                                    </div>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleStartKokoroFromSettings()}
                                  disabled={isStartingKokoroFromSettings}
                                >
                                  {isStartingKokoroFromSettings ? (kokoroServerStatus.upgradeAvailable ? 'Upgrading Kokoro...' : 'Starting Kokoro...') : (kokoroServerStatus.upgradeAvailable ? 'Upgrade Kokoro to GPU' : 'Start Kokoro')}
                                </Button>
                              {kokoroServerStatus.running ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleStopKokoroFromSettings()}
                                  disabled={isStoppingKokoroFromSettings}
                                >
                                  {isStoppingKokoroFromSettings ? 'Stopping Kokoro...' : 'Stop Kokoro'}
                                </Button>
                              ) : null}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleInstallXttsFromSettings()}
                                disabled={isInstallingXttsFromSettings || !isXttsBridgeSupported}
                              >
                                {isInstallingXttsFromSettings ? 'Installing XTTS...' : 'Install XTTS'}
                              </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleStartXttsFromSettings()}
                                  disabled={isStartingXttsFromSettings || !isXttsBridgeSupported}
                                >
                                  {isStartingXttsFromSettings ? ((xttsNeedsRecreate || xttsCanRecreate) ? 'Recreating XTTS...' : 'Starting XTTS...') : ((xttsNeedsRecreate || xttsCanRecreate) ? 'Recreate XTTS' : 'Start XTTS')}
                                </Button>
                              {xttsServerStatus.running && (xttsServerStatus.managed || xttsServerStatus.backend === 'docker') ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleStopXttsFromSettings()}
                                  disabled={isStoppingXttsFromSettings || !isXttsBridgeSupported}
                                >
                                  {isStoppingXttsFromSettings ? 'Stopping XTTS...' : 'Stop XTTS'}
                                </Button>
                              ) : null}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => void handleStartSttFromSettings()}
                                disabled={isStartingSttFromSettings}
                              >
                                {isStartingSttFromSettings ? 'Starting STT...' : 'Start STT'}
                              </Button>
                              {sttServerStatus.running && (sttServerStatus.managed || sttServerStatus.backend === 'docker') ? (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => void handleStopSttFromSettings()}
                                  disabled={isStoppingSttFromSettings}
                                >
                                  {isStoppingSttFromSettings ? 'Stopping STT...' : 'Stop STT'}
                                </Button>
                              ) : null}
                            </div>
                            {sttServerStatus.error ? (
                              <p className="text-[11px] text-destructive">{sttServerStatus.error}</p>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-widgets" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                        <div className="space-y-0.5 text-left">
                            <Label className="text-base">Widget Visibility</Label>
                            <p className="text-sm text-muted-foreground">
                            Show or hide floating widgets on the dashboard.
                            </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 pt-4 border-t">
                            {WIDGET_NAMES.map(widget => (
                                <div key={widget.id} className="flex items-center justify-between">
                                    <Label htmlFor={`widget-${widget.id}`} className="font-normal">
                                        {widget.label}
                                    </Label>
                                    <Switch
                                        id={`widget-${widget.id}`}
                                        checked={settings.widgetVisibility?.[widget.id] ?? true}
                                        onCheckedChange={(checked) => handleWidgetVisibilityChange(widget.id, checked)}
                                    />
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-scheduling" className="border rounded-lg">
                     <AccordionTrigger className="px-4 py-3">
                        <div className="space-y-0.5 text-left">
                          <Label className="text-base">Task Scheduling</Label>
                          <p className="text-sm text-muted-foreground">
                            Control how and what you schedule.
                          </p>
                        </div>
                    </AccordionTrigger>
                     <AccordionContent className="px-4 pb-4">
                        <div className="space-y-6 pt-4 border-t">
                            <div>
                               <Label className="font-semibold">Workout Scheduling</Label>
                                <p className="text-xs text-muted-foreground mb-2">Choose how your weekly workout plan is scheduled.</p>
                                <RadioGroup
                                    value={settings.workoutScheduling || 'day-of-week'}
                                    onValueChange={(value) => handleSettingChange('workoutScheduling', value as WorkoutSchedulingMode)}
                                >
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="day-of-week" id="r-dow" />
                                    <Label htmlFor="r-dow" className="font-normal">Day-of-Week (Rigid)</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">Workouts are tied to specific days (e.g., Monday is always Chest).</p>
                                    
                                    <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="sequential" id="r-seq" />
                                    <Label htmlFor="r-seq" className="font-normal">Sequential (Flexible)</Label>
                                    </div>
                                    <p className="text-xs text-muted-foreground pl-6">Workouts follow a sequence. If you miss a day, the next workout waits for you.</p>
                                </RadioGroup>
                            </div>
                            <Separator />
                            <div>
                               <Label className="font-semibold">Task Scheduling Level</Label>
                                <p className="text-xs text-muted-foreground mb-2">Choose the granularity for scheduling Deep Work and Upskill tasks.</p>
                                <RadioGroup
                                    value={String(settings.schedulingLevel || 3)}
                                    onValueChange={(value) => handleSettingChange('schedulingLevel', parseInt(value, 10))}
                                    className="space-y-1"
                                >
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="1" id="level-1" />
                                        <Label htmlFor="level-1" className="font-normal">Level 1: Intentions & Curiosities (High-level goals)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="2" id="level-2" />
                                        <Label htmlFor="level-2" className="font-normal">Level 2: Objectives (Mid-level milestones)</Label>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <RadioGroupItem value="3" id="level-3" />
                                        <Label htmlFor="level-3" className="font-normal">Level 3: Actions & Visualizations (Granular tasks)</Label>
                                    </div>
                                </RadioGroup>
                            </div>
                             <Separator />
                            <div>
                                <Label className="font-semibold">Spaced Repetition</Label>
                                <p className="text-xs text-muted-foreground mb-2">Set the default time slot for spaced repetition tasks.</p>
                                <Select
                                  value={settings.spacedRepetitionSlot || 'Late Night'}
                                  onValueChange={(value) => handleSettingChange('spacedRepetitionSlot', value as SlotName)}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select a slot..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {SLOT_NAMES.map(slot => (
                                      <SelectItem key={slot} value={slot}>{slot}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                            </div>
                            <Separator />
                              <div>
                                  <Label className="font-semibold">Holidays</Label>
                                  <p className="text-xs text-muted-foreground mb-2">Dates to skip for intelligent routines.</p>
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <Input
                                      type="date"
                                      value={newHolidayDate}
                                      onChange={(e) => setNewHolidayDate(e.target.value)}
                                    />
                                    <Input
                                      placeholder="Holiday name"
                                      value={newHolidayName}
                                      onChange={(e) => setNewHolidayName(e.target.value)}
                                    />
                                    <Button variant="secondary" onClick={handleAddHoliday}>Add</Button>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Button
                                      variant="outline"
                                      className="gap-2"
                                      onClick={() => {
                                        setHolidayGenError(null);
                                        setGeneratedHolidays([]);
                                        setIsHolidayAstraOpen(true);
                                      }}
                                    >
                                      <Sparkles className="h-4 w-4" />
                                      Astra Generate
                                    </Button>
                                    <p className="text-xs text-muted-foreground">Generate a national holiday list with Astra.</p>
                                  </div>
                                </div>
                                <div className="mt-2 space-y-2">
                                  {holidayEntries.length === 0 ? (
                                    <p className="text-xs text-muted-foreground">No holidays added yet.</p>
                                  ) : (
                                    holidayEntries.map((entry) => (
                                      <div key={`${entry.date}-${entry.name}`} className="flex items-center justify-between rounded-md border border-border/60 bg-muted/30 px-2 py-1 text-xs">
                                        <span>{entry.date}{entry.name ? ` - ${entry.name}` : ''}</span>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveHoliday(entry.date)}>
                                          <Trash2 className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ))
                                  )}
                                </div>
                            </div>
                        </div>
                     </AccordionContent>
                  </AccordionItem>
                  <AccordionItem value="item-habits" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                      <div className="space-y-0.5 text-left">
                        <Label className="text-base">Default Habit Links</Label>
                        <p className="text-sm text-muted-foreground">
                          Automatically link a habit when creating a new activity.
                        </p>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-3 pt-4 border-t">
                            {activityTypesForHabitLinking.map(type => (
                                <div key={type} className="flex items-center justify-between">
                                    <Label htmlFor={`habit-${type}`} className="capitalize font-normal">
                                        {type.replace('-', ' ')}
                                    </Label>
                                    <Select
                                        value={settings.defaultHabitLinks?.[type] || 'none'}
                                        onValueChange={(value) => handleDefaultHabitChange(type, value)}
                                    >
                                        <SelectTrigger className="w-[200px]" id={`habit-${type}`}>
                                            <SelectValue placeholder="Select a habit..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="none">-- None --</SelectItem>
                                            {habitCards.map(habit => (
                                                <SelectItem key={habit.id} value={habit.id}>{habit.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            ))}
                        </div>
                    </AccordionContent>
                  </AccordionItem>
                   <AccordionItem value="item-routines" className="border rounded-lg">
                    <AccordionTrigger className="px-4 py-3">
                        <div className="space-y-0.5 text-left">
                        <Label className="text-base">Manage Routine Tasks</Label>
                        <p className="text-sm text-muted-foreground">
                            View and remove tasks from your daily routine.
                        </p>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <div className="space-y-2 pt-4 border-t">
                        {(settings.routines || []).length > 0 ? (
                            (settings.routines || []).map((task, index) => (
                            <div key={index} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <span className="text-sm font-medium">{task.details} ({task.slot})</span>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleRemoveRoutine(task)}>
                                <Trash2 className="h-4 w-4 text-destructive"/>
                                </Button>
                            </div>
                            ))
                        ) : (
                            <p className="text-sm text-muted-foreground text-center py-4">No routine tasks defined.</p>
                        )}
                        </div>
                    </AccordionContent>
                    </AccordionItem>
                </Accordion>

                <div className="space-y-4 rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <Label className="text-base">General</Label>
                    <p className="text-sm text-muted-foreground">
                      Manage general application behavior.
                    </p>
                  </div>
                   <div className="flex items-center space-x-2">
                    <Label htmlFor="timestamp-offset" className="font-normal flex-shrink-0">
                        Timestamp Note Offset (sec):
                    </Label>
                    <Input
                        id="timestamp-offset"
                        type="number"
                        value={settings.timestampAnnotationOffset || 30}
                        onChange={(e) => handleSettingChange('timestampAnnotationOffset', parseInt(e.target.value, 10) || 0)}
                        className="w-20 h-8"
                        placeholder="30"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="drawing-autosave" className="font-normal flex-shrink-0">
                        Drawing Canvas Autosave (sec):
                    </Label>
                    <Input
                        id="drawing-autosave"
                        type="number"
                        value={settings.drawingCanvasAutoSaveInterval || 30}
                        onChange={(e) => handleSettingChange('drawingCanvasAutoSaveInterval', parseInt(e.target.value, 10) || 0)}
                        className="w-20 h-8"
                        placeholder="30"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Label htmlFor="daily-goal" className="font-normal flex-shrink-0">
                      Daily Productive Hours Goal:
                    </Label>
                    <Input
                      id="daily-goal"
                      type="number"
                      value={settings.dailyProductiveHoursGoal || 4}
                      onChange={(e) => handleSettingChange('dailyProductiveHoursGoal', parseInt(e.target.value, 10) || 0)}
                      className="w-20 h-8"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isp-simple-mode"
                      checked={settings.ispSimpleMode ?? true}
                      onCheckedChange={(checked) => handleSettingChange('ispSimpleMode', checked)}
                    />
                    <Label htmlFor="isp-simple-mode" className="font-normal">
                      Simple Production Mode (hide advanced features)
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="isp-simple-mode-keep-icons"
                      checked={settings.ispSimpleKeepCanvasAndBotherings ?? true}
                      onCheckedChange={(checked) => handleSettingChange('ispSimpleKeepCanvasAndBotherings', checked)}
                    />
                    <Label htmlFor="isp-simple-mode-keep-icons" className="font-normal">
                      In Simple Mode, keep Canvas + Botherings icons visible
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="smart-logging"
                      checked={settings.smartLogging}
                      onCheckedChange={(checked) => handleSettingChange('smartLogging', checked)}
                    />
                    <Label htmlFor="smart-logging" className="font-normal">
                      Enable Smart Logging Prompts
                    </Label>
                  </div>
                   <div className="flex items-center justify-between">
                    <Label htmlFor="reset-landing" className="font-normal">
                      Show the welcome page on next visit.
                    </Label>
                    <Button id="reset-landing" variant="outline" size="sm" onClick={handleResetLandingPage}>
                      Reset
                    </Button>
                  </div>
                  <Separator />
                  <div className="space-y-4">
                     <h3 className="font-semibold">Data Management</h3>
                      <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <HardDrive className="h-4 w-4 text-sky-300" />
                            <div>
                              <div className="text-sm font-medium">Storage Health</div>
                              <div className="text-xs text-muted-foreground">Tracks localStorage pressure and safe cleanup options.</div>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={refreshStorageHealth}
                            disabled={isRefreshingStorage}
                          >
                            <RefreshCw className={`mr-2 h-3.5 w-3.5 ${isRefreshingStorage ? 'animate-spin' : ''}`} />
                            Refresh
                          </Button>
                        </div>

                        {storageHealth ? (
                          <>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                              <div className="rounded border border-white/10 p-2">
                                <div className="text-muted-foreground">Total Used</div>
                                <div className="mt-1 font-semibold">{formatBytes(storageHealth.totalBytes)}</div>
                              </div>
                              <div className="rounded border border-white/10 p-2">
                                <div className="text-muted-foreground">LifeOS Used</div>
                                <div className="mt-1 font-semibold">{formatBytes(storageHealth.lifeosBytes)}</div>
                              </div>
                              <div className="rounded border border-white/10 p-2">
                                <div className="text-muted-foreground">All Keys</div>
                                <div className="mt-1 font-semibold">{storageHealth.totalKeys}</div>
                              </div>
                              <div className="rounded border border-white/10 p-2">
                                <div className="text-muted-foreground">LifeOS Keys</div>
                                <div className="mt-1 font-semibold">{storageHealth.lifeosKeys}</div>
                              </div>
                            </div>

                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-muted-foreground">
                                <span>Approx localStorage usage (5MB target)</span>
                                <span>{storageHealth.usagePct.toFixed(1)}%</span>
                              </div>
                              <Progress value={storageHealth.usagePct} className="h-1.5" />
                            </div>

                            {storageHealth.largestLifeosKeys.length > 0 ? (
                              <div className="space-y-1">
                                <div className="text-xs text-muted-foreground">Largest LifeOS keys</div>
                                {storageHealth.largestLifeosKeys.map((entry) => (
                                  <div key={entry.key} className="flex items-center justify-between text-xs rounded border border-white/10 px-2 py-1">
                                    <span className="truncate pr-2" title={entry.key}>{entry.key}</span>
                                    <span className="font-medium">{formatBytes(entry.bytes)}</span>
                                  </div>
                                ))}
                              </div>
                            ) : null}

                            <div className="flex items-center justify-between gap-3">
                              <Label htmlFor="cleanup-legacy-keys" className="font-normal text-xs text-muted-foreground leading-relaxed">
                                Remove old duplicate user keys from previous mixed-case username saves (only when canonical key exists).
                              </Label>
                              <AlertDialog>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    id="cleanup-legacy-keys"
                                    variant="outline"
                                    size="sm"
                                    disabled={storageHealth.legacyUserKeys.length === 0}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" />
                                    Clean Legacy Keys ({storageHealth.legacyUserKeys.length})
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Clean legacy localStorage keys?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This removes duplicate user-scoped keys and keeps canonical lowercase keys.
                                      Total keys to remove: {storageHealth.legacyUserKeys.length}.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={clearLegacyUserStorageKeys}>Yes, clean</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-muted-foreground">Storage snapshot not loaded yet.</div>
                        )}
                      </div>
                     <div className="flex items-center justify-between">
                        <Label htmlFor="recalculate-types" className="font-normal text-sm text-muted-foreground">
                          Fix misclassified tasks (e.g., tasks showing as "Objective" that shouldn't be).
                        </Label>
                        <Button id="recalculate-types" variant="outline" size="sm" onClick={recalculateAndFixTaskTypes}>
                          <RefreshCw className="mr-2 h-4 w-4" /> Recalculate
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <Label htmlFor="clear-indexeddb" className="font-normal text-sm text-muted-foreground">
                          Clear all locally stored files (audio, PDFs) from your browser.
                        </Label>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button id="clear-indexeddb" variant="destructive" size="sm">
                                  <Trash2 className="mr-2 h-4 w-4" /> Clear Local Files
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This action cannot be undone. This will permanently delete all local audio and PDF files stored in your browser for this application.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={clearAllLocalFiles}>Yes, clear data</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                      </div>
                  </div>
                  <Separator />
                   <div className="flex items-center justify-between">
                    <Label htmlFor="copy-spec-template" className="font-normal">
                      Copy specialization upload prompt.
                    </Label>
                    <Button id="copy-spec-template" variant="outline" size="sm" onClick={() => handleOpenCopyModal('specialization')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="copy-micro-template" className="font-normal">
                      Copy micro-skill upload prompt.
                    </Label>
                    <Button id="copy-micro-template" variant="outline" size="sm" onClick={() => handleOpenCopyModal('micro-skills')}>
                      <Copy className="mr-2 h-4 w-4" />
                      Copy
                    </Button>
                  </div>
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>
      )}
      <Dialog
        open={isHolidayAstraOpen}
        onOpenChange={(open) => {
          setIsHolidayAstraOpen(open);
          if (!open) {
            setHolidayGenError(null);
            setGeneratedHolidays([]);
            setIsGeneratingHolidays(false);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Astra Holiday Generator</DialogTitle>
            <DialogDescription>
              Astra can generate a national holiday list for {holidayYear}. Which country should we use?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-md border border-border/60 bg-muted/20 p-3 space-y-2">
              <div className="text-xs text-muted-foreground">Astra</div>
              <div className="text-sm">Pick a country below or type your own.</div>
            </div>
            <div className="flex flex-wrap gap-2">
              {['India', 'USA', 'UK', 'Japan', 'Korea'].map((country) => (
                <Button
                  key={country}
                  type="button"
                  variant={holidayCountry === country ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    setHolidayCountry(country);
                    setHolidayCustomCountry('');
                  }}
                >
                  {country}
                </Button>
              ))}
            </div>
            <Input
              placeholder="Or type a country (e.g., Canada)"
              value={holidayCustomCountry}
              onChange={(e) => setHolidayCustomCountry(e.target.value)}
            />
            {holidayGenError ? (
              <p className="text-xs text-destructive">{holidayGenError}</p>
            ) : null}
            <div className="flex items-center gap-2">
              <Button onClick={() => void handleGenerateHolidays()} disabled={isGeneratingHolidays}>
                {isGeneratingHolidays ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Holidays'
                )}
              </Button>
              <Button variant="outline" onClick={() => setIsHolidayAstraOpen(false)}>Close</Button>
            </div>
            {generatedHolidays.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-semibold text-muted-foreground">Preview</div>
                <div className="max-h-40 overflow-auto rounded-md border border-border/60 bg-muted/20 p-2 text-xs space-y-1">
                  {generatedHolidays.map((entry) => (
                    <div key={`${entry.date}-${entry.name}`} className="flex items-center justify-between gap-2">
                      <span>{entry.date}</span>
                      <span className="text-muted-foreground">{entry.name}</span>
                    </div>
                  ))}
                </div>
                <Button variant="secondary" onClick={handleApplyGeneratedHolidays}>
                  Update Holiday List
                </Button>
              </div>
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
      <Dialog open={isCopyModalOpen} onOpenChange={setIsCopyModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter {copyType === 'specialization' ? 'Specialization' : 'Micro-Skill Cluster'} Name</DialogTitle>
            <DialogDescription>This name will be added to the JSON template before copying.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              id="spec-name-input"
              value={specializationName}
              onChange={(e) => setSpecializationName(e.target.value)}
              placeholder={copyType === 'specialization' ? "e.g., GPU Programming" : "e.g., Advanced CSS"}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCopyModalOpen(false)}>Cancel</Button>
            <Button onClick={handleCopyTemplate}>Copy Prompt</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
