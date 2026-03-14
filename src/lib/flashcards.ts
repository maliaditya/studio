import type { FlashcardResourceData, FlashcardSessionIndex, Resource, UserSettings } from "@/types/workout";

export const normalizeFlashcardTopicName = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const normalizeFlashcardOptionText = (value: string) =>
  String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, " ");

const coerceFlashcardText = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const collectUniqueOptions = (rawOptions: unknown) =>
  (Array.isArray(rawOptions) ? rawOptions : [])
    .map((option) => coerceFlashcardText(option))
    .filter(Boolean)
    .filter(
      (option, index, list) =>
        list.findIndex((entry) => normalizeFlashcardOptionText(entry) === normalizeFlashcardOptionText(option)) === index
    );

const ensureAnswerBackedOptions = (
  options: string[],
  answer: string,
  preferredIndex: number | null
) => {
  if (!answer) return options;

  const existingAnswerIndex = options.findIndex(
    (option) => normalizeFlashcardOptionText(option) === normalizeFlashcardOptionText(answer)
  );
  if (existingAnswerIndex >= 0) return options;

  if (preferredIndex !== null && preferredIndex >= 0 && preferredIndex < options.length) {
    return options.map((option, index) => (index === preferredIndex ? answer : option));
  }

  return [answer, ...options];
};

const buildFallbackDistractors = (answer: string) => {
  const normalizedAnswer = coerceFlashcardText(answer);
  const genericFallbacks = [
    "A secondary detail from the passage.",
    "A broader interpretation not stated here.",
    "An unrelated conclusion not supported by the text.",
    "A surface-level reading that misses the main point.",
    "A claim that reverses the passage's meaning.",
  ];
  return genericFallbacks.filter(
    (option) => normalizeFlashcardOptionText(option) !== normalizeFlashcardOptionText(normalizedAnswer)
  );
};

const finalizeOptionList = (
  rawOptions: string[],
  answer: string
) => {
  let options = rawOptions
    .map((option) => coerceFlashcardText(option))
    .filter(Boolean)
    .filter(
      (option, index, list) =>
        list.findIndex((entry) => normalizeFlashcardOptionText(entry) === normalizeFlashcardOptionText(option)) === index
    );

  if (answer) {
    const answerIndex = options.findIndex(
      (option) => normalizeFlashcardOptionText(option) === normalizeFlashcardOptionText(answer)
    );

    if (answerIndex > 0) {
      const [correctOption] = options.splice(answerIndex, 1);
      options = [correctOption, ...options];
    } else if (answerIndex === -1) {
      options = [answer, ...options];
    }
  }

  for (const distractor of buildFallbackDistractors(answer)) {
    if (options.length >= 4) break;
    if (
      options.some(
        (option) => normalizeFlashcardOptionText(option) === normalizeFlashcardOptionText(distractor)
      )
    ) {
      continue;
    }
    options.push(distractor);
  }

  if (options.length > 4) {
    const correctOption = options[0];
    options = [correctOption, ...options.slice(1).slice(0, 3)];
  }

  return options.slice(0, 4);
};

export type SanitizedFlashcardMcq = {
  options: string[];
  answer: string;
  correctOptionIndex: number;
  isValid: boolean;
  repairFlags: string[];
};

export type RawFlashcardAiCandidate = {
  highlightId?: unknown;
  pageNumber?: unknown;
  question?: unknown;
  answer?: unknown;
  options?: unknown;
  correctOptionIndex?: unknown;
  explanation?: unknown;
  matchedTopicIds?: unknown;
  newTopics?: unknown;
};

export type SanitizedFlashcardAiCandidate = {
  highlightId: string;
  pageNumber: number;
  question: string;
  answer: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
  matchedTopicIds: string[];
  newTopics: string[];
  isValid: boolean;
  repairFlags: string[];
};

export const getFlashcardOptions = (
  flashcard?: Pick<FlashcardResourceData, "options" | "answer" | "correctOptionIndex"> | null
) => {
  return sanitizeFlashcardMcqCandidate(
    flashcard?.options,
    flashcard?.answer,
    flashcard?.correctOptionIndex
  ).options;
};

export const sanitizeFlashcardMcqCandidate = (
  rawOptions: unknown,
  rawAnswer: unknown,
  rawCorrectOptionIndex: unknown
) : SanitizedFlashcardMcq => {
  const repairFlags: string[] = [];
  const initialOptions = collectUniqueOptions(rawOptions);
  let answer = coerceFlashcardText(rawAnswer);
  const parsedCorrectOptionIndex = Number(rawCorrectOptionIndex);
  const preferredIndex =
    Number.isInteger(parsedCorrectOptionIndex) &&
    parsedCorrectOptionIndex >= 0 &&
    parsedCorrectOptionIndex < initialOptions.length
      ? parsedCorrectOptionIndex
      : null;

  if (!answer && preferredIndex !== null) {
    answer = initialOptions[preferredIndex];
    repairFlags.push("answer_from_index");
  }

  let options = ensureAnswerBackedOptions(initialOptions, answer, preferredIndex);
  if (options.length !== initialOptions.length) {
    repairFlags.push("answer_injected");
  }

  options = finalizeOptionList(options, answer);
  if (options.length < 4) {
    repairFlags.push("insufficient_options");
  }
  if (options.length === 4 && initialOptions.length !== 4) {
    repairFlags.push("options_rebuilt");
  }

  const correctOptionIndex = answer
    ? options.findIndex(
        (option) => normalizeFlashcardOptionText(option) === normalizeFlashcardOptionText(answer)
      )
    : -1;

  if (correctOptionIndex === -1 && options.length > 0) {
    answer = options[0];
    repairFlags.push("answer_realigned");
  }

  const finalCorrectOptionIndex = answer
    ? options.findIndex(
        (option) => normalizeFlashcardOptionText(option) === normalizeFlashcardOptionText(answer)
      )
    : -1;

  return {
    options,
    answer,
    correctOptionIndex: finalCorrectOptionIndex,
    isValid: options.length === 4 && finalCorrectOptionIndex >= 0,
    repairFlags,
  };
};

export const sanitizeFlashcardAiCandidate = (
  candidate: RawFlashcardAiCandidate,
  options?: {
    fallbackPageNumber?: number;
    validTopicIds?: Set<string>;
    fallbackQuestion?: string;
    fallbackAnswer?: string;
    fallbackExplanation?: string;
  }
): SanitizedFlashcardAiCandidate => {
  const sanitizedMcq = sanitizeFlashcardMcqCandidate(
    candidate?.options,
    candidate?.answer ?? options?.fallbackAnswer,
    candidate?.correctOptionIndex
  );
  const pageNumberValue = Number(candidate?.pageNumber);
  const pageNumber =
    Number.isFinite(pageNumberValue) && pageNumberValue > 0
      ? pageNumberValue
      : Number(options?.fallbackPageNumber || 0);
  const question = coerceFlashcardText(candidate?.question || options?.fallbackQuestion);
  const explanation = coerceFlashcardText(candidate?.explanation || options?.fallbackExplanation);
  const validTopicIds = options?.validTopicIds;
  const matchedTopicIds = Array.isArray(candidate?.matchedTopicIds)
    ? candidate.matchedTopicIds
        .map((topicId) => coerceFlashcardText(topicId))
        .filter((topicId) => (validTopicIds ? validTopicIds.has(topicId) : Boolean(topicId)))
    : [];
  const newTopics = Array.isArray(candidate?.newTopics)
    ? candidate.newTopics
        .map((topic) => coerceFlashcardText(topic))
        .filter(Boolean)
        .filter(
          (topic, index, list) =>
            list.findIndex((entry) => normalizeFlashcardTopicName(entry) === normalizeFlashcardTopicName(topic)) === index
        )
        .slice(0, 3)
    : [];

  return {
    highlightId: coerceFlashcardText(candidate?.highlightId),
    pageNumber,
    question,
    answer: sanitizedMcq.answer,
    options: sanitizedMcq.options,
    correctOptionIndex: sanitizedMcq.correctOptionIndex,
    explanation,
    matchedTopicIds,
    newTopics,
    isValid: Boolean(coerceFlashcardText(candidate?.highlightId) && pageNumber > 0 && question && sanitizedMcq.isValid),
    repairFlags: sanitizedMcq.repairFlags,
  };
};

export const getFlashcardCorrectOptionIndex = (
  flashcard?: Pick<FlashcardResourceData, "options" | "answer" | "correctOptionIndex"> | null,
  providedOptions?: string[]
) => {
  return sanitizeFlashcardMcqCandidate(
    providedOptions || flashcard?.options,
    flashcard?.answer,
    flashcard?.correctOptionIndex
  ).correctOptionIndex;
};

export const isFlashcardMultipleChoice = (
  flashcard?: Pick<FlashcardResourceData, "options" | "answer" | "correctOptionIndex"> | null
) => {
  const options = getFlashcardOptions(flashcard);
  return options.length >= 2 && getFlashcardCorrectOptionIndex(flashcard, options) >= 0;
};

export const buildFlashcardTaskKey = (
  activityType?: "deepwork" | "upskill" | null,
  definitionId?: string | null
) => {
  const normalizedType = activityType === "deepwork" || activityType === "upskill" ? activityType : null;
  const normalizedId = String(definitionId || "").trim();
  if (!normalizedType || !normalizedId) return null;
  return `${normalizedType}:${normalizedId}`;
};

export const isFlashcardResource = (resource: Resource | null | undefined): resource is Resource =>
  Boolean(resource && resource.type === "flashcard" && resource.flashcard);

export const getFlashcardSessionsForTask = (
  settings: Pick<UserSettings, "flashcardSessions">,
  taskKey?: string | null
) => {
  const normalizedTaskKey = String(taskKey || "").trim();
  if (!normalizedTaskKey) return [] as FlashcardSessionIndex[];
  return (settings.flashcardSessions || [])
    .filter((session) => session.taskKey === normalizedTaskKey)
    .sort((a, b) => {
      const aTime = Date.parse(a.createdAt || a.dateKey || "");
      const bTime = Date.parse(b.createdAt || b.dateKey || "");
      return (Number.isFinite(bTime) ? bTime : 0) - (Number.isFinite(aTime) ? aTime : 0);
    });
};

export const getFlashcardResourcesForTask = (
  resources: Resource[],
  settings: Pick<UserSettings, "flashcardSessions">,
  taskKey?: string | null
) => {
  const resourceMap = new Map(resources.map((resource) => [resource.id, resource] as const));
  return getFlashcardSessionsForTask(settings, taskKey).flatMap((session) =>
    session.flashcardResourceIds
      .map((resourceId) => resourceMap.get(resourceId))
      .filter(isFlashcardResource)
  );
};
