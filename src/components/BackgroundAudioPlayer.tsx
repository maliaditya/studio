
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Play, Pause, Volume1, Volume2, VolumeX, Eye, EyeOff, Bot, X, Settings2, Filter, RefreshCw, Loader2, Mic, MicOff, Phone, Lock, Unlock, Square } from 'lucide-react';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import { useToast } from '@/hooks/use-toast';
import { getStaticTaskAliasMap, mergeTaskAliasMaps } from '@/lib/shiv/taskAliases';
import { cleanSpeechText, getKokoroLocalVoices, parseCloudVoiceURI } from '@/lib/tts';

type ShivChatMessage = {
  role: 'user' | 'assistant';
  content: string;
};

type ShivContextScopeKey = 'resources' | 'routines' | 'todayTasks' | 'mindsetTasks' | 'botherings' | 'canvas' | 'skills' | 'health';
type ShivContextScopes = Record<ShivContextScopeKey, boolean>;

type SpeechRecognitionEventLike = {
  resultIndex: number;
  results: ArrayLike<{
    isFinal: boolean;
    [index: number]: { transcript?: string };
  }>;
};

type SpeechRecognitionLike = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onerror: ((event: { error?: string }) => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
  stop: () => void;
};

const isEmptyTranscriptError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  return /empty transcript|returned empty text|did not return a transcript/i.test(message);
};

type ShivVoiceLatency = {
  question: string;
  mode: "open" | "curated";
  sttMs: number;
  llmMs: number;
  ttsMs: number;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const getYouTubeVideoId = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    const host = url.hostname.toLowerCase();
    if (host.includes("youtu.be")) {
      const id = url.pathname.replace(/^\/+/, "").split("/")[0] || "";
      return id || null;
    }
    if (host.includes("youtube.com")) {
      if (url.pathname.startsWith("/watch")) {
        return url.searchParams.get("v") || null;
      }
      if (url.pathname.startsWith("/shorts/") || url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2] || "";
        return id || null;
      }
    }
    return null;
  } catch {
    return null;
  }
};

declare global {
  interface Window {
    SpeechRecognition?: new () => SpeechRecognitionLike;
    webkitSpeechRecognition?: new () => SpeechRecognitionLike;
  }
}

const MAX_CHAT_HISTORY = 8;
const SHIV_VOICE_SETTINGS_KEY = 'shiv_chat_voice_settings';
const SHIV_CONTEXT_SCOPES_KEY = 'shiv_chat_context_scopes';
const DEFAULT_SHIV_CONTEXT_SCOPES: ShivContextScopes = {
  resources: true,
  routines: true,
  todayTasks: true,
  mindsetTasks: true,
  botherings: true,
  canvas: true,
  skills: true,
  health: true,
};

const buildShivContextSnapshot = (auth: any, scopes: ShivContextScopes) => {
  const toDateOnly = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const parseDate = (value?: string | null) => {
    if (!value) return null;
    const normalized = value.length === 10 ? `${value}T00:00:00` : value;
    const parsed = new Date(normalized);
    if (Number.isNaN(parsed.getTime())) return null;
    parsed.setHours(0, 0, 0, 0);
    return parsed;
  };
  const addDays = (date: Date, days: number) => {
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    next.setHours(0, 0, 0, 0);
    return next;
  };
  const diffDays = (a: Date, b: Date) => {
    const ms = a.getTime() - b.getTime();
    return Math.floor(ms / (24 * 60 * 60 * 1000));
  };
  const diffMonths = (a: Date, b: Date) => {
    const years = a.getFullYear() - b.getFullYear();
    const months = a.getMonth() - b.getMonth();
    return years * 12 + months;
  };
  const relativeFromDays = (days: number) => {
    if (days <= 0) return 'today';
    if (days < 7) return `in ${days} day${days === 1 ? '' : 's'}`;
    const weeks = Math.floor(days / 7);
    if (days < 30) return `in ${weeks} week${weeks === 1 ? '' : 's'}`;
    const months = Math.floor(days / 30);
    return `in ${months} month${months === 1 ? '' : 's'}`;
  };
  const routineLabel = (rule: any) => {
    if (!rule) return 'none';
    if (rule.type === 'daily') return 'daily';
    if (rule.type === 'weekly') return 'weekly';
    if (rule.type === 'custom') {
      const interval = Math.max(1, Number(rule.repeatInterval ?? rule.days ?? 1));
      const unit = rule.repeatUnit ?? 'day';
      return `every ${interval} ${unit}${interval === 1 ? '' : 's'}`;
    }
    return 'none';
  };
  const isRoutineDueOnDate = (routine: any, date: Date) => {
    const rule = routine?.routine;
    if (!rule) return false;
    const base = parseDate(routine?.baseDate || routine?.createdAt);
    if (rule.type === 'daily') return true;
    if (!base) return false;
    if (rule.type === 'weekly') {
      return base.getDay() === date.getDay();
    }
    if (rule.type === 'custom') {
      const interval = Math.max(1, Number(rule.repeatInterval ?? rule.days ?? 1));
      const unit = rule.repeatUnit ?? 'day';
      if (unit === 'month') {
        if (base.getDate() !== date.getDate()) return false;
        const months = diffMonths(date, base);
        return months >= 0 && months % interval === 0;
      }
      const days = diffDays(date, base);
      if (unit === 'week') return days >= 0 && days % (interval * 7) === 0;
      return days >= 0 && days % interval === 0;
    }
    return false;
  };
  const isMindsetTaskDueOnDate = (task: any, date: Date) => {
    const recurrence = task?.recurrence || 'none';
    const start = parseDate(task?.startDate || task?.dateKey);
    if (recurrence === 'none') {
      if (!task?.dateKey) return false;
      return task.dateKey === toDateOnly(date);
    }
    if (!start) return false;
    if (recurrence === 'daily') return true;
    if (recurrence === 'weekly') return start.getDay() === date.getDay();
    if (recurrence === 'custom') {
      const interval = Math.max(1, Number(task?.repeatInterval || 1));
      const unit = task?.repeatUnit || 'day';
      if (unit === 'month') {
        if (start.getDate() !== date.getDate()) return false;
        const months = diffMonths(date, start);
        return months >= 0 && months % interval === 0;
      }
      const days = diffDays(date, start);
      if (unit === 'week') return days >= 0 && days % (interval * 7) === 0;
      return days >= 0 && days % interval === 0;
    }
    return false;
  };
  const findNextDueDate = (
    isDueFn: (date: Date) => boolean,
    fromDate: Date,
    maxDays = 400
  ) => {
    for (let i = 0; i <= maxDays; i += 1) {
      const d = addDays(fromDate, i);
      if (isDueFn(d)) return d;
    }
    return null;
  };

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayDate = parseDate(todayKey) || new Date();
  const fullSchedule = auth?.schedule || {};
  const scheduleKeys = Object.keys(fullSchedule).sort();
  const recentScheduleKeys = scheduleKeys.slice(-14);
  const recentSchedule: Record<string, unknown> = {};
  for (const key of recentScheduleKeys) {
    recentSchedule[key] = fullSchedule[key];
  }
  const todaySchedule = fullSchedule[todayKey] || {};
  const todayTasks = Object.entries(todaySchedule).flatMap(([slotName, activities]) =>
    Array.isArray(activities)
      ? activities.map((activity: any) => ({
          id: activity.id,
          details: activity.details,
          type: activity.type,
          slot: slotName,
          completed: Boolean(activity.completed),
          isRoutineInstance: String(activity.id || '').includes(`_${todayKey}`),
        }))
      : []
  );
  const routines = Array.isArray(auth?.settings?.routines) ? auth.settings.routines : [];
  const skipByDate = auth?.settings?.routineSkipByDate || {};
  const routinesWithNext = routines.map((routine: any) => {
    const nextDate = findNextDueDate((d) => {
      const key = toDateOnly(d);
      if ((skipByDate[key] || []).includes(routine.id)) return false;
      return isRoutineDueOnDate(routine, d);
    }, todayDate);
    const nextDateKey = nextDate ? toDateOnly(nextDate) : null;
    const nextInDays = nextDate ? diffDays(nextDate, todayDate) : null;
    return {
      id: routine.id,
      details: routine.details,
      type: routine.type,
      slot: routine.slot,
      recurrence: routineLabel(routine.routine),
      nextDate: nextDateKey,
      nextInDays,
      nextInRelative: nextInDays === null ? 'unknown' : relativeFromDays(nextInDays),
      skippedToday: (skipByDate[todayKey] || []).includes(routine.id),
      dueToday: Boolean(nextDateKey && nextDateKey === todayKey),
    };
  });
  const mindsetCards = Array.isArray(auth?.mindsetCards) ? auth.mindsetCards : [];
  const sourceByCardId: Record<string, 'external' | 'mismatch' | 'constraint'> = {
    mindset_botherings_external: 'external',
    mindset_botherings_mismatch: 'mismatch',
    mindset_botherings_constraint: 'constraint',
  };
  const mindsetLinkedTasks = mindsetCards.flatMap((card: any) => {
    const source = sourceByCardId[card?.id];
    if (!source) return [];
    const points = Array.isArray(card?.points) ? card.points : [];
    return points.flatMap((point: any) => {
      const tasks = Array.isArray(point?.tasks) ? point.tasks : [];
      return tasks.map((task: any) => {
        const nextDate = findNextDueDate((d) => isMindsetTaskDueOnDate(task, d), todayDate, 400);
        const nextDateKey = nextDate ? toDateOnly(nextDate) : null;
        const nextInDays = nextDate ? diffDays(nextDate, todayDate) : null;
        return {
          source,
          pointId: point?.id,
          pointText: point?.text || '',
          taskId: task?.id,
          details: task?.details || '',
          type: task?.type || 'planning',
          slotName: task?.slotName || null,
          recurrence:
            task?.recurrence && task?.recurrence !== 'none'
              ? `every ${Math.max(1, Number(task?.repeatInterval || 1))} ${(task?.repeatUnit || 'day')}${Math.max(1, Number(task?.repeatInterval || 1)) === 1 ? '' : 's'}`
              : 'one-time',
          nextDate: nextDateKey,
          nextInDays,
          nextInRelative: nextInDays === null ? 'unknown' : relativeFromDays(nextInDays),
          dueToday: Boolean(nextDateKey && nextDateKey === todayKey),
          completedToday: Boolean(task?.completionHistory?.[todayKey]),
        };
      });
    });
  });
  const upcomingMindsetLinked = mindsetLinkedTasks
    .filter((task) => task.nextInDays !== null && (task.nextInDays || 0) >= 0)
    .sort((a, b) => (a.nextInDays || 0) - (b.nextInDays || 0))
    .slice(0, 120);
  const todayMindsetLinked = mindsetLinkedTasks.filter((task) => task.dueToday);
  const normalizeText = (value: unknown) =>
    String(value || '')
      .toLowerCase()
      .replace(/[^\w]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  const currentSlotName = String(auth?.currentSlot || '').trim();
  const botheringsBySource = mindsetCards
    .filter((card: any) => sourceByCardId[card?.id])
    .flatMap((card: any) => {
      const source = sourceByCardId[card.id];
      const points = Array.isArray(card?.points) ? card.points : [];
      return points.map((point: any) => ({
        ...point,
        id: point?.id,
        text: point?.text || '',
        source,
        completed: Boolean(point?.completed),
        endDate: point?.endDate || null,
        linkedTaskCount: Array.isArray(point?.tasks) ? point.tasks.length : 0,
        linkedTasks: (Array.isArray(point?.tasks) ? point.tasks : []).map((task: any) => {
          const dueToday = isMindsetTaskDueOnDate(task, todayDate);
          const taskSlot = String(task?.slotName || '').trim();
          const taskDetails = String(task?.details || '');
          const normalizedTaskDetails = normalizeText(taskDetails);
          const scheduledTodayByDetails = todayTasks.some(
            (scheduledTask: any) => normalizeText(scheduledTask?.details || '') === normalizedTaskDetails
          );
          const scheduledInCurrentSlotByDetails = currentSlotName
            ? todayTasks.some(
                (scheduledTask: any) =>
                  String(scheduledTask?.slot || '') === currentSlotName &&
                  normalizeText(scheduledTask?.details || '') === normalizedTaskDetails
              )
            : false;
          const inCurrentSlot =
            Boolean(currentSlotName) &&
            ((dueToday && taskSlot === currentSlotName) || scheduledInCurrentSlotByDetails);
          return {
            id: task?.id,
            details: taskDetails,
            slotName: taskSlot || null,
            type: task?.type || 'planning',
            dueToday: Boolean(dueToday || scheduledTodayByDetails),
            inCurrentSlot: Boolean(inCurrentSlot),
          };
        }),
      }));
    });
  const botheringsWithFlags = botheringsBySource.map((bothering: any) => {
    const linkedTasks = Array.isArray(bothering.linkedTasks) ? bothering.linkedTasks : [];
    const hasTodayLinkedTask = linkedTasks.some((task: any) => task?.dueToday);
    const hasCurrentSlotLinkedTask = linkedTasks.some((task: any) => task?.inCurrentSlot);
    return {
      ...bothering,
      hasTodayLinkedTask,
      hasCurrentSlotLinkedTask,
    };
  });

  const snapshot: Record<string, unknown> = {
    meta: {
      nowIso: new Date().toISOString(),
      todayKey,
      currentSlot: auth?.currentSlot || null,
      user: auth?.currentUser
        ? { username: auth.currentUser.username, id: auth.currentUser.id }
        : null,
    },
    settings: {
      widgetVisibility: auth?.settings?.widgetVisibility || {},
      allWidgetsVisible: Boolean(auth?.settings?.allWidgetsVisible),
      smartLogging: Boolean(auth?.settings?.smartLogging),
      routines: Array.isArray(auth?.settings?.routines) ? auth.settings.routines : [],
      ai: {
        provider: auth?.settings?.ai?.provider || 'none',
        model: auth?.settings?.ai?.model || '',
      },
      shivDynamicTaskAliases: auth?.settings?.shivDynamicTaskAliases || {},
    },
  };

  if (scopes.todayTasks) {
    snapshot.today = {
      schedule: todaySchedule,
      dailyPurpose: auth?.dailyPurposes?.[todayKey] || '',
      topPriorities: Array.isArray(auth?.topPriorities) ? auth.topPriorities : [],
      tasks: todayTasks,
      taskCounts: {
        total: todayTasks.length,
        completed: todayTasks.filter((task) => task.completed).length,
        pending: todayTasks.filter((task) => !task.completed).length,
      },
    };
  }

  if (scopes.routines) {
    snapshot.routines = {
      total: routinesWithNext.length,
      dueToday: routinesWithNext.filter((routine) => routine.dueToday),
      upcoming: routinesWithNext
        .filter((routine) => routine.nextInDays !== null && (routine.nextInDays || 0) >= 0)
        .sort((a, b) => (a.nextInDays || 0) - (b.nextInDays || 0))
        .slice(0, 80),
    };
  }

  if (scopes.mindsetTasks) {
    snapshot.mindsetTaskLinks = {
      dueToday: todayMindsetLinked,
      upcoming: upcomingMindsetLinked,
      bySource: {
        external: upcomingMindsetLinked.filter((task) => task.source === 'external'),
        mismatch: upcomingMindsetLinked.filter((task) => task.source === 'mismatch'),
        constraint: upcomingMindsetLinked.filter((task) => task.source === 'constraint'),
      },
    };
  }

  if (scopes.botherings) {
    snapshot.botherings = {
      total: botheringsWithFlags.length,
      pending: botheringsWithFlags.filter((b) => !b.completed).length,
      completed: botheringsWithFlags.filter((b) => b.completed).length,
      bySource: {
        external: botheringsWithFlags.filter((b) => b.source === 'external'),
        mismatch: botheringsWithFlags.filter((b) => b.source === 'mismatch'),
        constraint: botheringsWithFlags.filter((b) => b.source === 'constraint'),
      },
    };
  }

  if (scopes.resources || scopes.todayTasks || scopes.routines) {
    snapshot.recentSchedule = recentSchedule;
  }

  if (scopes.resources || scopes.skills || scopes.mindsetTasks || scopes.canvas || scopes.health) {
    const data: Record<string, unknown> = {};
    if (scopes.resources) {
      data.resources = Array.isArray(auth?.resources) ? auth.resources.slice(0, 400) : [];
      data.resourceFolders = Array.isArray(auth?.resourceFolders) ? auth.resourceFolders : [];
      data.brainHacks = Array.isArray(auth?.brainHacks) ? auth.brainHacks : [];
      data.habitCards = Array.isArray(auth?.habitCards) ? auth.habitCards : [];
    }
    if (scopes.mindsetTasks) {
      data.mindsetCards = Array.isArray(auth?.mindsetCards) ? auth.mindsetCards : [];
    }
    if (scopes.skills) {
      data.projects = Array.isArray(auth?.projects) ? auth.projects : [];
      data.coreSkills = Array.isArray(auth?.coreSkills) ? auth.coreSkills : [];
      data.deepWorkDefinitions = Array.isArray(auth?.deepWorkDefinitions) ? auth.deepWorkDefinitions : [];
      data.upskillDefinitions = Array.isArray(auth?.upskillDefinitions) ? auth.upskillDefinitions : [];
      data.mindProgrammingDefinitions = Array.isArray(auth?.mindProgrammingDefinitions) ? auth.mindProgrammingDefinitions : [];
      data.spacedRepetitionData = auth?.spacedRepetitionData || {};
      data.logsSummary = {
        upskillLogsCount: Array.isArray(auth?.allUpskillLogs) ? auth.allUpskillLogs.length : 0,
        deepWorkLogsCount: Array.isArray(auth?.allDeepWorkLogs) ? auth.allDeepWorkLogs.length : 0,
        workoutLogsCount: Array.isArray(auth?.allWorkoutLogs) ? auth.allWorkoutLogs.length : 0,
        leadGenLogsCount: Array.isArray(auth?.allLeadGenLogs) ? auth.allLeadGenLogs.length : 0,
        mindsetLogsCount: Array.isArray(auth?.allMindProgrammingLogs) ? auth.allMindProgrammingLogs.length : 0,
      };
    }
    if (scopes.canvas) {
      data.canvasLayout = auth?.canvasLayout || { nodes: [], edges: [] };
    }
    if (scopes.health) {
      const weightLogs = Array.isArray(auth?.weightLogs) ? [...auth.weightLogs] : [];
      weightLogs.sort((a: any, b: any) => String(a?.date || "").localeCompare(String(b?.date || "")));
      const latestWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
      data.health = {
        latestWeightLog,
        goalWeight: auth?.goalWeight ?? null,
        height: auth?.height ?? null,
        gender: auth?.gender ?? null,
        dateOfBirth: auth?.dateOfBirth ?? null,
      };
    }
    snapshot.data = data;
  }

  snapshot.contextScopes = scopes;
  return snapshot;
};

export function BackgroundAudioPlayer() {
  const auth = useAuth() as any;
  const { toast } = useToast();
  const { 
    isAudioPlaying, 
    setIsAudioPlaying, 
    globalVolume, 
    setGlobalVolume,
    settings,
    setSettings,
  } = auth;
  const audioRef = useRef<HTMLAudioElement>(null);
  const activeUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const cloudAudioRef = useRef<HTMLAudioElement | null>(null);
  const cloudAudioUrlRef = useRef<string | null>(null);
  const speechSessionRef = useRef(0);
  const isMobile = useIsMobile();
  const [isShivOpen, setIsShivOpen] = useState(false);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [shivInput, setShivInput] = useState('');
  const [shivMessages, setShivMessages] = useState<ShivChatMessage[]>([]);
  const [isShivLoading, setIsShivLoading] = useState(false);
  const [shivError, setShivError] = useState<string | null>(null);
  const [speakingMessageKey, setSpeakingMessageKey] = useState<string | null>(null);
  const [pendingReadMessageKey, setPendingReadMessageKey] = useState<string | null>(null);
  const [manualReadMessageKey, setManualReadMessageKey] = useState<string | null>(null);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chatVoiceUri, setChatVoiceUri] = useState('');
  const [chatVoiceRate, setChatVoiceRate] = useState(1);
  const [autoReadReplies, setAutoReadReplies] = useState(false);
  const [openChatMode, setOpenChatMode] = useState(false);
  const [contextScopes, setContextScopes] = useState<ShivContextScopes>(DEFAULT_SHIV_CONTEXT_SCOPES);
  const [isRefreshingAliases, setIsRefreshingAliases] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false);
  const [isMediaRecordingStt, setIsMediaRecordingStt] = useState(false);
  const [isRefreshingServerStatus, setIsRefreshingServerStatus] = useState(false);
  const [kokoroServerStatus, setKokoroServerStatus] = useState<{ healthy: boolean; mode?: string | null }>({
    healthy: false,
    mode: null,
  });
  const [sttServerStatus, setSttServerStatus] = useState<{ healthy: boolean; managed?: boolean; backend?: string; error?: string }>({
    healthy: false,
    managed: false,
    backend: '',
    error: '',
  });
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const mediaChunksRef = useRef<BlobPart[]>([]);
  const voiceTurnStopTimerRef = useRef<number | null>(null);
  const micFinalTextRef = useRef<string>('');
  const micLiveTranscriptRef = useRef<string>('');
  const voiceChatModeRef = useRef<boolean>(false);
  const voiceLatencyRef = useRef<ShivVoiceLatency>({
    question: '',
    mode: 'curated',
    sttMs: 0,
    llmMs: 0,
    ttsMs: 0,
  });

  const isDesktopRuntime =
    isClientMounted && typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
  const kokoroChatEnabled =
    isDesktopRuntime ||
    Boolean(settings?.kokoroTtsBaseUrl?.trim()) ||
    Boolean(kokoroServerStatus.healthy);
  const kokoroChatVoices = useMemo(
    () => getKokoroLocalVoices(kokoroChatEnabled),
    [kokoroChatEnabled]
  );

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    voiceChatModeRef.current = isVoiceChatMode;
  }, [isVoiceChatMode]);

  const refreshDesktopServerStatus = useCallback(async () => {
    const isDesktopRuntime =
      typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge) return;
    setIsRefreshingServerStatus(true);
    try {
      const [kokoroResult, sttResult] = await Promise.all([
        bridge.kokoro?.status?.({ baseUrl: (settings?.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim() }),
        bridge.stt?.status?.({ baseUrl: (settings?.localSttBaseUrl || 'http://127.0.0.1:9890').trim() }),
      ]);
      setKokoroServerStatus({
        healthy: Boolean(kokoroResult?.healthy),
        mode: kokoroResult?.mode || null,
      });
      setSttServerStatus({
        healthy: Boolean(sttResult?.healthy),
        managed: Boolean(sttResult?.managed),
        backend: String(sttResult?.backend || ''),
        error: String(sttResult?.error || ''),
      });
      const nextSttBaseUrl = String(sttResult?.baseUrl || '').trim();
      if (nextSttBaseUrl && nextSttBaseUrl !== String(settings?.localSttBaseUrl || '').trim()) {
        setSettings((prev: any) => ({ ...prev, localSttBaseUrl: nextSttBaseUrl }));
      }
    } finally {
      setIsRefreshingServerStatus(false);
    }
  }, [settings?.kokoroTtsBaseUrl, settings?.localSttBaseUrl, setSettings]);

  const flushVoiceLatency = useCallback(async () => {
    const sample = voiceLatencyRef.current;
    const totalMs = Number(sample.sttMs || 0) + Number(sample.llmMs || 0) + Number(sample.ttsMs || 0);
    if (!sample.question || totalMs <= 0) return;
    try {
      await fetch('/api/ai/shiv-observability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'voice',
          question: sample.question,
          mode: sample.mode,
          sttMs: Math.round(sample.sttMs || 0),
          llmMs: Math.round(sample.llmMs || 0),
          ttsMs: Math.round(sample.ttsMs || 0),
          totalMs: Math.round(totalMs),
        }),
      });
    } catch {
      // ignore telemetry errors
    } finally {
      voiceLatencyRef.current = {
        question: '',
        mode: openChatMode ? 'open' : 'curated',
        sttMs: 0,
        llmMs: 0,
        ttsMs: 0,
      };
    }
  }, [openChatMode]);

  // Effect to sync audio element's playing state with component state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      // Attempt to play the audio. This returns a promise.
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay was prevented. This is expected on first load in most browsers.
          // We'll set isPlaying to false so the UI reflects the actual state.
          // The user can then click the play button to start it manually.
          console.log("Audio playback failed. User interaction is required.", error);
          setIsAudioPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isAudioPlaying, setIsAudioPlaying]);

  // Effect to sync audio element's volume with global state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = globalVolume;
    }
  }, [globalVolume]);
  
  // Effect for component cleanup
  useEffect(() => {
    const audio = audioRef.current;
    // The return function of useEffect serves as a cleanup function.
    return () => {
        if (audio) {
            // Pause and clean up the audio source when the component unmounts
            // to prevent memory leaks.
            audio.pause();
            audio.src = '';
        }
    };
  }, []);

  const togglePlayPause = () => {
    setIsAudioPlaying(prev => !prev);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setGlobalVolume(newVolume[0]);
  };

  const handleToggleAllWidgets = () => {
    setSettings(prev => ({
        ...prev,
        allWidgetsVisible: !prev.allWidgetsVisible,
    }));
  };
  
  const getVolumeIcon = () => {
    if (globalVolume === 0) return <VolumeX className="h-5 w-5" />;
    if (globalVolume < 0.5) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };

  const sendShivQuestion = async (rawQuestion: string) => {
    const question = String(rawQuestion || '').trim();
    if (!question || isShivLoading) return;

    const userMessage: ShivChatMessage = { role: 'user', content: question };
    const nextHistory = [...shivMessages, userMessage].slice(-MAX_CHAT_HISTORY);

    setShivMessages(nextHistory);
    setShivInput('');
    setShivError(null);
    setIsShivLoading(true);
    const llmStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isVoiceFlow = voiceChatModeRef.current || isMediaRecordingStt || isMicListening;

    try {
      const isDesktopRuntime =
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const effectiveScopes: ShivContextScopes = {
        ...contextScopes,
        resources: true,
        canvas: true,
      };
      const contextSnapshot = buildShivContextSnapshot(auth, effectiveScopes);

      const response = await fetch('/api/ai/ask-shiv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          question,
          history: nextHistory.slice(-MAX_CHAT_HISTORY),
          appContext: contextSnapshot,
          aiConfig,
          openMode: openChatMode,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to get Shiv response.'));
      }

      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      if (!answer) {
        throw new Error('Shiv returned an empty answer.');
      }

      setShivMessages((prev) => [...prev, { role: 'assistant', content: answer }].slice(-MAX_CHAT_HISTORY));
      if (isVoiceFlow) {
        const llmEndedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        voiceLatencyRef.current.question = question;
        voiceLatencyRef.current.mode = openChatMode ? 'open' : 'curated';
        voiceLatencyRef.current.llmMs = Math.max(0, llmEndedAt - llmStartedAt);
      }
      if (autoReadReplies) {
        const ttsStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        speakShivReply(answer, `assistant-voice-${Date.now()}`, () => {
          if (isVoiceFlow) {
            const ttsEndedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            voiceLatencyRef.current.ttsMs = Math.max(0, ttsEndedAt - ttsStartedAt);
            void flushVoiceLatency();
          }
          if (voiceChatModeRef.current) {
            void startMediaSttRecording();
          }
        });
      } else if (voiceChatModeRef.current) {
        if (isVoiceFlow) {
          voiceLatencyRef.current.ttsMs = 0;
          void flushVoiceLatency();
        }
        setTimeout(() => {
          if (voiceChatModeRef.current) {
            void startMediaSttRecording();
          }
        }, 350);
      }
    } catch (error) {
      setShivError(error instanceof Error ? error.message : 'Failed to ask Shiv.');
      if (voiceChatModeRef.current) {
        setTimeout(() => {
          if (voiceChatModeRef.current) void startMediaSttRecording();
        }, 700);
      }
    } finally {
      setIsShivLoading(false);
    }
  };

  const handleAskShiv = async () => {
    await sendShivQuestion(shivInput);
  };

  const handleRefreshShivAliases = async () => {
    if (isRefreshingAliases || isShivLoading) return;
    const routines = Array.isArray(settings?.routines) ? settings.routines : [];
    const routineTasks = routines
      .map((routine: any) => ({
        id: String(routine?.id || ''),
        details: String(routine?.details || '').trim(),
      }))
      .filter((task: { id: string; details: string }) => task.details.length > 0);

    if (routineTasks.length === 0) {
      toast({
        title: 'No routines found',
        description: 'Add routine tasks first, then refresh Shiv synonyms.',
        variant: 'destructive',
      });
      return;
    }

    setIsRefreshingAliases(true);
    setShivError(null);
    try {
      const isDesktopRuntime =
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const existingTaskAliases = mergeTaskAliasMaps(
        getStaticTaskAliasMap(),
        settings?.shivDynamicTaskAliases || {}
      );

      const response = await fetch('/api/ai/shiv-refresh-aliases', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          aiConfig,
          routineTasks,
          existingTaskAliases,
          languageHint: 'english',
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to refresh Shiv synonyms.'));
      }

      const nextAliases =
        result?.taskAliases && typeof result.taskAliases === 'object' ? result.taskAliases : null;
      if (!nextAliases) {
        throw new Error('Invalid synonym response format.');
      }

      setSettings((prev: any) => ({
        ...prev,
        shivDynamicTaskAliases: nextAliases,
        shivAliasRefreshMeta: {
          lastRefreshedAt: String(result?.meta?.refreshedAt || new Date().toISOString()),
          sourceProvider: String(result?.provider || ''),
          sourceModel: String(result?.model || ''),
          version: 1,
        },
      }));

      toast({
        title: 'Shiv synonyms refreshed',
        description: `Updated ${Array.isArray(result?.updatedKeys) ? result.updatedKeys.length : 0} task alias groups.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh Shiv synonyms.';
      setShivError(message);
      toast({
        title: 'Synonym refresh failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsRefreshingAliases(false);
    }
  };

  const stopShivMic = () => {
    recognitionRef.current?.stop();
  };

  const stopMediaSttRecording = () => {
    if (voiceTurnStopTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(voiceTurnStopTimerRef.current);
      voiceTurnStopTimerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const releaseMediaStream = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
  };

  const transcribeAudioBlob = async (audioBlob: Blob): Promise<string> => {
    const sttStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const isDesktopRuntime =
      typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
    const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
    const resolvedLocalSttBaseUrl = String(settings?.localSttBaseUrl || '').trim() || 'http://127.0.0.1:9890';
    const formData = new FormData();
    formData.append('audio', audioBlob, 'speech.webm');
    formData.append('aiConfig', JSON.stringify(aiConfig));
    formData.append('localSttBaseUrl', resolvedLocalSttBaseUrl);

    const response = await fetch('/api/ai/stt', {
      method: 'POST',
      headers: {
        'x-studio-desktop': isDesktopRuntime ? '1' : '0',
      },
      body: formData,
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      const details = String(result?.details || result?.error || 'Speech transcription failed.');
      if (/empty transcript|did not return a transcript/i.test(details)) {
        throw new Error('Speech transcription returned empty text.');
      }
      throw new Error(details);
    }
    const text = String(result?.text || '').trim();
    if (!text) {
      throw new Error('Speech transcription returned empty text.');
    }
    const sttEndedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
    voiceLatencyRef.current.sttMs = Math.max(0, sttEndedAt - sttStartedAt);
    return text;
  };

  const startMediaSttRecording = async () => {
    if (isMediaRecordingStt || isShivLoading) return;
    if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
      const message = 'Audio recording is not supported in this environment.';
      setShivError(message);
      toast({ title: 'Mic not supported', description: message, variant: 'destructive' });
      return;
    }

    try {
      setShivError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const preferredMimeTypes = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'];
      const mimeType = preferredMimeTypes.find((type) => {
        try {
          return MediaRecorder.isTypeSupported(type);
        } catch {
          return false;
        }
      });

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      mediaRecorderRef.current = recorder;
      mediaChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        if (voiceTurnStopTimerRef.current !== null && typeof window !== 'undefined') {
          window.clearTimeout(voiceTurnStopTimerRef.current);
          voiceTurnStopTimerRef.current = null;
        }
        setIsMediaRecordingStt(false);
        releaseMediaStream();
        setShivError('Audio recording failed.');
        toast({
          title: 'Mic error',
          description: 'Audio recording failed.',
          variant: 'destructive',
        });
      };

      recorder.onstop = async () => {
        if (voiceTurnStopTimerRef.current !== null && typeof window !== 'undefined') {
          window.clearTimeout(voiceTurnStopTimerRef.current);
          voiceTurnStopTimerRef.current = null;
        }
        setIsMediaRecordingStt(false);
        releaseMediaStream();
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        mediaChunksRef.current = [];
        if (!blob.size) return;
        try {
          const transcript = await transcribeAudioBlob(blob);
          setShivInput(transcript);
          if (voiceChatModeRef.current && !isShivLoading) {
            await sendShivQuestion(transcript);
          }
        } catch (error) {
          if (isEmptyTranscriptError(error)) {
            setShivError(null);
            if (voiceChatModeRef.current) {
              setTimeout(() => {
                if (voiceChatModeRef.current) {
                  void startMediaSttRecording();
                }
              }, 500);
            }
            return;
          }
          const message = error instanceof Error ? error.message : 'Speech-to-text transcription failed.';
          setShivError(message);
          toast({
            title: 'Mic error',
            description: message,
            variant: 'destructive',
          });
          if (voiceChatModeRef.current) {
            setTimeout(() => {
              if (voiceChatModeRef.current) {
                void startMediaSttRecording();
              }
            }, 900);
          }
        }
      };

      recorder.start();
      setIsMediaRecordingStt(true);
      // In continuous voice chat mode, capture one short turn then auto-stop so STT can run.
      if (voiceChatModeRef.current && typeof window !== 'undefined') {
        voiceTurnStopTimerRef.current = window.setTimeout(() => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        }, 6200);
      }
    } catch (error) {
      releaseMediaStream();
      setIsMediaRecordingStt(false);
      const message = error instanceof Error ? error.message : 'Unable to start mic recording.';
      setShivError(message);
      toast({
        title: 'Mic start failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const startShivMic = () => {
    if (typeof window === 'undefined') return;
    if (isMicListening || isMediaRecordingStt || isShivLoading) return;
    if (speakingMessageKey) {
      stopSpeech();
      return;
    }

    const SpeechRecognitionCtor = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      const message = 'Speech-to-text is not supported in this environment.';
      setShivError(message);
      toast({
        title: 'Mic not supported',
        description: message,
        variant: 'destructive',
      });
      return;
    }

    try {
      setShivError(null);
      const recognition = new SpeechRecognitionCtor();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      micFinalTextRef.current = shivInput.trim() ? `${shivInput.trim()} ` : '';
      micLiveTranscriptRef.current = shivInput.trim();
      recognitionRef.current = recognition;

      recognition.onstart = () => {
        setIsMicListening(true);
      };

      recognition.onresult = (event) => {
        let interim = '';
        let finalChunk = '';

        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const result = event.results[i];
          const transcript = String(result?.[0]?.transcript || '').trim();
          if (!transcript) continue;
          if (result.isFinal) {
            finalChunk += `${transcript} `;
          } else {
            interim += `${transcript} `;
          }
        }

        if (finalChunk) {
          micFinalTextRef.current += finalChunk;
        }
        const nextValue = `${micFinalTextRef.current}${interim}`.trim();
        micLiveTranscriptRef.current = nextValue;
        setShivInput(nextValue);
      };

      recognition.onerror = (event) => {
        setIsMicListening(false);
        recognitionRef.current = null;
        const errorCode = String(event?.error || 'unknown');
        if (errorCode === 'no-speech') return;
        if (errorCode === 'aborted') return;
        if (errorCode === 'network') {
          void startMediaSttRecording();
          return;
        }
        const message = errorCode === 'not-allowed'
          ? 'Microphone permission denied. Please allow mic access.'
          : `Speech-to-text error: ${errorCode}`;
        setShivError(message);
        toast({
          title: 'Mic error',
          description: message,
          variant: 'destructive',
        });
      };

      recognition.onend = () => {
        setIsMicListening(false);
        recognitionRef.current = null;
        const finalTranscript = micLiveTranscriptRef.current.trim();
        micFinalTextRef.current = '';
        micLiveTranscriptRef.current = '';
        if (voiceChatModeRef.current && finalTranscript && !isShivLoading) {
          void sendShivQuestion(finalTranscript);
          return;
        }
        if (voiceChatModeRef.current && !isShivLoading) {
          setTimeout(() => {
            if (voiceChatModeRef.current && !isShivLoading) {
              void startMediaSttRecording();
            }
          }, 500);
        }
      };

      recognition.start();
    } catch (error) {
      void startMediaSttRecording();
      setIsMicListening(false);
      recognitionRef.current = null;
      const message = error instanceof Error ? error.message : 'Unable to start speech-to-text.';
      setShivError(message);
      toast({
        title: 'Mic start failed',
        description: message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleShivMic = () => {
    if (isMicListening) {
      stopShivMic();
      return;
    }
    if (isMediaRecordingStt) {
      stopMediaSttRecording();
      return;
    }
    void startMediaSttRecording();
  };

  const handleToggleVoiceChatMode = () => {
    const next = !isVoiceChatMode;
    setIsVoiceChatMode(next);
    if (next) {
      setShivError(null);
      void startMediaSttRecording();
      toast({
        title: 'Voice chat mode on',
        description: 'Speak to ask. Shiv will reply with voice.',
      });
      return;
    }
    stopShivMic();
    stopMediaSttRecording();
    stopSpeech();
    toast({
      title: 'Voice chat mode off',
      description: 'Switched back to text chat.',
    });
  };

  const renderChatContent = (content: string, role: 'user' | 'assistant') => {
    const text = String(content || '');
    if (!text) return null;
    const parts = text.split(URL_REGEX);
    const embeds: string[] = [];
    const nodes: React.ReactNode[] = [];

    parts.forEach((part, idx) => {
      if (!part) return;
      const isUrl = /^https?:\/\//i.test(part);
      if (!isUrl) {
        nodes.push(
          <span key={`text-${idx}`} className="whitespace-pre-wrap break-words">
            {part}
          </span>
        );
        return;
      }
      const videoId = getYouTubeVideoId(part);
      if (role === 'assistant' && videoId && !embeds.includes(videoId)) {
        embeds.push(videoId);
      }
      nodes.push(
        <a
          key={`url-${idx}`}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-primary underline underline-offset-2"
        >
          {part}
        </a>
      );
    });

    return (
      <div className="space-y-2">
        <div>{nodes}</div>
        {role === 'assistant'
          ? embeds.map((videoId) => (
              <div key={`yt-${videoId}`} className="overflow-hidden rounded-md border border-border/60">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${videoId}`}
                  title={`YouTube video ${videoId}`}
                  className="h-52 w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                />
              </div>
            ))
          : null}
      </div>
    );
  };

  const stopSpeech = () => {
    if (cloudAudioRef.current) {
      try {
        cloudAudioRef.current.pause();
      } catch {
        // ignore
      }
      cloudAudioRef.current = null;
    }
    if (cloudAudioUrlRef.current) {
      try {
        URL.revokeObjectURL(cloudAudioUrlRef.current);
      } catch {
        // ignore
      }
      cloudAudioUrlRef.current = null;
    }
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setSpeakingMessageKey(null);
      setPendingReadMessageKey(null);
      setManualReadMessageKey(null);
      return;
    }
    speechSessionRef.current += 1;
    activeUtteranceRef.current = null;
    window.speechSynthesis.cancel();
    setSpeakingMessageKey(null);
    setPendingReadMessageKey(null);
    setManualReadMessageKey(null);
  };

  const speakShivReply = async (text: string, messageKey: string, onDone?: () => void) => {
    const content = String(text || '').trim();
    if (!content) return;
    const cloudVoice = parseCloudVoiceURI(chatVoiceUri);
    if (cloudVoice?.provider === 'kokoro') {
      try {
        const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
        const kokoroBaseUrl = String(settings?.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim();
        const response = await fetch('/api/ai/tts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
          },
          body: JSON.stringify({
            text: cleanSpeechText(content),
            provider: cloudVoice.provider,
            voice: cloudVoice.id,
            speed: chatVoiceRate,
            kokoroBaseUrl,
            aiConfig,
          }),
        });
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(String(result?.details || result?.error || 'Kokoro TTS failed.'));
        }
        const blob = await response.blob();
        if (cloudAudioUrlRef.current) {
          try { URL.revokeObjectURL(cloudAudioUrlRef.current); } catch {}
        }
        const url = URL.createObjectURL(blob);
        cloudAudioUrlRef.current = url;
        const audio = new Audio(url);
        cloudAudioRef.current = audio;
        setPendingReadMessageKey(messageKey);
        audio.onplaying = () => {
          setPendingReadMessageKey(null);
          setSpeakingMessageKey(messageKey);
        };
        audio.onended = () => {
          setSpeakingMessageKey(null);
          setPendingReadMessageKey(null);
          setManualReadMessageKey(null);
          cloudAudioRef.current = null;
          try { URL.revokeObjectURL(url); } catch {}
          if (cloudAudioUrlRef.current === url) cloudAudioUrlRef.current = null;
          onDone?.();
        };
        audio.onerror = () => {
          setSpeakingMessageKey(null);
          setPendingReadMessageKey(null);
          setManualReadMessageKey(null);
          cloudAudioRef.current = null;
          try { URL.revokeObjectURL(url); } catch {}
          if (cloudAudioUrlRef.current === url) cloudAudioUrlRef.current = null;
          setShivError('Kokoro chat voice playback failed.');
        };
        await audio.play();
        return;
      } catch (error) {
        setPendingReadMessageKey(null);
        setManualReadMessageKey(null);
        setShivError(error instanceof Error ? error.message : 'Kokoro chat voice failed.');
        return;
      }
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      setPendingReadMessageKey(null);
      setManualReadMessageKey(null);
      setShivError('Read out loud is not supported in this environment.');
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content);
    const sessionId = speechSessionRef.current + 1;
    speechSessionRef.current = sessionId;
    activeUtteranceRef.current = utterance;
    utterance.rate = Math.max(0.6, Math.min(1.6, chatVoiceRate));
    const preferredVoice = systemVoices.find((voice) => voice.voiceURI === chatVoiceUri);
    if (preferredVoice) {
      utterance.voice = preferredVoice;
      utterance.lang = preferredVoice.lang;
    }
    utterance.onstart = () => {
      if (speechSessionRef.current === sessionId) {
        setPendingReadMessageKey(null);
        setSpeakingMessageKey(messageKey);
      }
    };
    utterance.onend = () => {
      if (speechSessionRef.current === sessionId) {
        activeUtteranceRef.current = null;
        setSpeakingMessageKey(null);
        setPendingReadMessageKey(null);
        setManualReadMessageKey(null);
        onDone?.();
      }
    };
    utterance.onerror = () => {
      if (speechSessionRef.current === sessionId) {
        activeUtteranceRef.current = null;
        setSpeakingMessageKey(null);
        setPendingReadMessageKey(null);
        setManualReadMessageKey(null);
      }
    };
    setPendingReadMessageKey(messageKey);
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      if (!chatVoiceUri && voices.length > 0) {
        setChatVoiceUri(voices[0].voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [chatVoiceUri]);

  useEffect(() => {
    if (!isDesktopRuntime && isShivOpen) {
      setIsShivOpen(false);
    }
  }, [isDesktopRuntime, isShivOpen]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawVoice = localStorage.getItem(SHIV_VOICE_SETTINGS_KEY);
      if (rawVoice) {
        const parsed = JSON.parse(rawVoice);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.voiceUri === 'string') setChatVoiceUri(parsed.voiceUri);
          if (typeof parsed.rate === 'number') setChatVoiceRate(Math.max(0.6, Math.min(1.6, parsed.rate)));
          if (typeof parsed.autoReadReplies === 'boolean') setAutoReadReplies(parsed.autoReadReplies);
          if (typeof parsed.openChatMode === 'boolean') setOpenChatMode(parsed.openChatMode);
        }
      }
      const rawScopes = localStorage.getItem(SHIV_CONTEXT_SCOPES_KEY);
      if (rawScopes) {
        const parsedScopes = JSON.parse(rawScopes);
        if (parsedScopes && typeof parsedScopes === 'object') {
          setContextScopes({
            ...DEFAULT_SHIV_CONTEXT_SCOPES,
            ...parsedScopes,
          });
        }
      }
    } catch {
      // ignore malformed localStorage
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(
        SHIV_VOICE_SETTINGS_KEY,
        JSON.stringify({ voiceUri: chatVoiceUri, rate: chatVoiceRate, autoReadReplies, openChatMode })
      );
    } catch {
      // ignore storage errors
    }
  }, [chatVoiceUri, chatVoiceRate, autoReadReplies, openChatMode]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(SHIV_CONTEXT_SCOPES_KEY, JSON.stringify(contextScopes));
    } catch {
      // ignore storage errors
    }
  }, [contextScopes]);

  useEffect(() => {
    if (!isShivOpen || typeof window === 'undefined') return;
    void refreshDesktopServerStatus();
    const timer = window.setInterval(() => {
      void refreshDesktopServerStatus();
    }, 7000);
    return () => window.clearInterval(timer);
  }, [isShivOpen, refreshDesktopServerStatus]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop();
      stopMediaSttRecording();
      releaseMediaStream();
      if (cloudAudioRef.current) {
        try { cloudAudioRef.current.pause(); } catch {}
        cloudAudioRef.current = null;
      }
      if (cloudAudioUrlRef.current) {
        try { URL.revokeObjectURL(cloudAudioUrlRef.current); } catch {}
        cloudAudioUrlRef.current = null;
      }
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speechSessionRef.current += 1;
        activeUtteranceRef.current = null;
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  if (isMobile) {
    return null;
  }

  return (
    <>
      <audio ref={audioRef} src="/40 Hz Study Music.mp3" loop />
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur-sm">
        <Button onClick={handleToggleAllWidgets} variant="ghost" size="icon" className="h-10 w-10 rounded-full">
            {settings.allWidgetsVisible ? <Eye className="h-5 w-5" /> : <EyeOff className="h-5 w-5" />}
            <span className="sr-only">Toggle all widgets</span>
        </Button>
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        {isDesktopRuntime ? (
          <Button
            onClick={() => setIsShivOpen(true)}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            title="Ask Shiv"
          >
            <Bot className="h-5 w-5" />
            <span className="sr-only">Ask Shiv</span>
          </Button>
        ) : null}
        {isAudioPlaying && (
          <div className="flex h-5 w-5 items-end justify-between gap-0.5">
            <div className="h-full w-1 origin-bottom animate-audio-wave-1 rounded-full bg-primary"></div>
            <div className="h-full w-1 origin-bottom animate-audio-wave-2 rounded-full bg-primary"></div>
            <div className="h-full w-1 origin-bottom animate-audio-wave-3 rounded-full bg-primary"></div>
          </div>
        )}
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    {getVolumeIcon()}
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-auto p-2">
                <Slider
                    defaultValue={[globalVolume]}
                    max={1}
                    step={0.01}
                    onValueChange={handleVolumeChange}
                    className="w-32"
                />
            </PopoverContent>
        </Popover>
      </div>
      {isDesktopRuntime && isShivOpen && (
        <div className="fixed bottom-20 right-4 z-[70] flex h-[40rem] max-h-[calc(100vh-6rem)] w-[32rem] max-w-[calc(100vw-1rem)] flex-col rounded-xl border bg-background/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Bot className="h-4 w-4" />
              Ask Shiv
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                title="Refresh routine task synonyms"
                onClick={() => void handleRefreshShivAliases()}
                disabled={isRefreshingAliases || isShivLoading}
              >
                {isRefreshingAliases ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              </Button>
              <Button
                variant={isVoiceChatMode ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title={isVoiceChatMode ? "Turn off voice chat mode" : "Turn on voice chat mode"}
                onClick={handleToggleVoiceChatMode}
              >
                <Phone className="h-4 w-4" />
              </Button>
              <Button
                variant={speakingMessageKey ? "secondary" : autoReadReplies ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title={speakingMessageKey ? "Stop reading" : autoReadReplies ? "Turn off auto read replies" : "Turn on auto read replies"}
                onClick={() => {
                  if (speakingMessageKey) {
                    stopSpeech();
                    return;
                  }
                  setAutoReadReplies((prev) => !prev);
                }}
              >
                {speakingMessageKey ? <Square className="h-4 w-4" /> : autoReadReplies ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
              </Button>
              <Button
                variant={openChatMode ? "secondary" : "ghost"}
                size="icon"
                className="h-7 w-7"
                title={openChatMode ? "Open chat mode on (less restrictive)" : "Open chat mode off (curated answers)"}
                onClick={() => setOpenChatMode((prev) => !prev)}
              >
                {openChatMode ? <Unlock className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
              </Button>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-7 w-7" title="Shiv settings">
                    <Settings2 className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="z-[120] w-72 p-3">
                  <div className="space-y-3">
                    <div className="text-xs font-semibold">Shiv Voice (Chat only)</div>
                    <label className="block text-xs text-muted-foreground">Voice</label>
                    <select
                      className="w-full rounded-md border bg-background px-2 py-1 text-sm"
                      value={chatVoiceUri}
                      onChange={(e) => setChatVoiceUri(e.target.value)}
                    >
                      <optgroup label="System voices">
                        {systemVoices.map((voice) => (
                          <option key={voice.voiceURI} value={voice.voiceURI}>
                            {voice.name} ({voice.lang})
                          </option>
                        ))}
                      </optgroup>
                      {kokoroChatVoices.length > 0 ? (
                        <optgroup label="Provider voices">
                          {kokoroChatVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name}
                            </option>
                          ))}
                        </optgroup>
                      ) : null}
                    </select>
                    <label className="block text-xs text-muted-foreground">Speed</label>
                    <Slider
                      value={[chatVoiceRate]}
                      min={0.6}
                      max={1.6}
                      step={0.05}
                      onValueChange={(val) => setChatVoiceRate(val[0] ?? 1)}
                    />
                    <div className="text-xs text-muted-foreground">Current: {chatVoiceRate.toFixed(2)}x</div>
                    <div className="text-[11px] text-muted-foreground">
                      This voice setting is only for Shiv chat and does not change PDF voice.
                    </div>
                    <div className="space-y-1 rounded-md border border-border/60 p-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Kokoro</span>
                        <span className={kokoroServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {kokoroServerStatus.healthy
                            ? `running${kokoroServerStatus.mode ? ` (${kokoroServerStatus.mode})` : ''}`
                            : 'offline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Local STT</span>
                        <span className={sttServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {sttServerStatus.healthy
                            ? `running${sttServerStatus.backend ? ` (${sttServerStatus.backend})` : sttServerStatus.managed ? ' (managed)' : ''}`
                            : 'offline'}
                        </span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 w-full text-xs"
                        onClick={() => void refreshDesktopServerStatus()}
                        disabled={isRefreshingServerStatus}
                      >
                        {isRefreshingServerStatus ? 'Checking...' : 'Refresh server status'}
                      </Button>
                      {sttServerStatus.error ? (
                        <div className="text-[10px] text-destructive">{sttServerStatus.error}</div>
                      ) : null}
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => {
                setIsShivOpen(false);
                if (voiceChatModeRef.current) {
                  setIsVoiceChatMode(false);
                  stopShivMic();
                  stopMediaSttRecording();
                  stopSpeech();
                }
              }}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-3 py-2">
            <div className="space-y-2">
              {shivMessages.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Ask anything about your app data, schedule, widgets, routines, goals, or logs.
                </p>
              )}
              {shivMessages.map((msg, idx) => {
                const messageKey = `${msg.role}-${idx}-${(msg.content || '').slice(0, 24)}`;
                return (
                  <div key={`${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={
                        msg.role === 'user'
                          ? 'max-w-[88%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm'
                          : 'max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm'
                      }
                    >
                      <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                        {msg.role === 'user' ? 'You' : 'Shiv'}
                      </div>
                      <div className="break-words">{renderChatContent(msg.content, msg.role)}</div>
                      {msg.role === 'assistant' && !autoReadReplies && (
                        <div className="mt-2">
                          {pendingReadMessageKey === messageKey && manualReadMessageKey === messageKey ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs" disabled>
                              Reading...
                            </Button>
                          ) : speakingMessageKey === messageKey && manualReadMessageKey === messageKey ? (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={stopSpeech}>
                              Stop reading
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => {
                                setManualReadMessageKey(messageKey);
                                void speakShivReply(msg.content, messageKey);
                              }}
                              disabled={Boolean(speakingMessageKey) || Boolean(pendingReadMessageKey)}
                            >
                              <Volume2 className="mr-1 h-3 w-3" />
                              Read out loud
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {isShivLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm text-muted-foreground">
                    Shiv is thinking...
                  </div>
                </div>
              )}
              {shivError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                  {shivError}
                </div>
              )}
            </div>
          </ScrollArea>
          <div className="border-t p-2">
            <div className="flex items-end gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9" title="Context scopes">
                    <Filter className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="top" align="start" className="z-[120] w-64 p-3">
                  <div className="space-y-2">
                    <div className="text-xs font-semibold">Shiv Context Scopes</div>
                    {(Object.keys(DEFAULT_SHIV_CONTEXT_SCOPES) as ShivContextScopeKey[]).map((key) => (
                      <label key={key} className="flex items-center justify-between gap-2 text-xs">
                        <span>
                          {key === 'todayTasks' ? 'Today tasks' :
                           key === 'mindsetTasks' ? 'External/Mismatch tasks' :
                           key === 'botherings' ? 'Botherings' :
                           key === 'skills' ? 'Skills and logs' :
                           key === 'health' ? 'Health' :
                           key.charAt(0).toUpperCase() + key.slice(1)}
                        </span>
                        <input
                          type="checkbox"
                          checked={Boolean(contextScopes[key])}
                          onChange={(e) =>
                            setContextScopes((prev) => ({ ...prev, [key]: e.target.checked }))
                          }
                        />
                      </label>
                    ))}
                    <div className="text-[11px] text-muted-foreground">
                      Enabled scopes are sent to Shiv for richer answers.
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <Textarea
                value={shivInput}
                onChange={(e) => setShivInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void handleAskShiv();
                  }
                }}
                placeholder="Ask Shiv about your app data..."
                disabled={isShivLoading}
                rows={2}
                className="max-h-32 min-h-[2.25rem] resize-none overflow-y-auto"
              />
              <Button
                variant={isMicListening || isMediaRecordingStt ? 'secondary' : 'outline'}
                size="icon"
                className="h-9 w-9"
                title={isMicListening || isMediaRecordingStt ? 'Stop speech-to-text' : 'Start speech-to-text'}
                onClick={handleToggleShivMic}
                disabled={isShivLoading || Boolean(speakingMessageKey)}
              >
                {isMicListening || isMediaRecordingStt ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
              </Button>
              <Button onClick={() => void handleAskShiv()} disabled={isShivLoading || !shivInput.trim()}>
                Ask
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
