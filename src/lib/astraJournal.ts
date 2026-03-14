import type {
  Activity,
  CoreSkill,
  DailyJournalSession,
  ExerciseDefinition,
  FullSchedule,
  JournalBotheringReflection,
  JournalBotheringStatus,
  JournalCauseCategory,
  JournalChatMessage,
  JournalCursor,
  JournalIntentionality,
  JournalSlotReview,
  JournalSlotState,
  JournalTaskReflection,
  MindsetCard,
  MindsetPoint,
  MissedSlotReview,
  ProductizationPlan,
  Project,
  SkillAcquisitionPlan,
  SlotName,
} from "@/types/workout";

export const ASTRA_JOURNAL_SLOT_ORDER: SlotName[] = [
  "Late Night",
  "Dawn",
  "Morning",
  "Afternoon",
  "Evening",
  "Night",
];

const SLOT_END_HOURS: Record<SlotName, number> = {
  "Late Night": 4,
  Dawn: 8,
  Morning: 12,
  Afternoon: 16,
  Evening: 20,
  Night: 24,
};

export type AstraJournalChoice = {
  label: string;
  value: string;
};

export type AstraJournalPromptKind =
  | "opening_note"
  | "opening_mood"
  | "opening_energy"
  | "opening_stress"
  | "slot_overview"
  | "slot_cause"
  | "slot_intentionality"
  | "slot_feeling"
  | "task_reason_category"
  | "task_blocker"
  | "task_stopper"
  | "task_next_action"
  | "task_reschedule_slot"
  | "task_reschedule_fit"
  | "bothering_status"
  | "bothering_blocker_category"
  | "bothering_reflection"
  | "bothering_feeling"
  | "bothering_due_task_window"
  | "bothering_next_action"
  | "closeout_focus"
  | "closeout_protection"
  | "closeout_notes";

export type AstraJournalPrompt = {
  id: string;
  kind: AstraJournalPromptKind;
  section: JournalCursor["section"];
  prompt: string;
  placeholder?: string;
  choices?: AstraJournalChoice[];
  slotName?: SlotName;
  taskId?: string;
  botheringId?: string;
  sourceType?: "external" | "mismatch" | "constraint";
  relatedTaskIds?: string[];
  contextualData?: Record<string, unknown>;
};

export type AstraJournalBuildInput = {
  dateKey: string;
  now?: Date;
  currentSlot?: string | null;
  username?: string | null;
  schedule: FullSchedule;
  activityDurations: Record<string, string>;
  mindsetCards: MindsetCard[];
  missedSlotReviews: Record<string, MissedSlotReview>;
  offerizationPlans: Record<string, ProductizationPlan>;
  skillAcquisitionPlans: SkillAcquisitionPlan[];
  coreSkills: CoreSkill[];
  upskillDefinitions: ExerciseDefinition[];
  deepWorkDefinitions: ExerciseDefinition[];
  projects: Project[];
};

export type JournalSessionSummary = {
  date: string;
  status: DailyJournalSession["status"];
  moodRating: number | null;
  energyRating: number | null;
  stressRating: number | null;
  unresolvedBotherings: number;
  topCauses: string[];
  note: string;
};

const normalizeText = (value: unknown) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const formatMinutes = (value: number) => {
  const minutes = Math.max(0, Math.round(value));
  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainder = minutes % 60;
    if (remainder === 0) return `${hours} hour${hours === 1 ? "" : "s"}`;
    return `${hours} hour${hours === 1 ? "" : "s"} ${remainder} min`;
  }
  return `${minutes} min`;
};

export const parseDurationToMinutes = (durationStr: string | undefined, numericFallback?: number) => {
  if (typeof numericFallback === "number" && Number.isFinite(numericFallback) && numericFallback > 0) {
    return Math.round(numericFallback);
  }
  if (!durationStr || typeof durationStr !== "string") return 0;
  if (/^\d+$/.test(durationStr.trim())) {
    return parseInt(durationStr.trim(), 10);
  }
  let totalMinutes = 0;
  const hourMatch = durationStr.match(/(\d+)\s*h/i);
  if (hourMatch) totalMinutes += parseInt(hourMatch[1], 10) * 60;
  const minMatch = durationStr.match(/(\d+)\s*m/i);
  if (minMatch) totalMinutes += parseInt(minMatch[1], 10);
  return totalMinutes;
};

const parseDateOnly = (value?: string | null) => {
  if (!value) return null;
  const parsed = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  if (Number.isNaN(parsed.getTime())) return null;
  parsed.setHours(0, 0, 0, 0);
  return parsed;
};

const toDateKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const diffDays = (a: Date, b: Date) => Math.floor((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

const inferCurrentSlot = (now: Date): SlotName => {
  const hour = now.getHours();
  if (hour < SLOT_END_HOURS["Late Night"]) return "Late Night";
  if (hour < SLOT_END_HOURS.Dawn) return "Dawn";
  if (hour < SLOT_END_HOURS.Morning) return "Morning";
  if (hour < SLOT_END_HOURS.Afternoon) return "Afternoon";
  if (hour < SLOT_END_HOURS.Evening) return "Evening";
  return "Night";
};

export const getElapsedJournalSlots = (currentSlot?: string | null, now = new Date()) => {
  const effectiveSlot = ASTRA_JOURNAL_SLOT_ORDER.includes(currentSlot as SlotName)
    ? (currentSlot as SlotName)
    : inferCurrentSlot(now);
  const slotIndex = ASTRA_JOURNAL_SLOT_ORDER.indexOf(effectiveSlot);
  return ASTRA_JOURNAL_SLOT_ORDER.slice(0, Math.max(0, slotIndex));
};

const CAUSE_CHOICES: AstraJournalChoice[] = [
  { label: "Distraction", value: "distraction" },
  { label: "Low energy", value: "low_energy" },
  { label: "External demand", value: "external_demand" },
  { label: "Transition friction", value: "transition_friction" },
  { label: "Overplanned", value: "overplanned" },
  { label: "Avoidance", value: "avoidance" },
  { label: "Rest", value: "rest" },
  { label: "Admin", value: "admin" },
  { label: "Other", value: "other" },
];

const INTENTIONALITY_CHOICES: AstraJournalChoice[] = [
  { label: "Intentional", value: "intentional" },
  { label: "Mixed", value: "mixed" },
  { label: "Unintentional", value: "unintentional" },
];

const MOOD_RATING_CHOICES: AstraJournalChoice[] = [
  { label: "1 Very low", value: "1" },
  { label: "2 Low", value: "2" },
  { label: "3 Neutral", value: "3" },
  { label: "4 Good", value: "4" },
  { label: "5 Very good", value: "5" },
];

const ENERGY_RATING_CHOICES: AstraJournalChoice[] = [
  { label: "1 Drained", value: "1" },
  { label: "2 Low", value: "2" },
  { label: "3 Okay", value: "3" },
  { label: "4 Strong", value: "4" },
  { label: "5 Full", value: "5" },
];

const STRESS_RATING_CHOICES: AstraJournalChoice[] = [
  { label: "1 Calm", value: "1" },
  { label: "2 Light", value: "2" },
  { label: "3 Moderate", value: "3" },
  { label: "4 High", value: "4" },
  { label: "5 Overloaded", value: "5" },
];

const FEELING_RATING_CHOICES: AstraJournalChoice[] = [
  { label: "1 Very bad", value: "1" },
  { label: "2 Bad", value: "2" },
  { label: "3 Mixed", value: "3" },
  { label: "4 Okay", value: "4" },
  { label: "5 Good", value: "5" },
];

const BOTHERING_STATUS_CHOICES: AstraJournalChoice[] = [
  { label: "Solved", value: "solved" },
  { label: "Partial", value: "partial" },
  { label: "Not solved", value: "not_solved" },
  { label: "Changed", value: "changed" },
];

const YES_NO_CHOICES: AstraJournalChoice[] = [
  { label: "Yes", value: "yes" },
  { label: "No", value: "no" },
];

const TASK_BLOCKER_CHOICES: AstraJournalChoice[] = [
  { label: "Distracted", value: "got distracted" },
  { label: "Low energy", value: "low energy" },
  { label: "Interrupted", value: "got interrupted by something else" },
  { label: "No clear next step", value: "did not know the next step" },
  { label: "Too big", value: "it felt too big or heavy" },
  { label: "Avoided it", value: "avoided it" },
  { label: "Resource missing", value: "needed a missing resource or input" },
  { label: "Other", value: "other" },
];

const TASK_NEXT_ACTION_CHOICES: AstraJournalChoice[] = [
  { label: "Finish smaller part", value: "finish a smaller part" },
  { label: "Move to another slot", value: "move it to another slot" },
  { label: "Do it tomorrow", value: "reschedule it for tomorrow" },
  { label: "Drop for now", value: "drop it for now" },
];

const TASK_RESCHEDULE_FIT_CHOICES: AstraJournalChoice[] = [
  { label: "Yes, it can fit", value: "yes" },
  { label: "Skip move", value: "skip" },
];

const getUpcomingSlotChoices = (
  dateKey: string,
  currentSlot: string | null | undefined,
  now: Date,
  schedule: FullSchedule
) => {
  const effectiveSlot = ASTRA_JOURNAL_SLOT_ORDER.includes(currentSlot as SlotName)
    ? (currentSlot as SlotName)
    : inferCurrentSlot(now);
  const todayIndex = ASTRA_JOURNAL_SLOT_ORDER.indexOf(effectiveSlot);
  const todaySlots = ASTRA_JOURNAL_SLOT_ORDER.slice(Math.max(0, todayIndex));
  const baseDate = parseDateOnly(dateKey) || now;
  const tomorrowDate = new Date(baseDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  const tomorrowDateKey = toDateKey(tomorrowDate);

  const buildOption = (targetDateKey: string, slotName: SlotName, labelPrefix: string) => {
    const scheduledCount = Array.isArray(schedule?.[targetDateKey]?.[slotName])
      ? (schedule[targetDateKey][slotName] as Activity[]).length
      : 0;
    return {
      label: `${labelPrefix} ${slotName}${scheduledCount > 0 ? ` (${scheduledCount} task${scheduledCount === 1 ? "" : "s"})` : ""}`,
      value: `${targetDateKey}::${slotName}`,
      dateKey: targetDateKey,
      slotName,
      scheduledCount,
    };
  };

  const options = [
    ...todaySlots.map((slotName) => buildOption(dateKey, slotName, "Today")),
    ...ASTRA_JOURNAL_SLOT_ORDER.map((slotName) => buildOption(tomorrowDateKey, slotName, "Tomorrow")),
  ];

  return {
    tomorrowDateKey,
    options,
  };
};

const isMindsetTaskDueOnDate = (
  task: NonNullable<MindsetPoint["tasks"]>[number],
  dateKey: string
) => {
  const recurrence = task?.recurrence || "none";
  const targetDate = parseDateOnly(dateKey);
  const start = parseDateOnly(task?.startDate || task?.dateKey);
  if (!targetDate) return false;
  if (recurrence === "none") return task?.dateKey === dateKey;
  if (!start) return false;
  if (recurrence === "daily") return true;
  if (recurrence === "weekly") return start.getDay() === targetDate.getDay();
  if (recurrence === "custom") {
    const interval = Math.max(1, Number(task?.repeatInterval || 1));
    const unit = task?.repeatUnit || "day";
    if (unit === "month") {
      if (start.getDate() !== targetDate.getDate()) return false;
      const months =
        (targetDate.getFullYear() - start.getFullYear()) * 12 +
        (targetDate.getMonth() - start.getMonth());
      return months >= 0 && months % interval === 0;
    }
    const days = diffDays(targetDate, start);
    if (unit === "week") return days >= 0 && days % (interval * 7) === 0;
    return days >= 0 && days % interval === 0;
  }
  return false;
};

const getTodayActivityLookup = (schedule: FullSchedule, dateKey: string) => {
  const scheduleById = new Map<string, Activity & { slot: SlotName }>();
  const today = schedule[dateKey] || {};
  Object.entries(today).forEach(([slotName, activities]) => {
    if (!Array.isArray(activities)) return;
    activities.forEach((activity) => {
      if (!activity?.id) return;
      const withSlot = { ...activity, slot: slotName as SlotName };
      scheduleById.set(activity.id, withSlot);
      (activity.taskIds || []).forEach((taskId) => scheduleById.set(taskId, withSlot));
      const baseId = activity.id.replace(/_(\d{4}-\d{2}-\d{2})$/, "");
      scheduleById.set(baseId, withSlot);
    });
  });
  return scheduleById;
};

const findMatchingDefinition = (
  taskId: string | undefined,
  taskDetails: string,
  definitions: ExerciseDefinition[]
) => {
  const normalizedTaskDetails = normalizeText(taskDetails);
  return (
    definitions.find((definition) => definition.id === taskId) ||
    definitions.find((definition) => normalizeText(definition.name) === normalizedTaskDetails) ||
    null
  );
};

const findSpecializationForTask = (
  taskId: string | undefined,
  taskDetails: string,
  coreSkills: CoreSkill[],
  upskillDefinitions: ExerciseDefinition[],
  deepWorkDefinitions: ExerciseDefinition[]
) => {
  const specializations = coreSkills.filter((skill) => skill.type === "Specialization");
  const normalizedTaskDetails = normalizeText(taskDetails);
  let matchedSpec =
    specializations.find((spec) => spec.id === taskId || normalizeText(spec.name) === normalizedTaskDetails) ||
    null;
  if (matchedSpec) return matchedSpec;

  const matchedDefinition =
    findMatchingDefinition(taskId, taskDetails, [...deepWorkDefinitions, ...upskillDefinitions]) || null;
  if (!matchedDefinition) return null;

  const categoryKey = normalizeText(matchedDefinition.category);
  matchedSpec =
    specializations.find((spec) => normalizeText(spec.name) === categoryKey) ||
    specializations.find((spec) =>
      spec.skillAreas.some(
        (area) =>
          normalizeText(area.name) === categoryKey ||
          area.microSkills.some((micro) => normalizeText(micro.name) === categoryKey)
      )
    ) ||
    null;
  return matchedSpec;
};

const summarizeLearningPlan = (plan?: ProductizationPlan["learningPlan"]) => {
  if (!plan) return "";
  const parts: string[] = [];
  const audio = (plan.audioVideoResources || []).slice(0, 2).map((resource) => {
    const details: string[] = [];
    if (resource.totalHours != null) details.push(`${resource.totalHours}h`);
    if (resource.completionDate) details.push(`due ${resource.completionDate}`);
    return `${resource.name}${details.length ? ` (${details.join(", ")})` : ""}`;
  });
  const books = (plan.bookWebpageResources || []).slice(0, 2).map((resource) => {
    const details: string[] = [];
    if (resource.totalPages != null) details.push(`${resource.totalPages} pages`);
    if (resource.completionDate) details.push(`due ${resource.completionDate}`);
    return `${resource.name}${details.length ? ` (${details.join(", ")})` : ""}`;
  });
  const paths = (plan.skillTreePaths || []).slice(0, 2).map((path) => {
    const details: string[] = [];
    if (path.targetMicroSkills != null) details.push(`${path.targetMicroSkills} micro-skills`);
    if (path.completionDate) details.push(`due ${path.completionDate}`);
    return `${path.name}${details.length ? ` (${details.join(", ")})` : ""}`;
  });
  if (audio.length) parts.push(`Audio: ${audio.join(" | ")}`);
  if (books.length) parts.push(`Books: ${books.join(" | ")}`);
  if (paths.length) parts.push(`Paths: ${paths.join(" | ")}`);
  return parts.join(". ");
};

const summarizeSkillPlan = (
  specializationId: string,
  skillAcquisitionPlans: SkillAcquisitionPlan[]
) => {
  const plan = skillAcquisitionPlans.find((entry) => entry.specializationId === specializationId);
  if (!plan) return "";
  const parts: string[] = [];
  if (plan.targetDate) parts.push(`target ${plan.targetDate}`);
  if (plan.requiredHours != null) parts.push(`${plan.requiredHours}h required`);
  if (plan.requiredMoney != null) parts.push(`$${plan.requiredMoney} budgeted`);
  return parts.join(", ");
};

const countRemainingReleaseItems = (release: NonNullable<ProductizationPlan["releases"]>[number]) => {
  const normalizeStageItem = (item: string | { text: string; completed?: boolean }) =>
    typeof item === "string" ? { text: item, completed: false } : { text: item.text || "", completed: !!item.completed };
  const items = [
    ...(release.workflowStages?.ideaItems || []),
    ...(release.workflowStages?.codeItems || []),
    ...(release.workflowStages?.breakItems || []),
    ...(release.workflowStages?.fixItems || []),
  ]
    .map(normalizeStageItem)
    .filter((item) => item.text.trim().length > 0);
  const remaining = items.filter((item) => !item.completed).length;
  return { total: items.length, remaining };
};

const summarizeProjectPlan = (
  specializationId: string,
  offerizationPlans: Record<string, ProductizationPlan>,
  projects: Project[]
) => {
  const releases = offerizationPlans[specializationId]?.releases || [];
  if (!releases.length) return "";
  const ranked = [...releases]
    .map((release) => {
      const counts = countRemainingReleaseItems(release);
      const projectMatch = projects.find((project) => normalizeText(project.name) === normalizeText(release.name));
      return { release, counts, projectMatch };
    })
    .sort((a, b) => a.release.launchDate.localeCompare(b.release.launchDate));
  const top = ranked[0];
  const parts = [`${top.release.name} due ${top.release.launchDate}`];
  if (top.counts.total > 0) parts.push(`${top.counts.remaining}/${top.counts.total} items remaining`);
  if (top.projectMatch) parts.push(`project ${top.projectMatch.name}`);
  return parts.join(", ");
};

const buildTaskContext = (
  task: NonNullable<MindsetPoint["tasks"]>[number],
  input: AstraJournalBuildInput
) => {
  if (task.type !== "upskill" && task.type !== "deepwork") return null;
  const taskKey = task.activityId || task.id;
  const matchedSpec = findSpecializationForTask(
    taskKey,
    task.details || "",
    input.coreSkills,
    input.upskillDefinitions,
    input.deepWorkDefinitions
  );
  if (!matchedSpec) return null;
  const plan = input.offerizationPlans[matchedSpec.id];
  return {
    taskId: task.id,
    taskType: task.type,
    taskDetails: task.details,
    specializationId: matchedSpec.id,
    specializationName: matchedSpec.name,
    learningPlanSummary: summarizeLearningPlan(plan?.learningPlan),
    skillPlanSummary: summarizeSkillPlan(matchedSpec.id, input.skillAcquisitionPlans),
    projectPlanSummary:
      task.type === "deepwork"
        ? summarizeProjectPlan(matchedSpec.id, input.offerizationPlans, input.projects)
        : "",
  };
};

const sourceByCardId: Record<string, "external" | "mismatch" | "constraint"> = {
  mindset_botherings_external: "external",
  mindset_botherings_mismatch: "mismatch",
  mindset_botherings_constraint: "constraint",
};

const slotPromptText = (
  slotName: SlotName,
  activities: Activity[],
  completedTasks: Activity[],
  incompleteTasks: Activity[],
  loggedMinutes: number,
  untrackedMinutes: number
) => {
  if (activities.length === 0) {
    return `You had nothing scheduled in ${slotName}. What did you end up doing?`;
  }
  if (incompleteTasks.length > 0) {
    return `In ${slotName} you had ${activities.length} scheduled, ${incompleteTasks.length} incomplete, and ${formatMinutes(loggedMinutes)} logged. What were you doing during the missing time?`;
  }
  if (untrackedMinutes > 0) {
    return `I can see in ${slotName} you completed ${completedTasks.length} task${completedTasks.length === 1 ? "" : "s"} and logged ${formatMinutes(loggedMinutes)}. What were you doing in the remaining ${formatMinutes(untrackedMinutes)}?`;
  }
  return `In ${slotName} you completed everything you scheduled. What stands out about that slot?`;
};

const buildBotheringReflectionPrompt = (
  point: MindsetPoint,
  sourceType: "external" | "mismatch" | "constraint",
  pastSlotTasks: NonNullable<MindsetPoint["tasks"]>,
  taskContexts: Array<NonNullable<ReturnType<typeof buildTaskContext>>>
) => {
  const contextLines: string[] = [];
  taskContexts.forEach((context) => {
    contextLines.push(`Linked ${context.taskType}: ${context.taskDetails}`);
    if (context.learningPlanSummary) contextLines.push(`Learning plan: ${context.learningPlanSummary}`);
    if (context.skillPlanSummary) contextLines.push(`Skill target: ${context.skillPlanSummary}`);
    if (context.projectPlanSummary) contextLines.push(`Project plan: ${context.projectPlanSummary}`);
  });
  if (sourceType === "mismatch") {
    const mismatchLabel =
      point.mismatchType === "mental-model"
        ? "mental model mismatch"
        : point.mismatchType === "cognitive-load"
          ? "cognitive load mismatch"
          : point.mismatchType === "threat-prediction"
            ? "threat prediction mismatch"
            : point.mismatchType === "action-sequencing"
              ? "action sequencing mismatch"
              : "mismatch";
    return [
      `For this ${mismatchLabel}: "${point.text}", what happened today?`,
      pastSlotTasks.length
        ? `It had ${pastSlotTasks.length} linked task${pastSlotTasks.length === 1 ? "" : "s"} in earlier slots today. What was supposed to move, and what actually moved?`
        : "",
      contextLines.length ? `Context:\n- ${contextLines.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  if (sourceType === "constraint") {
    return [
      `For this constraint bothering: "${point.text}", is it still blocking you today or has it changed?`,
      pastSlotTasks.length
        ? `It had ${pastSlotTasks.length} linked task${pastSlotTasks.length === 1 ? "" : "s"} in earlier slots today. What happened around that time?`
        : "",
      contextLines.length ? `Context:\n- ${contextLines.join("\n- ")}` : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }
  return [
    `For this external bothering: "${point.text}", what happened today?`,
    pastSlotTasks.length
      ? `It had ${pastSlotTasks.length} linked task${pastSlotTasks.length === 1 ? "" : "s"} in earlier slots today. What happened around that scheduled window?`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");
};

export const buildAstraJournalPrompts = (input: AstraJournalBuildInput): AstraJournalPrompt[] => {
  const prompts: AstraJournalPrompt[] = [];
  const dateKey = input.dateKey;
  const todaySchedule = input.schedule[dateKey] || {};
  const elapsedSlots = getElapsedJournalSlots(input.currentSlot, input.now || new Date());

  prompts.push({
    id: "opening:note",
    kind: "opening_note",
    section: "opening",
    prompt: `How are you${input.username ? `, ${input.username}` : ""}?`,
    placeholder: "How are you feeling right now?",
  });
  prompts.push({
    id: "opening:mood",
    kind: "opening_mood",
    section: "opening",
    prompt: "Mood right now, from 1 to 5?",
    choices: MOOD_RATING_CHOICES,
  });
  prompts.push({
    id: "opening:energy",
    kind: "opening_energy",
    section: "opening",
    prompt: "Energy right now, from 1 to 5?",
    choices: ENERGY_RATING_CHOICES,
  });
  prompts.push({
    id: "opening:stress",
    kind: "opening_stress",
    section: "opening",
    prompt: "Stress right now, from 1 to 5?",
    choices: STRESS_RATING_CHOICES,
  });

  elapsedSlots.forEach((slotName) => {
    const activities = (todaySchedule[slotName] as Activity[] | undefined) || [];
    const completedTasks = activities.filter((activity) => activity.completed);
    const incompleteTasks = activities.filter((activity) => !activity.completed);
    const loggedMinutes = completedTasks.reduce(
      (sum, activity) => sum + parseDurationToMinutes(input.activityDurations[activity.id], activity.duration),
      0
    );
    const untrackedMinutes = Math.max(0, 240 - loggedMinutes);

    prompts.push({
      id: `slot:${slotName}:overview`,
      kind: "slot_overview",
      section: "slots",
      slotName,
      prompt: slotPromptText(slotName, activities, completedTasks, incompleteTasks, loggedMinutes, untrackedMinutes),
      placeholder: "Describe what happened in this slot...",
      contextualData: {
        slotState:
          activities.length === 0
            ? "empty"
            : incompleteTasks.length > 0
              ? "incomplete"
              : untrackedMinutes > 0
                ? "completed_with_remainder"
                : "completed_exact",
        scheduledTaskIds: activities.map((activity) => activity.id),
        completedTaskIds: completedTasks.map((activity) => activity.id),
        incompleteTaskIds: incompleteTasks.map((activity) => activity.id),
        loggedMinutes,
        untrackedMinutes,
      },
    });
    prompts.push({
      id: `slot:${slotName}:cause`,
      kind: "slot_cause",
      section: "slots",
      slotName,
      prompt: `What was the main reason ${slotName} went this way?`,
      choices: CAUSE_CHOICES,
    });
    prompts.push({
      id: `slot:${slotName}:intentionality`,
      kind: "slot_intentionality",
      section: "slots",
      slotName,
      prompt: `Was ${slotName} mostly intentional, mixed, or unintentional?`,
      choices: INTENTIONALITY_CHOICES,
    });
    prompts.push({
      id: `slot:${slotName}:feeling`,
      kind: "slot_feeling",
      section: "slots",
      slotName,
      prompt: `How did ${slotName} feel, from 1 to 5?`,
      choices: FEELING_RATING_CHOICES,
    });

    incompleteTasks.forEach((task) => {
      const rescheduleChoices = getUpcomingSlotChoices(dateKey, input.currentSlot, input.now || new Date(), input.schedule);
      prompts.push({
        id: `task:${task.id}:reason_category`,
        kind: "task_reason_category",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `What was the main reason "${task.details}" was not completed?`,
        choices: CAUSE_CHOICES,
        contextualData: {
          taskDetails: task.details,
        },
      });
      prompts.push({
        id: `task:${task.id}:blocker`,
        kind: "task_blocker",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `What blocked "${task.details}" specifically?`,
        choices: TASK_BLOCKER_CHOICES,
        placeholder: "Describe the blocker...",
        contextualData: {
          taskDetails: task.details,
        },
      });
      prompts.push({
        id: `task:${task.id}:stopper`,
        kind: "task_stopper",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `Was an urge or resistance involved for "${task.details}"?`,
        choices: YES_NO_CHOICES,
        relatedTaskIds: [task.id, task.id.replace(/_(\d{4}-\d{2}-\d{2})$/, ""), ...(task.taskIds || [])],
        contextualData: {
          taskDetails: task.details,
        },
      });
      prompts.push({
        id: `task:${task.id}:next_action`,
        kind: "task_next_action",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `What is the next concrete step for "${task.details}"? For example: finish a smaller part, move it to another slot, or drop it.`,
        choices: TASK_NEXT_ACTION_CHOICES,
        placeholder: "Example: read 10 pages tomorrow morning",
        contextualData: {
          taskDetails: task.details,
        },
      });
      prompts.push({
        id: `task:${task.id}:reschedule_slot`,
        kind: "task_reschedule_slot",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `Which slot should "${task.details}" move to? Pick from the upcoming slots today or tomorrow.`,
        choices: rescheduleChoices.options.map((option) => ({ label: option.label, value: option.value })),
        contextualData: {
          slotOptions: rescheduleChoices.options,
          sourceDateKey: dateKey,
          taskDetails: task.details,
        },
      });
      prompts.push({
        id: `task:${task.id}:reschedule_fit`,
        kind: "task_reschedule_fit",
        section: "slots",
        slotName,
        taskId: task.id,
        prompt: `That slot already has work scheduled. Will this task still fit there?`,
        choices: TASK_RESCHEDULE_FIT_CHOICES,
        contextualData: {
          taskDetails: task.details,
        },
      });
    });
  });

  prompts.push({
    id: "closeout:focus",
    kind: "closeout_focus",
    section: "closeout",
    prompt: "What should Astra remember for tomorrow?",
    placeholder: "Tomorrow's main focus...",
  });
  prompts.push({
    id: "closeout:protection",
    kind: "closeout_protection",
    section: "closeout",
    prompt: "What is one thing to protect tomorrow?",
    placeholder: "What needs protecting tomorrow?",
  });
  prompts.push({
    id: "closeout:notes",
    kind: "closeout_notes",
    section: "closeout",
    prompt: "Anything else to carry forward?",
    placeholder: "Carry-forward notes...",
  });

  return prompts;
};

const emptyCursor = (prompts: AstraJournalPrompt[]): JournalCursor => ({
  stepId: prompts[0]?.id || null,
  stepIndex: 0,
  totalSteps: prompts.length,
  section: prompts[0]?.section || "done",
});

export const createEmptyDailyJournalSession = (
  dateKey: string,
  prompts: AstraJournalPrompt[],
  previousMessages?: JournalChatMessage[]
): DailyJournalSession => ({
  id: `journal_${dateKey}`,
  date: dateKey,
  status: "in_progress",
  startedAt: Date.now(),
  completedAt: null,
  opening: {},
  slotReviews: [],
  botheringReviews: [],
  closeout: {},
  cursor: emptyCursor(prompts),
  messages: previousMessages || [],
});

export const syncJournalSessionCursor = (
  session: DailyJournalSession,
  prompts: AstraJournalPrompt[]
) => {
  if (!prompts.length) {
    return {
      ...session,
      cursor: {
        stepId: null,
        stepIndex: 0,
        totalSteps: 0,
        section: "done",
      },
    };
  }
  const currentIndex = Math.max(
    0,
    prompts.findIndex((prompt) => prompt.id === session.cursor.stepId)
  );
  const prompt = prompts[currentIndex] || prompts[0];
  return {
    ...session,
    cursor: {
      stepId: prompt.id,
      stepIndex: currentIndex,
      totalSteps: prompts.length,
      section: prompt.section,
    },
  };
};

export const getCurrentJournalPrompt = (
  session: DailyJournalSession | null | undefined,
  prompts: AstraJournalPrompt[]
) => {
  if (!session) return prompts[0] || null;
  const synced = syncJournalSessionCursor(session, prompts);
  return prompts[synced.cursor.stepIndex] || null;
};

const ensureSlotReview = (
  session: DailyJournalSession,
  prompt: AstraJournalPrompt
): JournalSlotReview | null => {
  if (!prompt.slotName) return null;
  const slotState = String(prompt.contextualData?.slotState || "completed_exact") as JournalSlotState;
  const scheduledTaskIds = Array.isArray(prompt.contextualData?.scheduledTaskIds)
    ? (prompt.contextualData?.scheduledTaskIds as string[])
    : [];
  const completedTaskIds = Array.isArray(prompt.contextualData?.completedTaskIds)
    ? (prompt.contextualData?.completedTaskIds as string[])
    : [];
  const incompleteTaskIds = Array.isArray(prompt.contextualData?.incompleteTaskIds)
    ? (prompt.contextualData?.incompleteTaskIds as string[])
    : [];
  const loggedMinutes = Number(prompt.contextualData?.loggedMinutes || 0);
  const untrackedMinutes = Number(prompt.contextualData?.untrackedMinutes || 0);
  let review = session.slotReviews.find((entry) => entry.slotName === prompt.slotName) || null;
  if (!review) {
    review = {
      slotName: prompt.slotName,
      slotState,
      scheduledTaskIds,
      completedTaskIds,
      incompleteTaskIds,
      loggedMinutes,
      untrackedMinutes,
      linkedStopperIds: [],
      taskReflections: [],
    };
    session.slotReviews.push(review);
  }
  return review;
};

const ensureTaskReflection = (
  session: DailyJournalSession,
  prompt: AstraJournalPrompt
): JournalTaskReflection | null => {
  if (!prompt.taskId) return null;
  const slotReview = ensureSlotReview(session, prompt);
  if (!slotReview) return null;
  let reflection = slotReview.taskReflections.find((entry) => entry.taskId === prompt.taskId) || null;
  if (!reflection) {
    reflection = {
      taskId: prompt.taskId,
      status: "missed",
      linkedStopperIds: [],
    };
    slotReview.taskReflections.push(reflection);
  }
  return reflection;
};

const ensureBotheringReview = (
  session: DailyJournalSession,
  prompt: AstraJournalPrompt
): JournalBotheringReflection | null => {
  if (!prompt.botheringId || !prompt.sourceType) return null;
  let review = session.botheringReviews.find((entry) => entry.botheringId === prompt.botheringId) || null;
  if (!review) {
    review = {
      botheringId: prompt.botheringId,
      sourceType: prompt.sourceType,
      linkedTaskIds: Array.isArray(prompt.relatedTaskIds) ? prompt.relatedTaskIds.filter(Boolean) : [],
      linkedStopperIds: [],
      contextualData: prompt.contextualData,
    };
    session.botheringReviews.push(review);
  }
  if (prompt.contextualData) review.contextualData = prompt.contextualData;
  return review;
};

const toRating = (value: string) => {
  const numeric = parseInt(String(value || "").trim(), 10);
  return Number.isFinite(numeric) ? Math.max(1, Math.min(5, numeric)) : null;
};

const mergeUnique = (left: string[], right: string[]) => Array.from(new Set([...(left || []), ...(right || [])]));

const isTaskRescheduleAction = (value: string) => {
  const normalized = normalizeText(value);
  return normalized === "move it to another slot" || normalized === "reschedule it for tomorrow";
};

const getPromptSlotOptions = (prompt: AstraJournalPrompt) =>
  Array.isArray(prompt.contextualData?.slotOptions)
    ? (prompt.contextualData?.slotOptions as Array<{
        value: string;
        dateKey: string;
        slotName: SlotName;
        scheduledCount: number;
      }>)
    : [];

const parseRescheduleChoice = (
  value: string,
  prompt: AstraJournalPrompt
): { dateKey: string; slotName: SlotName; scheduledCount: number } | null => {
  const normalized = String(value || "").trim();
  const fromOptions = getPromptSlotOptions(prompt).find((option) => option.value === normalized);
  if (fromOptions) {
    return {
      dateKey: fromOptions.dateKey,
      slotName: fromOptions.slotName,
      scheduledCount: Number(fromOptions.scheduledCount || 0),
    };
  }
  const [dateKey, slotName] = normalized.split("::");
  if (!dateKey || !ASTRA_JOURNAL_SLOT_ORDER.includes(slotName as SlotName)) return null;
  return { dateKey, slotName: slotName as SlotName, scheduledCount: 0 };
};

const findTaskReflection = (session: DailyJournalSession, taskId: string | undefined) => {
  if (!taskId) return null;
  for (const slotReview of session.slotReviews) {
    const reflection = slotReview.taskReflections.find((entry) => entry.taskId === taskId);
    if (reflection) return reflection;
  }
  return null;
};

const hasLinkedTaskReflection = (session: DailyJournalSession, prompt: AstraJournalPrompt) => {
  const relatedIds = new Set((prompt.relatedTaskIds || []).filter(Boolean).map((id) => String(id)));
  if (!relatedIds.size) return false;
  for (const slotReview of session.slotReviews) {
    for (const reflection of slotReview.taskReflections) {
      const taskId = String(reflection.taskId || "");
      const baseTaskId = taskId.replace(/_(\d{4}-\d{2}-\d{2})$/, "");
      if (!relatedIds.has(taskId) && !relatedIds.has(baseTaskId)) continue;
      if (
        reflection.missReasonCategory ||
        reflection.blockerSummary ||
        reflection.nextAction ||
        reflection.note ||
        reflection.rescheduleSlotName
      ) {
        return true;
      }
    }
  }
  return false;
};

export const applyJournalAnswerToSession = (
  session: DailyJournalSession,
  prompt: AstraJournalPrompt,
  answer: string,
  options?: { linkedStopperIds?: string[] }
) => {
  const cleanAnswer = String(answer || "").trim();
  const linkedStopperIds = options?.linkedStopperIds || [];
  const nextSession: DailyJournalSession = {
    ...session,
    opening: { ...session.opening },
    slotReviews: session.slotReviews.map((review) => ({
      ...review,
      taskReflections: review.taskReflections.map((reflection) => ({ ...reflection })),
      linkedStopperIds: [...review.linkedStopperIds],
    })),
    botheringReviews: session.botheringReviews.map((review) => ({
      ...review,
      linkedTaskIds: [...review.linkedTaskIds],
      linkedStopperIds: [...review.linkedStopperIds],
      contextualData: review.contextualData ? { ...review.contextualData } : undefined,
    })),
    closeout: { ...session.closeout },
    cursor: { ...session.cursor },
    messages: [...(session.messages || [])],
  };

  switch (prompt.kind) {
    case "opening_note":
      nextSession.opening.note = cleanAnswer;
      break;
    case "opening_mood":
      nextSession.opening.moodRating = toRating(cleanAnswer);
      break;
    case "opening_energy":
      nextSession.opening.energyRating = toRating(cleanAnswer);
      break;
    case "opening_stress":
      nextSession.opening.stressRating = toRating(cleanAnswer);
      break;
    case "slot_overview": {
      const review = ensureSlotReview(nextSession, prompt);
      if (review) review.note = cleanAnswer;
      break;
    }
    case "slot_cause": {
      const review = ensureSlotReview(nextSession, prompt);
      if (review) review.causeCategory = cleanAnswer as JournalCauseCategory;
      break;
    }
    case "slot_intentionality": {
      const review = ensureSlotReview(nextSession, prompt);
      if (review) review.intentionality = cleanAnswer as JournalIntentionality;
      break;
    }
    case "slot_feeling": {
      const review = ensureSlotReview(nextSession, prompt);
      if (review) review.feelingRating = toRating(cleanAnswer);
      break;
    }
    case "task_reason_category": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      if (reflection) reflection.missReasonCategory = cleanAnswer as JournalCauseCategory;
      break;
    }
    case "task_blocker": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      if (reflection) reflection.blockerSummary = cleanAnswer;
      break;
    }
    case "task_stopper": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      const slotReview = ensureSlotReview(nextSession, prompt);
      if (reflection && linkedStopperIds.length > 0) {
        reflection.linkedStopperIds = mergeUnique(reflection.linkedStopperIds, linkedStopperIds);
      }
      if (slotReview && linkedStopperIds.length > 0) {
        slotReview.linkedStopperIds = mergeUnique(slotReview.linkedStopperIds, linkedStopperIds);
      }
      break;
    }
    case "task_next_action": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      if (reflection) {
        reflection.nextAction = cleanAnswer;
        if (!isTaskRescheduleAction(cleanAnswer)) {
          reflection.rescheduleDateKey = undefined;
          reflection.rescheduleSlotName = undefined;
          reflection.rescheduleFit = undefined;
        }
      }
      break;
    }
    case "task_reschedule_slot": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      const parsedChoice = parseRescheduleChoice(cleanAnswer, prompt);
      if (reflection && parsedChoice) {
        reflection.rescheduleDateKey = parsedChoice.dateKey;
        reflection.rescheduleSlotName = parsedChoice.slotName;
        reflection.rescheduleFit = parsedChoice.scheduledCount > 0 ? "pending" : "not_needed";
      }
      break;
    }
    case "task_reschedule_fit": {
      const reflection = ensureTaskReflection(nextSession, prompt);
      if (reflection) {
        reflection.rescheduleFit = normalizeText(cleanAnswer) === "yes" ? "confirmed" : "skipped";
      }
      break;
    }
    case "bothering_status": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) review.status = cleanAnswer as JournalBotheringStatus;
      break;
    }
    case "bothering_blocker_category": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) review.blockerCategory = cleanAnswer as JournalCauseCategory;
      break;
    }
    case "bothering_reflection": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) {
        review.todaySummary = cleanAnswer;
        if (review.status === "solved") review.resolutionSummary = cleanAnswer;
      }
      break;
    }
    case "bothering_feeling": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) review.feelingRating = toRating(cleanAnswer);
      break;
    }
    case "bothering_due_task_window": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) review.dueTaskWindowNote = cleanAnswer;
      break;
    }
    case "bothering_next_action": {
      const review = ensureBotheringReview(nextSession, prompt);
      if (review) review.nextAction = cleanAnswer;
      break;
    }
    case "closeout_focus":
      nextSession.closeout.tomorrowFocus = cleanAnswer;
      break;
    case "closeout_protection":
      nextSession.closeout.tomorrowProtection = cleanAnswer;
      break;
    case "closeout_notes":
      nextSession.closeout.carryForwardNotes = cleanAnswer;
      break;
    default:
      break;
  }
  return nextSession;
};

export const advanceJournalSession = (
  session: DailyJournalSession,
  prompts: AstraJournalPrompt[]
) => {
  let nextIndex = session.cursor.stepIndex + 1;

  while (nextIndex < prompts.length) {
    const nextPrompt = prompts[nextIndex];
    if (nextPrompt.kind === "task_reschedule_slot") {
      const reflection = findTaskReflection(session, nextPrompt.taskId);
      if (!isTaskRescheduleAction(reflection?.nextAction || "")) {
        nextIndex += 1;
        continue;
      }
    }
    if (nextPrompt.kind === "task_reschedule_fit") {
      const reflection = findTaskReflection(session, nextPrompt.taskId);
      if (!isTaskRescheduleAction(reflection?.nextAction || "")) {
        nextIndex += 1;
        continue;
      }
      if (!reflection?.rescheduleDateKey || !reflection?.rescheduleSlotName) {
        nextIndex += 1;
        continue;
      }
      if (reflection.rescheduleFit === "not_needed") {
        nextIndex += 1;
        continue;
      }
    }
    if (
      nextPrompt.sourceType === "external" &&
      (nextPrompt.kind === "bothering_reflection" || nextPrompt.kind === "bothering_due_task_window") &&
      hasLinkedTaskReflection(session, nextPrompt)
    ) {
      nextIndex += 1;
      continue;
    }
    break;
  }

  if (nextIndex >= prompts.length) {
    return {
      ...session,
      status: "completed" as const,
      completedAt: Date.now(),
      cursor: {
        stepId: null,
        stepIndex: prompts.length,
        totalSteps: prompts.length,
        section: "done" as const,
      },
    };
  }
  const nextPrompt = prompts[nextIndex];
  return {
    ...session,
    cursor: {
      stepId: nextPrompt.id,
      stepIndex: nextIndex,
      totalSteps: prompts.length,
      section: nextPrompt.section,
    },
  };
};

export const getLinkedStopperIdsForTask = (taskIds: string[], mindsetCards: MindsetCard[]) => {
  const ids = new Set(taskIds.filter(Boolean));
  const linkedStopperIds = new Set<string>();
  mindsetCards.forEach((card) => {
    if (!card.id.startsWith("mindset_botherings_")) return;
    card.points.forEach((point) => {
      const matches = (point.tasks || []).some((task) => {
        const baseTaskId = String(task.id || "").replace(/_(\d{4}-\d{2}-\d{2})$/, "");
        const activityId = String(task.activityId || "");
        return ids.has(task.id) || ids.has(baseTaskId) || ids.has(activityId);
      });
      if (!matches) return;
      (point.linkedUrgeIds || []).forEach((id) => linkedStopperIds.add(id));
      (point.linkedResistanceIds || []).forEach((id) => linkedStopperIds.add(id));
    });
  });
  return Array.from(linkedStopperIds);
};

export const getLinkedStopperIdsForBothering = (botheringId: string, mindsetCards: MindsetCard[]) => {
  const linkedStopperIds = new Set<string>();
  mindsetCards.forEach((card) => {
    card.points.forEach((point) => {
      if (point.id !== botheringId) return;
      (point.linkedUrgeIds || []).forEach((id) => linkedStopperIds.add(id));
      (point.linkedResistanceIds || []).forEach((id) => linkedStopperIds.add(id));
    });
  });
  return Array.from(linkedStopperIds);
};

const journalMessageText = (message?: JournalChatMessage) => normalizeText(message?.content);

export const appendJournalMessages = (
  session: DailyJournalSession,
  nextMessages: JournalChatMessage[]
) => {
  const messages = [...(session.messages || [])];
  nextMessages.forEach((message) => {
    const alreadyExists = messages.some(
      (entry) =>
        entry.role === message.role &&
        entry.promptId === message.promptId &&
        journalMessageText(entry) === journalMessageText(message)
    );
    if (!alreadyExists) {
      messages.push(message);
    }
  });
  return { ...session, messages };
};

export const summarizeJournalSessions = (sessions: DailyJournalSession[]): JournalSessionSummary[] => {
  return [...sessions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)
    .map((session) => {
      const unresolved = session.botheringReviews.filter((review) => review.status !== "solved").length;
      const causes = [
        ...session.slotReviews.map((review) => review.causeCategory).filter(Boolean),
        ...session.botheringReviews.map((review) => review.blockerCategory).filter(Boolean),
      ] as string[];
      const rankedCauses = Array.from(
        causes.reduce((map, cause) => {
          map.set(cause, (map.get(cause) || 0) + 1);
          return map;
        }, new Map<string, number>())
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([cause]) => cause);
      return {
        date: session.date,
        status: session.status,
        moodRating: session.opening.moodRating ?? null,
        energyRating: session.opening.energyRating ?? null,
        stressRating: session.opening.stressRating ?? null,
        unresolvedBotherings: unresolved,
        topCauses: rankedCauses,
        note:
          session.closeout.carryForwardNotes ||
          session.closeout.tomorrowFocus ||
          session.opening.note ||
          "",
      };
    });
};

export const buildJournalContextSnapshot = (sessions: DailyJournalSession[]) => {
  const recentSessions = summarizeJournalSessions(sessions);
  const causeCounts = new Map<string, number>();
  recentSessions.forEach((session) => {
    session.topCauses.forEach((cause) => {
      causeCounts.set(cause, (causeCounts.get(cause) || 0) + 1);
    });
  });
  const topPatterns = Array.from(causeCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([cause, count]) => ({ cause, count }));
  return {
    recentSessions,
    patterns: topPatterns,
  };
};
