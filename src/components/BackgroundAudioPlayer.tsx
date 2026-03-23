
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from './ui/button';
import { Play, Pause, Volume1, Volume2, VolumeX, Eye, EyeOff, Bot, X, Check, Settings2, Filter, RefreshCw, Loader2, Mic, MicOff, Phone, Lock, Unlock, Square, Save, Library, Target, Plus } from 'lucide-react';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { ScrollArea } from './ui/scroll-area';
import { Textarea } from './ui/textarea';
import { getAiConfigFromSettings } from '@/lib/ai/config';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { getStaticTaskAliasMap, mergeTaskAliasMaps } from '@/lib/shiv/taskAliases';
import { cleanSpeechText, getKokoroLocalVoices, parseCloudVoiceURI } from '@/lib/tts';
import { getPdfForResource } from '@/lib/audioDB';
import {
  ASTRA_MINDSET_PATHS,
  advanceMindsetSession,
  appendMindsetMessages,
  applyMindsetAnswerToSession,
  buildAstraMindsetPrompts,
  buildMindsetIntroMessage,
  createEmptyMindsetSession,
  formatMindsetCompletionMessage,
  getCurrentMindsetPrompt,
  syncMindsetSessionCursor,
} from '@/lib/astraMindset';
import {
  appendJournalMessages,
  applyJournalAnswerToSession,
  advanceJournalSession,
  buildAstraJournalPrompts,
  buildJournalContextSnapshot,
  createEmptyDailyJournalSession,
  getCurrentJournalPrompt,
  getLinkedStopperIdsForTask,
  syncJournalSessionCursor,
} from '@/lib/astraJournal';
import type { Resource, ResourceFolder } from '@/types/workout';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';

type ShivChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  resourceId?: string;
  resourceName?: string;
};

type ResourceAstraContext = {
  resourceId: string;
  resourceName: string;
};

type AstraCreateMode = 'habit' | 'mechanism';

type AstraGapDraft = {
  userIssue: string;
  externalState: string;
  bothering: string;
  gap: string;
  coreNeed: string;
  actionType: string;
  expectedOutcome: string;
  dynamicReply: string;
  confidence: number | null;
  alternativeState: string;
  alternativeGap: string;
  status: 'diagnosed' | 'needs_issue';
  followUpPrompt: string;
};

type HabitDraft = {
  name: string;
  state: string;
  triggerAction: string;
  negativeResponseText: string;
  positiveResponseText: string;
  summary: string;
};

type MechanismDraft = {
  name: string;
  mechanismFramework: 'positive' | 'negative';
  triggerAction: string;
  mechanismText: string;
  benefit: string;
  reward: string;
  conditionVisualize: string;
  conditionAction: string;
  lawPremise: string;
  lawOutcome: string;
  emotionOrImage: string;
  summary: string;
};

type ShivPanelMode = 'chat' | 'guide' | 'anything' | 'journal' | 'mindset' | 'create-habit' | 'create-mechanism' | 'detect-gap';
const ASTRA_PANEL_MODE_OPTIONS: Array<{ value: ShivPanelMode; label: string; description: string }> = [
  { value: 'chat', label: 'Chat', description: 'Ask about your app data and system context' },
  { value: 'anything', label: 'Ask', description: 'Ask anything directly' },
  { value: 'create-habit', label: 'Habit', description: 'Describe a habit and Astra will draft a habit card' },
  { value: 'create-mechanism', label: 'Mechanism', description: 'Describe a mechanism and Astra will draft a mechanism card' },
  { value: 'detect-gap', label: 'Gap', description: 'Analyze an issue using external state, gap, core need, action, and outcome' },
  { value: 'mindset', label: 'Mindset', description: 'Focus on botherings, mismatches, resistance, and mindset patterns' },
  { value: 'journal', label: 'Journal', description: 'Review your day one question at a time' },
  { value: 'guide', label: 'Guide', description: 'Guide and creator flow' },
];
const isShivPanelMode = (value: unknown): value is ShivPanelMode =>
  ASTRA_PANEL_MODE_OPTIONS.some((option) => option.value === value);
type GuideLearningPlanType = 'audio' | 'book' | 'path';
type GuideBotheringType = 'external' | 'mismatch' | 'constraint';
type GuideLearningPath = {
  id: string;
  type: GuideLearningPlanType;
  title: string;
  subtitle: string;
  targetDate: string;
  requiredHours: string;
  totalPages: string;
  requiredMoney: string;
  targetMicroSkills: string;
  linkedPdfResourceId: string;
};

type ShivGuideDraft = {
  botheringType: GuideBotheringType;
  botheringText: string;
  domainMode: 'existing' | 'new';
  domainId: string;
  domainName: string;
  specializationMode: 'existing' | 'new';
  specializationId: string;
  specializationName: string;
  linkPdfToSpecialization: boolean;
  specializationPdfId: string;
  generateSkillTree: boolean;
  learningPaths: GuideLearningPath[];
  createProjectPlan: boolean;
  projectDomainId: string;
  projectSpecializationId: string;
  projectName: string;
  projectEndDate: string;
  openKanbanAfterCreate: boolean;
  routineActivityType: 'essentials' | 'upskill' | 'deepwork' | 'workout';
  routineSpecializationId: string;
  routineDetails: string;
  routineSlot: string;
  routineRecurrence: 'daily' | 'weekly' | 'custom';
  routineRepeatInterval: string;
  routineRepeatUnit: 'day' | 'week' | 'month';
  linkRoutineToBothering: boolean;
};

type GuideBotheringReview = {
  status: 'idle' | 'valid' | 'needs_rephrase' | 'invalid';
  botheringClassification: 'end' | 'means' | 'unclear';
  classification: 'bothering' | 'desire' | 'urge' | 'goal' | 'ought' | 'unclear';
  meansVsEnd: 'means' | 'end' | 'mixed' | 'unclear';
  botheringType: GuideBotheringType | 'unclear';
  solutionMethod: 'interaction' | 'learning' | 'resource' | 'unclear';
  recommendedMethods: string[];
  rootProblem: string;
  resolutionStrategy: string;
  reason: string;
  options: string[];
  suggestions: string[];
  clarifyingQuestions: string[];
  bestOption: string;
  nextQuestion: string;
};

type GuideStep =
  | 'bothering_text'
  | 'bothering_pick_option'
  | 'bothering_type'
  | 'domain'
  | 'specialization'
  | 'spec_pdf'
  | 'spec_pdf_pick'
  | 'generate_skill_tree'
  | 'learning_type'
  | 'learning_title'
  | 'learning_subtitle'
  | 'learning_target_date'
  | 'learning_pages'
  | 'learning_hours'
  | 'learning_money'
  | 'learning_target_micro'
  | 'learning_link_pdf'
  | 'learning_pick_pdf'
  | 'learning_add_more'
  | 'project_enabled'
  | 'project_domain'
  | 'project_specialization'
  | 'project_name'
  | 'project_end_date'
  | 'project_open_kanban'
  | 'routine_enabled'
  | 'routine_activity_type'
  | 'routine_specialization'
  | 'routine_details'
  | 'routine_slot'
  | 'routine_recurrence'
  | 'routine_repeat_interval'
  | 'routine_repeat_unit'
  | 'routine_link'
  | 'confirm';

type GoalTrayTaskStatus = 'completed' | 'due' | 'upcoming';

const GOAL_TRAY_SLOT_ORDER = ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'];
const GOAL_TRAY_SLOT_START_HOURS: Record<string, number> = {
  'Late Night': 0,
  Dawn: 5,
  Morning: 8,
  Afternoon: 13,
  Evening: 18,
  Night: 21,
};

const stripScheduledInstanceSuffix = (value?: string) => (value || '').replace(/_\d{4}-\d{2}-\d{2}$/, '');
const normalizeGoalTrayText = (value?: string) =>
  String(value || '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ');
const parseGoalTrayDate = (value?: string | null) => {
  if (!value) return null;
  const normalized = value.length === 10 ? `${value}T00:00:00` : value;
  const parsed = new Date(normalized);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};
const diffGoalTrayDays = (left: Date, right: Date) => {
  const ms = left.getTime() - right.getTime();
  return Math.floor(ms / (24 * 60 * 60 * 1000));
};
const diffGoalTrayMonths = (left: Date, right: Date) => {
  const years = left.getFullYear() - right.getFullYear();
  const months = left.getMonth() - right.getMonth();
  return years * 12 + months;
};
const isGoalTrayRoutineDueOnDate = (routine: any, date: Date) => {
  const rule = routine?.routine;
  if (!rule) return false;
  const base = parseGoalTrayDate(routine?.baseDate || routine?.createdAt);
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
      const months = diffGoalTrayMonths(date, base);
      return months >= 0 && months % interval === 0;
    }
    const days = diffGoalTrayDays(date, base);
    if (unit === 'week') return days >= 0 && days % (interval * 7) === 0;
    return days >= 0 && days % interval === 0;
  }
  return false;
};
const getGoalTrayLoggedMinutes = (activity: any) => {
  if (!activity || !activity.completed) return 0;
  if (activity.focusSessionInitialStartTime && activity.focusSessionEndTime) {
    const totalSessionMs = activity.focusSessionEndTime - activity.focusSessionInitialStartTime;
    const pauseDurationsMs = (activity.focusSessionPauses || [])
      .filter((pause: any) => pause.resumeTime)
      .reduce((sum: number, pause: any) => sum + (pause.resumeTime - pause.pauseTime), 0);
    return Math.max(0, Math.round((totalSessionMs - pauseDurationsMs) / 60000));
  }
  if (typeof activity.duration === 'number' && activity.duration > 0) return Math.max(0, activity.duration);
  if (typeof activity.focusSessionInitialDuration === 'number' && activity.focusSessionInitialDuration > 0) {
    return Math.max(0, activity.focusSessionInitialDuration);
  }
  return 0;
};
const formatGoalTrayLoggedDuration = (minutes: number) => {
  if (!Number.isFinite(minutes) || minutes <= 0) return '';
  const roundedMinutes = Math.max(1, Math.round(minutes));
  if (roundedMinutes < 60) return `${roundedMinutes}m logged`;
  const hours = Math.floor(roundedMinutes / 60);
  const remainderMinutes = roundedMinutes % 60;
  if (remainderMinutes === 0) return `${hours}h logged`;
  return `${hours}h ${remainderMinutes}m logged`;
};
const formatGoalTrayDateLabel = (dateKey?: string, pattern = 'MMM d') => {
  if (!dateKey) return '';
  const date = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(date.getTime())) return dateKey;
  return format(date, pattern);
};

const getDefaultXttsSpeakerPath = (voiceName?: string) => {
  const normalizedVoice = String(voiceName || 'my_voice')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_')
    .replace(/[^a-z0-9_-]+/g, '')
    || 'my_voice';
  return `/app/voices/xtts-${normalizedVoice}-sample.wav`;
};

const getNextStepAfterBotheringType = (botheringType: GuideBotheringType): GuideStep =>
  botheringType === 'external' ? 'routine_enabled' : 'domain';

const downmixSpeechToMono = (buffer: AudioBuffer) => {
  if (buffer.numberOfChannels === 1) return buffer.getChannelData(0);
  const mono = new Float32Array(buffer.length);
  for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
    const input = buffer.getChannelData(channel);
    for (let index = 0; index < buffer.length; index += 1) {
      mono[index] += input[index] / buffer.numberOfChannels;
    }
  }
  return mono;
};

const resampleSpeechChannel = (samples: Float32Array, sourceRate: number, targetRate: number) => {
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

const trimSpeechSilence = (samples: Float32Array, sampleRate: number) => {
  const threshold = 0.012;
  const padding = Math.max(0, Math.round(sampleRate * 0.12));
  let start = 0;
  while (start < samples.length && Math.abs(samples[start]) < threshold) {
    start += 1;
  }
  let end = samples.length - 1;
  while (end > start && Math.abs(samples[end]) < threshold) {
    end -= 1;
  }
  if (start >= end) return samples;
  const safeStart = Math.max(0, start - padding);
  const safeEnd = Math.min(samples.length, end + padding + 1);
  return samples.slice(safeStart, safeEnd);
};

const encodeSpeechWav = (samples: Float32Array, sampleRate: number) => {
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

const preprocessSpeechBlob = async (blob: Blob) => {
  if (typeof window === 'undefined') return blob;
  const AudioContextCtor =
    window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextCtor) return blob;
  const audioContext = new AudioContextCtor();
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const decoded = await audioContext.decodeAudioData(arrayBuffer.slice(0));
    const mono = downmixSpeechToMono(decoded);
    const resampled = resampleSpeechChannel(mono, decoded.sampleRate, 16000);
    const trimmed = trimSpeechSilence(resampled, 16000);
    return encodeSpeechWav(trimmed, 16000);
  } finally {
    void audioContext.close().catch(() => undefined);
  }
};

type GuideSessionState = {
  started: boolean;
  step: GuideStep;
  activeLearningPathId: string | null;
};

type GuideChoiceOption = {
  label: string;
  value: string;
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
  return /empty transcript|returned empty text|did not return a transcript|mostly no-speech|low-confidence transcript|filler-only transcript|unstable transcript/i.test(message);
};

type ShivVoiceLatency = {
  question: string;
  mode: "open" | "curated";
  sttMs: number;
  llmMs: number;
  ttsMs: number;
};

const URL_REGEX = /(https?:\/\/[^\s]+)/gi;

const splitCloudTtsText = (text: string, maxChars: number, firstChunkMaxChars = maxChars) => {
  const normalized = String(text || "").replace(/\s+/g, " ").trim();
  if (!normalized) return [];
  if (normalized.length <= firstChunkMaxChars) return [normalized];

  const sentences = normalized.match(/[^.!?]+[.!?]?/g)?.map((part) => part.trim()).filter(Boolean) || [normalized];
  const chunks: string[] = [];
  let current = "";
  let currentLimit = Math.max(40, firstChunkMaxChars);

  for (const sentence of sentences) {
    if (!sentence) continue;
    if (!current) {
      current = sentence;
      continue;
    }
    if (`${current} ${sentence}`.length <= currentLimit) {
      current = `${current} ${sentence}`;
      continue;
    }
    chunks.push(current);
    currentLimit = maxChars;
    if (sentence.length <= maxChars) {
      current = sentence;
      continue;
    }
    for (let index = 0; index < sentence.length; index += maxChars) {
      const slice = sentence.slice(index, index + maxChars).trim();
      if (slice) chunks.push(slice);
    }
    current = "";
  }

  if (current) chunks.push(current);
  return chunks;
};

if (typeof window !== 'undefined' && (pdfjs as any).GlobalWorkerOptions) {
  (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${(pdfjs as any).version}/build/pdf.worker.min.mjs`;
}

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
const DEFAULT_XTTS_BASE_URL = 'http://127.0.0.1:8020';
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

const SHIV_GUIDE_STATES = [
  { id: 'reality', label: 'Reality', note: 'Name what is actually unresolved.' },
  { id: 'bothering', label: 'Bothering', note: 'Capture the mismatch without distortion.' },
  { id: 'domain', label: 'Domain', note: 'Place the problem in the right domain.' },
  { id: 'specialization', label: 'Specialization', note: 'Choose the skill track that can solve it.' },
  { id: 'learning', label: 'Learning Plan', note: 'Pick one of the three learning plan types.' },
  { id: 'routine', label: 'Routine', note: 'Create repeated action so the system moves.' },
  { id: 'link', label: 'Link', note: 'Connect the routine back to the bothering.' },
] as const;

const createGuideLearningPath = (type: GuideLearningPlanType = 'path'): GuideLearningPath => ({
  id: `guide_lp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  type,
  title: '',
  subtitle: '',
  targetDate: '',
  requiredHours: '',
  totalPages: '',
  requiredMoney: '',
  targetMicroSkills: '',
  linkedPdfResourceId: '',
});

const createInitialGuideDraft = (): ShivGuideDraft => ({
  botheringType: 'constraint',
  botheringText: '',
  domainMode: 'existing',
  domainId: '',
  domainName: '',
  specializationMode: 'existing',
  specializationId: '',
  specializationName: '',
  linkPdfToSpecialization: false,
  specializationPdfId: '',
  generateSkillTree: false,
  learningPaths: [createGuideLearningPath('path')],
  createProjectPlan: false,
  projectDomainId: '',
  projectSpecializationId: '',
  projectName: '',
  projectEndDate: '',
  openKanbanAfterCreate: true,
  routineActivityType: 'essentials',
  routineSpecializationId: '',
  routineDetails: '',
  routineSlot: 'Morning',
  routineRecurrence: 'daily',
  routineRepeatInterval: '1',
  routineRepeatUnit: 'day',
  linkRoutineToBothering: true,
});

const extractLinesFromPageItems = (items: any[]) => {
  const rows = items
    .map((item) => ({
      text: String(item?.str || '').replace(/\s+/g, ' ').trim(),
      x: Number(item?.transform?.[4] || 0),
      y: Number(item?.transform?.[5] || 0),
    }))
    .filter((item) => item.text.length > 0)
    .sort((a, b) => Math.abs(b.y - a.y) < 2 ? a.x - b.x : b.y - a.y);

  const lines: string[] = [];
  let currentY: number | null = null;
  let currentLine: string[] = [];
  for (const row of rows) {
    if (currentY === null || Math.abs(row.y - currentY) <= 2) {
      currentLine.push(row.text);
      currentY = currentY ?? row.y;
      continue;
    }
    lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
    currentLine = [row.text];
    currentY = row.y;
  }
  if (currentLine.length) {
    lines.push(currentLine.join(' ').replace(/\s+/g, ' ').trim());
  }
  return lines.filter((line) => line.length > 0);
};

const pickIndexLikeLines = (lines: string[]) => {
  const candidates = lines.filter((line) => {
    const clean = line.trim();
    if (clean.length < 4 || clean.length > 180) return false;
    return /^(\d+(\.\d+)*|chapter|part|section|appendix)\b/i.test(clean);
  });
  return candidates.length > 20 ? candidates.slice(0, 240) : lines.slice(0, 240);
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
  /*
    const seen = new Set<string>();
    return [...todayMindsetLinked, ...upcomingMindsetLinked]
      .filter((task: any) => task?.taskId && !task?.completedToday)
      .filter((task: any) => {
        const key = String(task.taskId || '').trim();
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 40)
      .map((task: any) => {
        const source = String(task?.source || '').trim();
        const sourceLabel = source ? `${source.charAt(0).toUpperCase()}${source.slice(1)}` : 'Mindset';
        const relative = String(task?.nextInRelative || '').trim();
        const slot = String(task?.slotName || '').trim();
        return {
          id: String(task.taskId),
          label: String(task.details || 'Untitled task'),
          description: [sourceLabel, String(task.pointText || '').trim(), slot || null, relative || null]
            .filter(Boolean)
            .join(' • '),
        };
      });
  }, [todayMindsetLinked, upcomingMindsetLinked]);
  const mindsetPathBotheringOptions = useMemo(() => {
    return [...botheringsWithFlags]
      .filter((bothering: any) => !bothering?.completed)
      .sort((left: any, right: any) => {
        const leftRank = (left?.hasCurrentSlotLinkedTask ? 4 : 0) + (left?.hasTodayLinkedTask ? 2 : 0) + Math.min(1, Number(left?.linkedTaskCount || 0));
        const rightRank = (right?.hasCurrentSlotLinkedTask ? 4 : 0) + (right?.hasTodayLinkedTask ? 2 : 0) + Math.min(1, Number(right?.linkedTaskCount || 0));
        return rightRank - leftRank;
      })
      .slice(0, 40)
      .map((bothering: any) => {
        const source = String(bothering?.source || '').trim();
        const sourceLabel = source ? `${source.charAt(0).toUpperCase()}${source.slice(1)}` : 'Mindset';
        const taskCount = Number(bothering?.linkedTaskCount || 0);
        const urgencyLabel = bothering?.hasCurrentSlotLinkedTask
          ? 'linked this slot'
          : bothering?.hasTodayLinkedTask
            ? 'linked today'
            : null;
        return {
          id: String(bothering.id || ''),
          label: String(bothering.text || 'Untitled bothering'),
          description: [sourceLabel, taskCount ? `${taskCount} linked task${taskCount === 1 ? '' : 's'}` : null, urgencyLabel]
            .filter(Boolean)
            .join(' • '),
        };
      });
  }, [botheringsWithFlags]);

  */
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

  const journalSnapshot = buildJournalContextSnapshot(Array.isArray(auth?.journalSessions) ? auth.journalSessions : []);
  if ((journalSnapshot.recentSessions || []).length > 0 || (journalSnapshot.patterns || []).length > 0) {
    snapshot.journal = journalSnapshot;
  }

  snapshot.contextScopes = scopes;
  return snapshot;
};

export function BackgroundAudioPlayer() {
  const router = useRouter();
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
  const cloudPlaybackSessionRef = useRef(0);
  const speechSessionRef = useRef(0);
  const isMobile = useIsMobile();
  const [isShivOpen, setIsShivOpen] = useState(false);
  const [isGoalTasksOpen, setIsGoalTasksOpen] = useState(false);
  const [activeGoalContributionId, setActiveGoalContributionId] = useState<string | null>(null);
  const [isClientMounted, setIsClientMounted] = useState(false);
  const [shivInput, setShivInput] = useState('');
  const [shivMessages, setShivMessages] = useState<ShivChatMessage[]>([]);
  const [isShivLoading, setIsShivLoading] = useState(false);
  const [shivError, setShivError] = useState<string | null>(null);
  const [speakingMessageKey, setSpeakingMessageKey] = useState<string | null>(null);
  const [pendingReadMessageKey, setPendingReadMessageKey] = useState<string | null>(null);
  const [manualReadMessageKey, setManualReadMessageKey] = useState<string | null>(null);
  const [systemVoices, setSystemVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [chatSystemVoiceUri, setChatSystemVoiceUri] = useState('');
  const [chatKokoroVoiceUri, setChatKokoroVoiceUri] = useState('');
  const [chatVoiceRate, setChatVoiceRate] = useState(1);
  const [autoReadReplies, setAutoReadReplies] = useState(false);
  const [openChatMode, setOpenChatMode] = useState(false);
  const [shivDefaultMode, setShivDefaultMode] = useState<ShivPanelMode>('anything');
  const [shivPanelMode, setShivPanelMode] = useState<ShivPanelMode>('anything');
  const [resourceAstraContext, setResourceAstraContext] = useState<ResourceAstraContext | null>(null);
  const [contextScopes, setContextScopes] = useState<ShivContextScopes>(DEFAULT_SHIV_CONTEXT_SCOPES);
  const [journalAwaitingStopperPromptId, setJournalAwaitingStopperPromptId] = useState<string | null>(null);
  const [mindsetSessionViewId, setMindsetSessionViewId] = useState<string | null>(null);
  const [mindsetPickerQuery, setMindsetPickerQuery] = useState('');
  const [mindsetBodySelection, setMindsetBodySelection] = useState<string[]>([]);
  const [guideDraft, setGuideDraft] = useState<ShivGuideDraft>(createInitialGuideDraft);
  const [guideMessages, setGuideMessages] = useState<ShivChatMessage[]>([]);
  const [guidePickerQuery, setGuidePickerQuery] = useState('');
  const [guideBotheringReview, setGuideBotheringReview] = useState<GuideBotheringReview>({
    status: 'idle',
    botheringClassification: 'unclear',
    classification: 'unclear',
    meansVsEnd: 'unclear',
    botheringType: 'unclear',
    solutionMethod: 'unclear',
    recommendedMethods: [],
    rootProblem: '',
    resolutionStrategy: '',
    reason: '',
    options: [],
    suggestions: [],
    clarifyingQuestions: [],
    bestOption: '',
    nextQuestion: '',
  });
  const [guideSession, setGuideSession] = useState<GuideSessionState>({
    started: false,
    step: 'bothering_text',
    activeLearningPathId: null,
  });
  const [isGuideSaving, setIsGuideSaving] = useState(false);
  const [isGuideGeneratingTree, setIsGuideGeneratingTree] = useState(false);
  const [isGuideValidatingBothering, setIsGuideValidatingBothering] = useState(false);
  const [isRefreshingAliases, setIsRefreshingAliases] = useState(false);
  const [isMicListening, setIsMicListening] = useState(false);
  const [isVoiceChatMode, setIsVoiceChatMode] = useState(false);
  const [isMediaRecordingStt, setIsMediaRecordingStt] = useState(false);
  const [isManualMicSession, setIsManualMicSession] = useState(false);
  const [voiceActivityLevel, setVoiceActivityLevel] = useState(0);
  const [isRefreshingServerStatus, setIsRefreshingServerStatus] = useState(false);
  const [kokoroServerStatus, setKokoroServerStatus] = useState<{ healthy: boolean; mode?: string | null }>({
    healthy: false,
    mode: null,
  });
  const [xttsServerStatus, setXttsServerStatus] = useState<{ healthy: boolean; managed?: boolean; backend?: string; mode?: string | null; error?: string; warming?: boolean; warmingProgress?: number; details?: string[] }>({
    healthy: false,
    managed: false,
    backend: '',
    mode: null,
    error: '',
    warming: false,
    warmingProgress: 0,
    details: [],
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
  const voiceTurnMaxTimerRef = useRef<number | null>(null);
  const voiceMonitorIntervalRef = useRef<number | null>(null);
  const mediaAudioContextRef = useRef<AudioContext | null>(null);
  const mediaAnalyserRef = useRef<AnalyserNode | null>(null);
  const mediaSourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const isAssistantSpeakingRef = useRef<boolean>(false);
  const voiceAutoRestartTimerRef = useRef<number | null>(null);
  const lastVoiceListenStartedAtRef = useRef<number>(0);
  const lastVoiceListenStoppedAtRef = useRef<number>(0);
  const discardManualTranscriptRef = useRef<boolean>(false);
  const lastAutoReadGuideMessageKeyRef = useRef<string | null>(null);
  const lastAutoReadJournalMessageKeyRef = useRef<string | null>(null);
  const lastAutoReadMindsetMessageKeyRef = useRef<string | null>(null);
  const micFinalTextRef = useRef<string>('');
  const micLiveTranscriptRef = useRef<string>('');
  const guideTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const chatTextareaRef = useRef<HTMLTextAreaElement | null>(null);
  const voiceChatModeRef = useRef<boolean>(false);
  const voiceLatencyRef = useRef<ShivVoiceLatency>({
    question: '',
    mode: 'curated',
    sttMs: 0,
    llmMs: 0,
    ttsMs: 0,
  });
  const guideSaveActionRef = useRef<null | (() => void)>(null);
  const skillDomains = Array.isArray(auth?.skillDomains) ? auth.skillDomains : [];
  const specializations = Array.isArray(auth?.specializations) ? auth.specializations : [];
  const openGoalContributionComposer = useCallback((goalId: string) => {
    setActiveGoalContributionId(goalId);
  }, []);
  const closeGoalContributionComposer = useCallback((goalId: string) => {
    setActiveGoalContributionId((current) => current === goalId ? null : current);
  }, []);
  const handleAssignScheduledTaskToGoal = useCallback((goalId: string, goalTitle: string, activityId: string) => {
    const todayKey = format(new Date(), 'yyyy-MM-dd');
    let assignedTaskTitle = '';
    let reassignedFromGoalId = '';
    let updated = false;

    auth?.setSchedule?.((prev: Record<string, any>) => {
      const daySchedule = prev?.[todayKey];
      if (!daySchedule || typeof daySchedule !== 'object') return prev;

      const nextDaySchedule = { ...daySchedule };
      for (const slotName of GOAL_TRAY_SLOT_ORDER) {
        const activities = Array.isArray(nextDaySchedule[slotName]) ? nextDaySchedule[slotName] : [];
        const activityIndex = activities.findIndex((activity: any) => String(activity?.id || '') === activityId);
        if (activityIndex === -1) continue;

        const nextActivities = [...activities];
        const currentActivity = nextActivities[activityIndex];
        assignedTaskTitle = String(currentActivity?.details || 'Untitled task').trim() || 'Untitled task';
        reassignedFromGoalId = String(currentActivity?.contributedGoalId || '');
        nextActivities[activityIndex] = {
          ...currentActivity,
          contributedGoalId: goalId,
        };
        nextDaySchedule[slotName] = nextActivities;
        updated = true;
        break;
      }

      if (!updated) return prev;
      return {
        ...prev,
        [todayKey]: nextDaySchedule,
      };
    });

    if (!updated) {
      toast({
        title: 'Task not found',
        description: 'That scheduled task could not be assigned to this goal.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Task added to goal',
      description: reassignedFromGoalId && reassignedFromGoalId !== goalId
        ? `${assignedTaskTitle} now contributes to ${goalTitle} for today.`
        : `${assignedTaskTitle} now contributes to ${goalTitle} for today.`,
    });
    closeGoalContributionComposer(goalId);
  }, [auth, closeGoalContributionComposer, toast]);
  const todayGoalPopupData = useMemo(() => {
    const now = new Date();
    const todayKey = format(now, 'yyyy-MM-dd');
    const todayDate = parseGoalTrayDate(todayKey) || now;
    const goals = Array.isArray(auth?.goals) ? auth.goals : [];
    const activeGoals = goals.filter((goal: any) => {
      const status = String(goal?.status || '').trim().toLowerCase();
      return status !== 'completed' && status !== 'archived';
    });
    const routines = Array.isArray(settings?.routines) ? settings.routines : [];
    const skipByDate = settings?.routineSkipByDate || {};
    const routineById = new Map(
      routines
        .map((routine: any) => {
          const normalizedId = stripScheduledInstanceSuffix(String(routine?.id || ''));
          return normalizedId ? [normalizedId, routine] : null;
        })
        .filter(Boolean) as Array<[string, any]>
    );
    const schedule = auth?.schedule && typeof auth.schedule === 'object' ? auth.schedule : {};
    const todaySchedule = schedule?.[todayKey] && typeof schedule[todayKey] === 'object' ? schedule[todayKey] : {};
    const nowHour = now.getHours() + now.getMinutes() / 60;

    const scheduledActivities = GOAL_TRAY_SLOT_ORDER.flatMap((slotName) => {
      const slotActivities = Array.isArray(todaySchedule?.[slotName]) ? todaySchedule[slotName] : [];
      return slotActivities.map((activity: any) => ({ slotName, activity }));
    });

    const entries = activeGoals.map((goal: any) => {
      const linkedTaskIds = Array.from(
        (Array.isArray(goal?.linkedTaskIds) ? goal.linkedTaskIds : [])
          .map((taskId: unknown) => stripScheduledInstanceSuffix(String(taskId || '')))
          .filter(Boolean)
      );
      const linkedRoutineDetails = new Set(
        linkedTaskIds.map((taskId) => normalizeGoalTrayText(routineById.get(taskId)?.details)).filter(Boolean)
      );

      const tasks = linkedTaskIds.flatMap((linkedTaskId) => {
        const linkedRoutine = routineById.get(linkedTaskId);
        const linkedRoutineDetailsKey = normalizeGoalTrayText(linkedRoutine?.details);
        const matchedScheduledTasks = scheduledActivities.flatMap(({ slotName, activity }: { slotName: string; activity: any }) => {
          const normalizedIds = new Set(
            [
              stripScheduledInstanceSuffix(String(activity?.id || '')),
              ...((Array.isArray(activity?.taskIds) ? activity.taskIds : []).map((taskId: unknown) =>
                stripScheduledInstanceSuffix(String(taskId || ''))
              )),
            ].filter(Boolean)
          );
          const activityDetailsKey = normalizeGoalTrayText(activity?.details);
          const matchesById = normalizedIds.has(linkedTaskId);
          const matchesByDetails = Boolean(linkedRoutineDetailsKey) && activityDetailsKey === linkedRoutineDetailsKey;
          if (!matchesById && !matchesByDetails) return [];

          const slotStart = GOAL_TRAY_SLOT_START_HOURS[slotName] ?? 0;
          const status: GoalTrayTaskStatus = activity?.completed ? 'completed' : nowHour >= slotStart ? 'due' : 'upcoming';
          const loggedMinutes = getGoalTrayLoggedMinutes(activity);
          const loggedDurationLabel = formatGoalTrayLoggedDuration(loggedMinutes);

          return [{
            id: `${goal.id}:${slotName}:${activity?.id || linkedTaskId}`,
            linkedTaskId,
            title: String(activity?.details || linkedRoutine?.details || 'Untitled task').trim() || 'Untitled task',
            slotName,
            status,
            completed: Boolean(activity?.completed),
            loggedMinutes,
            loggedDurationLabel,
          }];
        });

        if (matchedScheduledTasks.length > 0) return matchedScheduledTasks;

        const skippedToday = (skipByDate[todayKey] || []).includes(linkedTaskId);
        const dueToday = Boolean(linkedRoutine && !skippedToday && isGoalTrayRoutineDueOnDate(linkedRoutine, todayDate));
        if (!linkedRoutine || !dueToday) return [];

        const fallbackSlotName = String(linkedRoutine.slot || '').trim() || 'Unscheduled';
        const fallbackStatus: GoalTrayTaskStatus = (GOAL_TRAY_SLOT_START_HOURS[fallbackSlotName] ?? 24) <= nowHour ? 'due' : 'upcoming';
        return [{
          id: `${goal.id}:routine:${linkedTaskId}`,
          linkedTaskId,
          title: String(linkedRoutine.details || 'Untitled task').trim() || 'Untitled task',
          slotName: fallbackSlotName,
          status: fallbackStatus,
          completed: false,
          loggedMinutes: 0,
          loggedDurationLabel: '',
        }];
      });

      const contributionTasks = scheduledActivities.flatMap(({ slotName, activity }: { slotName: string; activity: any }) => {
        if (String(activity?.contributedGoalId || '') !== String(goal?.id || '')) return [];
        const slotStart = GOAL_TRAY_SLOT_START_HOURS[slotName] ?? 0;
        const status: GoalTrayTaskStatus = activity?.completed ? 'completed' : nowHour >= slotStart ? 'due' : 'upcoming';
        const loggedMinutes = getGoalTrayLoggedMinutes(activity);
        const loggedDurationLabel = formatGoalTrayLoggedDuration(loggedMinutes);

        return [{
          id: `${goal.id}:${slotName}:${activity?.id || 'contribution'}`,
          linkedTaskId: '',
          title: String(activity?.details || 'Untitled task').trim() || 'Untitled task',
          slotName,
          status,
          completed: Boolean(activity?.completed),
          loggedMinutes,
          loggedDurationLabel,
          source: 'contribution' as const,
        }];
      });

      const dedupedTasks = [...tasks, ...contributionTasks].filter(
        (task, index, collection) => collection.findIndex((entry) => entry.id === task.id) === index
      );

      return {
        id: String(goal?.id || ''),
        title: String(goal?.title || 'Untitled goal').trim() || 'Untitled goal',
        priority: String(goal?.priority || 'medium'),
        dueDate: typeof goal?.dueDate === 'string' ? goal.dueDate : '',
        tasks: dedupedTasks,
      };
    });

    const allTasks = entries.flatMap((entry) => entry.tasks);
    const totalLoggedMinutes = allTasks.reduce((sum, task) => sum + Number(task.loggedMinutes || 0), 0);
    const completedTaskCount = allTasks.filter((task) => task.completed).length;
    const pendingTaskCount = allTasks.length - completedTaskCount;

    const weightLogs = Array.isArray(auth?.weightLogs) ? [...auth.weightLogs] : [];
    weightLogs.sort((left: any, right: any) => String(left?.date || '').localeCompare(String(right?.date || '')));
    const latestWeightLog = weightLogs.length > 0 ? weightLogs[weightLogs.length - 1] : null;
    const currentWeight = typeof latestWeightLog?.weight === 'number' ? latestWeightLog.weight : null;
    const goalWeight = typeof auth?.goalWeight === 'number' ? auth.goalWeight : null;
    const weightDifference = currentWeight !== null && goalWeight !== null
      ? parseFloat((goalWeight - currentWeight).toFixed(1))
      : null;

    return {
      todayKey,
      entries,
      scheduledNonRoutineTasks: scheduledActivities
        .filter(({ activity }: { activity: any }) => {
          const normalizedActivityId = stripScheduledInstanceSuffix(String(activity?.id || ''));
          const normalizedTaskIds = (Array.isArray(activity?.taskIds) ? activity.taskIds : [])
            .map((taskId: unknown) => stripScheduledInstanceSuffix(String(taskId || '')))
            .filter(Boolean);
          const isRoutineTask = Boolean(activity?.isRoutine || activity?.routine) ||
            routineById.has(normalizedActivityId) ||
            normalizedTaskIds.some((taskId: string) => routineById.has(taskId));
          return !isRoutineTask;
        })
        .map(({ slotName, activity }: { slotName: string; activity: any }) => ({
          id: String(activity?.id || ''),
          title: String(activity?.details || 'Untitled task').trim() || 'Untitled task',
          slotName,
          completed: Boolean(activity?.completed),
          contributedGoalId: String(activity?.contributedGoalId || ''),
        })),
      activeGoalCount: entries.length,
      goalsWithScheduledTasks: entries.filter((entry) => entry.tasks.length > 0).length,
      scheduledTaskCount: entries.reduce((sum, entry) => sum + entry.tasks.length, 0),
      totalLoggedMinutes,
      completedTaskCount,
      pendingTaskCount,
      currentWeight,
      goalWeight,
      weightDifference,
    };
  }, [auth?.goalWeight, auth?.goals, auth?.schedule, auth?.weightLogs, settings?.routines]);
  const pdfResources = useMemo(
    () => (Array.isArray(auth?.resources) ? auth.resources : []).filter((resource: any) => resource?.type === 'pdf'),
    [auth?.resources]
  );
  const mindsetPathTaskOptions = useMemo(() => {
    const cards = Array.isArray(auth?.mindsetCards) ? auth.mindsetCards : [];
    const sourceMap: Record<string, string> = {
      mindset_botherings_external: 'External',
      mindset_botherings_mismatch: 'Mismatch',
      mindset_botherings_constraint: 'Constraint',
    };
    const seen = new Set<string>();
    return cards
      .filter((card: any) => sourceMap[String(card?.id || '')])
      .flatMap((card: any) =>
        (Array.isArray(card?.points) ? card.points : []).flatMap((point: any) =>
          (Array.isArray(point?.tasks) ? point.tasks : []).map((task: any) => ({
            taskId: String(task?.id || ''),
            details: String(task?.details || '').trim(),
            slotName: String(task?.slotName || '').trim(),
            dateKey: String(task?.dateKey || task?.startDate || '').trim(),
            pointText: String(point?.text || '').trim(),
            sourceLabel: sourceMap[String(card?.id || '')],
          }))
        )
      )
      .filter((task: any) => {
        if (!task.taskId || !task.details || seen.has(task.taskId)) return false;
        seen.add(task.taskId);
        return true;
      })
      .slice(0, 40)
      .map((task: any) => ({
        id: task.taskId,
        label: task.details,
        description: [task.sourceLabel, task.pointText, task.slotName || null, task.dateKey || null]
          .filter(Boolean)
          .join(' | '),
      }));
  }, [auth?.mindsetCards]);
  const mindsetPathBotheringOptions = useMemo(() => {
    const cards = Array.isArray(auth?.mindsetCards) ? auth.mindsetCards : [];
    const sourceMap: Record<string, string> = {
      mindset_botherings_external: 'External',
      mindset_botherings_mismatch: 'Mismatch',
      mindset_botherings_constraint: 'Constraint',
    };
    return cards
      .filter((card: any) => sourceMap[String(card?.id || '')])
      .flatMap((card: any) =>
        (Array.isArray(card?.points) ? card.points : []).map((point: any) => ({
          id: String(point?.id || ''),
          text: String(point?.text || '').trim(),
          completed: Boolean(point?.completed),
          linkedTaskCount: Array.isArray(point?.tasks) ? point.tasks.length : 0,
          sourceLabel: sourceMap[String(card?.id || '')],
        }))
      )
      .filter((point: any) => point.id && point.text && !point.completed)
      .slice(0, 40)
      .map((point: any) => ({
        id: point.id,
        label: point.text,
        description: [point.sourceLabel, point.linkedTaskCount ? `${point.linkedTaskCount} linked task${point.linkedTaskCount === 1 ? '' : 's'}` : null]
          .filter(Boolean)
          .join(' | '),
      }));
  }, [auth?.mindsetCards]);

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
  const effectiveChatVoiceUri = useMemo(() => {
    if (
      kokoroServerStatus.healthy &&
      chatKokoroVoiceUri &&
      kokoroChatVoices.some((voice) => voice.voiceURI === chatKokoroVoiceUri)
    ) {
      return chatKokoroVoiceUri;
    }
    return chatSystemVoiceUri;
  }, [chatKokoroVoiceUri, chatSystemVoiceUri, kokoroChatVoices, kokoroServerStatus.healthy]);

  useEffect(() => {
    setIsClientMounted(true);
  }, []);

  useEffect(() => {
    if (!isGoalTasksOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsGoalTasksOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isGoalTasksOpen]);

  useEffect(() => {
    voiceChatModeRef.current = isVoiceChatMode;
  }, [isVoiceChatMode]);

  const selectedGuideDomainId =
    guideDraft.domainMode === 'existing' ? guideDraft.domainId : '';
  const availableGuideSpecializations = useMemo(() => {
    if (!selectedGuideDomainId) return specializations;
    return specializations.filter((spec: any) => spec.domainId === selectedGuideDomainId);
  }, [selectedGuideDomainId, specializations]);
  const selectedProjectDomainId =
    guideDraft.createProjectPlan
      ? (guideDraft.projectDomainId || selectedGuideDomainId)
      : selectedGuideDomainId;
  const availableProjectSpecializations = useMemo(() => {
    if (!selectedProjectDomainId) return specializations;
    return specializations.filter((spec: any) => spec.domainId === selectedProjectDomainId);
  }, [selectedProjectDomainId, specializations]);
  const selectedExistingGuideSpecialization = useMemo(
    () =>
      guideDraft.specializationMode === 'existing'
        ? availableGuideSpecializations.find((spec: any) => spec.id === guideDraft.specializationId) || null
        : null,
    [availableGuideSpecializations, guideDraft.specializationId, guideDraft.specializationMode]
  );

  useEffect(() => {
    if (guideDraft.domainMode !== 'existing') return;
    if (!guideDraft.domainId) return;
    if (availableGuideSpecializations.some((spec: any) => spec.id === guideDraft.specializationId)) return;
    setGuideDraft((prev) => ({ ...prev, specializationId: '', specializationMode: 'existing' }));
  }, [availableGuideSpecializations, guideDraft.domainId, guideDraft.domainMode, guideDraft.specializationId]);

  useEffect(() => {
    if (!selectedExistingGuideSpecialization) return;
    setGuideDraft((prev) => {
      if (prev.specializationMode !== 'existing' || prev.specializationId !== selectedExistingGuideSpecialization.id) {
        return prev;
      }
      const linkedPdfId = String(selectedExistingGuideSpecialization.linkedPdfResourceId || '');
      if (prev.specializationPdfId === linkedPdfId) return prev;
      return {
        ...prev,
        specializationPdfId: linkedPdfId,
        linkPdfToSpecialization: linkedPdfId.length > 0 ? true : prev.linkPdfToSpecialization,
      };
    });
  }, [selectedExistingGuideSpecialization]);

  const activeGuideState = useMemo(() => {
    if (!guideDraft.botheringText.trim()) return 'reality';
    if ((guideDraft.domainMode === 'existing' && !guideDraft.domainId) || (guideDraft.domainMode === 'new' && !guideDraft.domainName.trim())) {
      return 'domain';
    }
    if (
      (guideDraft.specializationMode === 'existing' && !guideDraft.specializationId) ||
      (guideDraft.specializationMode === 'new' && !guideDraft.specializationName.trim())
    ) {
      return 'specialization';
    }
    if (!guideDraft.learningPaths.some((path) => path.title.trim())) return 'learning';
    if (guideDraft.routineDetails.trim() && !guideDraft.linkRoutineToBothering) return 'link';
    if (!guideDraft.routineDetails.trim()) return 'routine';
    return 'link';
  }, [guideDraft]);
  const selectedShivModeMeta = useMemo(
    () => ASTRA_PANEL_MODE_OPTIONS.find((option) => option.value === shivPanelMode) || ASTRA_PANEL_MODE_OPTIONS[1],
    [shivPanelMode]
  );

  const updateGuideDraft = useCallback((updates: Partial<ShivGuideDraft>) => {
    setGuideDraft((prev) => ({ ...prev, ...updates }));
  }, []);

  const resizeTextareaToContent = useCallback((element: HTMLTextAreaElement | null) => {
    if (!element) return;
    element.style.height = '0px';
    const nextHeight = Math.min(element.scrollHeight, 192);
    element.style.height = `${Math.max(nextHeight, 40)}px`;
  }, []);

  const updateGuideLearningPath = useCallback((pathId: string, updates: Partial<GuideLearningPath>) => {
    setGuideDraft((prev) => ({
      ...prev,
      learningPaths: prev.learningPaths.map((path) => (path.id === pathId ? { ...path, ...updates } : path)),
    }));
  }, []);

  const addGuideLearningPath = useCallback((type: GuideLearningPlanType = 'path') => {
    setGuideDraft((prev) => ({
      ...prev,
      learningPaths: [...prev.learningPaths, createGuideLearningPath(type)],
    }));
  }, []);

  const removeGuideLearningPath = useCallback((pathId: string) => {
    setGuideDraft((prev) => {
      const next = prev.learningPaths.filter((path) => path.id !== pathId);
      return {
        ...prev,
        learningPaths: next.length ? next : [createGuideLearningPath('path')],
      };
    });
  }, []);

  const resetGuideDraft = useCallback(() => {
    setGuideDraft(createInitialGuideDraft());
    setGuideMessages([]);
    setGuideBotheringReview({
      status: 'idle',
      botheringClassification: 'unclear',
      classification: 'unclear',
      meansVsEnd: 'unclear',
      botheringType: 'unclear',
      solutionMethod: 'unclear',
      recommendedMethods: [],
      rootProblem: '',
      resolutionStrategy: '',
      reason: '',
      options: [],
      suggestions: [],
      clarifyingQuestions: [],
      bestOption: '',
      nextQuestion: '',
    });
    setGuideSession({
      started: false,
      step: 'bothering_text',
      activeLearningPathId: null,
    });
  }, []);

  const normalizeGuideText = useCallback((value?: string | null) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' '), []);
  const parseYesNo = useCallback((value: string) => {
    const text = normalizeGuideText(value);
    if (/^(yes|y|haan|ha|sure|ok|okay|link|create|add|continue)\b/.test(text)) return true;
    if (/^(no|n|nah|skip|dont|don't|not now)\b/.test(text)) return false;
    return null;
  }, [normalizeGuideText]);
  const findBestNamedMatch = useCallback((query: string, items: Array<{ id: string; name: string }>) => {
    const normalizedQuery = normalizeGuideText(query);
    if (!normalizedQuery) return null;
    const exact = items.find((item) => normalizeGuideText(item.name) === normalizedQuery);
    if (exact) return exact;
    const includes = items.find((item) => {
      const name = normalizeGuideText(item.name);
      return name.includes(normalizedQuery) || normalizedQuery.includes(name);
    });
    return includes || null;
  }, [normalizeGuideText]);

  const pushGuideAssistant = useCallback((content: string) => {
    setGuideMessages((prev) => [...prev, { role: 'assistant', content }].slice(-24));
  }, []);

  const askGuideQuestion = useCallback((step: GuideStep, draft: ShivGuideDraft, activeLearningPathId?: string | null) => {
    const activePath = draft.learningPaths.find((path) => path.id === activeLearningPathId) || draft.learningPaths[0];
    switch (step) {
      case 'bothering_text':
        pushGuideAssistant('Start from reality. What is the bothering you want to solve?');
        break;
      case 'bothering_type':
        pushGuideAssistant('What kind of bothering is it: `external`, `mismatch`, or `constraint`?');
        break;
      case 'bothering_pick_option':
        pushGuideAssistant('I rewrote the bothering into grounded ego-less options. Pick the one that fits best, keep the original, or retry.');
        break;
      case 'domain':
        pushGuideAssistant(`Which domain should this go into? You can name an existing one or type a new one. Existing: ${skillDomains.slice(0, 8).map((d: any) => d.name).join(', ') || 'none yet'}.`);
        break;
      case 'specialization': {
        const baseDomainId = draft.domainMode === 'existing' ? draft.domainId : '';
        const options = (baseDomainId ? specializations.filter((spec: any) => spec.domainId === baseDomainId) : specializations).slice(0, 8);
        pushGuideAssistant(`Which specialization should handle this? Type an existing one or a new name. Existing matches: ${options.map((item: any) => item.name).join(', ') || 'none yet'}.`);
        break;
      }
      case 'spec_pdf':
        pushGuideAssistant('Do you want to link a PDF to this specialization? Reply `yes` or `no`.');
        break;
      case 'spec_pdf_pick':
        pushGuideAssistant(`Which PDF should I link to the specialization? Available PDFs: ${pdfResources.slice(0, 10).map((r: any) => r.name).join(', ') || 'none found'}.`);
        break;
      case 'generate_skill_tree':
        pushGuideAssistant('Should I generate a skill tree from that linked PDF? Reply `yes` or `no`.');
        break;
      case 'learning_type':
        pushGuideAssistant('Add a learning path. What type is it: `audio/video`, `book`, or `path`?');
        break;
      case 'learning_title':
        pushGuideAssistant(`What is the title for this ${activePath?.type || 'learning'} learning path?`);
        break;
      case 'learning_subtitle':
        pushGuideAssistant(activePath?.type === 'book' ? 'Who is the author? You can also reply `skip`.' : activePath?.type === 'audio' ? 'Who is the tutor or creator? You can also reply `skip`.' : 'Any short note for this path? You can also reply `skip`.');
        break;
      case 'learning_target_date':
        pushGuideAssistant('What is the target date? Reply in `YYYY-MM-DD` format, or `skip`.');
        break;
      case 'learning_pages':
        pushGuideAssistant('How many pages does this book learning path have? Reply with a number, or `skip`.');
        break;
      case 'learning_hours':
        pushGuideAssistant('How many hours are required? Reply with a number, or `skip`.');
        break;
      case 'learning_money':
        pushGuideAssistant('How much money is required? Reply with a number, or `skip`.');
        break;
      case 'learning_target_micro':
        pushGuideAssistant('How many target micro-skills should this path cover? Reply with a number, or `skip`.');
        break;
      case 'learning_link_pdf':
        pushGuideAssistant(activePath?.type === 'book' ? 'Do you want to link a PDF to this book learning path? Reply `yes` or `no`.' : 'Do you want to link a PDF to this skill path? Reply `yes` or `no`.');
        break;
      case 'learning_pick_pdf':
        pushGuideAssistant(`Which PDF should I link to this learning path? Available PDFs: ${pdfResources.slice(0, 10).map((r: any) => r.name).join(', ') || 'none found'}.`);
        break;
      case 'learning_add_more':
        pushGuideAssistant('Do you want to add another learning path? Reply `yes` or `no`.');
        break;
      case 'project_enabled':
        pushGuideAssistant('Do you also want to create a project plan for this? Reply `yes` or `no`.');
        break;
      case 'project_domain':
        pushGuideAssistant(`Which domain should the project use? Existing: ${skillDomains.slice(0, 8).map((d: any) => d.name).join(', ') || 'none yet'}.`);
        break;
      case 'project_specialization': {
        const options = availableProjectSpecializations.slice(0, 8);
        pushGuideAssistant(`Which specialization should the project link to? Options: ${options.map((item: any) => item.name).join(', ') || 'none yet'}.`);
        break;
      }
      case 'project_name':
        pushGuideAssistant('What is the project name?');
        break;
      case 'project_end_date':
        pushGuideAssistant('What is the project end date? Reply in `YYYY-MM-DD` format.');
        break;
      case 'project_open_kanban':
        pushGuideAssistant('After I create it, should I open the kanban board for that project? Reply `yes` or `no`.');
        break;
      case 'routine_enabled':
        pushGuideAssistant(
          draft.botheringType === 'external'
            ? 'Do you want me to create an action for this bothering? Reply `yes` or `no`.'
            : 'Do you want me to create a routine task for this specialization? Reply `yes` or `no`.'
        );
        break;
      case 'routine_activity_type':
        pushGuideAssistant('Which activity should this action use: `essentials`, `upskill`, `deepwork`, or `workout`?');
        break;
      case 'routine_specialization':
        pushGuideAssistant(`Which specialization should this ${draft.routineActivityType} action link to? Options: ${specializations.slice(0, 10).map((item: any) => item.name).join(', ') || 'none yet'}.`);
        break;
      case 'routine_details':
        pushGuideAssistant(
          draft.botheringType === 'external'
            ? draft.routineActivityType === 'essentials'
              ? 'What is the name of the essential activity?'
              : draft.routineActivityType === 'workout'
                ? 'What workout activity should I create?'
                : 'What action should I create for this bothering?'
            : 'What should the routine task be called?'
        );
        break;
      case 'routine_slot':
        pushGuideAssistant('Which slot should it use: `Late Night`, `Dawn`, `Morning`, `Afternoon`, `Evening`, or `Night`?');
        break;
      case 'routine_recurrence':
        pushGuideAssistant('Should the routine repeat `daily`, `weekly`, or `custom`?');
        break;
      case 'routine_repeat_interval':
        pushGuideAssistant('What repeat interval should the custom routine use? Reply with a number.');
        break;
      case 'routine_repeat_unit':
        pushGuideAssistant('What repeat unit should the custom routine use: `day`, `week`, or `month`?');
        break;
      case 'routine_link':
        pushGuideAssistant('Should I link this routine back to the bothering? Reply `yes` or `no`.');
        break;
      case 'confirm':
        pushGuideAssistant('I have enough to create the flow. Reply `create` to save it, or `reset` to start over.');
        break;
      default:
        break;
    }
  }, [availableProjectSpecializations, pdfResources, pushGuideAssistant, skillDomains, specializations]);

  const validateGuideBothering = useCallback(async (text: string) => {
    const isDesktopRuntime =
      typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
    const response = await fetch('/api/ai/bothering-validate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
      },
      body: JSON.stringify({
        text,
        aiConfig: getAiConfigFromSettings(settings, isDesktopRuntime),
      }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(String(result?.details || result?.error || 'Failed to validate bothering.'));
    }
    return {
      status: result?.status === 'valid' || result?.status === 'needs_rephrase' || result?.status === 'invalid' ? result.status : 'invalid',
      botheringClassification:
        result?.botheringClassification === 'end' ||
        result?.botheringClassification === 'means'
          ? result.botheringClassification
          : 'unclear',
      classification:
        result?.classification === 'bothering' ||
        result?.classification === 'desire' ||
        result?.classification === 'urge' ||
        result?.classification === 'goal' ||
        result?.classification === 'ought' ||
        result?.classification === 'unclear'
          ? result.classification
          : 'unclear',
      meansVsEnd:
        result?.meansVsEnd === 'means' ||
        result?.meansVsEnd === 'end' ||
        result?.meansVsEnd === 'mixed' ||
        result?.meansVsEnd === 'unclear'
          ? result.meansVsEnd
          : 'unclear',
      botheringType:
        result?.botheringType === 'external' ||
        result?.botheringType === 'mismatch' ||
        result?.botheringType === 'constraint'
          ? result.botheringType
          : 'unclear',
      solutionMethod:
        result?.solutionMethod === 'interaction' ||
        result?.solutionMethod === 'learning' ||
        result?.solutionMethod === 'resource'
          ? result.solutionMethod
          : 'unclear',
      recommendedMethods: Array.isArray(result?.recommendedMethods)
        ? result.recommendedMethods.map((item: unknown) => String(item || '').trim()).filter(Boolean)
        : [],
      rootProblem: String(result?.rootProblem || '').trim(),
      resolutionStrategy: String(result?.resolutionStrategy || '').trim(),
      reason: String(result?.reason || '').trim(),
      options: Array.isArray(result?.options) ? result.options.map((item: unknown) => String(item || '').trim()).filter(Boolean) : [],
      suggestions: Array.isArray(result?.suggestions) ? result.suggestions.map((item: unknown) => String(item || '').trim()).filter(Boolean) : [],
      clarifyingQuestions: Array.isArray(result?.clarifyingQuestions) ? result.clarifyingQuestions.map((item: unknown) => String(item || '').trim()).filter(Boolean) : [],
      bestOption: String(result?.bestOption || '').trim(),
      nextQuestion: String(result?.nextQuestion || '').trim(),
    } as GuideBotheringReview;
  }, [settings]);

  useEffect(() => {
    if (shivPanelMode !== 'guide' || guideSession.started) return;
    setGuideSession((prev) => ({ ...prev, started: true, step: 'bothering_text', activeLearningPathId: null }));
    pushGuideAssistant('Guide mode is interactive now. I will ask one question at a time and build the full flow for you.');
    askGuideQuestion('bothering_text', guideDraft, null);
  }, [askGuideQuestion, guideDraft, guideSession.started, pushGuideAssistant, shivPanelMode]);

  useEffect(() => {
    const activeTextarea = shivPanelMode === 'guide' ? guideTextareaRef.current : chatTextareaRef.current;
    resizeTextareaToContent(activeTextarea);
  }, [resizeTextareaToContent, shivInput, shivPanelMode]);

  const handleGuideReply = useCallback((rawReply: string) => {
    const reply = String(rawReply || '').trim();
    if (!reply || isGuideSaving || isGuideGeneratingTree) return;
    if (normalizeGuideText(reply) === 'reset') {
      resetGuideDraft();
      setGuideSession({ started: true, step: 'bothering_text', activeLearningPathId: null });
      pushGuideAssistant('Guide reset. Let us start again.');
      askGuideQuestion('bothering_text', createInitialGuideDraft(), null);
      setShivInput('');
      return;
    }

    setGuideMessages((prev) => [...prev, { role: 'user', content: reply }].slice(-24));
    setShivInput('');
    setShivError(null);

    const currentStep = guideSession.step;
    const activeLearningPathId = guideSession.activeLearningPathId || guideDraft.learningPaths[0]?.id || null;
    const activePath = guideDraft.learningPaths.find((path) => path.id === activeLearningPathId) || guideDraft.learningPaths[0];
    const goto = (nextStep: GuideStep, nextDraft: ShivGuideDraft, nextActiveLearningPathId: string | null = activeLearningPathId) => {
      if (nextStep !== 'bothering_pick_option') {
        setGuideBotheringReview((prev) => ({ ...prev, options: [] }));
      }
      setGuideSession({ started: true, step: nextStep, activeLearningPathId: nextActiveLearningPathId });
      askGuideQuestion(nextStep, nextDraft, nextActiveLearningPathId);
    };

    if (currentStep === 'bothering_text') {
      const nextDraft = { ...guideDraft, botheringText: reply };
      setGuideDraft(nextDraft);
      setIsGuideValidatingBothering(true);
      void (async () => {
        try {
          const review = await validateGuideBothering(reply);
          setGuideBotheringReview(review);
          if (review.status === 'invalid') {
            const sections = [
              review.reason || 'This does not look like a grounded bothering.',
            ];
            if (review.meansVsEnd === 'means') {
              sections.push('This looks like a means, not the end-level bothering.');
            }
            if (review.suggestions.length) {
              sections.push(`Suggestions:\n${review.suggestions.map((item) => `- ${item}`).join('\n')}`);
            }
            if (review.clarifyingQuestions.length) {
              sections.push(`Clarifying questions:\n${review.clarifyingQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}`);
            }
            pushGuideAssistant(sections.join('\n\n'));
            setGuideSession({ started: true, step: 'bothering_text', activeLearningPathId: null });
            if (review.nextQuestion) {
              pushGuideAssistant(review.nextQuestion);
            } else {
              askGuideQuestion('bothering_text', nextDraft, null);
            }
            return;
          }

          const preferred = Array.from(
            new Set(
              [review.bestOption, ...review.options, reply]
                .map((item) => String(item || '').trim())
                .filter(Boolean)
            )
          ).slice(0, 5);
          setGuideBotheringReview((prev) => ({ ...prev, options: preferred }));
          setGuideSession({ started: true, step: 'bothering_pick_option', activeLearningPathId: null });
          askGuideQuestion('bothering_pick_option', nextDraft, null);
        } catch (error) {
          pushGuideAssistant(error instanceof Error ? error.message : 'Bothering validation failed. You can try again.');
          setGuideSession({ started: true, step: 'bothering_text', activeLearningPathId: null });
        } finally {
          setIsGuideValidatingBothering(false);
        }
      })();
      return;
    }
    if (currentStep === 'bothering_pick_option') {
      if (normalizeGuideText(reply) === 'retry') {
        setGuideBotheringReview((prev) => ({ ...prev, options: [] }));
        setGuideSession({ started: true, step: 'bothering_text', activeLearningPathId: null });
        askGuideQuestion('bothering_text', guideDraft, null);
        return;
      }
      const nextDraft = { ...guideDraft, botheringText: reply };
      setGuideDraft(nextDraft);
      goto('bothering_type', nextDraft);
      return;
    }
    if (currentStep === 'bothering_type') {
      if (normalizeGuideText(reply) === 'detect') {
        if (!guideDraft.botheringText.trim()) {
          pushGuideAssistant('I need the bothering text first before I can detect its type.');
          return;
        }
        setIsGuideValidatingBothering(true);
        void (async () => {
          try {
            const review = await validateGuideBothering(guideDraft.botheringText);
            setGuideBotheringReview((prev) => ({ ...prev, ...review, options: prev.options }));
            if (review.botheringType === 'unclear') {
              pushGuideAssistant(`I could not detect the type confidently yet. ${review.reason || 'Pick External, Mismatch, or Constraint manually.'}`);
              return;
            }
            const nextDraft = { ...guideDraft, botheringType: review.botheringType };
            setGuideDraft(nextDraft);
            const methodText =
              review.solutionMethod !== 'unclear'
                ? ` The right method is \`${review.solutionMethod}\`.`
                : '';
            const recommendationText = review.recommendedMethods.length
              ? ` Try: ${review.recommendedMethods.join(' | ')}.`
              : '';
            pushGuideAssistant(`Detected \`${review.botheringType}\`${review.reason ? ` because ${review.reason}` : '.'}${methodText}${recommendationText}`);
            goto(getNextStepAfterBotheringType(review.botheringType), nextDraft);
          } catch (error) {
            pushGuideAssistant(error instanceof Error ? error.message : 'Type detection failed. Pick the bothering type manually.');
          } finally {
            setIsGuideValidatingBothering(false);
          }
        })();
        return;
      }
      const text = normalizeGuideText(reply);
      const botheringType: GuideBotheringType =
        text.includes('external') ? 'external' : text.includes('mismatch') ? 'mismatch' : 'constraint';
      const nextDraft = { ...guideDraft, botheringType };
      setGuideDraft(nextDraft);
      goto(getNextStepAfterBotheringType(botheringType), nextDraft);
      return;
    }
    if (currentStep === 'domain') {
      const match = findBestNamedMatch(reply, skillDomains.map((domain: any) => ({ id: domain.id, name: domain.name })));
      const nextDraft = match
        ? { ...guideDraft, domainMode: 'existing' as const, domainId: match.id, domainName: '' }
        : { ...guideDraft, domainMode: 'new' as const, domainName: reply, domainId: '' };
      setGuideDraft(nextDraft);
      goto('specialization', nextDraft);
      return;
    }
    if (currentStep === 'specialization') {
      const match = findBestNamedMatch(reply, availableGuideSpecializations.map((spec: any) => ({ id: spec.id, name: spec.name })));
      const nextDraft = match
        ? { ...guideDraft, specializationMode: 'existing' as const, specializationId: match.id, specializationName: '' }
        : { ...guideDraft, specializationMode: 'new' as const, specializationName: reply, specializationId: '' };
      setGuideDraft(nextDraft);
      goto('spec_pdf', nextDraft);
      return;
    }
    if (currentStep === 'spec_pdf') {
      const yesNo = parseYesNo(reply);
      const nextDraft = { ...guideDraft, linkPdfToSpecialization: yesNo === true };
      if (yesNo === true) {
        setGuideDraft(nextDraft);
        goto('spec_pdf_pick', nextDraft);
        return;
      }
      if (yesNo === false) {
        nextDraft.specializationPdfId = '';
        nextDraft.generateSkillTree = false;
        setGuideDraft(nextDraft);
        const firstPathId = nextDraft.learningPaths[0]?.id || createGuideLearningPath('path').id;
        goto('learning_type', nextDraft, firstPathId);
        return;
      }
    }
    if (currentStep === 'spec_pdf_pick') {
      const match = findBestNamedMatch(reply, pdfResources.map((resource: any) => ({ id: resource.id, name: resource.name })));
      if (!match) {
        pushGuideAssistant('I could not match that PDF. Try again with the PDF name.');
        return;
      }
      const nextDraft = { ...guideDraft, specializationPdfId: match.id };
      setGuideDraft(nextDraft);
      goto('generate_skill_tree', nextDraft);
      return;
    }
    if (currentStep === 'generate_skill_tree') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      const nextDraft = { ...guideDraft, generateSkillTree: yesNo };
      setGuideDraft(nextDraft);
      goto('learning_type', nextDraft, nextDraft.learningPaths[0]?.id || null);
      return;
    }
    if (currentStep === 'learning_type') {
      const text = normalizeGuideText(reply);
      const type: GuideLearningPlanType =
        text.includes('audio') || text.includes('video') ? 'audio' : text.includes('book') ? 'book' : 'path';
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, type } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_title', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_title') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, title: reply } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_subtitle', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_subtitle') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, subtitle: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_target_date', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_target_date') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, targetDate: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      if (activePath?.type === 'book') {
        goto('learning_link_pdf', nextDraft, activeLearningPathId);
        return;
      }
      goto('learning_hours', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_pages') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, totalPages: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_money', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_hours') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, requiredHours: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_money', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_money') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, requiredMoney: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      if (activePath?.type === 'path') {
        goto('learning_target_micro', nextDraft, activeLearningPathId);
        return;
      }
      if (activePath?.type === 'book') {
        goto('learning_link_pdf', nextDraft, activeLearningPathId);
        return;
      }
      goto('learning_add_more', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_target_micro') {
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, targetMicroSkills: /^skip$/i.test(reply) ? '' : reply } : path),
      };
      setGuideDraft(nextDraft);
      goto('learning_link_pdf', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_link_pdf') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      if (yesNo) {
        goto('learning_pick_pdf', guideDraft, activeLearningPathId);
        return;
      }
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, linkedPdfResourceId: '' } : path),
      };
      setGuideDraft(nextDraft);
      goto(activePath?.type === 'book' ? 'learning_pages' : 'learning_add_more', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_pick_pdf') {
      const match = findBestNamedMatch(reply, pdfResources.map((resource: any) => ({ id: resource.id, name: resource.name })));
      if (!match) {
        pushGuideAssistant('I could not match that PDF. Try again with the PDF name.');
        return;
      }
      const nextDraft = {
        ...guideDraft,
        learningPaths: guideDraft.learningPaths.map((path) => path.id === activeLearningPathId ? { ...path, linkedPdfResourceId: match.id } : path),
      };
      setGuideDraft(nextDraft);
      goto(activePath?.type === 'book' ? 'learning_pages' : 'learning_add_more', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'learning_add_more') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      if (yesNo) {
        const newPath = createGuideLearningPath('path');
        const nextDraft = { ...guideDraft, learningPaths: [...guideDraft.learningPaths, newPath] };
        setGuideDraft(nextDraft);
        goto('learning_type', nextDraft, newPath.id);
        return;
      }
      goto('project_enabled', guideDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_enabled') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      const nextDraft = {
        ...guideDraft,
        createProjectPlan: yesNo,
        projectDomainId: yesNo ? (guideDraft.projectDomainId || guideDraft.domainId) : '',
        projectSpecializationId: yesNo ? (guideDraft.projectSpecializationId || guideDraft.specializationId) : '',
      };
      setGuideDraft(nextDraft);
      goto(yesNo ? 'project_domain' : 'routine_enabled', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_domain') {
      const match = findBestNamedMatch(reply, skillDomains.map((domain: any) => ({ id: domain.id, name: domain.name })));
      if (!match) {
        pushGuideAssistant('I need an existing domain for the project plan. Try again with one of your existing domain names.');
        return;
      }
      const nextDraft = { ...guideDraft, projectDomainId: match.id, projectSpecializationId: '' };
      setGuideDraft(nextDraft);
      goto('project_specialization', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_specialization') {
      const match = findBestNamedMatch(reply, availableProjectSpecializations.map((spec: any) => ({ id: spec.id, name: spec.name })));
      if (!match) {
        pushGuideAssistant('I could not match that specialization for the project. Try again with an existing specialization name.');
        return;
      }
      const nextDraft = { ...guideDraft, projectSpecializationId: match.id };
      setGuideDraft(nextDraft);
      goto('project_name', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_name') {
      const nextDraft = { ...guideDraft, projectName: reply };
      setGuideDraft(nextDraft);
      goto('project_end_date', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_end_date') {
      const nextDraft = { ...guideDraft, projectEndDate: reply };
      setGuideDraft(nextDraft);
      goto('project_open_kanban', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'project_open_kanban') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      const nextDraft = { ...guideDraft, openKanbanAfterCreate: yesNo };
      setGuideDraft(nextDraft);
      goto('routine_enabled', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_enabled') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      if (yesNo) {
        if (guideDraft.botheringType === 'external') {
          goto('routine_activity_type', guideDraft, activeLearningPathId);
          return;
        }
        goto('routine_details', guideDraft, activeLearningPathId);
        return;
      }
      const nextDraft = { ...guideDraft, routineDetails: '' };
      setGuideDraft(nextDraft);
      goto('confirm', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_activity_type') {
      const text = normalizeGuideText(reply);
      const routineActivityType =
        text.includes('upskill')
          ? 'upskill'
          : text.includes('deep')
            ? 'deepwork'
            : text.includes('workout')
              ? 'workout'
              : 'essentials';
      const nextDraft = {
        ...guideDraft,
        routineActivityType,
        routineSpecializationId: routineActivityType === 'upskill' || routineActivityType === 'deepwork' ? guideDraft.routineSpecializationId : '',
      };
      setGuideDraft(nextDraft);
      goto(routineActivityType === 'upskill' || routineActivityType === 'deepwork' ? 'routine_specialization' : 'routine_details', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_specialization') {
      const match = findBestNamedMatch(reply, specializations.map((spec: any) => ({ id: spec.id, name: spec.name })));
      if (!match) {
        pushGuideAssistant('I could not match that specialization. Try again with an existing specialization name.');
        return;
      }
      const nextDraft = { ...guideDraft, routineSpecializationId: match.id };
      setGuideDraft(nextDraft);
      goto('routine_details', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_details') {
      const nextDraft = { ...guideDraft, routineDetails: reply };
      setGuideDraft(nextDraft);
      goto('routine_slot', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_slot') {
      const nextDraft = { ...guideDraft, routineSlot: reply };
      setGuideDraft(nextDraft);
      goto('routine_recurrence', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_recurrence') {
      const text = normalizeGuideText(reply);
      const routineRecurrence = text.includes('weekly') ? 'weekly' : text.includes('custom') ? 'custom' : 'daily';
      const nextDraft = { ...guideDraft, routineRecurrence };
      setGuideDraft(nextDraft);
      goto(routineRecurrence === 'custom' ? 'routine_repeat_interval' : 'routine_link', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_repeat_interval') {
      const nextDraft = { ...guideDraft, routineRepeatInterval: reply };
      setGuideDraft(nextDraft);
      goto('routine_repeat_unit', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_repeat_unit') {
      const text = normalizeGuideText(reply);
      const routineRepeatUnit = text.includes('month') ? 'month' : text.includes('week') ? 'week' : 'day';
      const nextDraft = { ...guideDraft, routineRepeatUnit };
      setGuideDraft(nextDraft);
      goto('routine_link', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'routine_link') {
      const yesNo = parseYesNo(reply);
      if (yesNo === null) return;
      const nextDraft = { ...guideDraft, linkRoutineToBothering: yesNo };
      setGuideDraft(nextDraft);
      goto('confirm', nextDraft, activeLearningPathId);
      return;
    }
    if (currentStep === 'confirm') {
      if (/^(create|save|go|done|yes)$/i.test(reply)) {
        guideSaveActionRef.current?.();
        return;
      }
      pushGuideAssistant('Reply `create` to save, or `reset` to start over.');
      return;
    }
  }, [
    askGuideQuestion,
    availableGuideSpecializations,
    availableProjectSpecializations,
    createGuideLearningPath,
    findBestNamedMatch,
    guideDraft,
    guideSession.activeLearningPathId,
    guideSession.step,
    isGuideGeneratingTree,
    isGuideSaving,
    normalizeGuideText,
    parseYesNo,
    pdfResources,
    pushGuideAssistant,
    resetGuideDraft,
    skillDomains,
    specializations,
  ]);

  const guideChoiceOptions = useMemo<GuideChoiceOption[]>(() => {
    switch (guideSession.step) {
      case 'bothering_type':
        return [
          { label: 'Detect', value: 'detect' },
          { label: 'External', value: 'external' },
          { label: 'Mismatch', value: 'mismatch' },
          { label: 'Constraint', value: 'constraint' },
        ];
      case 'bothering_pick_option': {
        const options = guideBotheringReview.options.map((option) => ({
          label: option,
          value: option,
        }));
        return [
          ...options,
          { label: 'Keep original', value: guideDraft.botheringText || 'Keep original' },
          { label: 'Retry', value: 'retry' },
        ].slice(0, 7);
      }
      case 'spec_pdf':
      case 'generate_skill_tree':
      case 'learning_link_pdf':
      case 'learning_add_more':
      case 'project_enabled':
      case 'project_open_kanban':
      case 'routine_enabled':
      case 'routine_link':
        return [
          { label: 'Yes', value: 'yes' },
          { label: 'No', value: 'no' },
        ];
      case 'routine_activity_type':
        return [
          { label: 'Essentials', value: 'essentials' },
          { label: 'Upskill', value: 'upskill' },
          { label: 'Deep Work', value: 'deepwork' },
          { label: 'Workout', value: 'workout' },
        ];
      case 'learning_type':
        return [
          { label: 'Path', value: 'path' },
          { label: 'Book', value: 'book' },
          { label: 'Audio', value: 'audio' },
        ];
      case 'routine_slot':
        return ['Late Night', 'Dawn', 'Morning', 'Afternoon', 'Evening', 'Night'].map((slot) => ({
          label: slot,
          value: slot,
        }));
      case 'routine_recurrence':
        return [
          { label: 'Daily', value: 'daily' },
          { label: 'Weekly', value: 'weekly' },
          { label: 'Custom', value: 'custom' },
        ];
      case 'routine_repeat_unit':
        return [
          { label: 'Day', value: 'day' },
          { label: 'Week', value: 'week' },
          { label: 'Month', value: 'month' },
        ];
      case 'confirm':
        return [
          { label: 'Create', value: 'create' },
          { label: 'Reset', value: 'reset' },
        ];
      case 'spec_pdf_pick':
      case 'learning_pick_pdf':
        return pdfResources.slice(0, 10).map((resource: any) => ({
          label: resource.name,
          value: resource.name,
        }));
      case 'project_domain':
        return skillDomains.slice(0, 10).map((domain: any) => ({
          label: domain.name,
          value: domain.name,
        }));
      case 'project_specialization':
        return availableProjectSpecializations.slice(0, 10).map((spec: any) => ({
          label: spec.name,
          value: spec.name,
        }));
      case 'routine_specialization':
        return specializations.slice(0, 10).map((spec: any) => ({
          label: spec.name,
          value: spec.name,
        }));
      default:
        return [];
    }
  }, [availableProjectSpecializations, guideBotheringReview.options, guideDraft.botheringText, guideSession.step, pdfResources, skillDomains, specializations]);

  const guideUsesButtonsOnly = guideChoiceOptions.length > 0;
  const guideShowsDatePicker =
    guideSession.step === 'learning_target_date' || guideSession.step === 'project_end_date';
  const guideDateIsOptional = guideSession.step === 'learning_target_date';
  const guidePickerItems = useMemo(() => {
    switch (guideSession.step) {
      case 'domain':
        return guideDraft.domainMode === 'existing'
          ? skillDomains.map((domain: any) => ({ id: domain.id, name: domain.name }))
          : [];
      case 'specialization':
        return guideDraft.specializationMode === 'existing'
          ? availableGuideSpecializations.map((spec: any) => ({ id: spec.id, name: spec.name }))
          : [];
      case 'project_domain':
        return skillDomains.map((domain: any) => ({ id: domain.id, name: domain.name }));
      case 'project_specialization':
        return availableProjectSpecializations.map((spec: any) => ({ id: spec.id, name: spec.name }));
      case 'routine_specialization':
        return specializations.map((spec: any) => ({ id: spec.id, name: spec.name }));
      case 'spec_pdf_pick':
      case 'learning_pick_pdf':
        return pdfResources.map((resource: any) => ({ id: resource.id, name: resource.name }));
      default:
        return [];
    }
  }, [
    availableGuideSpecializations,
    availableProjectSpecializations,
    guideDraft.domainMode,
    guideDraft.specializationMode,
    guideSession.step,
    pdfResources,
    skillDomains,
    specializations,
  ]);
  const filteredGuidePickerItems = useMemo(() => {
    const query = normalizeGuideText(guidePickerQuery);
    if (!query) return guidePickerItems.slice(0, 30);
    return guidePickerItems
      .filter((item) => normalizeGuideText(item.name).includes(query))
      .slice(0, 30);
  }, [guidePickerItems, guidePickerQuery, normalizeGuideText]);
  const guideShowsPicker = guidePickerItems.length > 0;
  const guideShouldHideInput = guideUsesButtonsOnly || guideShowsPicker || guideShowsDatePicker;

  const shouldIgnoreGuideVoiceTranscript = useCallback((rawValue: string) => {
    const value = String(rawValue || '').trim();
    const text = normalizeGuideText(value);
    if (!text) return true;

    const genericFillers = new Set(['okay', 'ok', 'alright', 'all right', 'hmm', 'hm', 'uh', 'um', 'huh', 'okay astra']);
    if (genericFillers.has(text)) return true;

    if (guideSession.step === 'bothering_type') {
      return !['detect', 'external', 'mismatch', 'constraint'].some((option) => text.includes(option));
    }

    if (guideSession.step === 'bothering_pick_option') {
      const allowed = [
        ...guideBotheringReview.options,
        guideDraft.botheringText,
        'keep original',
        'retry',
      ]
        .map((item) => normalizeGuideText(item))
        .filter(Boolean);
      return !allowed.some((item) => item === text || item.includes(text) || text.includes(item));
    }

    if (
      guideSession.step === 'spec_pdf' ||
      guideSession.step === 'generate_skill_tree' ||
      guideSession.step === 'learning_link_pdf' ||
      guideSession.step === 'learning_add_more' ||
      guideSession.step === 'project_enabled' ||
      guideSession.step === 'project_open_kanban' ||
      guideSession.step === 'routine_enabled' ||
      guideSession.step === 'routine_link'
    ) {
      return parseYesNo(value) === null;
    }

    if (guideSession.step === 'learning_type') {
      return !['audio', 'video', 'book', 'path'].some((option) => text.includes(option));
    }

    if (guideSession.step === 'routine_slot') {
      return !['late night', 'dawn', 'morning', 'afternoon', 'evening', 'night'].some((option) => text.includes(option));
    }

    if (guideSession.step === 'routine_recurrence') {
      return !['daily', 'weekly', 'custom'].some((option) => text.includes(option));
    }

    if (guideSession.step === 'routine_repeat_unit') {
      return !['day', 'week', 'month'].some((option) => text.includes(option));
    }

    if (guideSession.step === 'learning_target_date') {
      return text !== 'skip' && !/^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    if (guideSession.step === 'project_end_date') {
      return !/^\d{4}-\d{2}-\d{2}$/.test(value);
    }

    if (guideSession.step === 'confirm') {
      return !/^(create|save|go|done|yes|reset)$/i.test(value);
    }

    const words = text.split(' ').filter(Boolean);
    const segments = text
      .split(/[.!?\n]+/)
      .map((segment) => segment.trim())
      .filter(Boolean);
    const lastWord = words[words.length - 1] || '';
    const danglingEndings = new Set([
      'i',
      'my',
      'the',
      'a',
      'an',
      'to',
      'and',
      'or',
      'but',
      'because',
      'if',
      'so',
      'that',
      'this',
      'these',
      'those',
      'of',
      'for',
      'with',
      'about',
    ]);
    const junkPhrases = [
      'hello',
      'hi',
      'all right',
      'alright',
      'okay',
      'ok',
      'good one',
      'thank you',
      'thanks',
      'hold it',
      'remove that',
      'removing that',
    ];
    const stopWords = new Set([
      'i', 'me', 'my', 'we', 'you', 'it', 'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
      'the', 'a', 'an', 'to', 'and', 'or', 'but', 'if', 'so', 'that', 'this', 'these', 'those',
      'of', 'for', 'with', 'about', 'in', 'on', 'at', 'by', 'from', 'as', 'do', 'did', 'does',
      'have', 'has', 'had', 'can', 'could', 'will', 'would', 'should', 'just', 'really',
      'hello', 'hi', 'okay', 'ok', 'alright', 'right', 'good', 'one', 'hold', 'remove', 'removing',
    ]);
    if (words.length <= 1) return true;
    if (danglingEndings.has(lastWord)) return true;
    if (
      segments.length > 0 &&
      segments.filter((segment) => junkPhrases.some((phrase) => segment === phrase || segment.includes(phrase))).length / segments.length >= 0.5
    ) {
      return true;
    }
    const contentWords = words.filter((word) => !stopWords.has(word) && word.length > 2);
    if (contentWords.length < 1 && words.length < 4) return true;

    return false;
  }, [guideBotheringReview.options, guideDraft.botheringText, guideSession.step, normalizeGuideText, parseYesNo]);

  useEffect(() => {
    setGuidePickerQuery('');
  }, [guideSession.step]);

  const handleOpenStateDiagram = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-state-diagram'));
  }, []);

  const extractPdfOutlineTextFromBlob = useCallback(async (pdfBlob: Blob): Promise<string> => {
    const arrayBuffer = await pdfBlob.arrayBuffer();
    const loadingTask = (pdfjs as any).getDocument({ data: new Uint8Array(arrayBuffer) });
    const pdf = await loadingTask.promise;

    try {
      const outline = await pdf.getOutline();
      if (Array.isArray(outline) && outline.length > 0) {
        const outlineLines: string[] = [];
        const walk = (items: any[], prefix: number[] = []) => {
          items.forEach((item, idx) => {
            const title = String(item?.title || '').replace(/\s+/g, ' ').trim();
            const number = [...prefix, idx + 1].join('.');
            if (title) outlineLines.push(`${number} ${title}`);
            const children = Array.isArray(item?.items) ? item.items : [];
            if (children.length > 0) walk(children, [...prefix, idx + 1]);
          });
        };
        walk(outline, []);
        if (outlineLines.length >= 4) {
          return outlineLines.slice(0, 1200).join('\n').slice(0, 24000);
        }
      }
    } catch {
      // Fall back to text extraction when outline extraction fails.
    }

    const maxPages = Math.min(pdf.numPages, 24);
    const allLines: string[] = [];
    for (let pageNum = 1; pageNum <= maxPages; pageNum += 1) {
      const page = await pdf.getPage(pageNum);
      const textContent = await page.getTextContent();
      const pageLines = extractLinesFromPageItems(Array.isArray(textContent.items) ? textContent.items : []);
      if (pageLines.length > 0) {
        allLines.push(`--- Page ${pageNum} ---`);
        allLines.push(...pageLines);
      }
    }
    return pickIndexLikeLines(allLines).join('\n').slice(0, 24000);
  }, []);

  const generateSkillTreeFromLinkedPdf = useCallback(async (specializationId: string, specializationName: string, pdfResourceId: string) => {
    const linkedPdfResource = pdfResources.find((resource: any) => resource.id === pdfResourceId);
    if (!linkedPdfResource) {
      throw new Error('Selected PDF resource was not found.');
    }
    setIsGuideGeneratingTree(true);
    try {
      const localPdf = await getPdfForResource(linkedPdfResource.id, linkedPdfResource.pdfFileName || undefined);
      if (!localPdf.blob) {
        throw new Error('Linked PDF was not found in local IndexedDB. Open or upload it in the PDF viewer first.');
      }
      const extractedText = await extractPdfOutlineTextFromBlob(localPdf.blob);
      if (!extractedText.trim()) {
        throw new Error('Could not extract readable index/headings from the linked PDF.');
      }

      const isDesktopRuntime =
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const response = await fetch('/api/ai/skill-from-pdf-index', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
        },
        body: JSON.stringify({
          specializationName,
          extractedText,
          aiConfig,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to generate from linked PDF.'));
      }

      const generatedAreasRaw = Array.isArray(result?.skillAreas) ? result.skillAreas : [];
      const generatedAreas = generatedAreasRaw
        .map((area: any) => {
          const areaName = String(area?.name || '').replace(/\s+/g, ' ').trim();
          const rawMicroSkills = Array.isArray(area?.microSkills) ? area.microSkills : [];
          const microSkills = rawMicroSkills
            .map((value: any) => {
              if (typeof value === 'string') {
                const name = value.replace(/\s+/g, ' ').trim();
                if (!name) return null;
                return { name, curiosities: [] as string[] };
              }
              const name = String(value?.name || '').replace(/\s+/g, ' ').trim();
              const curiositiesRaw = Array.isArray(value?.curiosities) ? value.curiosities : [];
              const curiosities = Array.from(
                new Set(
                  curiositiesRaw
                    .map((entry: unknown) => String(entry || '').replace(/\s+/g, ' ').trim())
                    .filter((entry: string) => entry.length > 1)
                )
              );
              if (!name) return null;
              return { name, curiosities };
            })
            .filter((value: any) => !!value);
          if (!areaName || microSkills.length === 0) return null;
          return { areaName, microSkills };
        })
        .filter((value: any) => !!value);

      if (generatedAreas.length === 0) {
        throw new Error('AI did not return usable hierarchical skill data.');
      }

      const normalizeKey = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
      const generatedCuriosities: Array<{ microSkillName: string; curiosityName: string }> = [];

      auth.setCoreSkills((prev: any[]) =>
        prev.map((skill: any) => {
          if (skill.id !== specializationId) return skill;
          const nextAreas = [...(skill.skillAreas || [])];

          generatedAreas.forEach((generatedArea: any) => {
            const existingAreaIndex = nextAreas.findIndex(
              (area: any) => normalizeKey(area.name) === normalizeKey(generatedArea.areaName)
            );
            const generatedMicros = generatedArea.microSkills.map((micro: any) => ({
              id: `ms_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${Math.random().toString(36).slice(2, 6)}`,
              name: micro.name,
              isReadyForRepetition: false,
            }));

            generatedArea.microSkills.forEach((micro: any) => {
              micro.curiosities.forEach((curiosity: string) => {
                generatedCuriosities.push({ microSkillName: micro.name, curiosityName: curiosity });
              });
            });

            if (existingAreaIndex >= 0) {
              const existing = nextAreas[existingAreaIndex];
              const existingNames = new Set((existing.microSkills || []).map((micro: any) => normalizeKey(micro.name)));
              nextAreas[existingAreaIndex] = {
                ...existing,
                microSkills: [
                  ...(existing.microSkills || []),
                  ...generatedMicros.filter((micro: any) => !existingNames.has(normalizeKey(micro.name))),
                ],
              };
            } else {
              nextAreas.push({
                id: `sa_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
                name: generatedArea.areaName,
                purpose: `Generated from PDF index: ${linkedPdfResource.name}`,
                microSkills: generatedMicros,
              });
            }
          });

          return { ...skill, skillAreas: nextAreas };
        })
      );

      if (generatedCuriosities.length > 0 && auth?.setUpskillDefinitions) {
        auth.setUpskillDefinitions((prev: any[]) => {
          const existing = new Set(prev.map((def: any) => `${normalizeKey(def.category)}::${normalizeKey(def.name)}`));
          const additions: any[] = [];
          generatedCuriosities.forEach(({ microSkillName, curiosityName }) => {
            const key = `${normalizeKey(microSkillName)}::${normalizeKey(curiosityName)}`;
            if (existing.has(key)) return;
            existing.add(key);
            additions.push({
              id: `def_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
              name: curiosityName,
              category: microSkillName,
              linkedUpskillIds: [],
            });
          });
          return additions.length ? [...prev, ...additions] : prev;
        });
      }

      return generatedAreas;
    } finally {
      setIsGuideGeneratingTree(false);
    }
  }, [auth, extractPdfOutlineTextFromBlob, pdfResources, settings]);

  const handleSaveGuideFlow = useCallback(async () => {
    if (!auth?.createShivGuideFlow || isGuideSaving) return;
    setIsGuideSaving(true);
    setShivError(null);
    try {
      if (guideDraft.linkPdfToSpecialization && !guideDraft.specializationPdfId) {
        throw new Error('Choose a PDF resource to link with the specialization.');
      }
      const routineRepeatInterval = Math.max(1, Number(guideDraft.routineRepeatInterval || '1') || 1);
      const result = auth.createShivGuideFlow({
        botheringType: guideDraft.botheringType,
        botheringText: guideDraft.botheringText,
        domainId: guideDraft.domainMode === 'existing' ? guideDraft.domainId : null,
        domainName: guideDraft.domainMode === 'new' ? guideDraft.domainName : '',
        specializationId: guideDraft.specializationMode === 'existing' ? guideDraft.specializationId : null,
        specializationName: guideDraft.specializationMode === 'new' ? guideDraft.specializationName : '',
        learningPlans: guideDraft.learningPaths.map((path) => ({
          type: path.type,
          title: path.title,
          subtitle: path.subtitle,
          targetDate: path.targetDate,
          requiredHours: path.requiredHours ? Number(path.requiredHours) : null,
          totalPages: path.totalPages ? Number(path.totalPages) : null,
          requiredMoney: path.requiredMoney ? Number(path.requiredMoney) : null,
          targetMicroSkills: path.targetMicroSkills ? Number(path.targetMicroSkills) : null,
          linkedPdfResourceId: path.linkedPdfResourceId || null,
        })),
        projectPlan: guideDraft.createProjectPlan
          ? {
              enabled: true,
              domainId: guideDraft.projectDomainId || guideDraft.domainId || null,
              specializationId: guideDraft.projectSpecializationId || guideDraft.specializationId || null,
              projectName: guideDraft.projectName,
              endDate: guideDraft.projectEndDate,
            }
          : {
              enabled: false,
            },
        routine: guideDraft.routineDetails.trim()
          ? {
              activityType: guideDraft.routineActivityType,
              specializationId:
                guideDraft.routineActivityType === 'upskill' || guideDraft.routineActivityType === 'deepwork'
                  ? guideDraft.routineSpecializationId || guideDraft.specializationId || null
                  : null,
              details: guideDraft.routineDetails,
              slot: guideDraft.routineSlot as any,
              recurrence:
                guideDraft.routineRecurrence === 'custom'
                  ? {
                      type: 'custom',
                      repeatInterval: routineRepeatInterval,
                      repeatUnit: guideDraft.routineRepeatUnit,
                    }
                  : { type: guideDraft.routineRecurrence },
              startDate: guideDraft.targetDate || new Date().toISOString().slice(0, 10),
              linkToBothering: guideDraft.linkRoutineToBothering,
            }
          : undefined,
      });

      const resolvedSpecializationId = result?.specializationId;
      const resolvedSpecializationName =
        guideDraft.specializationMode === 'new'
          ? guideDraft.specializationName.trim()
          : (selectedExistingGuideSpecialization?.name || '').trim();

      if (guideDraft.linkPdfToSpecialization && guideDraft.specializationPdfId && auth?.setCoreSkills && resolvedSpecializationId) {
        auth.setCoreSkills((prev: any[]) =>
          prev.map((skill: any) =>
            skill.id === resolvedSpecializationId
              ? { ...skill, linkedPdfResourceId: guideDraft.specializationPdfId }
              : skill
          )
        );
      }

      if (
        guideDraft.generateSkillTree &&
        guideDraft.linkPdfToSpecialization &&
        guideDraft.specializationPdfId &&
        resolvedSpecializationId &&
        resolvedSpecializationName
      ) {
        await generateSkillTreeFromLinkedPdf(
          resolvedSpecializationId,
          resolvedSpecializationName,
          guideDraft.specializationPdfId
        );
      }

      const summary = guideDraft.botheringType === 'external'
        ? [
            `I created a new external bothering: "${guideDraft.botheringText.trim()}".`,
            result?.routineId
              ? guideDraft.linkRoutineToBothering
                ? 'Action routine created and linked back to the bothering.'
                : 'Action routine created without bothering link.'
              : 'No action routine was created.',
          ].join(' ')
        : [
            `I created a new ${guideDraft.botheringType} bothering: "${guideDraft.botheringText.trim()}".`,
            guideDraft.domainMode === 'new'
              ? `Domain created: ${guideDraft.domainName.trim()}.`
              : `Domain linked from existing library.`,
            guideDraft.specializationMode === 'new'
              ? `Specialization created: ${guideDraft.specializationName.trim()}.`
              : `Specialization linked from existing library.`,
            `${guideDraft.learningPaths.filter((path) => path.title.trim()).length} learning path(s) added.`,
            guideDraft.createProjectPlan && result?.projectId
              ? `Project plan created: ${guideDraft.projectName.trim()}.`
              : 'No project plan created.',
            guideDraft.linkPdfToSpecialization && guideDraft.specializationPdfId
              ? 'PDF linked to specialization.'
              : 'No specialization PDF linked.',
            guideDraft.generateSkillTree && guideDraft.specializationPdfId
              ? 'Skill tree generated from linked PDF.'
              : 'Skill tree generation skipped.',
            result?.routineId
              ? guideDraft.linkRoutineToBothering
                ? 'Routine created and linked back to the bothering.'
                : 'Routine created without bothering link.'
              : 'No routine was created.',
          ].join(' ');

      setShivMessages((prev) => [...prev, { role: 'assistant', content: summary }].slice(-MAX_CHAT_HISTORY));
      toast({
        title: 'Guide flow created',
        description:
          guideDraft.botheringType === 'external'
            ? (result?.routineId ? 'Bothering and action routine were saved.' : 'Bothering was saved.')
            : (result?.routineId ? 'Bothering, specialization path, and routine were saved.' : 'Bothering and learning flow were saved.'),
      });
      if (guideDraft.createProjectPlan && guideDraft.openKanbanAfterCreate && result?.releaseId && result?.specializationId) {
        router.push(`/kanban?spec=${encodeURIComponent(result.specializationId)}&release=${encodeURIComponent(result.releaseId)}`);
      }
      resetGuideDraft();
      setShivPanelMode(shivDefaultMode);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create guide flow.';
      setShivError(message);
      toast({
        title: 'Guide flow failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsGuideSaving(false);
    }
  }, [auth, generateSkillTreeFromLinkedPdf, guideDraft, isGuideSaving, resetGuideDraft, router, selectedExistingGuideSpecialization, shivDefaultMode, toast]);

  useEffect(() => {
    guideSaveActionRef.current = () => {
      void handleSaveGuideFlow();
    };
    return () => {
      guideSaveActionRef.current = null;
    };
  }, [handleSaveGuideFlow]);

  const todayJournalDateKey = format(new Date(), 'yyyy-MM-dd');
  const journalSessions = Array.isArray(auth?.journalSessions) ? auth.journalSessions : [];
  const journalPrompts = useMemo(
    () =>
      buildAstraJournalPrompts({
        dateKey: todayJournalDateKey,
        now: new Date(),
        currentSlot: auth?.currentSlot || null,
        username: auth?.currentUser?.username || null,
        schedule: auth?.schedule || {},
        activityDurations: auth?.activityDurations || {},
        mindsetCards: auth?.mindsetCards || [],
        missedSlotReviews: auth?.missedSlotReviews || {},
        offerizationPlans: auth?.offerizationPlans || {},
        skillAcquisitionPlans: auth?.skillAcquisitionPlans || [],
        coreSkills: auth?.coreSkills || [],
        upskillDefinitions: auth?.upskillDefinitions || [],
        deepWorkDefinitions: auth?.deepWorkDefinitions || [],
        projects: auth?.projects || [],
      }),
    [
      auth?.activityDurations,
      auth?.coreSkills,
      auth?.currentSlot,
      auth?.currentUser?.username,
      auth?.deepWorkDefinitions,
      auth?.journalSessions,
      auth?.mindsetCards,
      auth?.missedSlotReviews,
      auth?.offerizationPlans,
      auth?.projects,
      auth?.schedule,
      auth?.skillAcquisitionPlans,
      auth?.upskillDefinitions,
      todayJournalDateKey,
    ]
  );
  const todayJournalSession = useMemo(
    () => journalSessions.find((session: any) => session?.date === todayJournalDateKey) || null,
    [journalSessions, todayJournalDateKey]
  );
  const syncedJournalSession = useMemo(
    () => (todayJournalSession ? syncJournalSessionCursor(todayJournalSession, journalPrompts) : null),
    [journalPrompts, todayJournalSession]
  );
  const currentJournalPrompt = useMemo(
    () => getCurrentJournalPrompt(syncedJournalSession, journalPrompts),
    [journalPrompts, syncedJournalSession]
  );
  const journalMessages = syncedJournalSession?.messages || [];
  const lastJournalAssistantMessage = useMemo(
    () => {
      for (let index = journalMessages.length - 1; index >= 0; index -= 1) {
        const message = journalMessages[index];
        if (message?.role === 'assistant') return message;
      }
      return null;
    },
    [journalMessages]
  );
  const effectiveJournalAwaitingStopperPromptId = useMemo(() => {
    if (journalAwaitingStopperPromptId) return journalAwaitingStopperPromptId;
    if (currentJournalPrompt?.kind !== 'task_stopper') return null;
    const promptId = String(lastJournalAssistantMessage?.promptId || '');
    if (
      promptId === `${currentJournalPrompt.id}:open_stopper` ||
      promptId === `${currentJournalPrompt.id}:pending`
    ) {
      return currentJournalPrompt.id;
    }
    return null;
  }, [currentJournalPrompt, journalAwaitingStopperPromptId, lastJournalAssistantMessage]);
  const awaitingJournalStopperPrompt = useMemo(
    () =>
      effectiveJournalAwaitingStopperPromptId
        ? journalPrompts.find((prompt) => prompt.id === effectiveJournalAwaitingStopperPromptId) || null
        : null,
    [effectiveJournalAwaitingStopperPromptId, journalPrompts]
  );
  const journalChoiceOptions = awaitingJournalStopperPrompt
    ? [
        { label: 'Done', value: 'done' },
        { label: 'Skip', value: 'skip' },
      ]
    : currentJournalPrompt?.choices || [];

  const persistJournalSession = useCallback((nextSession: any) => {
    if (!auth?.setJournalSessions) return;
    const currentSessions = Array.isArray(auth?.journalSessions) ? auth.journalSessions : [];
    const synced = syncJournalSessionCursor(nextSession, journalPrompts);
    const nextSessions = [...currentSessions.filter((session: any) => session?.date !== synced.date), synced]
      .sort((a: any, b: any) => String(a?.date || '').localeCompare(String(b?.date || '')));
    auth.setJournalSessions(nextSessions);
  }, [auth, journalPrompts]);

  const buildJournalCompletionSummary = useCallback((session: any) => {
    const solvedCount = (session?.botheringReviews || []).filter((review: any) => review?.status === 'solved').length;
    const totalBotherings = (session?.botheringReviews || []).length;
    const causes = [
      ...(session?.slotReviews || []).map((review: any) => review?.causeCategory).filter(Boolean),
      ...(session?.botheringReviews || []).map((review: any) => review?.blockerCategory).filter(Boolean),
    ];
    const topCause = Array.from(
      causes.reduce((map: Map<string, number>, cause: string) => {
        map.set(cause, (map.get(cause) || 0) + 1);
        return map;
      }, new Map<string, number>())
    )
      .sort((a, b) => b[1] - a[1])[0]?.[0];
    const tomorrowFocus = session?.closeout?.tomorrowFocus ? ` Tomorrow focus: ${session.closeout.tomorrowFocus}.` : '';
    return `Journal saved. Reviewed ${(session?.slotReviews || []).length} slot${(session?.slotReviews || []).length === 1 ? '' : 's'} and ${totalBotherings} bothering${totalBotherings === 1 ? '' : 's'}. ${solvedCount}/${totalBotherings} marked solved.${topCause ? ` Main pattern: ${topCause}.` : ''}${tomorrowFocus}`;
  }, []);

  const findJournalTaskReflection = useCallback((session: any, taskId: string | undefined) => {
    if (!taskId) return null;
    for (const slotReview of session?.slotReviews || []) {
      const reflection = (slotReview?.taskReflections || []).find((entry: any) => entry?.taskId === taskId);
      if (reflection) return reflection;
    }
    return null;
  }, []);

  const getJournalTaskLabel = useCallback((taskId: string | undefined) => {
    if (!taskId) return 'this task';
    const baseTaskId = String(taskId).replace(/_(\d{4}-\d{2}-\d{2})$/, '');
    const promptMatch = journalPrompts.find((prompt: any) => {
      const promptTaskId = String(prompt?.taskId || '');
      return promptTaskId === taskId || promptTaskId.replace(/_(\d{4}-\d{2}-\d{2})$/, '') === baseTaskId;
    });
    const taskDetails = String(promptMatch?.contextualData?.taskDetails || '').trim();
    return taskDetails || baseTaskId || String(taskId);
  }, [journalPrompts]);

  const getLinkedJournalTaskSummaries = useCallback((session: any, prompt: any) => {
    const relatedIds = new Set(
      (Array.isArray(prompt?.relatedTaskIds) ? prompt.relatedTaskIds : [])
        .map((id: unknown) => String(id || '').trim())
        .filter(Boolean)
    );
    if (!relatedIds.size) return [];
    const summaries: string[] = [];
    for (const slotReview of session?.slotReviews || []) {
      for (const reflection of slotReview?.taskReflections || []) {
        const taskId = String(reflection?.taskId || '');
        const baseTaskId = taskId.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
        if (!relatedIds.has(taskId) && !relatedIds.has(baseTaskId)) continue;
        const label = getJournalTaskLabel(taskId);
        const parts = [
          reflection?.missReasonCategory ? `reason: ${String(reflection.missReasonCategory).replace(/_/g, ' ')}` : '',
          reflection?.blockerSummary ? `blocker: ${String(reflection.blockerSummary).trim()}` : '',
          reflection?.nextAction ? `next: ${String(reflection.nextAction).trim()}` : '',
        ].filter(Boolean);
        if (!parts.length) continue;
        summaries.push(`${label} -> ${parts.join(', ')}`);
      }
    }
    return summaries.slice(0, 3);
  }, [getJournalTaskLabel]);

  const buildJournalAssistantPromptText = useCallback((prompt: any, session: any) => {
    if (!prompt) return '';
    if (prompt.kind === 'task_reschedule_fit') {
      const taskReflection = findJournalTaskReflection(session, prompt.taskId);
      const targetSlot = String(taskReflection?.rescheduleSlotName || '').trim();
      const targetDateKey = String(taskReflection?.rescheduleDateKey || '').trim();
      const label =
        targetDateKey && targetDateKey !== todayJournalDateKey
          ? `${targetSlot} tomorrow`
          : targetSlot
            ? `${targetSlot} today`
            : 'that slot';
      return `You already have work scheduled in ${label}. Will this task still fit there?`;
    }
    if (prompt.kind === 'bothering_feeling' && prompt.sourceType === 'external') {
      const summaries = getLinkedJournalTaskSummaries(session, prompt);
      const botheringText = String(prompt?.contextualData?.botheringText || '').trim();
      if (summaries.length > 0) {
        return `For "${botheringText || 'this bothering'}", I already have the linked task answers above:\n- ${summaries.join('\n- ')}\n\nHow do you feel about this right now, from 1 to 5?`;
      }
    }
    return prompt.prompt || '';
  }, [findJournalTaskReflection, getLinkedJournalTaskSummaries, todayJournalDateKey]);

  const syncJournalDerivedState = useCallback((session: any, prompt: any) => {
    if (prompt?.slotName && auth?.setMissedSlotReviews) {
      const slotReview = (session?.slotReviews || []).find((entry: any) => entry?.slotName === prompt.slotName);
      if (slotReview) {
        const reviewKey = `${todayJournalDateKey}-${prompt.slotName}`;
        auth.setMissedSlotReviews((prev: any) => ({
          ...prev,
          [reviewKey]: {
            ...(prev?.[reviewKey] || { id: reviewKey, reason: '', followedRuleIds: [] }),
            reason: slotReview.note || prev?.[reviewKey]?.reason || '',
            journalSessionId: session.id,
            slotState: slotReview.slotState,
            untrackedMinutes: slotReview.untrackedMinutes,
            causeCategory: slotReview.causeCategory,
            linkedStopperIds: slotReview.linkedStopperIds || [],
            activitySummary: slotReview.note || prev?.[reviewKey]?.activitySummary || '',
          },
        }));
        if (
          slotReview.causeCategory === 'distraction' &&
          slotReview.note &&
          slotReview.untrackedMinutes > 0 &&
          auth?.setSchedule
        ) {
          const distractionId = `journal_distraction_${todayJournalDateKey}_${prompt.slotName}`;
          auth.setSchedule((prev: any) => {
            const daySchedule = { ...(prev?.[todayJournalDateKey] || {}) };
            const currentActivities = Array.isArray(daySchedule[prompt.slotName]) ? [...daySchedule[prompt.slotName]] : [];
            const distractionActivity = {
              id: distractionId,
              type: 'distraction',
              details: slotReview.note,
              completed: true,
              duration: slotReview.untrackedMinutes,
              slot: prompt.slotName,
            };
            const existingIndex = currentActivities.findIndex((activity: any) => activity?.id === distractionId);
            if (existingIndex >= 0) currentActivities[existingIndex] = { ...currentActivities[existingIndex], ...distractionActivity };
            else currentActivities.push(distractionActivity);
            daySchedule[prompt.slotName] = currentActivities;
            return { ...prev, [todayJournalDateKey]: daySchedule };
          });
        }
      }
    }

    if (prompt?.taskId) {
      const taskReflection = findJournalTaskReflection(session, prompt.taskId);
      const canApplyReschedule =
        taskReflection?.rescheduleDateKey &&
        taskReflection?.rescheduleSlotName &&
        (taskReflection?.rescheduleFit === 'confirmed' || taskReflection?.rescheduleFit === 'not_needed');

      if (canApplyReschedule && auth?.setSchedule) {
        const taskId = String(prompt.taskId || '');
        const baseTaskId = taskId.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
        const targetDateKey = String(taskReflection.rescheduleDateKey);
        const targetSlot = String(taskReflection.rescheduleSlotName);
        auth.setSchedule((prev: any) => {
          const next = { ...(prev || {}) };
          const sourceDay = { ...(next?.[todayJournalDateKey] || {}) };
          const targetDay =
            targetDateKey === todayJournalDateKey
              ? sourceDay
              : { ...(next?.[targetDateKey] || {}) };

          const matchesTask = (activity: any) => {
            const activityId = String(activity?.id || '');
            const normalizedActivityId = activityId.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
            const taskIds = Array.isArray(activity?.taskIds) ? activity.taskIds.map((id: unknown) => String(id || '')) : [];
            return (
              activityId === taskId ||
              normalizedActivityId === baseTaskId ||
              taskIds.includes(taskId) ||
              taskIds.includes(baseTaskId)
            );
          };

          let sourceActivity: any = null;
          Object.keys(sourceDay).forEach((slotName) => {
            const activities = Array.isArray(sourceDay[slotName]) ? [...sourceDay[slotName]] : [];
            const filtered = activities.filter((activity: any) => {
              if (!matchesTask(activity)) return true;
              if (!sourceActivity) sourceActivity = activity;
              return false;
            });
            sourceDay[slotName] = filtered;
          });

          Object.keys(targetDay).forEach((slotName) => {
            const activities = Array.isArray(targetDay[slotName]) ? [...targetDay[slotName]] : [];
            const filtered = activities.filter((activity: any) => {
              if (!matchesTask(activity)) return true;
              if (!sourceActivity) sourceActivity = activity;
              return false;
            });
            targetDay[slotName] = filtered;
          });

          if (!sourceActivity) return prev;

          const hasDateSuffix = /_(\d{4}-\d{2}-\d{2})$/.test(String(sourceActivity.id || taskId));
          const nextActivityId =
            targetDateKey !== todayJournalDateKey && hasDateSuffix
              ? `${baseTaskId}_${targetDateKey}`
              : String(sourceActivity.id || taskId);
          const movedActivity = {
            ...sourceActivity,
            id: nextActivityId,
            slot: targetSlot,
            completed: false,
            completedAt: undefined,
          };
          const targetActivities = Array.isArray(targetDay[targetSlot]) ? [...targetDay[targetSlot]] : [];
          targetActivities.push(movedActivity);
          targetDay[targetSlot] = targetActivities;

          next[todayJournalDateKey] = sourceDay;
          next[targetDateKey] = targetDay;
          return next;
        });
      }

      if (canApplyReschedule && auth?.setMindsetCards) {
        auth.setMindsetCards((prev: any[]) =>
          prev.map((card: any) => ({
            ...card,
            points: (card?.points || []).map((point: any) => ({
              ...point,
              tasks: Array.isArray(point?.tasks)
                ? point.tasks.map((task: any) => {
                    const taskIdValue = String(task?.id || '');
                    const baseId = taskIdValue.replace(/_(\d{4}-\d{2}-\d{2})$/, '');
                    const activityId = String(task?.activityId || '');
                    const shouldUpdate =
                      taskIdValue === prompt.taskId ||
                      baseId === String(prompt.taskId || '').replace(/_(\d{4}-\d{2}-\d{2})$/, '') ||
                      activityId === prompt.taskId ||
                      activityId === String(prompt.taskId || '').replace(/_(\d{4}-\d{2}-\d{2})$/, '');
                    if (!shouldUpdate) return task;
                    return {
                      ...task,
                      dateKey: taskReflection.rescheduleDateKey,
                      slotName: taskReflection.rescheduleSlotName,
                    };
                  })
                : point?.tasks,
            })),
          }))
        );
      }
    }

    if (prompt?.botheringId && auth?.setMindsetCards) {
      const botheringReview = (session?.botheringReviews || []).find((entry: any) => entry?.botheringId === prompt.botheringId);
      if (botheringReview) {
        auth.setMindsetCards((prev: any[]) =>
          prev.map((card: any) => ({
            ...card,
            points: (card?.points || []).map((point: any) => {
              if (point?.id !== prompt.botheringId) return point;
              const nextCompleted =
                botheringReview.status === 'solved'
                  ? true
                  : botheringReview.status
                    ? false
                    : point.completed;
              return {
                ...point,
                completed: nextCompleted,
                resolution:
                  botheringReview.resolutionSummary ||
                  botheringReview.nextAction ||
                  botheringReview.todaySummary ||
                  point.resolution,
              };
            }),
          }))
        );
      }
    }
  }, [auth, findJournalTaskReflection, todayJournalDateKey]);

  const startFreshJournalSession = useCallback(() => {
    if (!journalPrompts.length) return;
    setJournalAwaitingStopperPromptId(null);
    setShivError(null);
    setShivInput('');
    const baseSession = createEmptyDailyJournalSession(todayJournalDateKey, journalPrompts);
    const nextPrompt = journalPrompts[0] || null;
    const nextSession = appendJournalMessages(baseSession, [
      {
        role: 'assistant',
        content: 'Journal mode is active. I will review elapsed slots and today\'s botherings one question at a time.',
        promptId: 'journal:intro',
        timestamp: Date.now(),
      },
      ...(nextPrompt
          ? [{
              role: 'assistant' as const,
              content: buildJournalAssistantPromptText(nextPrompt, baseSession),
              promptId: nextPrompt.id,
              timestamp: Date.now(),
            }]
        : []),
    ]);
    persistJournalSession(nextSession);
  }, [buildJournalAssistantPromptText, journalPrompts, persistJournalSession, todayJournalDateKey]);

  useEffect(() => {
    if (shivPanelMode !== 'journal' || !journalPrompts.length) return;
    if (!todayJournalSession) {
      startFreshJournalSession();
      return;
    }
    const needsCursorSync =
      syncedJournalSession &&
      (syncedJournalSession.cursor.stepId !== todayJournalSession.cursor.stepId ||
        syncedJournalSession.cursor.totalSteps !== todayJournalSession.cursor.totalSteps);
    if (needsCursorSync) {
      persistJournalSession(syncedJournalSession);
      return;
    }
    if ((syncedJournalSession?.messages || []).length === 0) {
      const nextPrompt = getCurrentJournalPrompt(syncedJournalSession, journalPrompts);
      const hydratedBaseSession = syncedJournalSession || createEmptyDailyJournalSession(todayJournalDateKey, journalPrompts);
      const hydrated = appendJournalMessages(
        hydratedBaseSession,
        [
          {
            role: 'assistant',
            content: 'Journal mode is active. I will review elapsed slots and today\'s botherings one question at a time.',
            promptId: 'journal:intro',
            timestamp: Date.now(),
          },
          ...(nextPrompt
            ? [{
                role: 'assistant' as const,
                content: buildJournalAssistantPromptText(nextPrompt, hydratedBaseSession),
                promptId: nextPrompt.id,
                timestamp: Date.now(),
              }]
            : []),
        ]
      );
      persistJournalSession(hydrated);
    }
  }, [buildJournalAssistantPromptText, journalPrompts, persistJournalSession, shivPanelMode, startFreshJournalSession, syncedJournalSession, todayJournalDateKey, todayJournalSession]);

  const handleJournalReply = useCallback((rawReply: string) => {
    const reply = String(rawReply || '').trim();
    if (!reply || !journalPrompts.length) return;
    if (/^reset$/i.test(reply)) {
      startFreshJournalSession();
      return;
    }

    const baseSession =
      syncedJournalSession ||
      createEmptyDailyJournalSession(todayJournalDateKey, journalPrompts);
    const activePrompt =
      (effectiveJournalAwaitingStopperPromptId
        ? journalPrompts.find((prompt) => prompt.id === effectiveJournalAwaitingStopperPromptId) || null
        : currentJournalPrompt) || null;
    if (!activePrompt) {
      startFreshJournalSession();
      return;
    }

    setShivError(null);
    setShivInput('');

    let nextSession = appendJournalMessages(baseSession, [
      {
        role: 'user',
        content: reply,
        promptId: activePrompt.id,
        timestamp: Date.now(),
      },
    ]);

    const normalizedReply = reply.trim().toLowerCase();

    if (effectiveJournalAwaitingStopperPromptId && activePrompt.kind === 'task_stopper') {
      if (normalizedReply !== 'done' && normalizedReply !== 'skip') {
        nextSession = appendJournalMessages(nextSession, [
          {
            role: 'assistant',
            content: 'After linking the urge or resistance in the popup, reply `done` or `skip`.',
            promptId: `${activePrompt.id}:pending`,
            timestamp: Date.now(),
          },
        ]);
        persistJournalSession(nextSession);
        return;
      }
      const linkedStopperIds =
        normalizedReply === 'done'
          ? getLinkedStopperIdsForTask(activePrompt.relatedTaskIds || [], auth?.mindsetCards || [])
          : [];
      nextSession = applyJournalAnswerToSession(nextSession, activePrompt, 'yes', { linkedStopperIds });
      syncJournalDerivedState(nextSession, activePrompt);
      nextSession = advanceJournalSession(nextSession, journalPrompts);
      setJournalAwaitingStopperPromptId(null);
      const nextPrompt = journalPrompts[nextSession.cursor.stepIndex] || null;
      nextSession = appendJournalMessages(nextSession, [
        {
          role: 'assistant',
          content: nextPrompt ? buildJournalAssistantPromptText(nextPrompt, nextSession) : buildJournalCompletionSummary(nextSession),
          promptId: nextPrompt ? nextPrompt.id : 'journal:complete',
          timestamp: Date.now(),
        },
      ]);
      persistJournalSession(nextSession);
      if (!nextPrompt) {
        toast({ title: 'Journal saved', description: 'Today\'s Astra journal was saved.' });
      }
      return;
    }

    if (activePrompt.kind === 'task_stopper' && normalizedReply === 'yes') {
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('open-resistance-list-for-task', {
          detail: {
            taskId: activePrompt.taskId,
            taskIds: activePrompt.relatedTaskIds || [],
            baseId: activePrompt.taskId?.replace(/_(\d{4}-\d{2}-\d{2})$/, ''),
          },
        }));
      }
      setJournalAwaitingStopperPromptId(activePrompt.id);
      nextSession = appendJournalMessages(nextSession, [
        {
          role: 'assistant',
          content: 'I opened the urge/resistance picker. Link an existing stopper or add a new one there, then reply `done` or `skip`.',
          promptId: `${activePrompt.id}:open_stopper`,
          timestamp: Date.now(),
        },
      ]);
      persistJournalSession(nextSession);
      return;
    }

    nextSession = applyJournalAnswerToSession(nextSession, activePrompt, reply);
    syncJournalDerivedState(nextSession, activePrompt);
    nextSession = advanceJournalSession(nextSession, journalPrompts);
    const nextPrompt = journalPrompts[nextSession.cursor.stepIndex] || null;
    nextSession = appendJournalMessages(nextSession, [
      {
        role: 'assistant',
        content: nextPrompt ? buildJournalAssistantPromptText(nextPrompt, nextSession) : buildJournalCompletionSummary(nextSession),
        promptId: nextPrompt ? nextPrompt.id : 'journal:complete',
        timestamp: Date.now(),
      },
    ]);
    persistJournalSession(nextSession);
    if (!nextPrompt) {
      toast({ title: 'Journal saved', description: 'Today\'s Astra journal was saved.' });
    }
  }, [
    auth?.mindsetCards,
    buildJournalAssistantPromptText,
    buildJournalCompletionSummary,
    currentJournalPrompt,
    effectiveJournalAwaitingStopperPromptId,
    journalAwaitingStopperPromptId,
    journalPrompts,
    persistJournalSession,
    startFreshJournalSession,
    syncJournalDerivedState,
    syncedJournalSession,
    toast,
    todayJournalDateKey,
  ]);

  const getMindsetPromptsForPath = useCallback((pathId: string) => {
    return buildAstraMindsetPrompts({
      pathId: pathId as any,
      username: auth?.currentUser?.username || null,
      taskOptions: mindsetPathTaskOptions,
      botheringOptions: mindsetPathBotheringOptions,
    });
  }, [auth?.currentUser?.username, mindsetPathBotheringOptions, mindsetPathTaskOptions]);

  const mindsetSessions = Array.isArray(auth?.mindsetSessions) ? auth.mindsetSessions : [];
  const pendingMindsetSession = useMemo(() => {
    return [...mindsetSessions]
      .filter((session: any) => session?.status === 'in_progress' || session?.status === 'abandoned')
      .sort((left: any, right: any) => Number(right?.startedAt || 0) - Number(left?.startedAt || 0))[0] || null;
  }, [mindsetSessions]);
  const viewedMindsetSession = useMemo(
    () => (mindsetSessionViewId ? mindsetSessions.find((session: any) => session?.id === mindsetSessionViewId) || null : null),
    [mindsetSessionViewId, mindsetSessions]
  );
  const activeMindsetPathId = String(
    viewedMindsetSession?.pathId ||
      pendingMindsetSession?.pathId ||
      ASTRA_MINDSET_PATHS[0]?.id ||
      'reality_interpretation_debugger'
  );
  const mindsetPrompts = useMemo(
    () => getMindsetPromptsForPath(activeMindsetPathId),
    [activeMindsetPathId, getMindsetPromptsForPath]
  );
  const syncedMindsetSession = useMemo(
    () => (viewedMindsetSession ? syncMindsetSessionCursor(viewedMindsetSession, mindsetPrompts) : null),
    [mindsetPrompts, viewedMindsetSession]
  );
  const currentMindsetPrompt = useMemo(
    () => getCurrentMindsetPrompt(syncedMindsetSession, mindsetPrompts),
    [mindsetPrompts, syncedMindsetSession]
  );
  const mindsetMessages = syncedMindsetSession?.messages || [];
  const filteredMindsetPickerItems = useMemo(() => {
    const items = Array.isArray(currentMindsetPrompt?.pickerItems) ? currentMindsetPrompt.pickerItems : [];
    const query = String(mindsetPickerQuery || '').trim().toLowerCase();
    if (!query) return items;
    return items.filter((item: any) => {
      const haystack = `${String(item?.label || '')} ${String(item?.description || '')}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [currentMindsetPrompt?.pickerItems, mindsetPickerQuery]);
  const lastMindsetAssistantMessage = useMemo(() => {
    for (let index = mindsetMessages.length - 1; index >= 0; index -= 1) {
      const message = mindsetMessages[index];
      if (message?.role === 'assistant') return message;
    }
    return null;
  }, [mindsetMessages]);
  const selectedMindsetPathMeta = useMemo(
    () => ASTRA_MINDSET_PATHS.find((path) => path.id === activeMindsetPathId) || ASTRA_MINDSET_PATHS[0],
    [activeMindsetPathId]
  );
  const mindsetChoiceOptions = Array.isArray(currentMindsetPrompt?.choices) ? currentMindsetPrompt.choices : [];
  const mindsetHasPicker = Array.isArray(currentMindsetPrompt?.pickerItems) && currentMindsetPrompt.pickerItems.length > 0;
  const mindsetHasTextEntry = Boolean(
    syncedMindsetSession &&
    currentMindsetPrompt &&
    !mindsetChoiceOptions.length &&
    !mindsetHasPicker &&
    currentMindsetPrompt.kind !== 'select_task' &&
    currentMindsetPrompt.kind !== 'select_bothering' &&
    currentMindsetPrompt.kind !== 'body_state_select'
  );

  useEffect(() => {
    if (currentMindsetPrompt?.kind === 'body_state_select') {
      const existing = syncedMindsetSession?.answers?.find((entry: any) => entry?.stepId === currentMindsetPrompt.id);
      setMindsetBodySelection(Array.isArray(existing?.value) ? existing.value : []);
      return;
    }
    setMindsetBodySelection([]);
  }, [currentMindsetPrompt?.id, currentMindsetPrompt?.kind, syncedMindsetSession?.answers]);

  const persistMindsetSession = useCallback((nextSession: any) => {
    if (!auth?.setMindsetSessions) return;
    const prompts = getMindsetPromptsForPath(String(nextSession?.pathId || activeMindsetPathId));
    const synced = syncMindsetSessionCursor(nextSession, prompts);
    const currentSessions = Array.isArray(auth?.mindsetSessions) ? auth.mindsetSessions : [];
    const nextSessions = [...currentSessions.filter((session: any) => session?.id !== synced.id), synced]
      .sort((left: any, right: any) => Number(left?.startedAt || 0) - Number(right?.startedAt || 0));
    auth.setMindsetSessions(nextSessions);
  }, [activeMindsetPathId, auth, getMindsetPromptsForPath]);

  const buildMindsetAssistantPromptText = useCallback((prompt: any) => {
    if (!prompt) return '';
    return [String(prompt.prompt || '').trim(), String(prompt.helperText || '').trim()].filter(Boolean).join('\n\n');
  }, []);

  const hydrateMindsetSession = useCallback((session: any) => {
    const prompts = getMindsetPromptsForPath(String(session?.pathId || activeMindsetPathId));
    const synced = syncMindsetSessionCursor(session, prompts);
    const nextPrompt = getCurrentMindsetPrompt(synced, prompts);
    return appendMindsetMessages(
      synced,
      [
        {
          role: 'assistant',
          content: buildMindsetIntroMessage(String(synced?.pathId || activeMindsetPathId) as any, auth?.currentUser?.username || null),
          stepId: 'mindset:intro',
          timestamp: Date.now(),
        },
        ...(nextPrompt
          ? [{
              role: 'assistant' as const,
              content: buildMindsetAssistantPromptText(nextPrompt),
              stepId: nextPrompt.id,
              timestamp: Date.now(),
            }]
          : []),
      ]
    );
  }, [activeMindsetPathId, auth?.currentUser?.username, buildMindsetAssistantPromptText, getMindsetPromptsForPath]);

  const startMindsetPath = useCallback((pathId: string) => {
    const prompts = getMindsetPromptsForPath(pathId);
    if (!prompts.length) return;
    setShivError(null);
    setShivInput('');
    setMindsetPickerQuery('');
    setMindsetBodySelection([]);
    const baseSession = createEmptyMindsetSession(pathId as any, prompts);
    const nextSession = hydrateMindsetSession(baseSession);
    persistMindsetSession(nextSession);
    setMindsetSessionViewId(nextSession.id);
  }, [getMindsetPromptsForPath, hydrateMindsetSession, persistMindsetSession]);

  const handleResumeMindsetSession = useCallback((session: any) => {
    if (!session) return;
    const prompts = getMindsetPromptsForPath(String(session?.pathId || activeMindsetPathId));
    const synced = syncMindsetSessionCursor({ ...session, status: 'in_progress' }, prompts);
    persistMindsetSession(synced);
    setMindsetSessionViewId(String(synced.id));
    setShivError(null);
    setShivInput('');
    setMindsetPickerQuery('');
  }, [activeMindsetPathId, getMindsetPromptsForPath, persistMindsetSession]);

  const handleExitMindsetPath = useCallback(() => {
    if (syncedMindsetSession && syncedMindsetSession.status === 'in_progress') {
      persistMindsetSession({ ...syncedMindsetSession, status: 'abandoned' });
    }
    setMindsetSessionViewId(null);
    setShivInput('');
    setShivError(null);
    setMindsetPickerQuery('');
    setMindsetBodySelection([]);
  }, [persistMindsetSession, syncedMindsetSession]);

  const getMindsetReplyDisplayText = useCallback((prompt: any, rawReply: string | string[]) => {
    if (Array.isArray(rawReply)) {
      return rawReply
        .map((value) => prompt?.choices?.find((choice: any) => choice.value === value)?.label || value)
        .join(', ');
    }
    const pickerLabel = prompt?.pickerItems?.find((item: any) => item.id === rawReply)?.label;
    if (pickerLabel) return pickerLabel;
    const choiceLabel = prompt?.choices?.find((choice: any) => choice.value === rawReply)?.label;
    return choiceLabel || String(rawReply || '').trim();
  }, []);

  useEffect(() => {
    if (!viewedMindsetSession) return;
    const prompts = getMindsetPromptsForPath(String(viewedMindsetSession?.pathId || activeMindsetPathId));
    const synced = syncMindsetSessionCursor(viewedMindsetSession, prompts);
    if (
      synced.cursor.stepId !== viewedMindsetSession.cursor.stepId ||
      synced.cursor.stepIndex !== viewedMindsetSession.cursor.stepIndex ||
      synced.cursor.totalSteps !== viewedMindsetSession.cursor.totalSteps
    ) {
      persistMindsetSession(synced);
      return;
    }
    if ((synced.messages || []).length === 0) {
      persistMindsetSession(hydrateMindsetSession(synced));
    }
  }, [activeMindsetPathId, getMindsetPromptsForPath, hydrateMindsetSession, persistMindsetSession, viewedMindsetSession]);

  const handleMindsetReply = useCallback((rawReply: string | string[]) => {
    if (!syncedMindsetSession || !currentMindsetPrompt) return;
    const reply = Array.isArray(rawReply)
      ? rawReply.map((entry) => String(entry || '').trim()).filter(Boolean)
      : String(rawReply || '').trim();
    if ((Array.isArray(reply) && reply.length === 0) || (!Array.isArray(reply) && !reply)) return;
    if (!Array.isArray(reply) && /^reset$/i.test(reply)) {
      startMindsetPath(String(syncedMindsetSession.pathId || activeMindsetPathId));
      return;
    }

    setShivError(null);
    setShivInput('');
    setMindsetPickerQuery('');

    const userContent = getMindsetReplyDisplayText(currentMindsetPrompt, reply);
    let nextSession = appendMindsetMessages(syncedMindsetSession, [
      {
        role: 'user',
        content: userContent,
        stepId: currentMindsetPrompt.id,
        timestamp: Date.now(),
      },
    ]);

    nextSession = applyMindsetAnswerToSession(nextSession, currentMindsetPrompt, reply, {
      label: userContent,
    });
    nextSession = advanceMindsetSession(nextSession, mindsetPrompts);
    const nextPrompt = mindsetPrompts[nextSession.cursor.stepIndex] || null;
    const assistantMessages: Array<{ role: 'assistant'; content: string; stepId: string; timestamp: number }> = [];
    if (currentMindsetPrompt.kind === 'witness_detection' && !Array.isArray(reply) && String(reply).trim() === 'not_clear_yet') {
      assistantMessages.push({
        role: 'assistant',
        content: 'That which notices both is the witness, even if it does not feel stable yet.',
        stepId: `${currentMindsetPrompt.id}:grounding`,
        timestamp: Date.now(),
      });
    }
    assistantMessages.push({
      role: 'assistant',
      content: nextPrompt ? buildMindsetAssistantPromptText(nextPrompt) : formatMindsetCompletionMessage(nextSession),
      stepId: nextPrompt ? nextPrompt.id : 'mindset:complete',
      timestamp: Date.now(),
    });
    nextSession = appendMindsetMessages(nextSession, assistantMessages);
    persistMindsetSession(nextSession);
    if (!nextPrompt) {
      toast({ title: 'Mindset path saved', description: 'The unbreakable mindset run was saved.' });
    }
  }, [
    activeMindsetPathId,
    buildMindsetAssistantPromptText,
    currentMindsetPrompt,
    getMindsetReplyDisplayText,
    mindsetPrompts,
    persistMindsetSession,
    startMindsetPath,
    syncedMindsetSession,
    toast,
  ]);

  const refreshDesktopServerStatus = useCallback(async () => {
    const isDesktopRuntime =
      typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
    if (!isDesktopRuntime) return;
    const bridge = (window as any)?.studioDesktop;
    if (!bridge?.desktop?.environmentStatus) return;
    setIsRefreshingServerStatus(true);
    try {
      const nextStatus = await bridge.desktop.environmentStatus({
        kokoroBaseUrl: (settings?.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim(),
        xttsBaseUrl: (settings?.xttsTtsBaseUrl || DEFAULT_XTTS_BASE_URL).trim(),
        sttBaseUrl: (settings?.localSttBaseUrl || 'http://127.0.0.1:9890').trim(),
      });
      const kokoroResult = nextStatus?.kokoro || {};
      const xttsResult = Object.prototype.hasOwnProperty.call(nextStatus || {}, 'xtts')
        ? (nextStatus?.xtts || {})
        : { healthy: false, error: 'Restart desktop app to enable XTTS controls.' };
      const sttResult = nextStatus?.stt || {};
      setKokoroServerStatus({
        healthy: Boolean(kokoroResult?.healthy),
        mode: kokoroResult?.mode || null,
      });
      setXttsServerStatus({
        healthy: Boolean(xttsResult?.healthy),
        managed: Boolean(xttsResult?.managed),
        backend: String(xttsResult?.backend || ''),
        mode: xttsResult?.mode || null,
        error: String(xttsResult?.error || ''),
        warming: Boolean(xttsResult?.warming),
        warmingProgress: Number(xttsResult?.warmingProgress || 0),
        details: Array.isArray(xttsResult?.details) ? xttsResult.details.map((item: unknown) => String(item || '').trim()).filter(Boolean) : [],
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
  }, [settings?.kokoroTtsBaseUrl, settings?.localSttBaseUrl, settings?.xttsTtsBaseUrl, setSettings]);

  const handleCheckVoiceReadiness = useCallback(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('open-desktop-readiness-dialog'));
  }, []);

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

  const ensureAstraFolder = useCallback((leafName: string) => {
    const existingFolders = Array.isArray(auth?.resourceFolders) ? [...auth.resourceFolders] as ResourceFolder[] : [];
    const folderPath = ['Astra', leafName];
    let changed = false;
    let currentParentId: string | null = null;
    let currentFolderId: string | null = null;
    const nextFolders = [...existingFolders];

    folderPath.forEach((name) => {
      let folder = nextFolders.find((item) => item.name === name && item.parentId === currentParentId);
      if (!folder) {
        changed = true;
        folder = {
          id: `folder_astra_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name,
          parentId: currentParentId,
          icon: 'Folder',
        };
        nextFolders.push(folder);
      }
      currentParentId = folder.id;
      currentFolderId = folder.id;
    });

    if (changed && typeof auth?.setResourceFolders === 'function') {
      auth.setResourceFolders(nextFolders);
    }

    return currentFolderId;
  }, [auth]);

  const createAstraResource = useCallback(async (mode: AstraCreateMode, rawPrompt: string) => {
    const prompt = String(rawPrompt || '').trim();
    if (!prompt || isShivLoading) return;

    const userMessage: ShivChatMessage = { role: 'user', content: prompt };
    const nextHistory = [...shivMessages, userMessage].slice(-MAX_CHAT_HISTORY);
    setShivMessages(nextHistory);
    setShivInput('');
    setShivError(null);
    setIsShivLoading(true);

    try {
      const isDesktopRuntime =
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const response = await fetch('/api/ai/astra-create-resource', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          mode,
          prompt,
          aiConfig,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to create Astra card.'));
      }

      const folderId = ensureAstraFolder(mode === 'habit' ? 'Habits' : 'Mechanisms');
      if (!folderId) {
        throw new Error('Unable to create an Astra folder for the new card.');
      }

      let resource: Resource;
      let assistantSummary = 'Created a new card.';

      if (mode === 'habit') {
        const draft = (result?.draft || {}) as Partial<HabitDraft>;
        resource = {
          id: `res_astra_habit_${Date.now()}`,
          name: String(draft.name || 'New Habit').trim() || 'New Habit',
          folderId,
          type: 'habit',
          createdAt: new Date().toISOString(),
          state: String(draft.state || '').trim() || undefined,
          trigger: {
            action: String(draft.triggerAction || '').trim(),
          },
          response: {
            text: String(draft.negativeResponseText || '').trim(),
          },
          newResponse: {
            text: String(draft.positiveResponseText || '').trim(),
          },
        };
        assistantSummary = String(draft.summary || `Created habit card "${resource.name}".`).trim() || `Created habit card "${resource.name}".`;
      } else {
        const draft = (result?.draft || {}) as Partial<MechanismDraft>;
        const framework = draft.mechanismFramework === 'positive' ? 'positive' : 'negative';
        resource = {
          id: `res_astra_mechanism_${Date.now()}`,
          name: String(draft.name || 'New Mechanism').trim() || 'New Mechanism',
          folderId,
          type: 'mechanism',
          createdAt: new Date().toISOString(),
          mechanismFramework: framework,
          trigger: {
            action: String(draft.triggerAction || '').trim(),
            feeling: String(draft.emotionOrImage || '').trim(),
          },
          response: {
            visualize: String(draft.mechanismText || '').trim(),
          },
          benefit: String(draft.benefit || '').trim(),
          reward: String(draft.reward || '').trim(),
          newResponse: {
            visualize: String(draft.conditionVisualize || '').trim(),
            action: String(draft.conditionAction || '').trim(),
          },
          law: {
            premise: String(draft.lawPremise || '').trim(),
            outcome: String(draft.lawOutcome || '').trim(),
          },
        };
        assistantSummary = String(draft.summary || `Created ${framework} mechanism card "${resource.name}".`).trim()
          || `Created ${framework} mechanism card "${resource.name}".`;
      }

      if (typeof auth?.setResources === 'function') {
        auth.setResources((prev: Resource[]) => [...prev, resource]);
      }
      if (typeof auth?.openGeneralPopup === 'function') {
        auth.openGeneralPopup(resource.id, null);
      }

      setShivMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `${assistantSummary} Saved in Astra ${mode === 'habit' ? 'Habits' : 'Mechanisms'} and opened for editing.`,
          resourceId: resource.id,
          resourceName: resource.name,
        },
      ].slice(-MAX_CHAT_HISTORY));
      toast({
        title: mode === 'habit' ? 'Habit card created' : 'Mechanism card created',
        description: resource.name,
      });
    } catch (error) {
      setShivError(error instanceof Error ? error.message : 'Failed to create Astra card.');
    } finally {
      setIsShivLoading(false);
    }
  }, [auth, ensureAstraFolder, isShivLoading, settings, shivMessages, toast]);

  const detectAstraGap = useCallback(async (rawPrompt: string) => {
    const prompt = String(rawPrompt || '').trim();
    if (!prompt || isShivLoading) return;

    const userMessage: ShivChatMessage = { role: 'user', content: prompt };
    const nextHistory = [...shivMessages, userMessage].slice(-MAX_CHAT_HISTORY);
    setShivMessages(nextHistory);
    setShivInput('');
    setShivError(null);
    setIsShivLoading(true);

    try {
      const isDesktopRuntime =
        typeof window !== 'undefined' && Boolean((window as any)?.studioDesktop?.isDesktop);
      const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
      const response = await fetch('/api/ai/astra-detect-gap', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          prompt,
          aiConfig,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to analyze the issue.'));
      }

      const draft = (result?.draft || {}) as Partial<AstraGapDraft>;
      const status = draft.status === 'needs_issue' ? 'needs_issue' : 'diagnosed';
      let content = '';

      if (status === 'needs_issue') {
        const followUp = String(draft.followUpPrompt || '').trim();
        const dynamicReply = String(draft.dynamicReply || '').trim();
        content = [
          dynamicReply || "I need a real issue to diagnose, not a general question.",
          '',
          followUp || 'Try something like: "I feel stuck because I cannot finish anything I start."',
          '',
          'Best inputs for this mode:',
          '- what feels wrong',
          '- what feels missing',
          '- where you feel stuck, empty, conflicted, or blocked',
        ].join('\n');
      } else {
        const lines = [
          `User Issue: ${String(draft.userIssue || prompt).trim()}`,
          `External State: ${String(draft.externalState || 'Unknown').trim()}`,
          `Bothering: ${String(draft.bothering || 'Unknown').trim()}`,
          `Gap: ${String(draft.gap || 'Unknown').trim()}`,
          `Core Need: ${String(draft.coreNeed || 'Unknown').trim()}`,
          `Action Type: ${String(draft.actionType || 'Unknown').trim()}`,
          `Expected Outcome: ${String(draft.expectedOutcome || 'Unknown').trim()}`,
          '',
          'Dynamic Reply:',
          String(draft.dynamicReply || 'No dynamic reply was generated.').trim(),
        ];

        const confidence =
          typeof draft.confidence === 'number' && Number.isFinite(draft.confidence)
            ? Math.max(0, Math.min(1, draft.confidence))
            : null;
        if (confidence !== null || String(draft.alternativeState || '').trim() || String(draft.alternativeGap || '').trim()) {
          lines.push('');
        }
        if (confidence !== null) {
          lines.push(`Confidence: ${confidence.toFixed(2)}`);
        }
        if (String(draft.alternativeState || '').trim()) {
          lines.push(`Alternative State: ${String(draft.alternativeState).trim()}`);
        }
        if (String(draft.alternativeGap || '').trim()) {
          lines.push(`Alternative Gap: ${String(draft.alternativeGap).trim()}`);
        }
        content = lines.join('\n');
      }

      setShivMessages((prev) => [
        ...prev,
        { role: 'assistant', content },
      ].slice(-MAX_CHAT_HISTORY));
    } catch (error) {
      setShivError(error instanceof Error ? error.message : 'Failed to analyze the issue.');
    } finally {
      setIsShivLoading(false);
    }
  }, [isShivLoading, settings, shivMessages]);

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
      const effectiveOpenMode = shivPanelMode === 'anything' ? true : openChatMode;
      const effectiveScopes: ShivContextScopes = {
        ...contextScopes,
        resources: true,
        canvas: true,
      };
      const contextSnapshot = buildShivContextSnapshot(auth, effectiveScopes);
      if (resourceAstraContext?.resourceId) {
        const focusedResource = Array.isArray(auth?.resources)
          ? auth.resources.find((resource: any) => resource?.id === resourceAstraContext.resourceId)
          : null;
        (contextSnapshot as any).focusedResource = focusedResource || {
          id: resourceAstraContext.resourceId,
          name: resourceAstraContext.resourceName,
        };
      }

      const response = await fetch('/api/ai/ask-shiv', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-studio-desktop': isDesktopRuntime ? '1' : '0',
        },
        body: JSON.stringify({
          question: resourceAstraContext?.resourceName
            ? `You are in resource card mode for "${resourceAstraContext.resourceName}". Focus the answer on that resource unless the user clearly asks to broaden scope.\n\nUser question: ${question}`
            : question,
          history: nextHistory.slice(-MAX_CHAT_HISTORY),
          appContext: contextSnapshot,
          aiConfig,
          openMode: effectiveOpenMode,
          replyLanguage: String(settings?.astraReplyLanguage || 'auto').trim().toLowerCase(),
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(String(result?.details || result?.error || 'Failed to get Astra response.'));
      }

      const answer = typeof result?.answer === 'string' ? result.answer.trim() : '';
      if (!answer) {
        throw new Error('Astra returned an empty answer.');
      }

      setShivMessages((prev) => [...prev, { role: 'assistant', content: answer }].slice(-MAX_CHAT_HISTORY));
      if (isVoiceFlow) {
        const llmEndedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        voiceLatencyRef.current.question = question;
        voiceLatencyRef.current.mode = effectiveOpenMode ? 'open' : 'curated';
        voiceLatencyRef.current.llmMs = Math.max(0, llmEndedAt - llmStartedAt);
      }
      if (autoReadReplies || voiceChatModeRef.current) {
        const ttsStartedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        speakShivReply(answer, `assistant-voice-${Date.now()}`, () => {
          if (isVoiceFlow) {
            const ttsEndedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
            voiceLatencyRef.current.ttsMs = Math.max(0, ttsEndedAt - ttsStartedAt);
            void flushVoiceLatency();
          }
          if (voiceChatModeRef.current) {
            scheduleVoiceAutoRestart(700);
          }
        });
      } else if (voiceChatModeRef.current) {
        if (isVoiceFlow) {
          voiceLatencyRef.current.ttsMs = 0;
          void flushVoiceLatency();
        }
        scheduleVoiceAutoRestart(900);
      }
    } catch (error) {
      setShivError(error instanceof Error ? error.message : 'Failed to ask Astra.');
      if (voiceChatModeRef.current) {
        scheduleVoiceAutoRestart(1400);
      }
    } finally {
      setIsShivLoading(false);
    }
  };

  const submitShivTurn = useCallback(async (rawInput: string) => {
    const input = String(rawInput || '').trim();
    if (!input) return;
    if (speakingMessageKey || pendingReadMessageKey || isAssistantSpeakingRef.current) {
      stopSpeech();
    }
    if (shivPanelMode === 'guide') {
      handleGuideReply(input);
      return;
    }
    if (shivPanelMode === 'journal') {
      handleJournalReply(input);
      return;
    }
    if (shivPanelMode === 'mindset' && syncedMindsetSession && syncedMindsetSession.status !== 'completed') {
      handleMindsetReply(input);
      return;
    }
    if (shivPanelMode === 'create-habit') {
      await createAstraResource('habit', input);
      return;
    }
    if (shivPanelMode === 'create-mechanism') {
      await createAstraResource('mechanism', input);
      return;
    }
    if (shivPanelMode === 'detect-gap') {
      await detectAstraGap(input);
      return;
    }
    await sendShivQuestion(input);
  }, [createAstraResource, detectAstraGap, handleGuideReply, handleJournalReply, handleMindsetReply, pendingReadMessageKey, sendShivQuestion, shivPanelMode, speakingMessageKey, syncedMindsetSession]);

  const handleAskShiv = async () => {
    await submitShivTurn(shivInput);
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
        description: 'Add routine tasks first, then refresh Astra synonyms.',
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
        throw new Error(String(result?.details || result?.error || 'Failed to refresh Astra synonyms.'));
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
        title: 'Astra synonyms refreshed',
        description: `Updated ${Array.isArray(result?.updatedKeys) ? result.updatedKeys.length : 0} task alias groups.`,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to refresh Astra synonyms.';
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

  const clearVoiceAutoRestart = () => {
    if (voiceAutoRestartTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(voiceAutoRestartTimerRef.current);
      voiceAutoRestartTimerRef.current = null;
    }
  };

  function scheduleVoiceAutoRestart(delayMs = 1000) {
    if (typeof window === 'undefined') return;
    clearVoiceAutoRestart();
    voiceAutoRestartTimerRef.current = window.setTimeout(() => {
      voiceAutoRestartTimerRef.current = null;
      if (
        !voiceChatModeRef.current ||
        isAssistantSpeakingRef.current ||
        isShivLoading ||
        isGuideSaving ||
        isGuideGeneratingTree ||
        isGuideValidatingBothering ||
        isMicListening ||
        isMediaRecordingStt
      ) {
        return;
      }
      void startMediaSttRecording();
    }, delayMs);
  }

  const clearVoiceTurnTimers = () => {
    if (voiceTurnStopTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(voiceTurnStopTimerRef.current);
      voiceTurnStopTimerRef.current = null;
    }
    if (voiceTurnMaxTimerRef.current !== null && typeof window !== 'undefined') {
      window.clearTimeout(voiceTurnMaxTimerRef.current);
      voiceTurnMaxTimerRef.current = null;
    }
    if (voiceMonitorIntervalRef.current !== null && typeof window !== 'undefined') {
      window.clearInterval(voiceMonitorIntervalRef.current);
      voiceMonitorIntervalRef.current = null;
    }
  };

  const releaseMediaAnalysis = () => {
    clearVoiceTurnTimers();
    setVoiceActivityLevel(0);
    try {
      mediaSourceNodeRef.current?.disconnect();
    } catch {}
    try {
      mediaAnalyserRef.current?.disconnect();
    } catch {}
    mediaSourceNodeRef.current = null;
    mediaAnalyserRef.current = null;
    const audioContext = mediaAudioContextRef.current;
    mediaAudioContextRef.current = null;
    if (audioContext) {
      void audioContext.close().catch(() => {});
    }
  };

  const stopMediaSttRecording = () => {
    clearVoiceTurnTimers();
    lastVoiceListenStoppedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') {
      recorder.stop();
    }
  };

  const releaseMediaStream = () => {
    releaseMediaAnalysis();
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
    let preparedAudioBlob = audioBlob;
    try {
      preparedAudioBlob = await preprocessSpeechBlob(audioBlob);
    } catch {
      preparedAudioBlob = audioBlob;
    }
    const formData = new FormData();
    formData.append('audio', preparedAudioBlob, preparedAudioBlob.type === 'audio/wav' ? 'speech.wav' : 'speech.webm');
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
      if (/empty transcript|did not return a transcript|mostly no-speech|low-confidence transcript|filler-only transcript|unstable transcript/i.test(details)) {
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
    clearVoiceAutoRestart();
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
      discardManualTranscriptRef.current = false;
      setIsManualMicSession(!voiceChatModeRef.current);
      lastVoiceListenStartedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();

      const AudioContextCtor = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextCtor) {
        const audioContext = new AudioContextCtor();
        const sourceNode = audioContext.createMediaStreamSource(stream);
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 2048;
        analyser.smoothingTimeConstant = 0.82;
        sourceNode.connect(analyser);
        mediaAudioContextRef.current = audioContext;
        mediaSourceNodeRef.current = sourceNode;
        mediaAnalyserRef.current = analyser;
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          mediaChunksRef.current.push(event.data);
        }
      };

      recorder.onerror = () => {
        clearVoiceTurnTimers();
        setIsMediaRecordingStt(false);
        setIsManualMicSession(false);
        releaseMediaStream();
        setShivError('Audio recording failed.');
        toast({
          title: 'Mic error',
          description: 'Audio recording failed.',
          variant: 'destructive',
        });
      };

      recorder.onstop = async () => {
        clearVoiceTurnTimers();
        setIsMediaRecordingStt(false);
        const discardTranscript = discardManualTranscriptRef.current;
        discardManualTranscriptRef.current = false;
        setIsManualMicSession(false);
        lastVoiceListenStoppedAtRef.current = typeof performance !== 'undefined' ? performance.now() : Date.now();
        releaseMediaStream();
        const blob = new Blob(mediaChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        mediaChunksRef.current = [];
        if (isAssistantSpeakingRef.current) return;
        if (discardTranscript) {
          setShivInput('');
          return;
        }
        if (!blob.size) return;
        try {
          const transcript = await transcribeAudioBlob(blob);
          if (voiceChatModeRef.current && shivPanelMode === 'guide' && shouldIgnoreGuideVoiceTranscript(transcript)) {
            setShivError(null);
            return;
          }
          setShivInput(transcript);
          if (voiceChatModeRef.current && !isShivLoading) {
            await submitShivTurn(transcript);
          }
        } catch (error) {
          if (isEmptyTranscriptError(error)) {
            setShivError(null);
            return;
          }
          const message = error instanceof Error ? error.message : 'Speech-to-text transcription failed.';
          setShivError(message);
          toast({
            title: 'Mic error',
            description: message,
            variant: 'destructive',
          });
        }
      };

      recorder.start();
      setIsMediaRecordingStt(true);
      if (typeof window !== 'undefined') {
        const analyser = mediaAnalyserRef.current;
        const buffer = analyser ? new Uint8Array(analyser.fftSize) : null;
        const ambientSamples: number[] = [];
        let speechDetected = false;
        let speechStartedAt = 0;
        let silenceStartedAt = 0;
        const startedAt = typeof performance !== 'undefined' ? performance.now() : Date.now();
        const isAutoTurnMode = voiceChatModeRef.current;

        const stopRecorderIfActive = () => {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
          }
        };

        if (isAutoTurnMode) {
          voiceTurnMaxTimerRef.current = window.setTimeout(() => {
            stopRecorderIfActive();
          }, 15000);
        }

        if (analyser && buffer) {
          voiceMonitorIntervalRef.current = window.setInterval(() => {
            analyser.getByteTimeDomainData(buffer);
            let sumSquares = 0;
            for (let i = 0; i < buffer.length; i += 1) {
              const sample = (buffer[i] - 128) / 128;
              sumSquares += sample * sample;
            }
            const rms = Math.sqrt(sumSquares / buffer.length);
            const normalizedLevel = Math.max(0, Math.min(1, (rms - 0.01) / 0.08));
            setVoiceActivityLevel((prev) => prev * 0.55 + normalizedLevel * 0.45);
            const now = typeof performance !== 'undefined' ? performance.now() : Date.now();

            if (ambientSamples.length < 8) {
              ambientSamples.push(rms);
            }
            const ambientFloor = ambientSamples.length
              ? ambientSamples.reduce((total, sample) => total + sample, 0) / ambientSamples.length
              : 0;
            const speechThreshold = Math.max(0.018, ambientFloor * 2.8);
            const silenceThreshold = Math.max(0.012, ambientFloor * 1.8);

            if (!isAutoTurnMode) {
              return;
            }

            if (!speechDetected) {
              if (rms >= speechThreshold) {
                speechDetected = true;
                speechStartedAt = now;
                silenceStartedAt = 0;
                return;
              }
              if (now - startedAt > 4000) {
                stopRecorderIfActive();
              }
              return;
            }

            if (rms >= silenceThreshold) {
              silenceStartedAt = 0;
              return;
            }

            if (!silenceStartedAt) {
              silenceStartedAt = now;
              return;
            }

            const spokenLongEnough = speechStartedAt > 0 && now - speechStartedAt >= 700;
            if (spokenLongEnough && now - silenceStartedAt >= 1400) {
              stopRecorderIfActive();
            }
          }, 120);
        }
      }
    } catch (error) {
      releaseMediaStream();
      setIsMediaRecordingStt(false);
      setVoiceActivityLevel(0);
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
    if (isMicListening || isMediaRecordingStt || isShivLoading) return;
    if (speakingMessageKey) {
      stopSpeech();
      return;
    }
    setShivError(null);
    void startMediaSttRecording();
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

  const handleCancelManualMic = () => {
    discardManualTranscriptRef.current = true;
    stopMediaSttRecording();
  };

  const handleCommitManualMic = () => {
    discardManualTranscriptRef.current = false;
    stopMediaSttRecording();
  };

  const handleToggleVoiceChatMode = () => {
    const next = !isVoiceChatMode;
    setIsVoiceChatMode(next);
    if (next) {
      setShivError(null);
      scheduleVoiceAutoRestart(300);
      toast({
        title: 'Voice chat mode on',
        description: 'Speak to ask. Astra will reply with voice.',
      });
      return;
    }
    clearVoiceAutoRestart();
    stopShivMic();
    stopMediaSttRecording();
    stopSpeech();
    toast({
      title: 'Voice chat mode off',
      description: 'Switched back to text chat.',
    });
  };

  useEffect(() => {
    if (shivPanelMode !== 'guide') {
      lastAutoReadGuideMessageKeyRef.current = null;
      return;
    }
    const lastIndex = guideMessages.length - 1;
    if (lastIndex < 0) return;
    const lastMessage = guideMessages[lastIndex];
    if (!lastMessage || lastMessage.role !== 'assistant') return;
    if (!isVoiceChatMode && !autoReadReplies) return;
    const messageKey = `guide-assistant-${lastIndex}-${String(lastMessage.content || '').slice(0, 32)}`;
    if (lastAutoReadGuideMessageKeyRef.current === messageKey) return;
    lastAutoReadGuideMessageKeyRef.current = messageKey;
    void speakShivReply(lastMessage.content, messageKey, () => {
      if (voiceChatModeRef.current) {
        scheduleVoiceAutoRestart(700);
      }
    });
  }, [autoReadReplies, guideMessages, isVoiceChatMode, shivPanelMode]);

  useEffect(() => {
    if (shivPanelMode !== 'journal') {
      lastAutoReadJournalMessageKeyRef.current = null;
      return;
    }
    const lastIndex = journalMessages.length - 1;
    if (lastIndex < 0) return;
    const lastMessage = journalMessages[lastIndex];
    if (!lastMessage || lastMessage.role !== 'assistant') return;
    if (!isVoiceChatMode && !autoReadReplies) return;
    const messageKey = `journal-assistant-${String(lastMessage.promptId || lastIndex)}-${String(lastMessage.content || '').slice(0, 32)}`;
    if (lastAutoReadJournalMessageKeyRef.current === messageKey) return;
    lastAutoReadJournalMessageKeyRef.current = messageKey;
    void speakShivReply(lastMessage.content, messageKey, () => {
      if (voiceChatModeRef.current) {
        scheduleVoiceAutoRestart(700);
      }
    });
  }, [autoReadReplies, isVoiceChatMode, journalMessages, shivPanelMode]);

  useEffect(() => {
    if (shivPanelMode !== 'mindset' || !syncedMindsetSession) {
      lastAutoReadMindsetMessageKeyRef.current = null;
      return;
    }
    const lastIndex = mindsetMessages.length - 1;
    if (lastIndex < 0) return;
    const lastMessage = mindsetMessages[lastIndex];
    if (!lastMessage || lastMessage.role !== 'assistant') return;
    if (!isVoiceChatMode && !autoReadReplies) return;
    const messageKey = `mindset-assistant-${String(lastMessage.stepId || lastIndex)}-${String(lastMessage.content || '').slice(0, 32)}`;
    if (lastAutoReadMindsetMessageKeyRef.current === messageKey) return;
    lastAutoReadMindsetMessageKeyRef.current = messageKey;
    void speakShivReply(lastMessage.content, messageKey, () => {
      if (voiceChatModeRef.current) {
        scheduleVoiceAutoRestart(700);
      }
    });
  }, [autoReadReplies, isVoiceChatMode, mindsetMessages, shivPanelMode, syncedMindsetSession]);

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
    isAssistantSpeakingRef.current = false;
    cloudPlaybackSessionRef.current += 1;
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
    stopSpeech();
    isAssistantSpeakingRef.current = true;
    stopShivMic();
    stopMediaSttRecording();
    const cloudVoice = parseCloudVoiceURI(effectiveChatVoiceUri);
    if (cloudVoice?.provider === 'kokoro') {
      try {
        const aiConfig = getAiConfigFromSettings(settings, isDesktopRuntime);
        const kokoroBaseUrl = String(settings?.kokoroTtsBaseUrl || 'http://127.0.0.1:8880').trim();
        const requestCloudBlob = async (chunkText: string) => {
          const response = await fetch('/api/ai/tts', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(isDesktopRuntime ? { 'x-studio-desktop': '1' } : {}),
            },
            body: JSON.stringify({
              text: chunkText,
              provider: cloudVoice.provider,
              voice: cloudVoice.id,
              speed: chatVoiceRate,
              kokoroBaseUrl,
              aiConfig,
            }),
          });
          if (!response.ok) {
            const result = await response.json().catch(() => ({}));
            const errorText = String(result?.error || '');
            const details = String(result?.details || '');
            if (/could not find the mounted voice sample/i.test(errorText)) {
              throw new Error('XTTS sample is not saved in the mounted voice folder yet. Open Settings, record or choose the sample again, then save it.');
            }
            throw new Error(String(details || result?.error || 'Kokoro TTS failed.'));
          }
          return response.blob();
        };

        const cleanText = cleanSpeechText(content);
        const chunks = [cleanText];
        const playbackSession = cloudPlaybackSessionRef.current + 1;
        cloudPlaybackSessionRef.current = playbackSession;
        setPendingReadMessageKey(messageKey);
        const blobPromises = new Map<number, Promise<Blob>>();

        const getBlobForChunk = (index: number) => {
          if (blobPromises.has(index)) return blobPromises.get(index)!;
          const promise = requestCloudBlob(chunks[index] || '');
          blobPromises.set(index, promise);
          return promise;
        };

        const playChunk = async (index: number): Promise<void> => {
          if (cloudPlaybackSessionRef.current !== playbackSession) return;
          const blob = await getBlobForChunk(index);
          if (cloudPlaybackSessionRef.current !== playbackSession) return;
          if (index + 1 < chunks.length) {
            void getBlobForChunk(index + 1);
          }
          if (cloudAudioUrlRef.current) {
            try { URL.revokeObjectURL(cloudAudioUrlRef.current); } catch {}
          }
          const url = URL.createObjectURL(blob);
          cloudAudioUrlRef.current = url;
          const audio = new Audio(url);
          cloudAudioRef.current = audio;
          audio.onplaying = () => {
            if (cloudPlaybackSessionRef.current !== playbackSession) return;
            setPendingReadMessageKey(null);
            setSpeakingMessageKey(messageKey);
          };
          audio.onended = () => {
            try { URL.revokeObjectURL(url); } catch {}
            if (cloudAudioUrlRef.current === url) cloudAudioUrlRef.current = null;
            if (cloudAudioRef.current === audio) cloudAudioRef.current = null;
            if (cloudPlaybackSessionRef.current !== playbackSession) return;
            if (index + 1 < chunks.length) {
              void playChunk(index + 1);
              return;
            }
            isAssistantSpeakingRef.current = false;
            setSpeakingMessageKey(null);
            setPendingReadMessageKey(null);
            setManualReadMessageKey(null);
            onDone?.();
          };
          audio.onerror = () => {
            try { URL.revokeObjectURL(url); } catch {}
            if (cloudAudioUrlRef.current === url) cloudAudioUrlRef.current = null;
            if (cloudAudioRef.current === audio) cloudAudioRef.current = null;
            if (cloudPlaybackSessionRef.current !== playbackSession) return;
            isAssistantSpeakingRef.current = false;
            setSpeakingMessageKey(null);
            setPendingReadMessageKey(null);
            setManualReadMessageKey(null);
            setShivError('Kokoro chat voice playback failed.');
          };
          await audio.play();
        };

        await playChunk(0);
        return;
      } catch (error) {
        isAssistantSpeakingRef.current = false;
        setPendingReadMessageKey(null);
        setManualReadMessageKey(null);
        setShivError(error instanceof Error ? error.message : 'Kokoro chat voice failed.');
        return;
      }
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      isAssistantSpeakingRef.current = false;
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
    const preferredVoice = systemVoices.find((voice) => voice.voiceURI === chatSystemVoiceUri);
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
        isAssistantSpeakingRef.current = false;
        activeUtteranceRef.current = null;
        setSpeakingMessageKey(null);
        setPendingReadMessageKey(null);
        setManualReadMessageKey(null);
        onDone?.();
      }
    };
    utterance.onerror = () => {
      if (speechSessionRef.current === sessionId) {
        isAssistantSpeakingRef.current = false;
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
    if (typeof window === 'undefined') return;

    const handleOpenAstraTaskScript = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskName?: string; content?: string }>;
      const taskName = String(customEvent.detail?.taskName || '').trim();
      const script = String(customEvent.detail?.content || '').trim();
      if (!script) return;

      const content = taskName
        ? `Task context script for "${taskName}"\n\n${script}`
        : script;
      const messageKey = `assistant-task-script-${Date.now()}`;

      if (speakingMessageKey || pendingReadMessageKey || isAssistantSpeakingRef.current) {
        stopSpeech();
      }

      setShivPanelMode('anything');
      setIsShivOpen(true);
      setShivInput('');
      setShivError(null);
      setShivMessages((prev) => [...prev, { role: 'assistant', content }].slice(-MAX_CHAT_HISTORY));
      void speakShivReply(content, messageKey, () => {
        if (voiceChatModeRef.current) {
          scheduleVoiceAutoRestart(700);
        }
      });
    };

    window.addEventListener('open-astra-task-script', handleOpenAstraTaskScript as EventListener);
    return () => {
      window.removeEventListener('open-astra-task-script', handleOpenAstraTaskScript as EventListener);
    };
  }, [pendingReadMessageKey, speakingMessageKey, stopSpeech, speakShivReply]);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleOpenAstraResourceChat = (event: Event) => {
      const customEvent = event as CustomEvent<{ resourceId?: string; resourceName?: string }>;
      const resourceId = String(customEvent.detail?.resourceId || '').trim();
      const resourceName = String(customEvent.detail?.resourceName || '').trim();
      if (!resourceId) return;

      if (speakingMessageKey || pendingReadMessageKey || isAssistantSpeakingRef.current) {
        stopSpeech();
      }

      setResourceAstraContext({ resourceId, resourceName: resourceName || 'Resource Card' });
      setShivPanelMode('anything');
      setIsShivOpen(true);
      setShivInput('');
      setShivError(null);
      setShivMessages([]);
    };

    window.addEventListener('open-astra-resource-chat', handleOpenAstraResourceChat as EventListener);
    return () => {
      window.removeEventListener('open-astra-resource-chat', handleOpenAstraResourceChat as EventListener);
    };
  }, [pendingReadMessageKey, speakingMessageKey, stopSpeech]);

  useEffect(() => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      setSystemVoices(voices);
      if (!chatSystemVoiceUri && voices.length > 0) {
        setChatSystemVoiceUri(voices[0].voiceURI);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, [chatSystemVoiceUri]);

  useEffect(() => {
    if (!chatKokoroVoiceUri && kokoroChatVoices.length > 0) {
      setChatKokoroVoiceUri(kokoroChatVoices[0].voiceURI);
    }
  }, [chatKokoroVoiceUri, kokoroChatVoices]);

  useEffect(() => {
    if (!isDesktopRuntime && isShivOpen) {
      setIsShivOpen(false);
    }
  }, [isDesktopRuntime, isShivOpen]);

  const handleOpenAstraPanel = useCallback(() => {
    setResourceAstraContext(null);
    setShivPanelMode(shivDefaultMode);
    setIsShivOpen(true);
  }, [shivDefaultMode]);

  const getResourceAiNoteTitle = useCallback((content: string, fallback = 'AI Note') => {
    const firstLine = String(content || '')
      .split('\n')
      .map((line) => line.replace(/^[-#*\s>]+/, '').trim())
      .find(Boolean);
    return (firstLine || fallback).slice(0, 80);
  }, []);

  const saveReplyToResource = useCallback((content: string) => {
    const resourceId = resourceAstraContext?.resourceId;
    const text = String(content || '').trim();
    if (!resourceId || !text || typeof auth?.setResources !== 'function') return;

    const point = {
      id: `point_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: 'ai-note',
      text,
      displayText: getResourceAiNoteTitle(text, 'AI Note'),
    };

    auth.setResources((prev: any[]) => prev.map((resource: any) => (
      resource?.id === resourceId
        ? { ...resource, points: [...(Array.isArray(resource?.points) ? resource.points : []), point] }
        : resource
    )));

    toast({
      title: 'AI note saved',
      description: resourceAstraContext?.resourceName
        ? `Saved to ${resourceAstraContext.resourceName}.`
        : 'Saved to the linked resource card.',
    });
  }, [auth, getResourceAiNoteTitle, resourceAstraContext, toast]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const rawVoice = localStorage.getItem(SHIV_VOICE_SETTINGS_KEY);
      if (rawVoice) {
        const parsed = JSON.parse(rawVoice);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.systemVoiceUri === 'string') {
            setChatSystemVoiceUri(parsed.systemVoiceUri);
          } else if (typeof parsed.voiceUri === 'string') {
            const legacyVoice = parseCloudVoiceURI(parsed.voiceUri);
            if (!legacyVoice) {
              setChatSystemVoiceUri(parsed.voiceUri);
            }
          }
          if (typeof parsed.kokoroVoiceUri === 'string') {
            setChatKokoroVoiceUri(parsed.kokoroVoiceUri);
          } else if (typeof parsed.voiceUri === 'string') {
            const legacyVoice = parseCloudVoiceURI(parsed.voiceUri);
            if (legacyVoice?.provider === 'kokoro') {
              setChatKokoroVoiceUri(parsed.voiceUri);
            }
          }
          if (typeof parsed.rate === 'number') setChatVoiceRate(Math.max(0.6, Math.min(1.6, parsed.rate)));
          if (typeof parsed.autoReadReplies === 'boolean') setAutoReadReplies(parsed.autoReadReplies);
          if (typeof parsed.openChatMode === 'boolean') setOpenChatMode(parsed.openChatMode);
          if (isShivPanelMode(parsed.defaultMode)) {
            setShivDefaultMode(parsed.defaultMode);
            setShivPanelMode(parsed.defaultMode);
          }
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
        JSON.stringify({
          systemVoiceUri: chatSystemVoiceUri,
          kokoroVoiceUri: chatKokoroVoiceUri,
          rate: chatVoiceRate,
          autoReadReplies,
          openChatMode,
          defaultMode: shivDefaultMode,
        })
      );
    } catch {
      // ignore storage errors
    }
  }, [chatKokoroVoiceUri, chatSystemVoiceUri, chatVoiceRate, autoReadReplies, openChatMode, shivDefaultMode]);

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
      releaseMediaAnalysis();
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
            onClick={handleOpenAstraPanel}
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full"
            title="Ask Astra"
          >
            <Bot className="h-5 w-5" />
            <span className="sr-only">Ask Astra</span>
          </Button>
        ) : null}
        <Button
          onClick={() => setIsGoalTasksOpen(true)}
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-full"
          title="Show today's goal-linked tasks"
        >
          <Target className="h-5 w-5" />
          <span className="sr-only">Show today's goal-linked tasks</span>
        </Button>
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
      {isGoalTasksOpen && (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[2px]"
          onClick={() => setIsGoalTasksOpen(false)}
        >
          <div
            className="flex h-[90vh] w-[95vw] max-w-[95vw] flex-col overflow-hidden rounded-3xl border border-border/70 bg-background/95 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-border/60 px-6 py-4">
              <div>
                <div className="text-lg font-semibold">Today's Goal Tasks</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {formatGoalTrayDateLabel(todayGoalPopupData.todayKey, 'EEEE, MMM d')}
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-full"
                onClick={() => setIsGoalTasksOpen(false)}
                title="Close goal tasks popup"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close goal tasks popup</span>
              </Button>
            </div>
            <div className="flex flex-wrap gap-2 border-b border-border/60 px-6 py-3 text-xs text-muted-foreground">
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                {todayGoalPopupData.activeGoalCount} active goal{todayGoalPopupData.activeGoalCount === 1 ? '' : 's'}
              </span>
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                {todayGoalPopupData.goalsWithScheduledTasks} goal{todayGoalPopupData.goalsWithScheduledTasks === 1 ? '' : 's'} with tasks today
              </span>
              <span className="rounded-full border border-border/60 bg-muted/30 px-3 py-1">
                {todayGoalPopupData.scheduledTaskCount} linked task{todayGoalPopupData.scheduledTaskCount === 1 ? '' : 's'} scheduled today
              </span>
            </div>
            <ScrollArea className="flex-1 px-6 py-5">
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Total Time Logged</div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">
                      {formatGoalTrayLoggedDuration(todayGoalPopupData.totalLoggedMinutes) || '0m logged'}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Across today&apos;s linked goal tasks
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Completed / Total</div>
                    <div className="mt-3 text-2xl font-semibold text-foreground">
                      {todayGoalPopupData.completedTaskCount}/{todayGoalPopupData.scheduledTaskCount}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {todayGoalPopupData.pendingTaskCount} pending today
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">Weight Goal</div>
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div>
                        <div className="text-2xl font-semibold text-foreground">
                          {todayGoalPopupData.currentWeight !== null ? `${todayGoalPopupData.currentWeight.toFixed(1)} kg/lb` : '--'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Current weight</div>
                      </div>
                      <div className="text-right">
                        <div className={cn(
                          'text-lg font-semibold',
                          typeof todayGoalPopupData.weightDifference === 'number'
                            ? todayGoalPopupData.weightDifference < 0
                              ? 'text-emerald-300'
                              : todayGoalPopupData.weightDifference > 0
                                ? 'text-amber-300'
                                : 'text-sky-300'
                            : 'text-foreground'
                        )}>
                          {typeof todayGoalPopupData.weightDifference === 'number'
                            ? todayGoalPopupData.weightDifference === 0
                              ? 'At goal'
                              : `${Math.abs(todayGoalPopupData.weightDifference).toFixed(1)} ${todayGoalPopupData.weightDifference < 0 ? 'to lose' : 'to gain'}`
                            : '--'}
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {todayGoalPopupData.goalWeight !== null ? `Goal ${todayGoalPopupData.goalWeight.toFixed(1)} kg/lb` : 'Set a goal weight'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {todayGoalPopupData.entries.length === 0 ? (
                  <div className="col-span-full rounded-2xl border border-dashed border-border/60 bg-muted/20 px-4 py-10 text-center text-sm text-muted-foreground">
                    No active goals found.
                  </div>
                ) : (
                  todayGoalPopupData.entries.map((goal) => (
                    <div key={goal.id} className="flex h-full flex-col rounded-2xl border border-border/60 bg-muted/20 p-3.5">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[15px] font-semibold">{goal.title}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                            <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1 capitalize">
                              {goal.priority} priority
                            </span>
                            <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                              {goal.tasks.length} scheduled today
                            </span>
                            {goal.dueDate ? (
                              <span className="rounded-full border border-border/60 bg-background/70 px-2.5 py-1">
                                Due {formatGoalTrayDateLabel(goal.dueDate, 'MMM d')}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 rounded-full border border-border/60 bg-background/70 text-muted-foreground hover:text-foreground"
                          onClick={() => activeGoalContributionId === goal.id ? closeGoalContributionComposer(goal.id) : openGoalContributionComposer(goal.id)}
                          title="Add a one-off task that contributed to this goal today"
                        >
                          <Plus className="h-4 w-4" />
                          <span className="sr-only">Add one-off contribution task</span>
                        </Button>
                      </div>
                      {activeGoalContributionId === goal.id ? (
                        <div className="mt-3 rounded-xl border border-border/60 bg-background/50 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">Pick from today&apos;s scheduled tasks</div>
                            <Button type="button" variant="ghost" size="sm" onClick={() => closeGoalContributionComposer(goal.id)}>
                              Close
                            </Button>
                          </div>
                          {todayGoalPopupData.scheduledNonRoutineTasks.length === 0 ? (
                            <div className="mt-3 rounded-lg border border-dashed border-border/60 bg-background/40 px-3 py-3 text-sm text-muted-foreground">
                              No non-routine tasks are scheduled today.
                            </div>
                          ) : (
                            <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                              {todayGoalPopupData.scheduledNonRoutineTasks.map((scheduledTask) => {
                                const alreadyAssignedToThisGoal = scheduledTask.contributedGoalId === goal.id;
                                return (
                                  <button
                                    key={scheduledTask.id}
                                    type="button"
                                    className={cn(
                                      'flex w-full items-center justify-between gap-3 rounded-lg border px-3 py-2 text-left transition-colors',
                                      alreadyAssignedToThisGoal
                                        ? 'border-emerald-500/40 bg-emerald-500/10'
                                        : 'border-border/60 bg-background/40 hover:border-primary/40 hover:bg-background/70'
                                    )}
                                    onClick={() => handleAssignScheduledTaskToGoal(goal.id, goal.title, scheduledTask.id)}
                                  >
                                    <div className="min-w-0 flex-1">
                                      <div className={cn('truncate text-sm font-medium', scheduledTask.completed && 'line-through text-muted-foreground')}>
                                        {scheduledTask.title}
                                      </div>
                                      <div className="mt-0.5 text-[11px] text-muted-foreground">{scheduledTask.slotName}</div>
                                    </div>
                                    <div className="shrink-0 text-[11px] text-muted-foreground">
                                      {alreadyAssignedToThisGoal ? 'Added' : 'Add'}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      ) : null}
                      {goal.tasks.length === 0 ? (
                        <div className="mt-3 rounded-xl border border-dashed border-border/60 bg-background/50 px-3 py-3 text-sm text-muted-foreground">
                          No linked tasks from this goal are scheduled in today's time slots.
                        </div>
                      ) : (
                        <div className="mt-3 overflow-hidden rounded-xl border border-border/50 bg-background/40">
                          {goal.tasks.map((task) => (
                            <div
                              key={task.id}
                              className="flex items-center justify-between gap-3 border-b border-border/40 px-3 py-2.5 last:border-b-0"
                            >
                              <div className="flex min-w-0 flex-1 items-start gap-2.5">
                                <span
                                  className={cn(
                                    "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border",
                                    task.completed
                                      ? "border-emerald-400/60 bg-emerald-500/15 text-emerald-300"
                                      : "border-border/70 bg-background/70 text-transparent"
                                  )}
                                  aria-hidden="true"
                                >
                                  <Check className="h-3.5 w-3.5" />
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className={cn("truncate text-sm font-medium leading-5", task.completed && "line-through text-muted-foreground")}>{task.title}</div>
                                  <div className={cn("text-[11px] text-muted-foreground", task.completed && "line-through")}>{task.slotName}</div>
                                  {task.loggedDurationLabel ? (
                                    <div className="text-[11px] text-muted-foreground">{task.loggedDurationLabel}</div>
                                  ) : null}
                                  {task.source === 'contribution' ? (
                                    <div className="text-[11px] text-sky-300">One-off contribution</div>
                                  ) : null}
                                </div>
                              </div>
                              <span
                                className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                  task.status === 'completed'
                                    ? 'bg-emerald-500/15 text-emerald-300'
                                    : task.status === 'due'
                                      ? 'bg-amber-500/15 text-amber-300'
                                      : 'bg-sky-500/15 text-sky-300'
                                }`}
                              >
                                {task.status === 'completed' ? 'Completed' : task.status === 'due' ? 'Due now' : 'Upcoming'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))
                )}
                </div>
              </div>
            </ScrollArea>
          </div>
        </div>
      )}
      {isDesktopRuntime && isShivOpen && (
        <div className="fixed bottom-20 right-4 z-[70] flex h-[40rem] max-h-[calc(100vh-6rem)] w-[32rem] max-w-[calc(100vw-1rem)] flex-col rounded-xl border bg-background/95 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-muted/40">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold leading-none">Astra</div>
                {resourceAstraContext?.resourceName ? (
                  <div className="mt-1 flex min-w-0 items-center gap-1.5">
                    <span className="rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-sky-300">
                      Resource
                    </span>
                    <span className="truncate text-[11px] text-muted-foreground" title={resourceAstraContext.resourceName}>
                      {resourceAstraContext.resourceName}
                    </span>
                  </div>
                ) : (
                  <div className="mt-1 text-[11px] text-muted-foreground">
                    {selectedShivModeMeta.label}
                  </div>
                )}              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select value={shivPanelMode} onValueChange={(value) => setShivPanelMode(value as ShivPanelMode)}>
                <SelectTrigger
                  className="h-8 w-[6.5rem] border-border/60 bg-muted/30 px-2 text-xs"
                  title={selectedShivModeMeta.description}
                  aria-label="Astra mode"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="z-[130]">
                  {ASTRA_PANEL_MODE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value} className="text-xs">
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {resourceAstraContext ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  title="Exit resource mode"
                  onClick={() => setResourceAstraContext(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              ) : null}
              <div className="flex items-center gap-1 border-l border-border/60 pl-2">
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
                    <Button variant="ghost" size="icon" className="h-7 w-7" title="Astra settings">
                      <Settings2 className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent side="bottom" align="end" className="z-[120] w-72 p-3">
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-semibold">Astra Settings</div>
                      <div className="text-[11px] text-muted-foreground">{chatVoiceRate.toFixed(2)}x</div>
                    </div>
                    <div className="grid grid-cols-[1.2fr_0.8fr] gap-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-muted-foreground">Default mode</label>
                        <Select value={shivDefaultMode} onValueChange={(value) => setShivDefaultMode(value as ShivPanelMode)}>
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="z-[130]">
                            {ASTRA_PANEL_MODE_OPTIONS.map((option) => (
                              <SelectItem key={`default-${option.value}`} value={option.value}>
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-muted-foreground">Speed</label>
                        <div className="rounded-md border border-border/60 px-2 py-2">
                          <Slider
                            value={[chatVoiceRate]}
                            min={0.6}
                            max={1.6}
                            step={0.05}
                            onValueChange={(val) => setChatVoiceRate(val[0] ?? 1)}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-2 md:grid-cols-2">
                      <div className="space-y-1">
                        <label className="block text-[11px] text-muted-foreground">System voice</label>
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={chatSystemVoiceUri}
                          onChange={(e) => setChatSystemVoiceUri(e.target.value)}
                        >
                          {systemVoices.map((voice) => (
                            <option key={voice.voiceURI} value={voice.voiceURI}>
                              {voice.name} ({voice.lang})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-[11px] text-muted-foreground">Kokoro voice</label>
                        <select
                          className="h-8 w-full rounded-md border bg-background px-2 py-1 text-sm"
                          value={chatKokoroVoiceUri}
                          onChange={(e) => setChatKokoroVoiceUri(e.target.value)}
                          disabled={kokoroChatVoices.length === 0}
                        >
                          {kokoroChatVoices.length > 0 ? (
                            kokoroChatVoices.map((voice) => (
                              <option key={voice.voiceURI} value={voice.voiceURI}>
                                {voice.name}
                              </option>
                            ))
                          ) : (
                            <option value="">No Kokoro voices available</option>
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="text-[11px] leading-relaxed text-muted-foreground">
                      Kokoro is preferred when online. If it is offline, Astra falls back to the system voice.
                    </div>
                    <div className="space-y-1.5 rounded-md border border-border/60 p-2">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Kokoro</span>
                        <span className={kokoroServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {kokoroServerStatus.healthy
                            ? `running${kokoroServerStatus.mode ? ` (${kokoroServerStatus.mode})` : ''}`
                            : 'offline'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">XTTS</span>
                        <span className={xttsServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {xttsServerStatus.healthy
                            ? `running${xttsServerStatus.mode ? ` (${xttsServerStatus.mode})` : xttsServerStatus.backend ? ` (${xttsServerStatus.backend})` : xttsServerStatus.managed ? ' (managed)' : ''}`
                            : xttsServerStatus.warming
                            ? 'warming up'
                            : xttsServerStatus.error
                            ? 'unavailable'
                            : 'offline'}
                        </span>
                      </div>
                      {xttsServerStatus.warming ? (
                        <div className="space-y-1">
                          <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                            <div
                              className="h-full rounded-full bg-emerald-400/80 transition-all duration-300"
                              style={{ width: `${Math.max(6, Math.min(100, Number(xttsServerStatus.warmingProgress || 0)))}%` }}
                            />
                          </div>
                          <div className="text-[10px] text-muted-foreground">
                            XTTS is starting{xttsServerStatus.warmingProgress ? ` (${Math.round(xttsServerStatus.warmingProgress)}%)` : ''}.
                          </div>
                        </div>
                      ) : null}
                      {!xttsServerStatus.healthy && xttsServerStatus.error ? (
                        <div className="text-[10px] text-muted-foreground">
                          {xttsServerStatus.error}
                        </div>
                      ) : null}
                      {!xttsServerStatus.healthy && xttsServerStatus.details?.length ? (
                        <div className="space-y-1 text-[10px] text-muted-foreground">
                          {xttsServerStatus.details.slice(0, 2).map((detail) => (
                            <div key={detail} className="break-all">
                              {detail}
                            </div>
                          ))}
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">Local STT</span>
                        <span className={sttServerStatus.healthy ? 'text-emerald-400' : 'text-muted-foreground'}>
                          {sttServerStatus.healthy
                            ? `running${sttServerStatus.mode ? ` (${sttServerStatus.mode})` : sttServerStatus.backend ? ` (${sttServerStatus.backend})` : sttServerStatus.managed ? ' (managed)' : ''}`
                            : 'offline'}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void handleCheckVoiceReadiness()}
                        >
                          Check readiness
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => void refreshDesktopServerStatus()}
                          disabled={isRefreshingServerStatus}
                        >
                          {isRefreshingServerStatus ? 'Checking...' : 'Refresh status'}
                        </Button>
                      </div>
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
                  clearVoiceAutoRestart();
                  stopShivMic();
                  stopMediaSttRecording();
                  stopSpeech();
                }
              }}>
                <X className="h-4 w-4" />
              </Button>
              </div>
            </div>
          </div>
          <ScrollArea className="min-h-0 flex-1 px-3 py-2">
            {shivPanelMode === 'guide' ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-border/70 bg-muted/40 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Lost to action flow</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Use the state diagram strategically: reality {'->'} bothering {'->'} domain {'->'} specialization {'->'} learning plan {'->'} routine {'->'} link.
                      </p>
                    </div>
                    <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleOpenStateDiagram}>
                      Open diagram
                    </Button>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {SHIV_GUIDE_STATES.map((state) => (
                      <div
                        key={state.id}
                        className={`rounded-lg border px-2 py-2 text-xs ${
                          activeGuideState === state.id ? 'border-primary/60 bg-primary/10' : 'border-border/60 bg-background/40'
                        }`}
                      >
                        <div className="font-medium">{state.label}</div>
                        <div className="mt-1 text-[11px] text-muted-foreground">{state.note}</div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <div className="mb-3 text-xs text-muted-foreground">
                    Reply in plain text. You can type names naturally, `yes`/`no`, `skip`, or `reset`.
                  </div>
                  {isGuideValidatingBothering && (
                    <div className="mb-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Validating bothering and generating grounded options...
                    </div>
                  )}
                  {guideBotheringReview.reason && guideSession.step === 'bothering_pick_option' && (
                    <div className="mb-3 rounded-md border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      {guideBotheringReview.classification !== 'bothering' ? `${guideBotheringReview.classification}: ` : ''}
                      {guideBotheringReview.meansVsEnd !== 'unclear' ? `(${guideBotheringReview.meansVsEnd}) ` : ''}
                      {guideBotheringReview.reason}
                    </div>
                  )}
                  <div className="space-y-2">
                    {guideMessages.map((msg, idx) => (
                      <div key={`guide-${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={msg.role === 'user' ? 'max-w-[88%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm' : 'max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm'}>
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                            {msg.role === 'user' ? 'You' : 'Astra'}
                          </div>
                          <div className="break-words">{renderChatContent(msg.content, msg.role)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                  {guideChoiceOptions.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {guideChoiceOptions.map((option) => (
                        <Button
                          key={`${guideSession.step}-${option.value}`}
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleGuideReply(option.value)}
                          disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering}
                        >
                          {option.label}
                        </Button>
                      ))}
                    </div>
                  )}
                  {guideShowsDatePicker && (
                    <div className="mt-3 flex items-center gap-2">
                      <input
                        type="date"
                        className="h-9 flex-1 rounded-md border bg-background px-3 py-2 text-sm"
                        value={
                          guideSession.step === 'learning_target_date'
                            ? (guideDraft.learningPaths.find((path) => path.id === guideSession.activeLearningPathId)?.targetDate || '')
                            : guideDraft.projectEndDate
                        }
                        onChange={(e) => {
                          const value = e.target.value;
                          if (!value) return;
                          handleGuideReply(value);
                        }}
                        disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering}
                      />
                      {guideDateIsOptional && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-9 text-xs"
                          onClick={() => handleGuideReply('skip')}
                          disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering}
                        >
                          Skip
                        </Button>
                      )}
                    </div>
                  )}
                  {(guideSession.step === 'domain' || guideSession.step === 'specialization') && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button
                        variant={guideSession.step === 'domain' ? (guideDraft.domainMode === 'new' ? 'secondary' : 'outline') : (guideDraft.specializationMode === 'new' ? 'secondary' : 'outline')}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (guideSession.step === 'domain') {
                            setGuideDraft((prev) => ({ ...prev, domainMode: 'new', domainId: '' }));
                          } else {
                            setGuideDraft((prev) => ({ ...prev, specializationMode: 'new', specializationId: '' }));
                          }
                        }}
                      >
                        Add new
                      </Button>
                      <Button
                        variant={guideSession.step === 'domain' ? (guideDraft.domainMode === 'existing' ? 'secondary' : 'outline') : (guideDraft.specializationMode === 'existing' ? 'secondary' : 'outline')}
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          if (guideSession.step === 'domain') {
                            setGuideDraft((prev) => ({ ...prev, domainMode: 'existing' }));
                          } else {
                            setGuideDraft((prev) => ({ ...prev, specializationMode: 'existing' }));
                          }
                        }}
                      >
                        Existing
                      </Button>
                    </div>
                  )}
                  {guideShowsPicker && (
                    <div className="mt-3 rounded-md border border-border/60">
                      <Command>
                        <CommandInput
                          placeholder="Search..."
                          value={guidePickerQuery}
                          onValueChange={setGuidePickerQuery}
                        />
                        <CommandList>
                          <CommandEmpty>No matches found.</CommandEmpty>
                          <CommandGroup>
                            {filteredGuidePickerItems.map((item) => (
                              <CommandItem key={`${guideSession.step}-${item.id}`} value={item.name} onSelect={() => handleGuideReply(item.name)}>
                                {item.name}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </div>
                  )}
                </div>
                <div className="rounded-xl border border-border/70 bg-background/50 p-3 text-xs text-muted-foreground space-y-1">
                  <div>Bothering: {guideDraft.botheringText || 'Pending'}</div>
                  <div>Domain: {guideDraft.domainMode === 'existing' ? (skillDomains.find((d: any) => d.id === guideDraft.domainId)?.name || 'Pending') : (guideDraft.domainName || 'Pending')}</div>
                  <div>Specialization: {guideDraft.specializationMode === 'existing' ? (specializations.find((s: any) => s.id === guideDraft.specializationId)?.name || 'Pending') : (guideDraft.specializationName || 'Pending')}</div>
                  <div>Learning paths: {guideDraft.learningPaths.filter((path) => path.title.trim()).length}</div>
                  <div>Project plan: {guideDraft.createProjectPlan ? (guideDraft.projectName || 'In progress') : 'Skipped'}</div>
                  <div>Routine: {guideDraft.routineDetails || 'Skipped or pending'}</div>
                </div>
                {shivError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {shivError}
                  </div>
                )}
              </div>
            ) : shivPanelMode === 'journal' ? (
              <div className="space-y-3">
                <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold">Daily Journal</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Review elapsed slots, active botherings, and missed work one question at a time.
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      {syncedJournalSession?.status === 'completed'
                        ? 'Completed'
                        : currentJournalPrompt
                          ? `Step ${Math.min((syncedJournalSession?.cursor.stepIndex || 0) + 1, syncedJournalSession?.cursor.totalSteps || journalPrompts.length)} / ${syncedJournalSession?.cursor.totalSteps || journalPrompts.length}`
                          : 'Ready'}
                    </div>
                  </div>
                  {currentJournalPrompt && (
                    <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                      Current prompt: {currentJournalPrompt.prompt}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  {journalMessages.length === 0 && (
                    <p className="text-xs text-muted-foreground">
                      Start Journal to review today&apos;s elapsed slots and botherings.
                    </p>
                  )}
                  {journalMessages.map((msg: any, idx: number) => (
                    <div key={`journal-${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={
                          msg.role === 'user'
                            ? 'max-w-[88%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm'
                            : 'max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm'
                        }
                      >
                        <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                          {msg.role === 'user' ? 'You' : 'Astra'}
                        </div>
                        <div className="break-words whitespace-pre-wrap">{renderChatContent(msg.content, msg.role)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                {journalChoiceOptions.length > 0 && (currentJournalPrompt || awaitingJournalStopperPrompt) && (
                  <div className="flex flex-wrap gap-2">
                    {journalChoiceOptions.map((option) => (
                      <Button
                        key={`${currentJournalPrompt.id}-${option.value}`}
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => handleJournalReply(option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                )}
                {shivError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {shivError}
                  </div>
                )}
              </div>
            ) : shivPanelMode === 'mindset' ? (
              <div className="space-y-3">
                {!syncedMindsetSession ? (
                  <>
                    {pendingMindsetSession && !mindsetSessionViewId && (
                      <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold">Resume previous path</div>
                            <p className="mt-1 text-xs text-muted-foreground">
                              {ASTRA_MINDSET_PATHS.find((path) => path.id === pendingMindsetSession.pathId)?.label || 'Mindset path'} is still available to resume.
                            </p>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {pendingMindsetSession.status === 'abandoned' ? 'Paused' : 'In progress'}
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <Button size="sm" className="h-8 text-xs" onClick={() => handleResumeMindsetSession(pendingMindsetSession)}>
                            Resume
                          </Button>
                          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startMindsetPath(String(pendingMindsetSession.pathId || selectedMindsetPathMeta.id))}>
                            Restart
                          </Button>
                          <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setMindsetSessionViewId(null)}>
                            Exit to chat
                          </Button>
                        </div>
                      </div>
                    )}
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                      <div className="text-sm font-semibold">Unbreakable Mindset</div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        Choose a path to start a structured run, or use free chat below if you only want to talk to Astra.
                      </p>
                      <div className="mt-3 grid gap-2">
                        {ASTRA_MINDSET_PATHS.map((path) => (
                          <button
                            key={path.id}
                            type="button"
                            className="rounded-lg border border-border/60 bg-muted/20 px-3 py-3 text-left transition hover:border-primary/40 hover:bg-primary/5"
                            onClick={() => startMindsetPath(path.id)}
                          >
                            <div className="text-sm font-medium">{path.label}</div>
                            <div className="mt-1 text-xs text-muted-foreground">{path.description}</div>
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      {shivMessages.length === 0 && (
                        <p className="text-xs text-muted-foreground">
                          Start a path above, or ask Astra about mindset in free chat.
                        </p>
                      )}
                      {shivMessages.map((msg, idx) => {
                        const messageKey = `${msg.role}-${idx}-${(msg.content || '').slice(0, 24)}`;
                        return (
                          <div key={`mindset-chat-${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={
                                msg.role === 'user'
                                  ? 'max-w-[88%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm'
                                  : 'max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm'
                              }
                            >
                              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {msg.role === 'user' ? 'You' : 'Astra'}
                              </div>
                              <div className="break-words">{renderChatContent(msg.content, msg.role)}</div>
                              {msg.role === 'assistant' && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {msg.resourceId ? (
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-7 text-xs"
                                      onClick={() => auth.openGeneralPopup?.(msg.resourceId as string, null)}
                                    >
                                      <Library className="mr-1 h-3 w-3" />
                                      {msg.resourceName ? `Open ${msg.resourceName}` : 'Open Card'}
                                    </Button>
                                  ) : null}
                                  {!autoReadReplies && !isVoiceChatMode ? (
                                    pendingReadMessageKey === messageKey && manualReadMessageKey === messageKey ? (
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
                                    )
                                  ) : null}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  <>
                    <div className="rounded-xl border border-border/70 bg-background/50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">{selectedMindsetPathMeta?.label || 'Mindset path'}</div>
                          <p className="mt-1 text-xs text-muted-foreground">
                            {selectedMindsetPathMeta?.description || 'Structured mindset path.'}
                          </p>
                        </div>
                        <div className="text-right text-xs text-muted-foreground">
                          {syncedMindsetSession?.status === 'completed'
                            ? 'Completed'
                            : currentMindsetPrompt
                              ? `Step ${Math.min((syncedMindsetSession?.cursor.stepIndex || 0) + 1, syncedMindsetSession?.cursor.totalSteps || mindsetPrompts.length)} / ${syncedMindsetSession?.cursor.totalSteps || mindsetPrompts.length}`
                              : 'Ready'}
                        </div>
                      </div>
                      {syncedMindsetSession?.linkTarget?.label && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          Linked {syncedMindsetSession.linkTarget.type}: {syncedMindsetSession.linkTarget.label}
                        </div>
                      )}
                      {currentMindsetPrompt && syncedMindsetSession?.status !== 'completed' && (
                        <div className="mt-3 rounded-lg border border-border/60 bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                          Current prompt: {currentMindsetPrompt.prompt}
                        </div>
                      )}
                    </div>
                    <div className="space-y-2">
                      {mindsetMessages.map((msg: any, idx: number) => {
                        const messageKey = `mindset-${String(msg?.stepId || idx)}-${String(msg?.content || '').slice(0, 24)}`;
                        return (
                          <div key={`mindset-${msg.role}-${idx}`} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={
                                msg.role === 'user'
                                  ? 'max-w-[88%] rounded-2xl rounded-br-md border border-primary/20 bg-primary/10 px-3 py-2 text-sm'
                                  : 'max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm'
                              }
                            >
                              <div className="mb-1 text-[10px] uppercase tracking-wide text-muted-foreground">
                                {msg.role === 'user' ? 'You' : 'Astra'}
                              </div>
                              <div className="break-words whitespace-pre-wrap">{renderChatContent(msg.content, msg.role)}</div>
                              {msg.role === 'assistant' && !autoReadReplies && !isVoiceChatMode && (
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
                    </div>
                    {currentMindsetPrompt?.kind === 'body_state_select' && syncedMindsetSession?.status !== 'completed' && (
                      <div className="space-y-2">
                        <div className="flex flex-wrap gap-2">
                          {mindsetChoiceOptions.map((option) => {
                            const selected = mindsetBodySelection.includes(option.value);
                            return (
                              <Button
                                key={`${currentMindsetPrompt.id}-${option.value}`}
                                variant={selected ? 'secondary' : 'outline'}
                                size="sm"
                                className="h-8 text-xs"
                                onClick={() =>
                                  setMindsetBodySelection((prev) =>
                                    prev.includes(option.value)
                                      ? prev.filter((value) => value !== option.value)
                                      : [...prev, option.value]
                                  )
                                }
                              >
                                {option.label}
                              </Button>
                            );
                          })}
                        </div>
                        <Button size="sm" className="h-8 text-xs" onClick={() => handleMindsetReply(mindsetBodySelection)} disabled={!mindsetBodySelection.length}>
                          Continue
                        </Button>
                      </div>
                    )}
                    {mindsetChoiceOptions.length > 0 && currentMindsetPrompt && currentMindsetPrompt.kind !== 'body_state_select' && syncedMindsetSession?.status !== 'completed' && (
                      <div className="flex flex-wrap gap-2">
                        {mindsetChoiceOptions.map((option) => (
                          <Button
                            key={`${currentMindsetPrompt.id}-${option.value}`}
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleMindsetReply(option.value)}
                          >
                            {option.label}
                          </Button>
                        ))}
                      </div>
                    )}
                    {(currentMindsetPrompt?.kind === 'select_task' || currentMindsetPrompt?.kind === 'select_bothering') && syncedMindsetSession?.status !== 'completed' && (
                      <div className="rounded-md border border-border/60">
                        <Command>
                          <CommandInput
                            placeholder={currentMindsetPrompt?.placeholder || 'Search...'}
                            value={mindsetPickerQuery}
                            onValueChange={setMindsetPickerQuery}
                          />
                          <CommandList>
                            <CommandEmpty>No matches found.</CommandEmpty>
                            <CommandGroup>
                              {filteredMindsetPickerItems.map((item: any) => (
                                <CommandItem
                                  key={`${currentMindsetPrompt.id}-${item.id}`}
                                  value={`${item.label} ${item.description || ''}`}
                                  onSelect={() => handleMindsetReply(item.id)}
                                >
                                  <div className="flex flex-col">
                                    <span>{item.label}</span>
                                    {item.description ? <span className="text-[11px] text-muted-foreground">{item.description}</span> : null}
                                  </div>
                                </CommandItem>
                              ))}
                            </CommandGroup>
                          </CommandList>
                        </Command>
                      </div>
                    )}
                    {syncedMindsetSession?.status === 'completed' && (
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" className="h-8 text-xs" onClick={() => setMindsetSessionViewId(null)}>
                          Done
                        </Button>
                        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => startMindsetPath(String(syncedMindsetSession.pathId || selectedMindsetPathMeta.id))}>
                          Run again
                        </Button>
                        <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => setMindsetSessionViewId(null)}>
                          Return to chat
                        </Button>
                      </div>
                    )}
                  </>
                )}
                {shivError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {shivError}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {shivMessages.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    {resourceAstraContext?.resourceName
                      ? `Ask about "${resourceAstraContext.resourceName}" or use the mic to create AI notes for that resource.`
                      : shivPanelMode === 'create-habit'
                      ? 'Describe the trigger, bad loop, and better replacement. Astra will draft and save a habit card.'
                      : shivPanelMode === 'create-mechanism'
                      ? 'Describe the mechanism, and Astra will draft and save a mechanism card.'
                      : shivPanelMode === 'detect-gap'
                      ? 'Describe an issue. Astra will map it into external state, bothering, gap, core need, action type, and expected outcome.'
                      : shivPanelMode === 'anything'
                      ? 'Ask anything directly. Astra will answer broadly instead of staying limited to your app data.'
                      : shivPanelMode === 'mindset'
                        ? 'Ask about botherings, mismatch patterns, urges, resistance, and linked mindset tasks.'
                      : 'Ask anything about your app data, schedule, widgets, routines, goals, or logs.'}
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
                          {msg.role === 'user' ? 'You' : 'Astra'}
                        </div>
                        <div className="break-words">{renderChatContent(msg.content, msg.role)}</div>
                        {msg.role === 'assistant' && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {msg.resourceId ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => auth.openGeneralPopup?.(msg.resourceId as string, null)}
                              >
                                <Library className="mr-1 h-3 w-3" />
                                {msg.resourceName ? `Open ${msg.resourceName}` : 'Open Card'}
                              </Button>
                            ) : null}
                            {resourceAstraContext ? (
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => saveReplyToResource(msg.content)}
                              >
                                <Save className="mr-1 h-3 w-3" />
                                Save to Resource
                              </Button>
                            ) : null}
                            {!autoReadReplies && !isVoiceChatMode ? (
                              pendingReadMessageKey === messageKey && manualReadMessageKey === messageKey ? (
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
                              )
                            ) : null}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
                {isShivLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[88%] rounded-2xl rounded-bl-md border border-border/70 bg-muted/65 px-3 py-2 text-sm text-muted-foreground">
                      Astra is thinking...
                    </div>
                  </div>
                )}
                {shivError && (
                  <div className="rounded-md border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive">
                    {shivError}
                  </div>
                )}
              </div>
            )}
          </ScrollArea>
          <div className="border-t p-2">
            {shivPanelMode === 'guide' ? (
              <div className="space-y-2">
                {(isMicListening || isMediaRecordingStt) && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-xs font-medium text-emerald-100">
                        Listening{isMediaRecordingStt ? '...' : '.'}
                      </span>
                    </div>
                    <div className="flex h-6 items-end gap-1">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const baseLevel = isMediaRecordingStt ? voiceActivityLevel : 0.25;
                        const height = 6 + Math.round(Math.max(0.15, baseLevel) * (10 + index * 2));
                        return (
                          <span
                            key={`guide-voice-bar-${index}`}
                            className="w-1.5 rounded-full bg-emerald-300/90 transition-all duration-150 animate-pulse"
                            style={{
                              height,
                              opacity: 0.45 + Math.min(0.5, baseLevel + index * 0.06),
                              transform: `scaleY(${0.9 + Math.min(0.6, baseLevel * 0.7 + index * 0.03)})`,
                              animationDelay: `${index * 120}ms`,
                              animationDuration: '900ms',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={resetGuideDraft} disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering}>
                    Reset
                  </Button>
                  {!guideShouldHideInput ? (
                    <>
                      <Textarea
                        ref={guideTextareaRef}
                        value={shivInput}
                        onChange={(e) => {
                          setShivInput(e.target.value);
                          resizeTextareaToContent(e.currentTarget);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleGuideReply(shivInput);
                          }
                        }}
                        placeholder="Reply to Astra guide..."
                        disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering}
                        rows={1}
                        className="max-h-48 min-h-[2.5rem] resize-none overflow-y-auto leading-5"
                      />
                      {isManualMicSession && !isVoiceChatMode ? (
                        <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Cancel recording"
                            onClick={handleCancelManualMic}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Use recording"
                            onClick={handleCommitManualMic}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant={isMicListening || isMediaRecordingStt ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-9 w-9"
                          title={isMicListening || isMediaRecordingStt ? 'Stop speech-to-text' : 'Start speech-to-text'}
                          onClick={handleToggleShivMic}
                          disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering || Boolean(speakingMessageKey)}
                        >
                          {isMicListening || isMediaRecordingStt ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button onClick={() => handleGuideReply(shivInput)} disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering || !shivInput.trim()}>
                        {isGuideValidatingBothering ? 'Validating...' : isGuideGeneratingTree ? 'Generating...' : isGuideSaving ? 'Creating...' : 'Reply'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        {guideShowsDatePicker
                          ? 'Choose a date above.'
                          : 'Choose one of the buttons or pick from the searchable list above.'}
                      </div>
                      {isManualMicSession && !isVoiceChatMode ? (
                        <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Cancel recording"
                            onClick={handleCancelManualMic}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Use recording"
                            onClick={handleCommitManualMic}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant={isMicListening || isMediaRecordingStt ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-9 w-9"
                          title={isMicListening || isMediaRecordingStt ? 'Stop speech-to-text' : 'Start speech-to-text'}
                          onClick={handleToggleShivMic}
                          disabled={isGuideSaving || isGuideGeneratingTree || isGuideValidatingBothering || Boolean(speakingMessageKey)}
                        >
                          {isMicListening || isMediaRecordingStt ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ) : shivPanelMode === 'journal' ? (
              <div className="space-y-2">
                {(isMicListening || isMediaRecordingStt) && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-xs font-medium text-emerald-100">
                        Listening{isMediaRecordingStt ? '...' : '.'}
                      </span>
                    </div>
                    <div className="flex h-6 items-end gap-1">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const baseLevel = isMediaRecordingStt ? voiceActivityLevel : 0.25;
                        const height = 6 + Math.round(Math.max(0.15, baseLevel) * (10 + index * 2));
                        return (
                          <span
                            key={`journal-voice-bar-${index}`}
                            className="w-1.5 rounded-full bg-emerald-300/90 transition-all duration-150 animate-pulse"
                            style={{
                              height,
                              opacity: 0.45 + Math.min(0.5, baseLevel + index * 0.06),
                              transform: `scaleY(${0.9 + Math.min(0.6, baseLevel * 0.7 + index * 0.03)})`,
                              animationDelay: `${index * 120}ms`,
                              animationDuration: '900ms',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                <div className="flex items-end gap-2">
                  <Button variant="outline" size="sm" className="h-9 text-xs" onClick={startFreshJournalSession}>
                    Restart
                  </Button>
                  {currentJournalPrompt || effectiveJournalAwaitingStopperPromptId ? (
                    <>
                      <Textarea
                        ref={chatTextareaRef}
                        value={shivInput}
                        onChange={(e) => {
                          setShivInput(e.target.value);
                          resizeTextareaToContent(e.currentTarget);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleJournalReply(shivInput);
                          }
                        }}
                        placeholder={
                          effectiveJournalAwaitingStopperPromptId
                            ? 'Reply `done` after linking a stopper, or `skip`...'
                            : currentJournalPrompt?.placeholder || 'Reply to Astra journal...'
                        }
                        rows={1}
                        className="max-h-48 min-h-[2.5rem] resize-none overflow-y-auto leading-5"
                      />
                      {isManualMicSession && !isVoiceChatMode ? (
                        <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Cancel recording"
                            onClick={handleCancelManualMic}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Use recording"
                            onClick={handleCommitManualMic}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <Button
                          variant={isMicListening || isMediaRecordingStt ? 'secondary' : 'outline'}
                          size="icon"
                          className="h-9 w-9"
                          title={isMicListening || isMediaRecordingStt ? 'Stop speech-to-text' : 'Start speech-to-text'}
                          onClick={handleToggleShivMic}
                          disabled={Boolean(speakingMessageKey)}
                        >
                          {isMicListening || isMediaRecordingStt ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button onClick={() => handleJournalReply(shivInput)} disabled={!shivInput.trim()}>
                        Reply
                      </Button>
                    </>
                  ) : (
                    <div className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                      Journal complete. Use Restart to run today&apos;s journal again.
                    </div>
                  )}
                </div>
              </div>
            ) : shivPanelMode === 'mindset' ? (
              <div className="space-y-2">
                {(isMicListening || isMediaRecordingStt) && mindsetHasTextEntry && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-xs font-medium text-emerald-100">
                        Listening{isMediaRecordingStt ? '...' : '.'}
                      </span>
                    </div>
                    <div className="flex h-6 items-end gap-1">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const baseLevel = isMediaRecordingStt ? voiceActivityLevel : 0.25;
                        const height = 6 + Math.round(Math.max(0.15, baseLevel) * (10 + index * 2));
                        return (
                          <span
                            key={`mindset-voice-bar-${index}`}
                            className="w-1.5 rounded-full bg-emerald-300/90 transition-all duration-150 animate-pulse"
                            style={{
                              height,
                              opacity: 0.45 + Math.min(0.5, baseLevel + index * 0.06),
                              transform: `scaleY(${0.9 + Math.min(0.6, baseLevel * 0.7 + index * 0.03)})`,
                              animationDelay: `${index * 120}ms`,
                              animationDuration: '900ms',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
                {syncedMindsetSession ? (
                  <div className="flex items-end gap-2">
                    <Button variant="outline" size="sm" className="h-9 text-xs" onClick={() => startMindsetPath(String(syncedMindsetSession.pathId || selectedMindsetPathMeta.id))}>
                      Restart
                    </Button>
                    <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={handleExitMindsetPath}>
                      Exit path
                    </Button>
                    {syncedMindsetSession.status === 'completed' ? (
                      <div className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        Path complete. Use Done or Return to chat above, or restart it.
                      </div>
                    ) : mindsetHasTextEntry ? (
                      <>
                        <Textarea
                          ref={chatTextareaRef}
                          value={shivInput}
                          onChange={(e) => {
                            setShivInput(e.target.value);
                            resizeTextareaToContent(e.currentTarget);
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                              e.preventDefault();
                              handleMindsetReply(shivInput);
                            }
                          }}
                          placeholder={currentMindsetPrompt?.placeholder || 'Reply to Astra mindset path...'}
                          rows={1}
                          className="max-h-48 min-h-[2.5rem] resize-none overflow-y-auto leading-5"
                        />
                        {isManualMicSession && !isVoiceChatMode ? (
                          <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-full"
                              title="Cancel recording"
                              onClick={handleCancelManualMic}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="secondary"
                              size="icon"
                              className="h-9 w-9 rounded-full"
                              title="Use recording"
                              onClick={handleCommitManualMic}
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant={isMicListening || isMediaRecordingStt ? 'secondary' : 'outline'}
                            size="icon"
                            className="h-9 w-9"
                            title={isMicListening || isMediaRecordingStt ? 'Stop speech-to-text' : 'Start speech-to-text'}
                            onClick={handleToggleShivMic}
                            disabled={Boolean(speakingMessageKey)}
                          >
                            {isMicListening || isMediaRecordingStt ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                          </Button>
                        )}
                        <Button onClick={() => handleMindsetReply(shivInput)} disabled={!shivInput.trim()}>
                          Reply
                        </Button>
                      </>
                    ) : (
                      <div className="flex-1 rounded-md border border-border/60 px-3 py-2 text-xs text-muted-foreground">
                        {currentMindsetPrompt?.kind === 'body_state_select'
                          ? 'Select one or more body sensations above, then continue.'
                          : currentMindsetPrompt?.kind === 'select_task' || currentMindsetPrompt?.kind === 'select_bothering'
                            ? 'Pick one option from the searchable list above.'
                            : 'Choose one of the buttons above to continue the path.'}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-2">
                    {(isMicListening || isMediaRecordingStt) && (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                          </span>
                          <span className="text-xs font-medium text-emerald-100">
                            Listening{isMediaRecordingStt ? '...' : '.'}
                          </span>
                        </div>
                        <div className="flex h-6 items-end gap-1">
                          {[0, 1, 2, 3, 4].map((index) => {
                            const baseLevel = isMediaRecordingStt ? voiceActivityLevel : 0.25;
                            const height = 6 + Math.round(Math.max(0.15, baseLevel) * (10 + index * 2));
                            return (
                              <span
                                key={`mindset-free-voice-bar-${index}`}
                                className="w-1.5 rounded-full bg-emerald-300/90 transition-all duration-150 animate-pulse"
                                style={{
                                  height,
                                  opacity: 0.45 + Math.min(0.5, baseLevel + index * 0.06),
                                  transform: `scaleY(${0.9 + Math.min(0.6, baseLevel * 0.7 + index * 0.03)})`,
                                  animationDelay: `${index * 120}ms`,
                                  animationDuration: '900ms',
                                }}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    <div className="flex items-end gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="icon" className="h-9 w-9" title="Context scopes">
                            <Filter className="h-4 w-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent side="top" align="start" className="z-[120] w-64 p-3">
                          <div className="space-y-2">
                            <div className="text-xs font-semibold">Astra Context Scopes</div>
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
                              Enabled scopes are sent to Astra for richer answers.
                            </div>
                          </div>
                        </PopoverContent>
                      </Popover>
                      <Textarea
                        ref={chatTextareaRef}
                        value={shivInput}
                        onChange={(e) => {
                          setShivInput(e.target.value);
                          resizeTextareaToContent(e.currentTarget);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            void handleAskShiv();
                          }
                        }}
                        placeholder="Ask Astra about mindset, botherings, and resistance..."
                        disabled={isShivLoading}
                        rows={1}
                        className="max-h-48 min-h-[2.5rem] resize-none overflow-y-auto leading-5"
                      />
                      {isManualMicSession && !isVoiceChatMode ? (
                        <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Cancel recording"
                            onClick={handleCancelManualMic}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="secondary"
                            size="icon"
                            className="h-9 w-9 rounded-full"
                            title="Use recording"
                            onClick={handleCommitManualMic}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
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
                      )}
                      <Button onClick={() => void handleAskShiv()} disabled={isShivLoading || !shivInput.trim()}>
                        Ask
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {(isMicListening || isMediaRecordingStt) && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-400/30 bg-emerald-500/8 px-3 py-2">
                    <div className="flex items-center gap-2">
                      <span className="relative flex h-2.5 w-2.5">
                        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400/60" />
                        <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                      </span>
                      <span className="text-xs font-medium text-emerald-100">
                        Listening{isMediaRecordingStt ? '...' : '.'}
                      </span>
                    </div>
                    <div className="flex h-6 items-end gap-1">
                      {[0, 1, 2, 3, 4].map((index) => {
                        const baseLevel = isMediaRecordingStt ? voiceActivityLevel : 0.25;
                        const height = 6 + Math.round(Math.max(0.15, baseLevel) * (10 + index * 2));
                        return (
                          <span
                            key={`voice-bar-${index}`}
                            className="w-1.5 rounded-full bg-emerald-300/90 transition-all duration-150 animate-pulse"
                            style={{
                              height,
                              opacity: 0.45 + Math.min(0.5, baseLevel + index * 0.06),
                              transform: `scaleY(${0.9 + Math.min(0.6, baseLevel * 0.7 + index * 0.03)})`,
                              animationDelay: `${index * 120}ms`,
                              animationDuration: '900ms',
                            }}
                          />
                        );
                      })}
                    </div>
                  </div>
                )}
              <div className="flex items-end gap-2">
                {shivPanelMode !== 'create-habit' && shivPanelMode !== 'create-mechanism' && shivPanelMode !== 'detect-gap' ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button variant="outline" size="icon" className="h-9 w-9" title="Context scopes">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent side="top" align="start" className="z-[120] w-64 p-3">
                      <div className="space-y-2">
                        <div className="text-xs font-semibold">Astra Context Scopes</div>
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
                          Enabled scopes are sent to Astra for richer answers.
                        </div>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
                <Textarea
                  ref={chatTextareaRef}
                  value={shivInput}
                  onChange={(e) => {
                    setShivInput(e.target.value);
                    resizeTextareaToContent(e.currentTarget);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void handleAskShiv();
                    }
                  }}
                  placeholder={
                    resourceAstraContext?.resourceName
                      ? `Ask Astra about "${resourceAstraContext.resourceName}"...`
                      : shivPanelMode === 'create-habit'
                      ? 'Describe the habit card you want Astra to create...'
                      : shivPanelMode === 'create-mechanism'
                      ? 'Describe the mechanism card you want Astra to create...'
                      : shivPanelMode === 'detect-gap'
                      ? 'Describe the issue Astra should diagnose...'
                      : shivPanelMode === 'anything'
                      ? 'Ask anything...'
                      : shivPanelMode === 'mindset'
                        ? 'Ask Astra about mindset, botherings, and resistance...'
                        : 'Ask Astra about your app data...'
                  }
                  disabled={isShivLoading}
                  rows={1}
                  className="max-h-48 min-h-[2.5rem] resize-none overflow-y-auto leading-5"
                />
                {isManualMicSession && !isVoiceChatMode ? (
                  <div className="flex items-center gap-2 rounded-full bg-muted/60 p-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      title="Cancel recording"
                      onClick={handleCancelManualMic}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9 rounded-full"
                      title="Use recording"
                      onClick={handleCommitManualMic}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
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
                )}
                <Button onClick={() => void handleAskShiv()} disabled={isShivLoading || !shivInput.trim()}>
                  {shivPanelMode === 'create-habit' || shivPanelMode === 'create-mechanism'
                    ? 'Create'
                    : shivPanelMode === 'detect-gap'
                      ? 'Diagnose'
                      : 'Ask'}
                </Button>
              </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
