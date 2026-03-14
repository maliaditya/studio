
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Lightbulb, Zap, PlusCircle, Trash2, BookOpen, Workflow, ArrowRight, Brain, HeartPulse, HandHeart, TrendingUp, Edit, MinusCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Pattern, PatternPhrase, MetaRule, Resource } from '@/types/workout';
import { cn } from '@/lib/utils';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuGroup } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';

const STEP_ARROW = ' -> ';
const PATTERN_STATE_OPTIONS = ['Autonomy', 'Competence', 'Relatedness'] as const;
const NEGATIVE_PATTERN_CATEGORY_OPTIONS = ['Resistance', 'Avoidance', 'Emotional Distress'] as const;
const GROWTH_PATTERN_CATEGORY_OPTIONS = ['Initiative', 'Mastery', 'Connection'] as const;
const THREAT_SIGNAL_CATEGORY_OPTIONS = ['Emotional', 'Cognitive', 'Physiological'] as const;
const THREAT_SIGNAL_CATEGORY_TO_SIGNALS: Record<(typeof THREAT_SIGNAL_CATEGORY_OPTIONS)[number], readonly string[]> = {
    Emotional: ['Fear', 'Pain (emotional hurt)', 'Anger'],
    Cognitive: ['Doubt', 'Confusion'],
    Physiological: ['Stress', 'Fatigue', 'Hunger'],
};
const THREAT_SIGNAL_TO_CATEGORY: Record<string, string> = {
    ...Object.fromEntries(
    Object.entries(THREAT_SIGNAL_CATEGORY_TO_SIGNALS).flatMap(([category, signals]) =>
        signals.map((signal) => [signal, category])
    )
    ),
    'Doubt/confusion + stress/fatigue/hunger': 'Cognitive + Physiological',
};
const ALL_THREAT_SIGNALS = [
    ...(Object.values(THREAT_SIGNAL_CATEGORY_TO_SIGNALS).flat() as string[]),
    'Doubt/confusion + stress/fatigue/hunger',
];
const THREAT_SIGNALS_BY_STATE: Partial<Record<(typeof PATTERN_STATE_OPTIONS)[number], readonly string[]>> = {
    Autonomy: ['Fear', 'Pain (emotional hurt)', 'Anger'],
    Competence: ['Doubt', 'Confusion', 'Stress', 'Fatigue', 'Hunger', 'Doubt/confusion + stress/fatigue/hunger'],
    Relatedness: ['Fear', 'Pain (emotional hurt)', 'Anger'],
};
const GROWTH_SIGNAL_CATEGORY_OPTIONS = ['Cognitive', 'Emotional'] as const;
const GROWTH_SIGNAL_CATEGORY_TO_SIGNALS: Record<(typeof GROWTH_SIGNAL_CATEGORY_OPTIONS)[number], readonly string[]> = {
    Cognitive: ['Curiosity', 'Truth-Seeking', 'Inspiration'],
    Emotional: ['Compassion', 'Gratitude', 'Contentment'],
};
const GROWTH_SIGNAL_TO_CATEGORY = Object.fromEntries(
    Object.entries(GROWTH_SIGNAL_CATEGORY_TO_SIGNALS).flatMap(([category, signals]) =>
        signals.map((signal) => [signal, category])
    )
) as Record<string, (typeof GROWTH_SIGNAL_CATEGORY_OPTIONS)[number]>;
const ALL_GROWTH_SIGNALS = Object.values(GROWTH_SIGNAL_CATEGORY_TO_SIGNALS).flat() as string[];
const GROWTH_SIGNALS_BY_STATE: Partial<Record<(typeof PATTERN_STATE_OPTIONS)[number], readonly string[]>> = {
    Autonomy: ['Contentment'],
    Competence: ['Curiosity', 'Truth-Seeking', 'Inspiration'],
    Relatedness: ['Compassion', 'Gratitude', 'Contentment'],
};
const RESISTANCE_ACTION_TYPE_OPTIONS = ['arguing', 'rebellion', 'procrastination', 'pushing back'] as const;
const AVOIDANCE_ACTION_TYPE_OPTIONS = ['procrastination', 'distraction', 'delaying work', 'quitting'] as const;
const EMOTIONAL_DISTRESS_ACTION_TYPE_OPTIONS = ['rumination', 'loneliness', 'seeking validation', 'emotional reactions'] as const;
const PATTERN_CATEGORY_TO_STATE: Record<(typeof NEGATIVE_PATTERN_CATEGORY_OPTIONS)[number], (typeof PATTERN_STATE_OPTIONS)[number]> = {
    Resistance: 'Autonomy',
    Avoidance: 'Competence',
    'Emotional Distress': 'Relatedness',
};
const STATE_TO_PATTERN_CATEGORY: Record<(typeof PATTERN_STATE_OPTIONS)[number], (typeof NEGATIVE_PATTERN_CATEGORY_OPTIONS)[number]> = {
    Autonomy: 'Resistance',
    Competence: 'Avoidance',
    Relatedness: 'Emotional Distress',
};
const THREAT_TO_GROWTH_PATTERN: Record<(typeof NEGATIVE_PATTERN_CATEGORY_OPTIONS)[number], (typeof GROWTH_PATTERN_CATEGORY_OPTIONS)[number]> = {
    Resistance: 'Initiative',
    Avoidance: 'Mastery',
    'Emotional Distress': 'Connection',
};
const GROWTH_INTERPRETATION_BY_STATE: Record<(typeof PATTERN_STATE_OPTIONS)[number], { interpretation: string; thought: string }> = {
    Autonomy: {
        interpretation: 'I can choose my response.',
        thought: 'I have the freedom to decide my next step.',
    },
    Competence: {
        interpretation: 'I can learn this.',
        thought: 'I can figure this out.',
    },
    Relatedness: {
        interpretation: 'I can connect.',
        thought: 'I can build meaningful connections.',
    },
};
const THREAT_INTERPRETATION_BY_STATE: Record<(typeof PATTERN_STATE_OPTIONS)[number], { interpretation: string; thought: string }> = {
    Autonomy: {
        interpretation: 'My freedom or control is being restricted',
        thought: 'I am being controlled.',
    },
    Competence: {
        interpretation: 'I am not capable enough',
        thought: "I can't handle this.",
    },
    Relatedness: {
        interpretation: 'I may be rejected or not valued',
        thought: "I don't belong here.",
    },
};
const PATTERN_CATEGORY_TO_OUTCOMES: Record<(typeof NEGATIVE_PATTERN_CATEGORY_OPTIONS)[number], readonly string[]> = {
    Resistance: ['Energy Loss', 'Resource Loss', 'Regret', 'Energy Loss / Resource Loss'],
    Avoidance: ['Regret', 'Temporary Relief / Pleasure', 'Energy Loss', 'Regret / Resource Loss'],
    'Emotional Distress': ['Connection', 'Energy Loss', 'Regret'],
};
const RESISTANCE_ACTION_OUTCOME_MAP: Record<(typeof RESISTANCE_ACTION_TYPE_OPTIONS)[number], { outcome: string; why: string }> = {
    arguing: {
        outcome: 'Energy Loss',
        why: 'Conflict consumes mental energy',
    },
    rebellion: {
        outcome: 'Resource Loss',
        why: 'Rules broken and opportunities lost',
    },
    procrastination: {
        outcome: 'Regret',
        why: 'Task avoided and consequences come later',
    },
    'pushing back': {
        outcome: 'Energy Loss / Resource Loss',
        why: 'Friction with authority or the system',
    },
};
const AVOIDANCE_ACTION_OUTCOME_MAP: Record<(typeof AVOIDANCE_ACTION_TYPE_OPTIONS)[number], { outcome: string; why: string }> = {
    procrastination: {
        outcome: 'Regret',
        why: 'Work remains undone and pressure increases',
    },
    distraction: {
        outcome: 'Temporary Relief / Pleasure',
        why: 'Dopamine activity distracts from the problem',
    },
    'delaying work': {
        outcome: 'Energy Loss',
        why: 'Mental load stays active and drains energy',
    },
    quitting: {
        outcome: 'Regret / Resource Loss',
        why: 'Opportunity or progress is lost',
    },
};
const EMOTIONAL_DISTRESS_ACTION_OUTCOME_MAP: Record<(typeof EMOTIONAL_DISTRESS_ACTION_TYPE_OPTIONS)[number], { outcome: string; why: string }> = {
    rumination: {
        outcome: 'Energy Loss',
        why: 'Repetitive thinking drains mental energy',
    },
    loneliness: {
        outcome: 'Energy Loss',
        why: 'Isolation reduces emotional stability',
    },
    'seeking validation': {
        outcome: 'Connection',
        why: 'Attempts to restore belonging',
    },
    'emotional reactions': {
        outcome: 'Regret',
        why: 'Impulsive reactions damage relationships',
    },
};
const GROWTH_ACTION_TYPES_BY_STATE: Record<(typeof PATTERN_STATE_OPTIONS)[number], readonly string[]> = {
    Autonomy: ['Initiative', 'Decision making', 'Experimentation', 'Self-direction'],
    Competence: ['Learning', 'Practice', 'Problem solving', 'Skill building'],
    Relatedness: ['Supporting others', 'Expressing appreciation', 'Open communication', 'Collaboration'],
};
const GROWTH_ACTION_OUTCOME_BY_STATE: Record<(typeof PATTERN_STATE_OPTIONS)[number], Record<string, string>> = {
    Autonomy: {
        'Initiative': 'Momentum',
        'Decision making': 'Clarity',
        'Experimentation': 'Discovery',
        'Self-direction': 'Ownership',
    },
    Competence: {
        'Learning': 'Knowledge',
        'Practice': 'Skill improvement',
        'Problem solving': 'Capability',
        'Skill building': 'Mastery',
    },
    Relatedness: {
        'Supporting others': 'Mutual support',
        'Expressing appreciation': 'Trust',
        'Open communication': 'Understanding',
        'Collaboration': 'Connection',
    },
};

const getActionTypeOptions = (patternCategory: string) => {
    if (patternCategory === 'Resistance') return RESISTANCE_ACTION_TYPE_OPTIONS;
    if (patternCategory === 'Avoidance') return AVOIDANCE_ACTION_TYPE_OPTIONS;
    if (patternCategory === 'Emotional Distress') return EMOTIONAL_DISTRESS_ACTION_TYPE_OPTIONS;
    return null;
};

const getPatternCategoryOptions = (patternType: 'Positive' | 'Negative') => {
    if (patternType === 'Negative') return NEGATIVE_PATTERN_CATEGORY_OPTIONS;
    return [] as const;
};

const getOutcomeOptions = (patternCategory: string) => {
    return PATTERN_CATEGORY_TO_OUTCOMES[patternCategory as keyof typeof PATTERN_CATEGORY_TO_OUTCOMES] || [];
};

const getAvoidanceOutcomeMeta = (patternCategory: string, actionType: string) => {
    if (patternCategory !== 'Avoidance') return null;
    return AVOIDANCE_ACTION_OUTCOME_MAP[actionType as keyof typeof AVOIDANCE_ACTION_OUTCOME_MAP] || null;
};

const getResistanceOutcomeMeta = (patternCategory: string, actionType: string) => {
    if (patternCategory !== 'Resistance') return null;
    return RESISTANCE_ACTION_OUTCOME_MAP[actionType as keyof typeof RESISTANCE_ACTION_OUTCOME_MAP] || null;
};

const getEmotionalDistressOutcomeMeta = (patternCategory: string, actionType: string) => {
    if (patternCategory !== 'Emotional Distress') return null;
    return EMOTIONAL_DISTRESS_ACTION_OUTCOME_MAP[actionType as keyof typeof EMOTIONAL_DISTRESS_ACTION_OUTCOME_MAP] || null;
};

const getThreatInterpretationOptions = (patternCategory: string) => {
    if (patternCategory === 'Resistance') return ['My autonomy is being threatened.'];
    if (patternCategory === 'Avoidance') return ['My competence is being threatened.'];
    if (patternCategory === 'Emotional Distress') return ['My relatedness is being threatened.'];
    return [];
};
const getGrowthActionTypeOptions = (state: string) => {
    return GROWTH_ACTION_TYPES_BY_STATE[state as keyof typeof GROWTH_ACTION_TYPES_BY_STATE] || [];
};

const getGrowthOutcomeOptions = (state: string) => {
    return Object.values(GROWTH_ACTION_OUTCOME_BY_STATE[state as keyof typeof GROWTH_ACTION_OUTCOME_BY_STATE] || {});
};

const getGrowthOutcomeMeta = (state: string, actionType: string) => {
    const outcome = GROWTH_ACTION_OUTCOME_BY_STATE[state as keyof typeof GROWTH_ACTION_OUTCOME_BY_STATE]?.[actionType];
    return outcome ? { outcome } : null;
};

const buildPatternName = ({
    action1,
    cause1,
    action2,
    cause2,
    outcome,
    outcome2,
    includeSecondary,
}: {
    action1: string;
    cause1?: string;
    action2?: string;
    cause2?: string;
    outcome: string;
    outcome2?: string;
    includeSecondary?: boolean;
}) => {
    const nameParts = [];

    if (cause1?.trim()) {
        nameParts.push(cause1.trim());
    }
    if (action1.trim()) {
        nameParts.push(action1.trim());
    }
    if (includeSecondary && cause2?.trim()) {
        nameParts.push(cause2.trim());
    }
    if (includeSecondary && action2?.trim()) {
        nameParts.push(action2.trim());
    }
    nameParts.push((includeSecondary ? outcome2 : outcome)?.trim() || outcome.trim());
    return nameParts.join(STEP_ARROW);
};

const getPatternPathSummary = (pattern: Pattern) => {
    const parts = pattern.name.split(STEP_ARROW).map((part) => part.trim());
    const threatPath = {
        signal: pattern.threatSignal || parts[0] || '',
        action: pattern.threatAction || parts[1] || '',
        outcome: pattern.threatOutcome || parts[2] || '',
    };
    const growthPath = {
        signal: pattern.growthSignal || parts[3] || '',
        action: pattern.growthAction || parts[4] || '',
        outcome: pattern.growthOutcome || parts[5] || '',
    };
    return { threatPath, growthPath };
};


const FormattedPatternName = ({ name, type }: { name: string; type: 'Positive' | 'Negative' }) => {
    const parts = name.split(STEP_ARROW).map((p) => p.trim());

    const positiveColors = {
        cause: "text-yellow-500",
        plus: "text-amber-300",
        action: "text-orange-500",
        outcome: "text-green-500",
    };
    const negativeColors = {
        cause: "text-blue-500",
        plus: "text-sky-300",
        action: "text-teal-500",
        outcome: "text-red-500",
    };

    const colors = type === 'Positive' ? positiveColors : negativeColors;

    if (parts.length >= 6) {
        return (
            <span className="font-semibold">
                <span className={colors.cause}>{parts[0]}</span>
                <span className={`mx-1 ${colors.plus}`}>+</span>
                <span className={colors.action}>{parts[1]}</span>
                <span className="mx-1 text-muted-foreground">{STEP_ARROW.trim()}</span>
                <span className={colors.outcome}>{parts[2]}</span>
                <span className="mx-1 text-muted-foreground">{STEP_ARROW.trim()}</span>
                <span className={colors.cause}>{parts[3]}</span>
                <span className={`mx-1 ${colors.plus}`}>+</span>
                <span className={colors.action}>{parts[4]}</span>
                <span className="mx-1 text-muted-foreground">{STEP_ARROW.trim()}</span>
                <span className={colors.outcome}>{parts[5]}</span>
            </span>
        );
    }

    if (parts.length >= 3) {
        return (
            <span className="font-semibold">
                <span className={colors.cause}>{parts[0]}</span>
                <span className={`mx-1 ${colors.plus}`}>+</span>
                <span className={colors.action}>{parts[1]}</span>
                <span className="mx-1 text-muted-foreground">{STEP_ARROW.trim()}</span>
                <span className={colors.outcome}>{parts[2]}</span>
            </span>
        );
    }

    return <span className="font-semibold">{name}</span>;
};

const PatternFieldNode = ({ label, value, onChange, placeholder }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
}) => (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="mt-2" />
    </div>
);

const PatternSelectNode = ({ label, value, onChange, placeholder, options }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: readonly string[];
}) => (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Select value={value || undefined} onValueChange={onChange}>
            <SelectTrigger className="mt-2">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
                {options.map((option) => (
                    <SelectItem key={option} value={option}>{option}</SelectItem>
                ))}
            </SelectContent>
        </Select>
    </div>
);

const PatternActionNode = ({ label, value, onChange, placeholder, options }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    placeholder: string;
    options: readonly string[];
}) => {
    if (options.length > 0) {
        return (
            <PatternSelectNode
                label={label}
                value={value}
                onChange={onChange}
                placeholder="Select linked mechanism"
                options={options}
            />
        );
    }

    return <PatternFieldNode label={label} value={value} onChange={onChange} placeholder={placeholder} />;
};

const PatternEmptyNode = ({ label, placeholder }: { label: string; placeholder: string }) => (
    <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
        <Input value="" placeholder={placeholder} className="mt-2" disabled />
    </div>
);

const PatternEvidencePanel = ({
    habitGroups,
    activeHabitId,
    onFocusHabit,
    onTogglePhrase,
    selectedPhrases,
    footer,
}: {
    habitGroups: Array<{
        habitPhrase: PatternPhrase;
        evidenceByCategory: Record<string, PatternPhrase[]>;
    }>;
    activeHabitId: string | null;
    onFocusHabit: (habitId: string) => void;
    onTogglePhrase: (phrase: PatternPhrase) => void;
    selectedPhrases: PatternPhrase[];
    footer?: React.ReactNode;
}) => {
    const activeGroup = habitGroups.find((group) => group.habitPhrase.mechanismCardId === activeHabitId) ?? habitGroups[0];

    const isHabitSelected = (phrase: PatternPhrase) => selectedPhrases.some((p) =>
        (p.category === 'Habit Cards' && p.mechanismCardId === phrase.mechanismCardId) ||
        ((phrase as PatternPhrase & { linkedMechanismIds?: string[] }).linkedMechanismIds?.includes(p.mechanismCardId || ''))
    );

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" />Evidence Library</CardTitle>
                <CardDescription>Habit cards drive the selection. Pick a habit, then choose evidence from its linked mechanisms.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
                    <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-2">
                            <Workflow className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-semibold">Habit Controllers</h3>
                            <Badge variant="outline">{habitGroups.length}</Badge>
                        </div>
                        <ScrollArea className="h-[34rem] rounded-xl border border-border/50 p-3">
                            <div className="space-y-2">
                                {habitGroups.map((group) => {
                                    const phrase = group.habitPhrase;
                                    const isFocused = phrase.mechanismCardId === activeGroup?.habitPhrase.mechanismCardId;
                                    const isSelected = isHabitSelected(phrase);
                                    const evidenceCount = Object.values(group.evidenceByCategory).reduce((sum, phrases) => sum + phrases.length, 0);

                                    return (
                                        <div
                                            key={phrase.mechanismCardId}
                                            className={cn(
                                                "rounded-xl border transition-colors",
                                                isFocused ? "border-primary/40 bg-primary/5" : "border-border/30 bg-transparent"
                                            )}
                                        >
                                            <div className="flex items-start gap-3 p-3">
                                                <button
                                                    type="button"
                                                    onClick={() => onTogglePhrase(phrase)}
                                                    className="mt-0.5"
                                                >
                                                    <Checkbox checked={isSelected} className="pointer-events-none border-border/60 data-[state=checked]:border-border/70 data-[state=checked]:bg-muted-foreground data-[state=checked]:text-background" />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => onFocusHabit(phrase.mechanismCardId!)}
                                                    className="min-w-0 flex-1 text-left"
                                                >
                                                    <div className="flex flex-wrap items-center gap-2">
                                                        <p className="font-semibold text-foreground/95">{phrase.text}</p>
                                                        <Badge variant="outline">{evidenceCount} evidence</Badge>
                                                    </div>
                                                    {!!phrase.linkedMechanisms?.length && (
                                                        <p className="mt-1 text-xs text-muted-foreground/80">
                                                            Linked: {phrase.linkedMechanisms.join(', ')}
                                                        </p>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>

                    <div className="min-w-0">
                        <div className="mb-3 flex items-center gap-2">
                            <h3 className="font-semibold">Evidence From This Habit</h3>
                            {activeGroup && <Badge variant="outline">{activeGroup.habitPhrase.text}</Badge>}
                        </div>
                        <ScrollArea className="h-[34rem] rounded-xl border border-border/50 p-3">
                            {activeGroup ? (
                                <div className="space-y-5">
                                    {Object.entries(activeGroup.evidenceByCategory).map(([title, phrases]) => (
                                        <div key={title} className="min-w-0">
                                            <div className="mb-2 flex items-center gap-2">
                                                <h4 className="font-semibold">{title}</h4>
                                                <Badge variant="outline">{phrases.length}</Badge>
                                            </div>
                                            <div className="space-y-2">
                                                {phrases.map((phrase, i) => {
                                                    const isSelected = selectedPhrases.some((p) => p.text === phrase.text);
                                                    return (
                                                        <button
                                                            key={`${title}-${i}`}
                                                            type="button"
                                                            onClick={() => onTogglePhrase(phrase)}
                                                            className={cn(
                                                                "w-full rounded-xl border p-3 text-left transition-colors",
                                                                isSelected
                                                                    ? "border-border/50 bg-muted/35"
                                                                    : "border-border/30 bg-transparent hover:border-border/50 hover:bg-muted/15"
                                                            )}
                                                        >
                                                            <div className="flex items-start gap-3">
                                                                <Checkbox checked={isSelected} className="mt-0.5 pointer-events-none border-border/60 data-[state=checked]:border-border/70 data-[state=checked]:bg-muted-foreground data-[state=checked]:text-background" />
                                                                <p className="min-w-0 flex-1 text-sm leading-snug text-foreground/90">{phrase.text}</p>
                                                            </div>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="flex h-full items-center justify-center">
                                    <p className="text-sm text-muted-foreground">No habit cards available.</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </div>
            </CardContent>
            {footer}
        </Card>
    );
};

const PatternBuilderPanel = ({
    habitCards,
    mechanismCards,
    mindsetCards,
    patterns,
    selectedPatternToUpdate,
    onSelectPattern,
    selectedPhrases,
    showSecondaryAction,
    setShowSecondaryAction,
    showSecondaryActionEdit,
    setShowSecondaryActionEdit,
    newPatternAction,
    setNewPatternAction,
    newSharedCause,
    setNewSharedCause,
    newThreatSignalCategory,
    setNewThreatSignalCategory,
    newPatternCause,
    setNewPatternCause,
    newPatternAction2,
    setNewPatternAction2,
    newGrowthSignalCategory,
    setNewGrowthSignalCategory,
    newPatternCause2,
    setNewPatternCause2,
    newPatternOutcome,
    setNewPatternOutcome,
    newPatternOutcome2,
    setNewPatternOutcome2,
    newPatternCategory,
    setNewPatternCategory,
    newPatternActionType,
    setNewPatternActionType,
    newGrowthActionType,
    setNewGrowthActionType,
    newPatternState,
    setNewPatternState,
    newPatternType,
    setNewPatternType,
    editedPatternFields,
    setEditedPatternFields,
    onCreateOrUpdate,
    showMode = true,
    showSelectedEvidence = true,
    showSubmitButton = true,
}: {
    habitCards: Resource[];
    mechanismCards: Resource[];
    mindsetCards: any[];
    patterns: Pattern[];
    selectedPatternToUpdate: string | null;
    onSelectPattern: (value: string | null) => void;
    selectedPhrases: PatternPhrase[];
    showSecondaryAction: boolean;
    setShowSecondaryAction: React.Dispatch<React.SetStateAction<boolean>>;
    showSecondaryActionEdit: boolean;
    setShowSecondaryActionEdit: React.Dispatch<React.SetStateAction<boolean>>;
    newPatternAction: string;
    setNewPatternAction: React.Dispatch<React.SetStateAction<string>>;
    newSharedCause: string;
    setNewSharedCause: React.Dispatch<React.SetStateAction<string>>;
    newThreatSignalCategory: string;
    setNewThreatSignalCategory: React.Dispatch<React.SetStateAction<string>>;
    newPatternCause: string;
    setNewPatternCause: React.Dispatch<React.SetStateAction<string>>;
    newPatternAction2: string;
    setNewPatternAction2: React.Dispatch<React.SetStateAction<string>>;
    newGrowthSignalCategory: string;
    setNewGrowthSignalCategory: React.Dispatch<React.SetStateAction<string>>;
    newPatternCause2: string;
    setNewPatternCause2: React.Dispatch<React.SetStateAction<string>>;
    newPatternOutcome: string;
    setNewPatternOutcome: React.Dispatch<React.SetStateAction<string>>;
    newPatternOutcome2: string;
    setNewPatternOutcome2: React.Dispatch<React.SetStateAction<string>>;
    newPatternCategory: string;
    setNewPatternCategory: React.Dispatch<React.SetStateAction<string>>;
    newPatternActionType: string;
    setNewPatternActionType: React.Dispatch<React.SetStateAction<string>>;
    newGrowthActionType: string;
    setNewGrowthActionType: React.Dispatch<React.SetStateAction<string>>;
    newPatternState: string;
    setNewPatternState: React.Dispatch<React.SetStateAction<string>>;
    newPatternType: 'Positive' | 'Negative';
    setNewPatternType: React.Dispatch<React.SetStateAction<'Positive' | 'Negative'>>;
    editedPatternFields: {
        action1: string;
        sharedCause: string;
        threatSignalCategory: string;
        cause1: string;
        action2: string;
        growthSignalCategory: string;
        cause2: string;
        outcome: string;
        outcome2: string;
        patternCategory: string;
        actionType: string;
        growthActionType: string;
        state: string;
        type: 'Positive' | 'Negative';
    };
    setEditedPatternFields: React.Dispatch<React.SetStateAction<{
        action1: string;
        sharedCause: string;
        threatSignalCategory: string;
        cause1: string;
        action2: string;
        growthSignalCategory: string;
        cause2: string;
        outcome: string;
        outcome2: string;
        patternCategory: string;
        actionType: string;
        growthActionType: string;
        state: string;
        type: 'Positive' | 'Negative';
    }>>;
    onCreateOrUpdate: () => void;
    showMode?: boolean;
    showSelectedEvidence?: boolean;
    showSubmitButton?: boolean;
}) => {
    const isEditing = Boolean(selectedPatternToUpdate);
    const handleNewThreatSignalCategoryChange = (value: string) => {
        setNewThreatSignalCategory(value);
    };
    const handleNewThreatSignalChange = (value: string) => {
        setNewPatternCause(value);
        setNewThreatSignalCategory(THREAT_SIGNAL_TO_CATEGORY[value] || '');
    };
    const handleNewGrowthSignalCategoryChange = (value: string) => {
        setNewGrowthSignalCategory(value);
    };
    const handleNewGrowthSignalChange = (value: string) => {
        setNewPatternCause2(value);
        setNewGrowthSignalCategory(GROWTH_SIGNAL_TO_CATEGORY[value] || '');
    };
    const handleNewPatternCategoryChange = (value: string) => {
        setNewPatternCategory(value);
        if (value !== 'Resistance' && value !== 'Avoidance' && value !== 'Emotional Distress') {
            setNewPatternActionType('');
        }
        const nextOutcomes = getOutcomeOptions(value);
        setNewPatternOutcome((current) => nextOutcomes.includes(current) ? current : '');
        setNewPatternState(PATTERN_CATEGORY_TO_STATE[value as keyof typeof PATTERN_CATEGORY_TO_STATE] || '');
    };
    const handleEditedThreatSignalCategoryChange = (value: string) => {
        setEditedPatternFields((f) => ({
            ...f,
            threatSignalCategory: value,
        }));
    };
    const handleEditedThreatSignalChange = (value: string) => {
        setEditedPatternFields((f) => ({
            ...f,
            cause1: value,
            threatSignalCategory: THREAT_SIGNAL_TO_CATEGORY[value] || '',
        }));
    };
    const handleEditedGrowthSignalCategoryChange = (value: string) => {
        setEditedPatternFields((f) => ({
            ...f,
            growthSignalCategory: value,
        }));
    };
    const handleEditedGrowthSignalChange = (value: string) => {
        setEditedPatternFields((f) => ({
            ...f,
            cause2: value,
            growthSignalCategory: GROWTH_SIGNAL_TO_CATEGORY[value] || '',
        }));
    };
    const handleEditedPatternCategoryChange = (value: string) => {
        setEditedPatternFields((f) => ({
            ...f,
            patternCategory: value,
            actionType: value === 'Resistance' || value === 'Avoidance' || value === 'Emotional Distress' ? f.actionType : '',
            outcome: getOutcomeOptions(value).includes(f.outcome) ? f.outcome : '',
            state: PATTERN_CATEGORY_TO_STATE[value as keyof typeof PATTERN_CATEGORY_TO_STATE] || '',
        }));
    };
    const handleNewPatternStateChange = (value: string) => {
        const nextPatternCategory = STATE_TO_PATTERN_CATEGORY[value as keyof typeof STATE_TO_PATTERN_CATEGORY] || '';
        setNewPatternState(value);
        if (!nextPatternCategory) return;
        setNewPatternCategory(nextPatternCategory);
        setNewPatternActionType('');
        setNewGrowthActionType('');
        const nextOutcomes = getOutcomeOptions(nextPatternCategory);
        const nextThreatSignals = THREAT_SIGNALS_BY_STATE[value as keyof typeof THREAT_SIGNALS_BY_STATE] || ALL_THREAT_SIGNALS;
        const nextGrowthSignals = GROWTH_SIGNALS_BY_STATE[value as keyof typeof GROWTH_SIGNALS_BY_STATE] || ALL_GROWTH_SIGNALS;
        setNewPatternOutcome((current) => nextOutcomes.includes(current) ? current : '');
        const nextThreatSignal = nextThreatSignals.includes(newPatternCause) ? newPatternCause : '';
        setNewPatternCause(nextThreatSignal);
        setNewThreatSignalCategory(nextThreatSignal ? (THREAT_SIGNAL_TO_CATEGORY[nextThreatSignal] || '') : '');
        setNewPatternCause2((current) => nextGrowthSignals.includes(current) ? current : '');
        setNewPatternOutcome2('');
    };
    const handleEditedPatternStateChange = (value: string) => {
        const nextPatternCategory = STATE_TO_PATTERN_CATEGORY[value as keyof typeof STATE_TO_PATTERN_CATEGORY] || '';
        setEditedPatternFields((f) => {
            if (!nextPatternCategory) {
                return { ...f, state: value };
            }
            return {
                ...f,
                state: value,
                patternCategory: nextPatternCategory,
                actionType: '',
                growthActionType: '',
                cause1: (THREAT_SIGNALS_BY_STATE[value as keyof typeof THREAT_SIGNALS_BY_STATE] || ALL_THREAT_SIGNALS).includes(f.cause1) ? f.cause1 : '',
                threatSignalCategory: (THREAT_SIGNALS_BY_STATE[value as keyof typeof THREAT_SIGNALS_BY_STATE] || ALL_THREAT_SIGNALS).includes(f.cause1)
                    ? (THREAT_SIGNAL_TO_CATEGORY[f.cause1] || '')
                    : '',
                outcome: getOutcomeOptions(nextPatternCategory).includes(f.outcome) ? f.outcome : '',
                cause2: (GROWTH_SIGNALS_BY_STATE[value as keyof typeof GROWTH_SIGNALS_BY_STATE] || ALL_GROWTH_SIGNALS).includes(f.cause2) ? f.cause2 : '',
                outcome2: '',
            };
        });
    };

    const newPatternCategoryOptions = getPatternCategoryOptions('Negative');
    const editedPatternCategoryOptions = getPatternCategoryOptions('Negative');
    const newActionTypeOptions = getActionTypeOptions(newPatternCategory);
    const editedActionTypeOptions = getActionTypeOptions(editedPatternFields.patternCategory);
    const newThreatSignalOptions = THREAT_SIGNALS_BY_STATE[newPatternState as keyof typeof THREAT_SIGNALS_BY_STATE] || ALL_THREAT_SIGNALS;
    const editedThreatSignalOptions = THREAT_SIGNALS_BY_STATE[editedPatternFields.state as keyof typeof THREAT_SIGNALS_BY_STATE] || ALL_THREAT_SIGNALS;
    const newGrowthSignalOptions = GROWTH_SIGNALS_BY_STATE[newPatternState as keyof typeof GROWTH_SIGNALS_BY_STATE] || ALL_GROWTH_SIGNALS;
    const editedGrowthSignalOptions = GROWTH_SIGNALS_BY_STATE[editedPatternFields.state as keyof typeof GROWTH_SIGNALS_BY_STATE] || ALL_GROWTH_SIGNALS;
    const newOutcomeOptions = getOutcomeOptions(newPatternCategory);
    const editedOutcomeOptions = getOutcomeOptions(editedPatternFields.patternCategory);
    const newGrowthActionTypeOptions = getGrowthActionTypeOptions(newPatternState);
    const editedGrowthActionTypeOptions = getGrowthActionTypeOptions(editedPatternFields.state);
    const newGrowthOutcomeOptions = getGrowthOutcomeOptions(newPatternState);
    const editedGrowthOutcomeOptions = getGrowthOutcomeOptions(editedPatternFields.state);
    const newGrowthPattern = THREAT_TO_GROWTH_PATTERN[newPatternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '';
    const editedGrowthPattern = THREAT_TO_GROWTH_PATTERN[editedPatternFields.patternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '';
    const newThreatInterpretation = THREAT_INTERPRETATION_BY_STATE[newPatternState as keyof typeof THREAT_INTERPRETATION_BY_STATE] || null;
    const editedThreatInterpretation = THREAT_INTERPRETATION_BY_STATE[editedPatternFields.state as keyof typeof THREAT_INTERPRETATION_BY_STATE] || null;
    const newGrowthInterpretation = GROWTH_INTERPRETATION_BY_STATE[newPatternState as keyof typeof GROWTH_INTERPRETATION_BY_STATE] || null;
    const editedGrowthInterpretation = GROWTH_INTERPRETATION_BY_STATE[editedPatternFields.state as keyof typeof GROWTH_INTERPRETATION_BY_STATE] || null;
    const newResistanceOutcomeMeta = getResistanceOutcomeMeta(newPatternCategory, newPatternActionType);
    const editedResistanceOutcomeMeta = getResistanceOutcomeMeta(editedPatternFields.patternCategory, editedPatternFields.actionType);
    const newAvoidanceOutcomeMeta = getAvoidanceOutcomeMeta(newPatternCategory, newPatternActionType);
    const editedAvoidanceOutcomeMeta = getAvoidanceOutcomeMeta(editedPatternFields.patternCategory, editedPatternFields.actionType);
    const newEmotionalDistressOutcomeMeta = getEmotionalDistressOutcomeMeta(newPatternCategory, newPatternActionType);
    const editedEmotionalDistressOutcomeMeta = getEmotionalDistressOutcomeMeta(editedPatternFields.patternCategory, editedPatternFields.actionType);
    const selectedThreatMechanismOptions = Array.from(new Set(
        selectedPhrases
            .filter((phrase) => phrase.category === 'Habit Cards' && phrase.mechanismCardId)
            .map((phrase) => {
                const habit = habitCards.find((item) => item.id === phrase.mechanismCardId);
                const mechanismId = habit?.response?.resourceId;
                const mechanism = mechanismId
                    ? mechanismCards.find((resource) => resource.id === mechanismId)
                    : null;
                return mechanism?.name?.trim();
            })
            .filter((mechanismName): mechanismName is string => Boolean(mechanismName))
    ));
    const selectedLinkedBotheringOptions = Array.from(new Set(
        selectedPhrases
            .filter((phrase) => phrase.category === 'Habit Cards' && phrase.mechanismCardId)
            .map((phrase) => {
                const habit = habitCards.find((item) => item.id === phrase.mechanismCardId);
                if (!habit?.linkedBotheringId || !habit?.linkedBotheringType) return '';
                const cardId = `mindset_botherings_${habit.linkedBotheringType}`;
                const botheringCard = (mindsetCards || []).find((card: any) => card.id === cardId);
                const botheringPoint = botheringCard?.points?.find((point: any) => point.id === habit.linkedBotheringId);
                return String(botheringPoint?.text || '').trim();
            })
            .filter((botheringText): botheringText is string => Boolean(botheringText))
    ));
    const selectedGrowthMechanismOptions = Array.from(new Set(
        selectedPhrases
            .filter((phrase) => phrase.category === 'Habit Cards' && phrase.mechanismCardId)
            .map((phrase) => {
                const habit = habitCards.find((item) => item.id === phrase.mechanismCardId);
                const mechanismId = habit?.newResponse?.resourceId;
                const mechanism = mechanismId
                    ? mechanismCards.find((resource) => resource.id === mechanismId)
                    : null;
                return mechanism?.name?.trim();
            })
            .filter((mechanismName): mechanismName is string => Boolean(mechanismName))
    ));

    const handleNewActionTypeChange = (value: string) => {
        setNewPatternActionType(value);
        const resistanceOutcome = getResistanceOutcomeMeta(newPatternCategory, value);
        if (resistanceOutcome) {
            setNewPatternOutcome(resistanceOutcome.outcome);
            return;
        }
        const emotionalDistressOutcome = getEmotionalDistressOutcomeMeta(newPatternCategory, value);
        if (emotionalDistressOutcome) {
            setNewPatternOutcome(emotionalDistressOutcome.outcome);
            return;
        }
        const mappedOutcome = getAvoidanceOutcomeMeta(newPatternCategory, value);
        if (mappedOutcome) {
            setNewPatternOutcome(mappedOutcome.outcome);
        }
    };

    const handleEditedActionTypeChange = (value: string) => {
        setEditedPatternFields((f) => {
            const resistanceOutcome = getResistanceOutcomeMeta(f.patternCategory, value);
            if (resistanceOutcome) {
                return {
                    ...f,
                    actionType: value,
                    outcome: resistanceOutcome.outcome,
                };
            }
            const emotionalDistressOutcome = getEmotionalDistressOutcomeMeta(f.patternCategory, value);
            if (emotionalDistressOutcome) {
                return {
                    ...f,
                    actionType: value,
                    outcome: emotionalDistressOutcome.outcome,
                };
            }
            const mappedOutcome = getAvoidanceOutcomeMeta(f.patternCategory, value);
            return {
                ...f,
                actionType: value,
                outcome: mappedOutcome ? mappedOutcome.outcome : f.outcome,
            };
        });
    };
    const handleNewGrowthActionTypeChange = (value: string) => {
        setNewGrowthActionType(value);
        const mappedOutcome = getGrowthOutcomeMeta(newPatternState, value);
        if (mappedOutcome) {
            setNewPatternOutcome2(mappedOutcome.outcome);
        }
    };

    const handleEditedGrowthActionTypeChange = (value: string) => {
        setEditedPatternFields((f) => {
            const mappedOutcome = getGrowthOutcomeMeta(f.state, value);
            return {
                ...f,
                growthActionType: value,
                outcome2: mappedOutcome ? mappedOutcome.outcome : f.outcome2,
            };
        });
    };

    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Zap className="h-5 w-5" />Pattern Builder</CardTitle>
                <CardDescription>Keep the same flow, but work in a focused builder.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
                {showMode && <div className="space-y-3">
                    <Label className="font-semibold">Mode</Label>
                    <ScrollArea className="max-h-44 rounded-xl border border-border/60 p-3">
                        <RadioGroup value={selectedPatternToUpdate || 'new'} onValueChange={(v) => onSelectPattern(v === 'new' ? null : v)} className="space-y-2">
                            <div className="flex items-start gap-2 min-w-0">
                                <RadioGroupItem value="new" id="type-new-pattern" className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                                <Label htmlFor="type-new-pattern" className="break-words">Create New Pattern</Label>
                            </div>
                            {patterns.map((p) => (
                                <div key={p.id} className="flex items-start gap-2 min-w-0">
                                    <RadioGroupItem value={p.id} id={`pattern-${p.id}`} className="mt-0.5 h-4 w-4 shrink-0 rounded-full" />
                                    <Label htmlFor={`pattern-${p.id}`} className="min-w-0 break-words leading-snug">Edit Pattern: <span className="font-semibold">{p.name}</span></Label>
                                </div>
                            ))}
                        </RadioGroup>
                    </ScrollArea>
                </div>}

                {!isEditing ? (
                    <div className="space-y-3">
                        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Primary Path</Label>
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">State</Label>
                                <Select value={newPatternState} onValueChange={handleNewPatternStateChange}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PATTERN_STATE_OPTIONS.map((state) => (
                                            <SelectItem key={state} value={state}>{state}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PatternSelectNode label="Cause" value={newSharedCause} onChange={setNewSharedCause} placeholder="Select linked bothering" options={selectedLinkedBotheringOptions} />
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Threat Mode</Label>
                                    {newPatternCategoryOptions.length > 0 && (
                                        <PatternSelectNode label="Pattern" value={newPatternCategory} onChange={handleNewPatternCategoryChange} placeholder="Select pattern" options={newPatternCategoryOptions} />
                                    )}
                                    <PatternSelectNode label="Interpretation" value={newThreatInterpretation?.interpretation || ''} onChange={() => {}} placeholder="Select interpretation" options={newThreatInterpretation ? [newThreatInterpretation.interpretation] : []} />
                                    {newThreatInterpretation && (
                                        <p className="px-1 text-xs text-muted-foreground">Typical Thought: {newThreatInterpretation.thought}</p>
                                    )}
                                    <PatternSelectNode label="Signal" value={newPatternCause} onChange={handleNewThreatSignalChange} placeholder="Select signal" options={newThreatSignalOptions} />
                                    {newThreatSignalCategory && (
                                        <p className="px-1 text-xs text-muted-foreground">Category: {newThreatSignalCategory}</p>
                                    )}
                                    <PatternActionNode label="Actions" value={newPatternAction} onChange={setNewPatternAction} placeholder="Select negative mechanism" options={selectedThreatMechanismOptions} />
                                    {newActionTypeOptions && (
                                        <PatternSelectNode label="Action Type" value={newPatternActionType} onChange={handleNewActionTypeChange} placeholder="Select action type" options={newActionTypeOptions} />
                                    )}
                                    <PatternSelectNode label="Outcome" value={newPatternOutcome} onChange={setNewPatternOutcome} placeholder="Select outcome" options={newOutcomeOptions} />
                                    {newResistanceOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{newResistanceOutcomeMeta.why}</p>
                                    )}
                                    {newAvoidanceOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{newAvoidanceOutcomeMeta.why}</p>
                                    )}
                                    {newEmotionalDistressOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{newEmotionalDistressOutcomeMeta.why}</p>
                                    )}
                                </div>
                                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Growth Mode</Label>
                                    <PatternSelectNode label="Pattern" value={newGrowthPattern} onChange={() => {}} placeholder="Select pattern" options={GROWTH_PATTERN_CATEGORY_OPTIONS} />
                                    <PatternSelectNode label="Interpretation" value={newGrowthInterpretation?.interpretation || ''} onChange={() => {}} placeholder="Select interpretation" options={newGrowthInterpretation ? [newGrowthInterpretation.interpretation] : []} />
                                    {newGrowthInterpretation && (
                                        <p className="px-1 text-xs text-muted-foreground">Typical Thought: {newGrowthInterpretation.thought}</p>
                                    )}
                                    <PatternSelectNode label="Signal" value={newPatternCause2} onChange={handleNewGrowthSignalChange} placeholder="Select signal" options={newGrowthSignalOptions} />
                                    {newGrowthSignalCategory && (
                                        <p className="px-1 text-xs text-muted-foreground">Category: {newGrowthSignalCategory}</p>
                                    )}
                                    <PatternActionNode label="Actions" value={newPatternAction2} onChange={setNewPatternAction2} placeholder="Select positive mechanism" options={selectedGrowthMechanismOptions} />
                                    <PatternSelectNode label="Action Type" value={newGrowthActionType} onChange={handleNewGrowthActionTypeChange} placeholder="Select action type" options={newGrowthActionTypeOptions} />
                                    <PatternSelectNode label="Outcome" value={newPatternOutcome2} onChange={setNewPatternOutcome2} placeholder="Select outcome" options={newGrowthOutcomeOptions} />
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        <div className="space-y-3 rounded-xl border border-border/60 bg-muted/15 p-3">
                            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Primary Path</Label>
                            <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                                <Label className="text-xs uppercase tracking-wide text-muted-foreground">State</Label>
                                <Select value={editedPatternFields.state} onValueChange={handleEditedPatternStateChange}>
                                    <SelectTrigger className="mt-2">
                                        <SelectValue placeholder="Select state" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {PATTERN_STATE_OPTIONS.map((state) => (
                                            <SelectItem key={state} value={state}>{state}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <PatternSelectNode label="Cause" value={editedPatternFields.sharedCause} onChange={(value) => setEditedPatternFields((f) => ({ ...f, sharedCause: value }))} placeholder="Select linked bothering" options={selectedLinkedBotheringOptions} />
                            <div className="grid gap-4 xl:grid-cols-2">
                                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Threat Mode</Label>
                                    {editedPatternCategoryOptions.length > 0 && (
                                        <PatternSelectNode label="Pattern" value={editedPatternFields.patternCategory} onChange={handleEditedPatternCategoryChange} placeholder="Select pattern" options={editedPatternCategoryOptions} />
                                    )}
                                    <PatternSelectNode label="Interpretation" value={editedThreatInterpretation?.interpretation || ''} onChange={() => {}} placeholder="Select interpretation" options={editedThreatInterpretation ? [editedThreatInterpretation.interpretation] : []} />
                                    {editedThreatInterpretation && (
                                        <p className="px-1 text-xs text-muted-foreground">Typical Thought: {editedThreatInterpretation.thought}</p>
                                    )}
                                    <PatternSelectNode label="Signal" value={editedPatternFields.cause1} onChange={handleEditedThreatSignalChange} placeholder="Select signal" options={editedThreatSignalOptions} />
                                    {editedPatternFields.threatSignalCategory && (
                                        <p className="px-1 text-xs text-muted-foreground">Category: {editedPatternFields.threatSignalCategory}</p>
                                    )}
                                    <PatternActionNode label="Actions" value={editedPatternFields.action1} onChange={(value) => setEditedPatternFields((f) => ({ ...f, action1: value }))} placeholder="Select negative mechanism" options={selectedThreatMechanismOptions} />
                                    {editedActionTypeOptions && (
                                        <PatternSelectNode label="Action Type" value={editedPatternFields.actionType} onChange={handleEditedActionTypeChange} placeholder="Select action type" options={editedActionTypeOptions} />
                                    )}
                                    <PatternSelectNode label="Outcome" value={editedPatternFields.outcome} onChange={(value) => setEditedPatternFields((f) => ({ ...f, outcome: value }))} placeholder="Select outcome" options={editedOutcomeOptions} />
                                    {editedResistanceOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{editedResistanceOutcomeMeta.why}</p>
                                    )}
                                    {editedAvoidanceOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{editedAvoidanceOutcomeMeta.why}</p>
                                    )}
                                    {editedEmotionalDistressOutcomeMeta && (
                                        <p className="px-1 text-xs text-muted-foreground">{editedEmotionalDistressOutcomeMeta.why}</p>
                                    )}
                                </div>
                                <div className="space-y-3 rounded-xl border border-border/60 bg-muted/10 p-3">
                                    <Label className="text-xs uppercase tracking-wide text-muted-foreground">Growth Mode</Label>
                                    <PatternSelectNode label="Pattern" value={editedGrowthPattern} onChange={() => {}} placeholder="Select pattern" options={GROWTH_PATTERN_CATEGORY_OPTIONS} />
                                    <PatternSelectNode label="Interpretation" value={editedGrowthInterpretation?.interpretation || ''} onChange={() => {}} placeholder="Select interpretation" options={editedGrowthInterpretation ? [editedGrowthInterpretation.interpretation] : []} />
                                    {editedGrowthInterpretation && (
                                        <p className="px-1 text-xs text-muted-foreground">Typical Thought: {editedGrowthInterpretation.thought}</p>
                                    )}
                                    <PatternSelectNode label="Signal" value={editedPatternFields.cause2} onChange={handleEditedGrowthSignalChange} placeholder="Select signal" options={editedGrowthSignalOptions} />
                                    {editedPatternFields.growthSignalCategory && (
                                        <p className="px-1 text-xs text-muted-foreground">Category: {editedPatternFields.growthSignalCategory}</p>
                                    )}
                                    <PatternActionNode label="Actions" value={editedPatternFields.action2} onChange={(value) => setEditedPatternFields((f) => ({ ...f, action2: value }))} placeholder="Select positive mechanism" options={selectedGrowthMechanismOptions} />
                                    <PatternSelectNode label="Action Type" value={editedPatternFields.growthActionType} onChange={handleEditedGrowthActionTypeChange} placeholder="Select action type" options={editedGrowthActionTypeOptions} />
                                    <PatternSelectNode label="Outcome" value={editedPatternFields.outcome2} onChange={(value) => setEditedPatternFields((f) => ({ ...f, outcome2: value }))} placeholder="Select outcome" options={editedGrowthOutcomeOptions} />
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {showSelectedEvidence && <div className="rounded-xl border border-border/60 bg-muted/20 p-3">
                    <Label className="font-semibold">Selected Evidence ({selectedPhrases.length})</Label>
                    <ScrollArea className="mt-2 h-28">
                        {selectedPhrases.length > 0 ? (
                            <div className="flex flex-wrap gap-2 pr-2">
                                {selectedPhrases.map((phrase, i) => (
                                    <Badge key={`${phrase.text}-${i}`} variant="secondary" className="max-w-full whitespace-normal break-words py-1">
                                        {phrase.text}
                                    </Badge>
                                ))}
                            </div>
                        ) : (
                            <p className="pt-8 text-center text-xs text-muted-foreground">No phrases selected yet.</p>
                        )}
                    </ScrollArea>
                </div>}

                {showSubmitButton && <Button onClick={onCreateOrUpdate}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    {isEditing ? 'Update Pattern' : 'Create Pattern'}
                </Button>}
            </CardContent>
        </Card>
    );
};

const PatternPreviewCard = ({ type, name, selectedPhrases, state, sharedCause, threatPattern, threatSignal, threatAction, threatActionType, threatOutcome, growthPattern, growthSignal, growthAction, growthActionType, growthOutcome }: {
    type: 'Positive' | 'Negative';
    name: string;
    selectedPhrases: PatternPhrase[];
    state?: string;
    sharedCause?: string;
    threatPattern?: string;
    threatSignal?: string;
    threatAction?: string;
    threatActionType?: string;
    threatOutcome?: string;
    growthPattern?: string;
    growthSignal?: string;
    growthAction?: string;
    growthActionType?: string;
    growthOutcome?: string;
}) => {
    const linkedHabitCount = new Set(selectedPhrases.filter((p) => p.category === 'Habit Cards').map((p) => p.mechanismCardId)).size;
    const threatPreview = [threatSignal, threatAction, threatOutcome].filter(Boolean).join(STEP_ARROW);
    const growthPreview = [growthSignal, growthAction, growthOutcome].filter(Boolean).join(STEP_ARROW);
    return (
        <Card className="min-w-0">
            <CardHeader>
                <CardTitle className="flex items-center gap-2"><Brain className="h-5 w-5" />Pattern Preview</CardTitle>
                <CardDescription>Live summary of the pattern being created or edited.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline">{selectedPhrases.length} phrase{selectedPhrases.length === 1 ? '' : 's'}</Badge>
                    <Badge variant="outline">{linkedHabitCount} habit{linkedHabitCount === 1 ? '' : 's'}</Badge>
                </div>
                <div className="space-y-3 rounded-2xl border border-border/60 bg-muted/20 p-4">
                    <div className="grid gap-3 md:grid-cols-2">
                        <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">State</p>
                            <p className="text-sm font-medium">{state || '...'}</p>
                        </div>
                        <div>
                            <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">Cause</p>
                            <p className="text-sm font-medium">{sharedCause || '...'}</p>
                        </div>
                    </div>
                    <div>
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Threat Path</p>
                        {threatPreview ? (
                            <FormattedPatternName name={threatPreview} type="Negative" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Fill threat mode to preview the threat path.</p>
                        )}
                    </div>
                    <div className="border-t border-border/50 pt-3">
                        <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Growth Path</p>
                        {growthPreview ? (
                            <FormattedPatternName name={growthPreview} type="Positive" />
                        ) : (
                            <p className="text-sm text-muted-foreground">Fill growth mode to preview the growth path.</p>
                        )}
                    </div>
                </div>
                <div className="grid gap-4 xl:grid-cols-2">
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Threat Mode</p>
                        <div className="mt-3 space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Pattern:</span> {threatPattern || '...'}</p>
                            <p><span className="text-muted-foreground">Signal:</span> {threatSignal || '...'}</p>
                            <p><span className="text-muted-foreground">Action:</span> {threatAction || '...'}</p>
                            <p><span className="text-muted-foreground">Action Type:</span> {threatActionType || '...'}</p>
                            <p><span className="text-muted-foreground">Outcome:</span> {threatOutcome || '...'}</p>
                        </div>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-muted/15 p-4">
                        <p className="text-xs uppercase tracking-wide text-muted-foreground">Growth Mode</p>
                        <div className="mt-3 space-y-2 text-sm">
                            <p><span className="text-muted-foreground">Pattern:</span> {growthPattern || '...'}</p>
                            <p><span className="text-muted-foreground">Signal:</span> {growthSignal || '...'}</p>
                            <p><span className="text-muted-foreground">Action:</span> {growthAction || '...'}</p>
                            <p><span className="text-muted-foreground">Action Type:</span> {growthActionType || '...'}</p>
                            <p><span className="text-muted-foreground">Outcome:</span> {growthOutcome || '...'}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

const ExistingPatternsPanel = ({
    patterns,
    selectedPatternForRule,
    setSelectedPatternForRule,
    editingPatternId,
    editingPatternName,
    setEditingPatternName,
    handleSavePatternName,
    openEditModal,
    handleDeletePattern,
    getHabitLinksForRule,
    handleOpenHabitPopup,
}: {
    patterns: Pattern[];
    selectedPatternForRule: string | null;
    setSelectedPatternForRule: React.Dispatch<React.SetStateAction<string | null>>;
    editingPatternId: string | null;
    editingPatternName: string;
    setEditingPatternName: React.Dispatch<React.SetStateAction<string>>;
    handleSavePatternName: () => void;
    openEditModal: (pattern: Pattern) => void;
    handleDeletePattern: (patternId: string) => void;
    getHabitLinksForRule: (rule: { id: string; patternId: string; text: string }) => Array<{ habitId: string; habitName: string; response: string; newResponse: string }>;
    handleOpenHabitPopup: (e: React.MouseEvent, habitId: string) => void;
}) => (
    <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2"><Lightbulb className="h-5 w-5" />Existing Patterns</CardTitle>
            <CardDescription>Select a pattern to inspect or to base a meta-rule on it.</CardDescription>
        </CardHeader>
        <CardContent>
            <ScrollArea className="h-72 pr-4">
                {patterns.length > 0 ? (
                    <RadioGroup value={selectedPatternForRule || ''} onValueChange={setSelectedPatternForRule} className="space-y-4">
                        {patterns.map((p) => {
                            const isSelected = selectedPatternForRule === p.id;
                            const linkedHabits = isSelected ? getHabitLinksForRule({ id: p.id, patternId: p.id, text: p.name }) : [];
                            return (
                                <Card key={p.id} className={cn("transition-all", isSelected && "ring-2 ring-primary")}>
                                    <CardHeader className="p-3">
                                        <div className="flex flex-row items-center justify-between gap-3">
                                            <div className="flex min-w-0 flex-1 items-center gap-2">
                                                <RadioGroupItem value={p.id} id={`rule-pattern-${p.id}`} className="shrink-0" />
                                                <div className="min-w-0 flex-1 cursor-pointer" onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
                                                    {editingPatternId === p.id ? (
                                                        <Input
                                                            value={editingPatternName}
                                                            onChange={(e) => setEditingPatternName(e.target.value)}
                                                            onBlur={handleSavePatternName}
                                                            onKeyDown={(e) => e.key === 'Enter' && handleSavePatternName()}
                                                            className="h-8"
                                                            autoFocus
                                                        />
                                                    ) : (
                                                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                                                            <Badge variant={p.type === 'Positive' ? 'default' : 'destructive'}>{p.type}</Badge>
                                                            <div className="min-w-0 break-words" title={p.name}>
                                                                <FormattedPatternName name={p.name} type={p.type} />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex items-center">
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); openEditModal(p); }}>
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={(e) => { e.stopPropagation(); handleDeletePattern(p.id); }}>
                                                    <Trash2 className="h-4 w-4 text-destructive" />
                                                </Button>
                                            </div>
                                        </div>
                                    </CardHeader>
                                    {isSelected && linkedHabits.length > 0 && (
                                        <CardContent className="p-3 pt-0 text-xs">
                                            <div className="mt-2 border-t pt-2">
                                                <h4 className="mb-1 font-medium text-muted-foreground">Habits</h4>
                                                <div className="space-y-1">
                                                    {linkedHabits.map((habit, i) => (
                                                        <button
                                                            key={i}
                                                            className="w-full rounded p-1 text-left hover:bg-background"
                                                            onClick={(e) => handleOpenHabitPopup(e, habit.habitId)}
                                                        >
                                                            <span className="text-xs font-semibold text-foreground">{habit.habitName}</span> = <span className="text-xs text-muted-foreground">{habit.response} <ArrowRight className="inline h-3 w-3" /> {habit.newResponse}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        </CardContent>
                                    )}
                                </Card>
                            );
                        })}
                    </RadioGroup>
                ) : (
                    <div className="flex h-full items-center justify-center rounded-md border">
                        <p className="text-center text-sm text-muted-foreground">No patterns defined yet.</p>
                    </div>
                )}
            </ScrollArea>
        </CardContent>
    </Card>
);


function PatternsPageContent() {
    const { resources, mindsetCards, patterns, setPatterns, metaRules, setMetaRules, handleOpenNestedPopup } = useAuth();
    const { toast } = useToast();

    const [selectedPhrases, setSelectedPhrases] = useState<PatternPhrase[]>([]);
    const [newPatternAction, setNewPatternAction] = useState('');
    const [newSharedCause, setNewSharedCause] = useState('');
    const [newThreatSignalCategory, setNewThreatSignalCategory] = useState('');
    const [newPatternCause, setNewPatternCause] = useState('');
    const [newPatternAction2, setNewPatternAction2] = useState('');
    const [newGrowthSignalCategory, setNewGrowthSignalCategory] = useState('');
    const [newPatternCause2, setNewPatternCause2] = useState('');
    const [newPatternOutcome, setNewPatternOutcome] = useState('');
    const [newPatternOutcome2, setNewPatternOutcome2] = useState('');
    const [newPatternCategory, setNewPatternCategory] = useState('');
    const [newPatternActionType, setNewPatternActionType] = useState('');
    const [newGrowthActionType, setNewGrowthActionType] = useState('');
    const [newPatternState, setNewPatternState] = useState('');
    const [newPatternType, setNewPatternType] = useState<'Positive' | 'Negative'>('Negative');
    const [selectedPatternToUpdate, setSelectedPatternToUpdate] = useState<string | null>(null);
    const [activeWorkspace, setActiveWorkspace] = useState<'build' | 'patterns' | 'rules'>('build');
    const [builderStep, setBuilderStep] = useState<0 | 1 | 2 | 3>(0);
    const [activeHabitId, setActiveHabitId] = useState<string | null>(null);

    const [newMetaRuleText, setNewMetaRuleText] = useState('');
    const [selectedPatternForRule, setSelectedPatternForRule] = useState<string | null>(null);
    
    const [editingPatternId, setEditingPatternId] = useState<string | null>(null);
    const [editingPatternName, setEditingPatternName] = useState('');
    
    const [editingPattern, setEditingPattern] = useState<Pattern | null>(null);
    const [editedPatternPhrases, setEditedPatternPhrases] = useState<PatternPhrase[]>([]);
    
    const [showSecondaryAction, setShowSecondaryAction] = useState(false);
    
    const [editedPatternFields, setEditedPatternFields] = useState({
        action1: '', sharedCause: '', threatSignalCategory: '', cause1: '', action2: '', growthSignalCategory: '', cause2: '', outcome: '', outcome2: '', patternCategory: '', actionType: '', growthActionType: '', state: '', type: 'Positive' as 'Positive' | 'Negative'
    });
    const [showSecondaryActionEdit, setShowSecondaryActionEdit] = useState(false);

    useEffect(() => {
        if (selectedPatternToUpdate) {
            setActiveWorkspace('build');
            setBuilderStep(1);
        }
    }, [selectedPatternToUpdate]);

    const { habitCards, mechanismCards } = useMemo(() => {
        const habits = resources.filter(r => r.type === 'habit');
        const mechanisms = resources.filter(r => r.type === 'mechanism');
        return { habitCards: habits, mechanismCards: mechanisms };
    }, [resources]);

    useEffect(() => {
        if (selectedPatternToUpdate) {
            const patternToEdit = patterns.find(p => p.id === selectedPatternToUpdate);
            if (patternToEdit) {
                const linkedMechanismIds = new Set(
                    patternToEdit.phrases
                        .map((phrase) => phrase.mechanismCardId)
                        .filter((id): id is string => Boolean(id))
                );
                const inferredHabitPhrases: PatternPhrase[] = habitCards
                    .filter((habit) => {
                        const habitMechanismIds = [habit.response?.resourceId, habit.newResponse?.resourceId].filter(Boolean);
                        return habitMechanismIds.some((id) => linkedMechanismIds.has(id as string));
                    })
                    .map((habit) => {
                        const linkedMechanisms = [
                            habit.response?.resourceId,
                            habit.newResponse?.resourceId
                        ]
                            .filter(Boolean)
                            .map((id) => mechanismCards.find((m) => m.id === id)?.name)
                            .filter(Boolean) as string[];

                        return {
                            category: 'Habit Cards' as const,
                            text: habit.name,
                            mechanismCardId: habit.id,
                            linkedMechanisms,
                            linkedMechanismIds: [habit.response?.resourceId, habit.newResponse?.resourceId].filter(Boolean) as string[],
                        };
                    });

                const mergedPhrases = [...patternToEdit.phrases];
                inferredHabitPhrases.forEach((phrase) => {
                    if (!mergedPhrases.some((existing) => existing.category === phrase.category && existing.mechanismCardId === phrase.mechanismCardId)) {
                        mergedPhrases.push(phrase);
                    }
                });
                setSelectedPhrases(mergedPhrases);

                const parts = patternToEdit.name.split(STEP_ARROW);
                const savedCause1 = patternToEdit.threatSignal ?? '';
                const savedAction1 = patternToEdit.threatAction ?? '';
                const savedOutcome1 = patternToEdit.threatOutcome ?? '';
                const savedCause2 = patternToEdit.growthSignal ?? '';
                const savedAction2 = patternToEdit.growthAction ?? '';
                const savedOutcome2 = patternToEdit.growthOutcome ?? '';

                if (savedAction1 || savedOutcome1 || savedCause2 || savedAction2 || savedOutcome2) {
                    setEditedPatternFields({
                        action1: savedAction1,
                        sharedCause: patternToEdit.sharedCause || '',
                        threatSignalCategory: patternToEdit.threatSignalCategory || THREAT_SIGNAL_TO_CATEGORY[savedCause1] || '',
                        cause1: savedCause1,
                        action2: savedAction2,
                        growthSignalCategory: patternToEdit.growthSignalCategory || GROWTH_SIGNAL_TO_CATEGORY[savedCause2] || '',
                        cause2: savedCause2,
                        outcome: savedOutcome1,
                        outcome2: savedOutcome2,
                        patternCategory: patternToEdit.patternCategory || '',
                        actionType: patternToEdit.actionType || '',
                        growthActionType: patternToEdit.growthActionType || '',
                        state: patternToEdit.state || '',
                        type: patternToEdit.type
                    });
                    setShowSecondaryActionEdit(Boolean(savedCause2 || savedAction2 || savedOutcome2));
                } else if (parts.length >= 6) { // Cause -> Action -> Outcome -> Cause -> Action -> Outcome
                    const cause1 = parts[0] || '';
                    const action1 = parts[1] || '';
                    const outcome = parts[2] || '';
                    const cause2 = parts[3] || '';
                    const action2 = parts[4] || '';
                    const outcome2 = parts[5] || '';
                    setEditedPatternFields({ action1, sharedCause: patternToEdit.sharedCause || '', threatSignalCategory: patternToEdit.threatSignalCategory || THREAT_SIGNAL_TO_CATEGORY[cause1] || '', cause1, action2, growthSignalCategory: patternToEdit.growthSignalCategory || GROWTH_SIGNAL_TO_CATEGORY[cause2] || '', cause2, outcome, outcome2, patternCategory: patternToEdit.patternCategory || '', actionType: patternToEdit.actionType || '', growthActionType: patternToEdit.growthActionType || '', state: patternToEdit.state || '', type: patternToEdit.type });
                    setShowSecondaryActionEdit(true);
                } else if (parts.length >= 3) { // Cause -> Action -> Outcome
                    const cause1 = parts[0] || '';
                    const action1 = parts[1] || '';
                    const outcome = parts[2] || '';
                    setEditedPatternFields({ action1, sharedCause: patternToEdit.sharedCause || '', threatSignalCategory: patternToEdit.threatSignalCategory || THREAT_SIGNAL_TO_CATEGORY[cause1] || '', cause1, outcome, action2: '', growthSignalCategory: patternToEdit.growthSignalCategory || '', cause2: '', outcome2: '', patternCategory: patternToEdit.patternCategory || '', actionType: patternToEdit.actionType || '', growthActionType: patternToEdit.growthActionType || '', state: patternToEdit.state || '', type: patternToEdit.type });
                    setShowSecondaryActionEdit(false);
                } else { // Fallback for old format
                    setEditedPatternFields({ action1: patternToEdit.name, sharedCause: patternToEdit.sharedCause || '', threatSignalCategory: patternToEdit.threatSignalCategory || '', cause1: '', action2: '', growthSignalCategory: patternToEdit.growthSignalCategory || '', cause2: '', outcome: '', outcome2: '', patternCategory: patternToEdit.patternCategory || '', actionType: patternToEdit.actionType || '', growthActionType: patternToEdit.growthActionType || '', state: patternToEdit.state || '', type: patternToEdit.type });
                    setShowSecondaryActionEdit(false);
                }
            }
        } else {
            setSelectedPhrases([]);
        }
    }, [selectedPatternToUpdate, patterns, habitCards, mechanismCards]);
    
    const aggregatedFields = useMemo(() => {
        const allPossiblePhrases: PatternPhrase[] = [];
        mechanismCards.forEach(card => {
            if (card.mechanismFramework === 'positive') {
                if (card.benefit) allPossiblePhrases.push({ category: 'Benefits', text: card.benefit, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.reward) allPossiblePhrases.push({ category: 'Benefits', text: card.reward, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Positive Laws', text: `${card.law.premise} can only happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
            } else { // negative
                if (card.trigger?.feeling && card.benefit) allPossiblePhrases.push({ category: 'Costs', text: `That one ${card.trigger.feeling} costs me ${card.benefit}.`, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.reward) allPossiblePhrases.push({ category: 'Costs', text: `This blocks ${card.reward}.`, mechanismCardId: card.id, mechanismCardName: card.name });
                if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Negative Laws', text: `${card.law.premise} cannot happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
            }
        });

        let habitsToDisplay: Resource[];
        
        if (selectedPatternToUpdate) {
            const currentPattern = patterns.find(p => p.id === selectedPatternToUpdate);
            const currentPatternMechanismIds = new Set(
                currentPattern?.phrases
                    .map((phrase) => phrase.mechanismCardId)
                    .filter((id): id is string => Boolean(id)) || []
            );
            const currentPatternHabitIds = new Set(
                [
                    ...(currentPattern?.phrases
                        .filter(ph => ph.category === 'Habit Cards')
                        .map(ph => ph.mechanismCardId) || []),
                    ...habitCards
                        .filter((habit) => {
                            const habitMechanismIds = [habit.response?.resourceId, habit.newResponse?.resourceId].filter(Boolean);
                            return habitMechanismIds.some((id) => currentPatternMechanismIds.has(id as string));
                        })
                        .map((habit) => habit.id),
                ]
            );
            const allOtherHabitIds = new Set(
                patterns.flatMap(p => p.id === selectedPatternToUpdate ? [] : p.phrases.filter(ph => ph.category === 'Habit Cards').map(ph => ph.mechanismCardId))
            );
            habitsToDisplay = habitCards.filter(h => currentPatternHabitIds.has(h.id) || !allOtherHabitIds.has(h.id));
        } else {
            const allHabitIdsInAnyPattern = new Set(patterns.flatMap(p => p.phrases.filter(ph => ph.category === 'Habit Cards').map(ph => ph.mechanismCardId)));
            habitsToDisplay = habitCards.filter(h => !allHabitIdsInAnyPattern.has(h.id));
        }

        const habitPhrases = habitsToDisplay.map(habit => {
            const linkedMechanismIds = [
                habit.response?.resourceId,
                habit.newResponse?.resourceId
            ].filter(Boolean) as string[];
            const linkedMechanisms = [
                habit.response?.resourceId,
                habit.newResponse?.resourceId
            ].filter(Boolean).map(id => mechanismCards.find(m => m.id === id)?.name).filter(Boolean);
            return {
                category: 'Habit Cards' as const,
                text: habit.name,
                mechanismCardId: habit.id,
                linkedMechanisms: linkedMechanisms as string[],
                linkedMechanismIds,
            };
        });

        const phrasesByCategory: Record<string, PatternPhrase[]> = { 'Habit Cards': habitPhrases };
        
        const displayedHabitMechanismIds = new Set(
            habitsToDisplay.flatMap(h => [h.response?.resourceId, h.newResponse?.resourceId]).filter(Boolean)
        );

        allPossiblePhrases.forEach(p => {
            if (p.mechanismCardId && displayedHabitMechanismIds.has(p.mechanismCardId)) {
                if (!phrasesByCategory[p.category]) phrasesByCategory[p.category] = [];
                phrasesByCategory[p.category].push(p);
            }
        });
        
        return phrasesByCategory;
    }, [habitCards, mechanismCards, patterns, selectedPatternToUpdate]);

    const habitEvidenceGroups = useMemo(() => {
        const habitPhrases = aggregatedFields['Habit Cards'] || [];

        return habitPhrases.map((habitPhrase) => {
            const habit = habitCards.find((item) => item.id === habitPhrase.mechanismCardId);
            const linkedMechanismIds = new Set([habit?.response?.resourceId, habit?.newResponse?.resourceId].filter(Boolean));
            const evidenceByCategory: Record<string, PatternPhrase[]> = {};

            Object.entries(aggregatedFields).forEach(([category, phrases]) => {
                if (category === 'Habit Cards') return;
                const linkedPhrases = phrases.filter((phrase) => phrase.mechanismCardId && linkedMechanismIds.has(phrase.mechanismCardId));
                if (linkedPhrases.length > 0) {
                    evidenceByCategory[category] = linkedPhrases;
                }
            });

            return { habitPhrase, evidenceByCategory };
        });
    }, [aggregatedFields, habitCards]);

    useEffect(() => {
        if (!habitEvidenceGroups.length) {
            setActiveHabitId(null);
            return;
        }

        if (activeHabitId && habitEvidenceGroups.some((group) => group.habitPhrase.mechanismCardId === activeHabitId)) {
            return;
        }

        const selectedHabit = habitEvidenceGroups.find((group) =>
            selectedPhrases.some((phrase) => phrase.category === 'Habit Cards' && phrase.mechanismCardId === group.habitPhrase.mechanismCardId)
        );

        setActiveHabitId(selectedHabit?.habitPhrase.mechanismCardId || habitEvidenceGroups[0].habitPhrase.mechanismCardId || null);
    }, [habitEvidenceGroups, activeHabitId, selectedPhrases]);


     const handlePhraseToggle = (phrase: PatternPhrase) => {
        const isSelected = selectedPhrases.some(p => p.text === phrase.text);
        
        const allPossiblePhrases: PatternPhrase[] = [];
        mechanismCards.forEach(card => {
          if (card.mechanismFramework === 'positive') {
            if (card.benefit) allPossiblePhrases.push({ category: 'Benefits', text: card.benefit, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.reward) allPossiblePhrases.push({ category: 'Benefits', text: card.reward, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Positive Laws', text: `${card.law.premise} can only happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
          } else {
            if (card.trigger?.feeling && card.benefit) allPossiblePhrases.push({ category: 'Costs', text: `That one ${card.trigger.feeling} costs me ${card.benefit}.`, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.reward) allPossiblePhrases.push({ category: 'Costs', text: `This blocks ${card.reward}.`, mechanismCardId: card.id, mechanismCardName: card.name });
            if (card.law?.premise && card.law?.outcome) allPossiblePhrases.push({ category: 'Negative Laws', text: `${card.law.premise} cannot happen when ${card.law.outcome}`, mechanismCardId: card.id, mechanismCardName: card.name });
          }
        });
    
        if (phrase.category === 'Habit Cards') {
            const habitCard = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habitCard) return; 
            
            const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));
            const relatedPhrases = allPossiblePhrases.filter(p => p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId));
            const allPhrasesToToggle = [phrase, ...relatedPhrases];
    
            if (!isSelected) {
                // Add habit and all related phrases if not already present
                setSelectedPhrases(prev => {
                    const newPhrasesToAdd = allPhrasesToToggle.filter(p => !prev.some(sp => sp.text === p.text));
                    return [...prev, ...newPhrasesToAdd];
                });
            } else {
                // Remove the habit plus any phrase tied to its linked mechanisms.
                setSelectedPhrases(prev => prev.filter((selectedPhrase) => {
                    if (selectedPhrase.category === 'Habit Cards' && selectedPhrase.mechanismCardId === phrase.mechanismCardId) {
                        return false;
                    }
                    if (selectedPhrase.mechanismCardId && relatedMechanismIds.has(selectedPhrase.mechanismCardId)) {
                        return false;
                    }
                    return true;
                }));
            }
        } else {
             if (!isSelected) {
                setSelectedPhrases(prev => [...prev, phrase]);
            } else {
                setSelectedPhrases(prev => prev.filter(p => p.text !== phrase.text));
            }
        }
    };


    const handleCreateOrUpdatePattern = () => {
        if (selectedPatternToUpdate) {
            const { action1, sharedCause, threatSignalCategory, cause1, action2, growthSignalCategory, cause2, outcome, outcome2, patternCategory, actionType, growthActionType, state, type } = editedPatternFields;
            const includeGrowthPath = Boolean(cause2.trim() || action2.trim() || outcome2.trim() || growthActionType.trim());
            if (!action1.trim() || !outcome.trim() || (includeGrowthPath && (!action2.trim() || !outcome2.trim()))) {
                 toast({ title: 'Error', description: 'Each path needs action and outcome.', variant: 'destructive' });
                return;
            }
            const updatedName = buildPatternName({
                action1,
                cause1,
                action2,
                cause2,
                outcome,
                outcome2,
                includeSecondary: includeGrowthPath,
            });

            setPatterns(prev => prev.map(p => 
                p.id === selectedPatternToUpdate ? {
                    ...p,
                    phrases: selectedPhrases,
                    name: updatedName,
                    patternCategory: patternCategory || undefined,
                    threatSignalCategory: threatSignalCategory || undefined,
                    growthSignalCategory: growthSignalCategory || undefined,
                    sharedCause: sharedCause || undefined,
                    threatSignal: cause1 || undefined,
                    threatAction: action1 || undefined,
                    threatOutcome: outcome || undefined,
                    growthSignal: cause2 || undefined,
                    growthAction: action2 || undefined,
                    growthOutcome: outcome2 || undefined,
                    actionType: actionType || undefined,
                    growthActionType: growthActionType || undefined,
                    state,
                    type: type
                } : p
            ));
            toast({ title: 'Pattern Updated!', description: `The pattern has been updated.`});
        } else {
            const includeGrowthPath = Boolean(newPatternCause2.trim() || newPatternAction2.trim() || newPatternOutcome2.trim() || newGrowthActionType.trim());
            if (!newPatternAction.trim() || !newPatternOutcome.trim() || (includeGrowthPath && (!newPatternAction2.trim() || !newPatternOutcome2.trim()))) {
                toast({ title: 'Error', description: 'Each path needs action and outcome.', variant: 'destructive' });
                return;
            }
            const newPatternName = buildPatternName({
                action1: newPatternAction,
                cause1: newPatternCause,
                action2: newPatternAction2,
                cause2: newPatternCause2,
                outcome: newPatternOutcome,
                outcome2: newPatternOutcome2,
                includeSecondary: includeGrowthPath,
            });

            const newPattern: Pattern = {
                id: `pattern_${Date.now()}`,
                name: newPatternName,
                type: newPatternType,
                patternCategory: newPatternCategory || undefined,
                threatSignalCategory: newThreatSignalCategory || undefined,
                growthSignalCategory: newGrowthSignalCategory || undefined,
                sharedCause: newSharedCause || undefined,
                threatSignal: newPatternCause || undefined,
                threatAction: newPatternAction || undefined,
                threatOutcome: newPatternOutcome || undefined,
                growthSignal: newPatternCause2 || undefined,
                growthAction: newPatternAction2 || undefined,
                growthOutcome: newPatternOutcome2 || undefined,
                actionType: newPatternActionType || undefined,
                growthActionType: newGrowthActionType || undefined,
                state: newPatternState || undefined,
                phrases: selectedPhrases,
            };
            setPatterns(prev => [...prev, newPattern]);
            setNewPatternAction('');
            setNewSharedCause('');
            setNewThreatSignalCategory('');
            setNewPatternCause('');
            setNewPatternAction2('');
            setNewGrowthSignalCategory('');
            setNewPatternCause2('');
            setNewPatternOutcome('');
            setNewPatternOutcome2('');
            setNewPatternCategory('');
            setNewPatternActionType('');
            setNewGrowthActionType('');
            setNewPatternState('');
            setShowSecondaryAction(false);
            toast({ title: 'Pattern Created!', description: `The "${newPatternName}" pattern has been saved.`});
        }

        setSelectedPhrases([]);
        setSelectedPatternToUpdate(null);
        setBuilderStep(0);
    };

    const handleDeletePattern = (patternId: string) => {
        setPatterns(prev => prev.filter(p => p.id !== patternId));
        setMetaRules(prev => prev.filter(r => r.patternId !== patternId));
    };

    const resetNewPatternDraft = () => {
        setSelectedPatternToUpdate(null);
        setSelectedPhrases([]);
        setActiveHabitId(null);
        setNewPatternAction('');
        setNewSharedCause('');
        setNewThreatSignalCategory('');
        setNewPatternCause('');
        setNewPatternAction2('');
        setNewGrowthSignalCategory('');
        setNewPatternCause2('');
        setNewPatternOutcome('');
        setNewPatternOutcome2('');
        setNewPatternCategory('');
        setNewPatternActionType('');
        setNewGrowthActionType('');
        setNewPatternState('');
        setNewPatternType('Negative');
        setShowSecondaryAction(false);
    };

    const handleAddMetaRule = () => {
        if (!newMetaRuleText.trim()) {
            toast({ title: 'Error', description: 'Meta-rule cannot be empty.', variant: 'destructive' });
            return;
        }
        if (!selectedPatternForRule) {
            toast({ title: 'Error', description: 'Please select a pattern to base this rule on.', variant: 'destructive' });
            return;
        }

        const newRule: MetaRule = {
            id: `rule_${Date.now()}`,
            text: newMetaRuleText.trim(),
            patternId: selectedPatternForRule,
        };
        setMetaRules(prev => [...prev, newRule]);
        setNewMetaRuleText('');
        setSelectedPatternForRule(null);
        toast({ title: 'Meta-Rule Created!', description: 'A new rule has been added to your Purpose page.' });
    };

    const getHabitLinksForRule = (rule: { id: string, patternId: string, text: string }) => {
        const pattern = patterns.find(p => p.id === rule.patternId);
        if (!pattern) return [];

        const habitPhrases = pattern.phrases.filter(p => p.category === 'Habit Cards');

        return habitPhrases.map(phrase => {
            const habit = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habit) return null;

            const responseMechanism = mechanismCards.find(m => m.id === habit.response?.resourceId);
            const newResponseMechanism = mechanismCards.find(m => m.id === habit.newResponse?.resourceId);

            return {
                habitId: habit.id,
                habitName: habit.name,
                response: responseMechanism?.response?.visualize || '...',
                newResponse: newResponseMechanism?.newResponse?.action || '...'
            };
        }).filter((h): h is NonNullable<typeof h> => h !== null);
    };

    const handleOpenHabitPopup = (e: React.MouseEvent, habitId: string) => {
        handleOpenNestedPopup(habitId, e);
    };

    const pillars = [
        { name: 'Mind', icon: <Brain className="h-6 w-6 text-blue-500" />, attributes: ['Focus', 'Learning', 'Creativity'] },
        { name: 'Body', icon: <HeartPulse className="h-6 w-6 text-red-500" />, attributes: ['Health', 'Strength', 'Energy'] },
        { name: 'Heart', icon: <HandHeart className="h-6 w-6 text-pink-500" />, attributes: ['Relationships', 'Emotional Health'] },
        { name: 'Spirit', icon: <TrendingUp className="h-6 w-6 text-purple-500" />, attributes: ['Meaning', 'Contribution', 'Legacy'] },
    ];

    const handleUpdatePillar = (id: string, pillar: string) => {
        setMetaRules(prev => prev.map(r => r.id === id ? { ...r, purposePillar: pillar } : r));
    };

    const handleSavePatternName = () => {
        if (!editingPatternId || !editingPatternName.trim()) {
            setEditingPatternId(null);
            return;
        }
        setPatterns(prev => prev.map(p => 
            p.id === editingPatternId ? { ...p, name: editingPatternName.trim() } : p
        ));
        setEditingPatternId(null);
    };

    const openEditModal = (pattern: Pattern) => {
        setEditingPattern(pattern);
        setEditedPatternPhrases(pattern.phrases);
    };

    const handlePhraseToggleInModal = (phrase: PatternPhrase) => {
        const isSelected = editedPatternPhrases.some(p => p.text === phrase.text);
    
        if (phrase.category === 'Habit Cards') {
            const habitCard = habitCards.find(h => h.id === phrase.mechanismCardId);
            if (!habitCard) return; 

            const allPhrasesFromAllMechanisms = Object.values(aggregatedFields).flat();
            const relatedMechanismIds = new Set([habitCard.response?.resourceId, habitCard.newResponse?.resourceId].filter(Boolean));
            const relatedPhrases = allPhrasesFromAllMechanisms.filter(p => p.mechanismCardId && relatedMechanismIds.has(p.mechanismCardId));
            const allPhrasesToToggle = [phrase, ...relatedPhrases];
            
            if (!isSelected) {
                setEditedPatternPhrases(prev => [...prev, ...allPhrasesToToggle]);
            } else {
                const phrasesToRemoveTexts = new Set(allPhrasesToToggle.map(p => p.text));
                setEditedPatternPhrases(prev => prev.filter(p => !phrasesToRemoveTexts.has(p.text)));
            }
        } else {
            if (isSelected) {
                setEditedPatternPhrases(prev => prev.filter(p => p.text !== phrase.text));
            } else {
                setEditedPatternPhrases(prev => [...prev, phrase]);
            }
        }
    };
    
    const handleSaveChangesInModal = () => {
        if (!editingPattern) return;

        setPatterns(prev => prev.map(p => {
            if (p.id === editingPattern.id) {
                return { ...p, name: editingPattern.name, phrases: editedPatternPhrases };
            }
            return p;
        }));

        setEditingPattern(null);
        toast({ title: 'Pattern Updated!', description: 'Your changes have been saved.' });
    };

    const draftPatternName = selectedPatternToUpdate
        ? buildPatternName({
            action1: editedPatternFields.action1,
            cause1: editedPatternFields.cause1,
            action2: editedPatternFields.action2,
            cause2: editedPatternFields.cause2,
            outcome: editedPatternFields.outcome,
            outcome2: editedPatternFields.outcome2,
            includeSecondary: Boolean(
                editedPatternFields.cause2.trim() ||
                editedPatternFields.action2.trim() ||
                editedPatternFields.outcome2.trim() ||
                editedPatternFields.growthActionType.trim()
            ),
        })
        : buildPatternName({
            action1: newPatternAction,
            cause1: newPatternCause,
            action2: newPatternAction2,
            cause2: newPatternCause2,
            outcome: newPatternOutcome,
            outcome2: newPatternOutcome2,
            includeSecondary: Boolean(
                newPatternCause2.trim() ||
                newPatternAction2.trim() ||
                newPatternOutcome2.trim() ||
                newGrowthActionType.trim()
            ),
        });
    const draftThreatPath = selectedPatternToUpdate
        ? [editedPatternFields.cause1, editedPatternFields.action1, editedPatternFields.outcome].filter(Boolean).join(STEP_ARROW)
        : [newPatternCause, newPatternAction, newPatternOutcome].filter(Boolean).join(STEP_ARROW);
    const draftGrowthPath = selectedPatternToUpdate
        ? [editedPatternFields.cause2, editedPatternFields.action2, editedPatternFields.outcome2].filter(Boolean).join(STEP_ARROW)
        : [newPatternCause2, newPatternAction2, newPatternOutcome2].filter(Boolean).join(STEP_ARROW);
    const draftPatternType = selectedPatternToUpdate ? editedPatternFields.type : newPatternType;
    const builderSteps = [
        { id: 0 as const, label: 'Start', description: 'Choose whether you are creating or refining.' },
        { id: 1 as const, label: 'Evidence', description: 'Pick the habit and mechanism phrases you want to use.' },
        { id: 2 as const, label: 'Shape', description: 'Write the actual chain for the pattern.' },
        { id: 3 as const, label: 'Review', description: 'Review the finished pattern and save it.' },
    ];
    const hasPatternDraft = selectedPatternToUpdate
        ? Boolean(
            editedPatternFields.action1.trim() &&
            editedPatternFields.outcome.trim() &&
            (
                !(editedPatternFields.cause2.trim() || editedPatternFields.action2.trim() || editedPatternFields.outcome2.trim() || editedPatternFields.growthActionType.trim()) ||
                (editedPatternFields.action2.trim() && editedPatternFields.outcome2.trim())
            )
        )
        : Boolean(
            newPatternAction.trim() &&
            newPatternOutcome.trim() &&
            (
                !(newPatternCause2.trim() || newPatternAction2.trim() || newPatternOutcome2.trim() || newGrowthActionType.trim()) ||
                (newPatternAction2.trim() && newPatternOutcome2.trim())
            )
        );
    const selectedRulePattern = selectedPatternForRule
        ? patterns.find((p) => p.id === selectedPatternForRule) || null
        : null;

    return (
        <>
        <div className="container mx-auto space-y-8 p-4 sm:p-6 lg:p-8">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-primary">Pattern Recognition</h1>
                    <p className="mt-3 max-w-2xl text-lg text-muted-foreground">Work through one stage at a time. Build, review your saved patterns, then turn them into rules when you are ready.</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant={activeWorkspace === 'build' ? 'default' : 'outline'} onClick={() => setActiveWorkspace('build')}>Builder Flow</Button>
                    <Button variant={activeWorkspace === 'patterns' ? 'default' : 'outline'} onClick={() => setActiveWorkspace('patterns')}>Pattern Library</Button>
                    <Button variant={activeWorkspace === 'rules' ? 'default' : 'outline'} onClick={() => setActiveWorkspace('rules')}>Meta Rules</Button>
                </div>
            </div>

            {activeWorkspace === 'build' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BookOpen /> Guided Builder</CardTitle>
                            <CardDescription>Move through the flow in stages instead of managing the whole page at once.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid gap-3 md:grid-cols-4">
                            {builderSteps.map((step) => (
                                <button
                                    key={step.id}
                                    type="button"
                                    onClick={() => {
                                        if (step.id <= builderStep || step.id === builderStep + 1 || (step.id === 3 && hasPatternDraft)) {
                                            setBuilderStep(step.id);
                                        }
                                    }}
                                    className={cn(
                                        "rounded-2xl border p-4 text-left transition-colors",
                                        builderStep === step.id ? "border-primary bg-primary/10" : "border-border/60 bg-card hover:bg-muted/30"
                                    )}
                                >
                                    <div className="mb-2 flex items-center gap-2">
                                        <Badge variant={builderStep === step.id ? 'default' : 'outline'}>{step.id + 1}</Badge>
                                        <span className="font-semibold">{step.label}</span>
                                    </div>
                                    <p className="text-sm text-muted-foreground">{step.description}</p>
                                </button>
                            ))}
                        </CardContent>
                    </Card>

                    {builderStep === 0 && (
                        <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
                            <Card>
                                <CardHeader>
                                    <CardTitle>Choose Your Entry Point</CardTitle>
                                    <CardDescription>Start fresh or reopen an existing pattern and walk through the same guided steps.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            resetNewPatternDraft();
                                            setBuilderStep(1);
                                        }}
                                        className="w-full rounded-2xl border border-border/60 p-4 text-left hover:bg-muted/30"
                                    >
                                        <div className="flex items-center justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">Create New Pattern</p>
                                                <p className="text-sm text-muted-foreground">Pick evidence first, then shape the chain.</p>
                                            </div>
                                            <PlusCircle className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                    </button>
                                    <div className="rounded-2xl border border-dashed border-border/60 p-4">
                                        <p className="font-semibold">Current draft</p>
                                        <p className="mt-1 text-sm text-muted-foreground">{draftPatternName.trim() ? draftPatternName : 'No draft started yet.'}</p>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>Refine Existing Pattern</CardTitle>
                                    <CardDescription>Select a saved pattern to reopen it inside the guided flow.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <ScrollArea className="h-80 pr-4">
                                        <div className="space-y-3">
                                            {patterns.length > 0 ? patterns.map((pattern) => (
                                                (() => {
                                                    const { threatPath, growthPath } = getPatternPathSummary(pattern);
                                                    return (
                                                        <button
                                                            key={pattern.id}
                                                            type="button"
                                                            onClick={() => {
                                                                setSelectedPatternToUpdate(pattern.id);
                                                                setBuilderStep(1);
                                                            }}
                                                            className="w-full rounded-2xl border border-border/60 p-4 text-left hover:bg-muted/30"
                                                        >
                                                            <div className="grid gap-3 md:grid-cols-2">
                                                                <div>
                                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">State</p>
                                                                    <p className="mt-1 text-sm font-medium">{pattern.state || '...'}</p>
                                                                </div>
                                                                <div>
                                                                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Cause</p>
                                                                    <p className="mt-1 text-sm font-medium">{pattern.sharedCause || '...'}</p>
                                                                </div>
                                                            </div>
                                                            <div className="mt-4 space-y-3 rounded-xl border border-border/50 bg-muted/10 p-3">
                                                                <div>
                                                                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Threat Path</p>
                                                                    {threatPath.signal || threatPath.action || threatPath.outcome ? (
                                                                        <FormattedPatternName
                                                                            name={[threatPath.signal, threatPath.action, threatPath.outcome].filter(Boolean).join(STEP_ARROW)}
                                                                            type="Negative"
                                                                        />
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">No threat path saved.</p>
                                                                    )}
                                                                </div>
                                                                <div className="border-t border-border/50 pt-3">
                                                                    <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Growth Path</p>
                                                                    {growthPath.signal || growthPath.action || growthPath.outcome ? (
                                                                        <FormattedPatternName
                                                                            name={[growthPath.signal, growthPath.action, growthPath.outcome].filter(Boolean).join(STEP_ARROW)}
                                                                            type="Positive"
                                                                        />
                                                                    ) : (
                                                                        <p className="text-sm text-muted-foreground">No growth path saved.</p>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <p className="mt-3 text-sm text-muted-foreground">{pattern.phrases.length} linked phrase{pattern.phrases.length === 1 ? '' : 's'}</p>
                                                        </button>
                                                    );
                                                })()
                                            )) : (
                                                <div className="flex h-48 items-center justify-center rounded-2xl border border-border/60">
                                                    <p className="text-sm text-muted-foreground">No saved patterns yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </ScrollArea>
                                </CardContent>
                            </Card>
                        </div>
                    )}

                    {builderStep === 1 && (
                        <div>
                            <PatternEvidencePanel
                                habitGroups={habitEvidenceGroups}
                                activeHabitId={activeHabitId}
                                onFocusHabit={setActiveHabitId}
                                selectedPhrases={selectedPhrases}
                                onTogglePhrase={handlePhraseToggle}
                                footer={
                                    <div className="border-t border-border/60 px-6 py-4">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <Badge variant="outline">{selectedPhrases.length} selected</Badge>
                                            <Badge variant="outline">{selectedPatternToUpdate ? 'Editing existing' : 'Creating new'}</Badge>
                                        </div>
                                        <div className="mt-4 flex justify-between gap-3">
                                            <Button variant="outline" onClick={() => setBuilderStep(0)}>Back</Button>
                                            <Button onClick={() => setBuilderStep(2)}>Next: Shape Pattern</Button>
                                        </div>
                                    </div>
                                }
                            />
                        </div>
                    )}

                    {builderStep === 2 && (
                        <div className="grid gap-6 xl:grid-cols-[1fr_0.75fr]">
                            <PatternBuilderPanel
                                habitCards={habitCards}
                                mechanismCards={mechanismCards}
                                mindsetCards={mindsetCards}
                                patterns={patterns}
                                selectedPatternToUpdate={selectedPatternToUpdate}
                                onSelectPattern={setSelectedPatternToUpdate}
                                selectedPhrases={selectedPhrases}
                                showSecondaryAction={showSecondaryAction}
                                setShowSecondaryAction={setShowSecondaryAction}
                                showSecondaryActionEdit={showSecondaryActionEdit}
                                setShowSecondaryActionEdit={setShowSecondaryActionEdit}
                                newPatternAction={newPatternAction}
                                setNewPatternAction={setNewPatternAction}
                                newSharedCause={newSharedCause}
                                setNewSharedCause={setNewSharedCause}
                                newThreatSignalCategory={newThreatSignalCategory}
                                setNewThreatSignalCategory={setNewThreatSignalCategory}
                                newPatternCause={newPatternCause}
                                setNewPatternCause={setNewPatternCause}
                                newPatternAction2={newPatternAction2}
                                setNewPatternAction2={setNewPatternAction2}
                                newGrowthSignalCategory={newGrowthSignalCategory}
                                setNewGrowthSignalCategory={setNewGrowthSignalCategory}
                                newPatternCause2={newPatternCause2}
                                setNewPatternCause2={setNewPatternCause2}
                                newPatternOutcome={newPatternOutcome}
                                setNewPatternOutcome={setNewPatternOutcome}
                                newPatternOutcome2={newPatternOutcome2}
                                setNewPatternOutcome2={setNewPatternOutcome2}
                                newPatternCategory={newPatternCategory}
                                setNewPatternCategory={setNewPatternCategory}
                                newPatternActionType={newPatternActionType}
                                setNewPatternActionType={setNewPatternActionType}
                                newGrowthActionType={newGrowthActionType}
                                setNewGrowthActionType={setNewGrowthActionType}
                                newPatternState={newPatternState}
                                setNewPatternState={setNewPatternState}
                                newPatternType={newPatternType}
                                setNewPatternType={setNewPatternType}
                                editedPatternFields={editedPatternFields}
                                setEditedPatternFields={setEditedPatternFields}
                                onCreateOrUpdate={handleCreateOrUpdatePattern}
                                showMode={false}
                                showSubmitButton={false}
                            />
                            <div className="space-y-6">
                                <PatternPreviewCard
                                    type={draftPatternType}
                                    name={draftPatternName}
                                    selectedPhrases={selectedPhrases}
                                    state={selectedPatternToUpdate ? editedPatternFields.state : newPatternState}
                                    sharedCause={selectedPatternToUpdate ? editedPatternFields.sharedCause : newSharedCause}
                                    threatPattern={selectedPatternToUpdate ? editedPatternFields.patternCategory : newPatternCategory}
                                    threatSignal={selectedPatternToUpdate ? editedPatternFields.cause1 : newPatternCause}
                                    threatAction={selectedPatternToUpdate ? editedPatternFields.action1 : newPatternAction}
                                    threatActionType={selectedPatternToUpdate ? editedPatternFields.actionType : newPatternActionType}
                                    threatOutcome={selectedPatternToUpdate ? editedPatternFields.outcome : newPatternOutcome}
                                    growthPattern={selectedPatternToUpdate
                                        ? (THREAT_TO_GROWTH_PATTERN[editedPatternFields.patternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '')
                                        : (THREAT_TO_GROWTH_PATTERN[newPatternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '')}
                                    growthSignal={selectedPatternToUpdate ? editedPatternFields.cause2 : newPatternCause2}
                                    growthAction={selectedPatternToUpdate ? editedPatternFields.action2 : newPatternAction2}
                                    growthActionType={selectedPatternToUpdate ? editedPatternFields.growthActionType : newGrowthActionType}
                                    growthOutcome={selectedPatternToUpdate ? editedPatternFields.outcome2 : newPatternOutcome2}
                                />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Move Forward</CardTitle>
                                        <CardDescription>Once action and outcome are set, review the finished pattern before saving.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="flex justify-between gap-3">
                                        <Button variant="outline" onClick={() => setBuilderStep(1)}>Back</Button>
                                        <Button onClick={() => setBuilderStep(3)} disabled={!hasPatternDraft}>Next: Review</Button>
                                    </CardContent>
                                </Card>
                            </div>
                        </div>
                    )}

                    {builderStep === 3 && (
                        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
                            <div className="space-y-6">
                                <PatternPreviewCard
                                    type={draftPatternType}
                                    name={draftPatternName}
                                    selectedPhrases={selectedPhrases}
                                    state={selectedPatternToUpdate ? editedPatternFields.state : newPatternState}
                                    sharedCause={selectedPatternToUpdate ? editedPatternFields.sharedCause : newSharedCause}
                                    threatPattern={selectedPatternToUpdate ? editedPatternFields.patternCategory : newPatternCategory}
                                    threatSignal={selectedPatternToUpdate ? editedPatternFields.cause1 : newPatternCause}
                                    threatAction={selectedPatternToUpdate ? editedPatternFields.action1 : newPatternAction}
                                    threatActionType={selectedPatternToUpdate ? editedPatternFields.actionType : newPatternActionType}
                                    threatOutcome={selectedPatternToUpdate ? editedPatternFields.outcome : newPatternOutcome}
                                    growthPattern={selectedPatternToUpdate
                                        ? (THREAT_TO_GROWTH_PATTERN[editedPatternFields.patternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '')
                                        : (THREAT_TO_GROWTH_PATTERN[newPatternCategory as keyof typeof THREAT_TO_GROWTH_PATTERN] || '')}
                                    growthSignal={selectedPatternToUpdate ? editedPatternFields.cause2 : newPatternCause2}
                                    growthAction={selectedPatternToUpdate ? editedPatternFields.action2 : newPatternAction2}
                                    growthActionType={selectedPatternToUpdate ? editedPatternFields.growthActionType : newGrowthActionType}
                                    growthOutcome={selectedPatternToUpdate ? editedPatternFields.outcome2 : newPatternOutcome2}
                                />
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Evidence Review</CardTitle>
                                        <CardDescription>Sanity check the evidence attached to this pattern before saving.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ScrollArea className="h-56 rounded-xl border border-border/60 p-3">
                                            {selectedPhrases.length > 0 ? (
                                                <div className="space-y-2">
                                                    {selectedPhrases.map((phrase, i) => (
                                                        <div key={`${phrase.text}-${i}`} className="rounded-lg border border-border/60 p-3">
                                                            <p className="text-sm">{phrase.text}</p>
                                                            <p className="mt-1 text-xs text-muted-foreground">{phrase.category}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="flex h-full items-center justify-center">
                                                    <p className="text-sm text-muted-foreground">No evidence attached.</p>
                                                </div>
                                            )}
                                        </ScrollArea>
                                    </CardContent>
                                </Card>
                            </div>
                            <Card>
                                <CardHeader>
                                    <CardTitle>{selectedPatternToUpdate ? 'Update Pattern' : 'Create Pattern'}</CardTitle>
                                    <CardDescription>Final review before saving.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="rounded-2xl border border-border/60 bg-muted/20 p-4">
                                        <p className="text-sm font-semibold">Pattern Paths</p>
                                        <div className="mt-3 space-y-4 min-w-0 break-words">
                                            <div>
                                                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Threat Path</p>
                                                {(selectedPatternToUpdate
                                                    ? [editedPatternFields.cause1, editedPatternFields.action1, editedPatternFields.outcome].filter(Boolean).join(STEP_ARROW)
                                                    : [newPatternCause, newPatternAction, newPatternOutcome].filter(Boolean).join(STEP_ARROW)
                                                ) ? (
                                                    <FormattedPatternName
                                                        name={selectedPatternToUpdate
                                                            ? [editedPatternFields.cause1, editedPatternFields.action1, editedPatternFields.outcome].filter(Boolean).join(STEP_ARROW)
                                                            : [newPatternCause, newPatternAction, newPatternOutcome].filter(Boolean).join(STEP_ARROW)
                                                        }
                                                        type="Negative"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Threat path is still incomplete.</p>
                                                )}
                                            </div>
                                            <div className="border-t border-border/50 pt-3">
                                                <p className="mb-2 text-xs uppercase tracking-wide text-muted-foreground">Growth Path</p>
                                                {(selectedPatternToUpdate
                                                    ? [editedPatternFields.cause2, editedPatternFields.action2, editedPatternFields.outcome2].filter(Boolean).join(STEP_ARROW)
                                                    : [newPatternCause2, newPatternAction2, newPatternOutcome2].filter(Boolean).join(STEP_ARROW)
                                                ) ? (
                                                    <FormattedPatternName
                                                        name={selectedPatternToUpdate
                                                            ? [editedPatternFields.cause2, editedPatternFields.action2, editedPatternFields.outcome2].filter(Boolean).join(STEP_ARROW)
                                                            : [newPatternCause2, newPatternAction2, newPatternOutcome2].filter(Boolean).join(STEP_ARROW)
                                                        }
                                                        type="Positive"
                                                    />
                                                ) : (
                                                    <p className="text-sm text-muted-foreground">Growth path is still incomplete.</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-2">
                                        <Badge variant="outline">{selectedPhrases.length} linked phrase{selectedPhrases.length === 1 ? '' : 's'}</Badge>
                                    </div>
                                    <div className="flex justify-between gap-3">
                                        <Button variant="outline" onClick={() => setBuilderStep(2)}>Back</Button>
                                        <Button onClick={handleCreateOrUpdatePattern} disabled={!hasPatternDraft}>
                                            <PlusCircle className="mr-2 h-4 w-4" />
                                            {selectedPatternToUpdate ? 'Update Pattern' : 'Create Pattern'}
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    )}
                </div>
            )}

            {activeWorkspace === 'patterns' && (
                <div className="space-y-6">
                    <ExistingPatternsPanel
                        patterns={patterns}
                        selectedPatternForRule={selectedPatternForRule}
                        setSelectedPatternForRule={setSelectedPatternForRule}
                        editingPatternId={editingPatternId}
                        editingPatternName={editingPatternName}
                        setEditingPatternName={setEditingPatternName}
                        handleSavePatternName={handleSavePatternName}
                        openEditModal={openEditModal}
                        handleDeletePattern={handleDeletePattern}
                        getHabitLinksForRule={getHabitLinksForRule}
                        handleOpenHabitPopup={handleOpenHabitPopup}
                    />
                    <Card>
                        <CardHeader>
                            <CardTitle>Next Actions</CardTitle>
                            <CardDescription>Use the saved library as a jumping-off point instead of mixing everything into the builder.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex flex-wrap gap-3">
                            <Button onClick={() => { resetNewPatternDraft(); setActiveWorkspace('build'); setBuilderStep(0); }}>Start New Pattern</Button>
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (selectedPatternForRule) {
                                        setSelectedPatternToUpdate(selectedPatternForRule);
                                        setActiveWorkspace('build');
                                        setBuilderStep(1);
                                    }
                                }}
                                disabled={!selectedPatternForRule}
                            >
                                Refine Selected Pattern
                            </Button>
                            <Button variant="outline" onClick={() => setActiveWorkspace('rules')} disabled={!selectedPatternForRule}>Use Selected Pattern For Rule</Button>
                        </CardContent>
                    </Card>
                </div>
            )}

            {activeWorkspace === 'rules' && (
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lightbulb /> Meta Rule Studio</CardTitle>
                            <CardDescription>Pick a saved pattern from the library, then turn it into a rule here.</CardDescription>
                        </CardHeader>
                        <CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
                            <div className="space-y-4">
                                <Label className="font-semibold">Selected Pattern</Label>
                                <div className="min-h-60 rounded-xl border border-border/60 bg-muted/20 p-4">
                                    {selectedRulePattern ? (
                                        <div className="space-y-4">
                                            <div className="flex flex-wrap items-center gap-2">
                                                <Badge variant={selectedRulePattern.type === 'Positive' ? 'default' : 'destructive'}>{selectedRulePattern.type}</Badge>
                                                <div className="min-w-0 break-words text-sm font-medium">
                                                    <FormattedPatternName name={selectedRulePattern.name} type={selectedRulePattern.type} />
                                                </div>
                                            </div>
                                            <div className="flex flex-wrap gap-2">
                                                {selectedRulePattern.phrases.map((phrase, i) => (
                                                    <Badge key={`${phrase.text}-${i}`} variant="secondary" className="max-w-full whitespace-normal break-words py-1">
                                                        {phrase.text}
                                                    </Badge>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex h-full items-center justify-center">
                                            <p className="text-sm text-muted-foreground text-center">Go to Pattern Library, select a pattern, then come back here to write the rule.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="meta-rule">New Meta-Rule</Label>
                                    <Textarea id="meta-rule" value={newMetaRuleText} onChange={e => setNewMetaRuleText(e.target.value)} placeholder="e.g., Every day must start with an Energy Feeder." />
                                    <Button onClick={handleAddMetaRule} className="mt-2" disabled={!selectedPatternForRule || !newMetaRuleText.trim()}>Add Rule</Button>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Lightbulb /> Defined Meta-Rules</CardTitle>
                    <CardDescription>A list of all the life rules you've created from your patterns. These will appear on your Purpose page.</CardDescription>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-60">
                        {metaRules.length > 0 ? (
                            <div className="space-y-2 pr-4">
                                {metaRules.map(rule => {
                                    const pattern = patterns.find(p => p.id === rule.patternId);
                                    return (
                                        <Dialog key={rule.id}>
                                            <DialogTrigger asChild>
                                                <div className="group flex cursor-pointer items-center justify-between rounded-md border bg-muted/30 p-3">
                                                    <p className="font-medium">{rule.text}</p>
                                                    <div className="opacity-0 transition-opacity group-hover:opacity-100">
                                                        <Badge className="capitalize">{rule.purposePillar?.[0] || '?'}</Badge>
                                                    </div>
                                                </div>
                                            </DialogTrigger>
                                            <DialogContent>
                                                <DialogHeader>
                                                    <DialogTitle>Meta-Rule Details</DialogTitle>
                                                </DialogHeader>
                                                <div className="space-y-4">
                                                    <p className="text-lg font-semibold">{rule.text}</p>
                                                    {pattern && (
                                                        <div>
                                                            <h4 className="font-semibold text-muted-foreground">Based on Pattern:</h4>
                                                            <div className="mt-1 rounded-md bg-muted/50 p-2">
                                                                <FormattedPatternName name={pattern.name} type={pattern.type} />
                                                            </div>
                                                        </div>
                                                    )}
                                                     <div>
                                                        <Label>Assign to Pillar</Label>
                                                         <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="outline" className="mt-1 w-full justify-start">{rule.purposePillar || 'Select Pillar...'}</Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent className="w-56">
                                                                {pillars.map(pillar => (
                                                                    <DropdownMenuGroup key={pillar.name}>
                                                                        <DropdownMenuItem onSelect={() => handleUpdatePillar(rule.id, pillar.name)}>
                                                                            {pillar.name}
                                                                        </DropdownMenuItem>
                                                                        {pillar.attributes.map(attr => (
                                                                            <DropdownMenuItem key={attr} onSelect={() => handleUpdatePillar(rule.id, attr)} className="pl-6">
                                                                                {attr}
                                                                            </DropdownMenuItem>
                                                                        ))}
                                                                    </DropdownMenuGroup>
                                                                ))}
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                </div>
                                            </DialogContent>
                                        </Dialog>
                                    )
                                })}
                            </div>
                        ) : (
                            <div className="flex h-40 items-center justify-center">
                                <p className="text-muted-foreground">No meta-rules defined yet.</p>
                            </div>
                        )}
                    </ScrollArea>
                </CardContent>
            </Card>
        </div>

            {editingPattern && (
                <Dialog open={!!editingPattern} onOpenChange={() => setEditingPattern(null)}>
                    <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
                        <DialogHeader>
                            <DialogTitle>Edit Pattern: {editingPattern.name}</DialogTitle>
                            <DialogDescription>Add or remove phrases to refine this pattern.</DialogDescription>
                        </DialogHeader>
                        <div className="flex-grow min-h-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex flex-col">
                                <Label className="font-semibold mb-2">Available Phrases</Label>
                                <ScrollArea className="h-full border rounded-md p-2">
                                    {Object.entries(aggregatedFields).map(([title, phrases]) => (
                                        <div key={title} className="mb-4">
                                            <h3 className="font-semibold mb-2 text-sm">{title}</h3>
                                            <div className="space-y-2">
                                                {(phrases || []).map((phrase, i) => (
                                                    <div key={`avail-${i}`} className="flex items-start space-x-2">
                                                        <Checkbox
                                                            id={`avail-phrase-${title}-${i}`}
                                                            checked={editedPatternPhrases.some(p => p.text === phrase.text)}
                                                            onCheckedChange={() => handlePhraseToggleInModal(phrase)}
                                                        />
                                                        <Label htmlFor={`avail-phrase-${title}-${i}`} className="font-normal w-full flex-grow cursor-pointer">{phrase.text}</Label>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </ScrollArea>
                            </div>
                            <div className="flex flex-col">
                                <Label className="font-semibold mb-2">Selected Phrases ({editedPatternPhrases.length})</Label>
                                <ScrollArea className="h-full border rounded-md p-2">
                                    <div className="space-y-2">
                                        {editedPatternPhrases.map((phrase, i) => (
                                            <div key={`sel-${i}`} className="flex items-start space-x-2">
                                                <Checkbox
                                                    id={`sel-phrase-${i}`}
                                                    checked={true}
                                                    onCheckedChange={() => handlePhraseToggleInModal(phrase)}
                                                />
                                                <Label htmlFor={`sel-phrase-${i}`} className="font-normal w-full flex-grow cursor-pointer">{phrase.text}</Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setEditingPattern(null)}>Cancel</Button>
                            <Button onClick={handleSaveChangesInModal}>Save Changes</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}

export default function PatternsPage() {
    return (
        <AuthGuard>
            <PatternsPageContent />
        </AuthGuard>
    );
}
    









    

    






    












    
