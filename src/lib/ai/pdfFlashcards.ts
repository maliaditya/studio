import { z } from "zod";
import { parseJsonWithRecovery } from "@/lib/jsonRecovery";
import { normalizeFlashcardTopicName } from "@/lib/flashcards";

export type PdfFlashcardHighlightInput = {
  highlightId: string;
  pageNumber: number;
  text: string;
  createdAt: string;
};

export type PdfFlashcardTaskContextInput = {
  taskName: string;
  definitionId: string;
  activityType: string;
  specializationId: string;
  specializationName: string;
  bookName: string;
  pdfResourceId: string;
  pdfResourceName: string;
};

export type PdfFlashcardTopicInput = {
  id: string;
  name: string;
  normalizedName: string;
};

export type PdfFlashcardPromptPackage = {
  systemPrompt: string;
  userPrompt: string;
};

export type PdfFlashcardFailureCategory =
  | "parse_failure"
  | "truncation_failure"
  | "schema_failure"
  | "semantic_contract_failure"
  | "quality_failure"
  | "retry_exhaustion";

export type PdfFlashcardCandidateFailure = {
  highlightId: string;
  pageNumber: number;
  categories: PdfFlashcardFailureCategory[];
  reasons: string[];
};

export type PdfFlashcardValidationResult = {
  ok: boolean;
  category: PdfFlashcardFailureCategory | null;
  candidates: PdfFlashcardCandidate[];
  reasons: string[];
  candidateFailures: PdfFlashcardCandidateFailure[];
  rawContent: string;
};

export type PdfFlashcardRetryAttempt = {
  stage: "generate" | "repair" | "regenerate";
  rawContent: string;
  result: PdfFlashcardValidationResult;
};

export type PdfFlashcardCandidate = {
  highlightId: string;
  pageNumber: number;
  question: string;
  answer: string;
  options: [string, string, string, string];
  correctOptionIndex: number;
  explanation: string;
  matchedTopicIds: string[];
  newTopics: string[];
};

const candidateSchema = z.object({
  highlightId: z.string().trim().min(1),
  pageNumber: z.number().int().positive(),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  options: z.tuple([
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
    z.string().trim().min(1),
  ]),
  correctOptionIndex: z.number().int().min(0).max(3),
  explanation: z.string().trim().min(1),
  matchedTopicIds: z.array(z.string().trim().min(1)),
  newTopics: z.array(z.string().trim().min(1)).max(3),
});

const payloadSchema = z.object({
  candidates: z.array(candidateSchema),
});

const compact = (value: unknown) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const normalizeOption = (value: string) => compact(value).toLowerCase();

const stripCodeFences = (value: string) =>
  value
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const extractJsonBlock = (value: string) => {
  const trimmed = stripCodeFences(value);
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart !== -1 && objectEnd !== -1 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1);
  }
  return null;
};

const looksTruncated = (value: string) => {
  const trimmed = stripCodeFences(value);
  if (!trimmed) return false;
  if (!trimmed.includes("{") || !trimmed.includes("[")) return false;
  const openCurly = (trimmed.match(/\{/g) || []).length;
  const closeCurly = (trimmed.match(/\}/g) || []).length;
  const openSquare = (trimmed.match(/\[/g) || []).length;
  const closeSquare = (trimmed.match(/\]/g) || []).length;
  return openCurly !== closeCurly || openSquare !== closeSquare;
};

const tryParsePayload = (value: string) => {
  const normalized = stripCodeFences(value);
  try {
    return parseJsonWithRecovery<unknown>(normalized);
  } catch {
    const extracted = extractJsonBlock(normalized);
    if (!extracted) return null;
    try {
      return parseJsonWithRecovery<unknown>(extracted);
    } catch {
      return null;
    }
  }
};

const normalizeParsedPayload = (value: unknown) => {
  if (Array.isArray(value)) {
    return { candidates: value };
  }
  if (!value || typeof value !== "object") return value;

  const record = value as Record<string, unknown>;
  if (Array.isArray(record.candidates)) return value;

  const candidateCollectionKeys = [
    "flashcards",
    "cards",
    "items",
    "questions",
    "mcqs",
  ] as const;

  for (const key of candidateCollectionKeys) {
    if (Array.isArray(record[key])) {
      return { candidates: record[key] };
    }
  }

  return value;
};

const exampleSchema = {
  candidates: [
    {
      highlightId: "hl_example_1",
      pageNumber: 12,
      question: "What does the passage say makes disciplined learning effective?",
      answer: "It requires consistent repetition over time.",
      options: [
        "It requires consistent repetition over time.",
        "It works only when motivation is high.",
        "It depends on reading very quickly.",
        "It improves through passive exposure alone.",
      ],
      correctOptionIndex: 0,
      explanation: "The passage ties effective learning to repeated practice, not speed or motivation alone.",
      matchedTopicIds: ["topic_study_habits"],
      newTopics: [],
    },
  ],
};

const invalidExample = {
  candidates: [
    {
      highlightId: "hl_example_1",
      pageNumber: 12,
      question: "What does the passage say makes disciplined learning effective?",
      answer: "It requires consistent repetition over time.",
      options: [
        "Motivation matters.",
        "It requires consistent repetition over time.",
        "It requires consistent repetition over time.",
        "Something unrelated.",
      ],
      correctOptionIndex: 3,
      explanation: "Bad because the correctOptionIndex points to the wrong option and there are duplicate options.",
      matchedTopicIds: ["invented_topic_id"],
      newTopics: ["This is too long to be a good topic label for the schema"],
    },
  ],
};

const buildContractBlock = () =>
  [
    "Output contract:",
    "- Return one JSON object only",
    "- The root object must have exactly one key: `candidates`",
    "- `candidates` must be an array with exactly one candidate per input highlight",
    "- Each candidate must contain:",
    "  - `highlightId`: string",
    "  - `pageNumber`: integer",
    "  - `question`: string",
    "  - `answer`: string",
    "  - `options`: array of exactly 4 unique strings",
    "  - `correctOptionIndex`: integer 0-3",
    "  - `explanation`: string",
    "  - `matchedTopicIds`: array of known topic IDs only",
    "  - `newTopics`: array of 0-3 short topic labels",
    "- `answer` must exactly match `options[correctOptionIndex]`",
    "- Do not output markdown, code fences, comments, or partial JSON",
  ].join("\n");

const buildRulesBlock = () =>
  [
    "Hard rules:",
    "- Never invent highlight IDs or page numbers",
    "- Never paraphrase a topic ID",
    "- Never let correctOptionIndex point to a distractor",
    "- Never output an answer that is missing from the options array",
    "- Never return fewer or more than 4 options",
    "- Never use joke, filler, or generic distractors",
    "- Never leave trailing text after the JSON object",
    "",
    "Quality rules:",
    "- Questions must be answerable from the highlight",
    "- Questions should test recall, not copy the highlight verbatim",
    "- Distractors should be plausible but clearly wrong",
    "- Explanation should justify why the correct option is correct",
    "- New topic labels must be short noun-style labels, not sentences",
  ].join("\n");

export const buildPdfFlashcardPromptPackage = (input: {
  taskContext: PdfFlashcardTaskContextInput;
  highlights: PdfFlashcardHighlightInput[];
  existingTopics: PdfFlashcardTopicInput[];
}): PdfFlashcardPromptPackage => {
  const systemPrompt = [
    "You are a structured-output engine for study flashcards.",
    "Your only job is to convert the provided highlights into valid MCQ flashcards.",
    "You must obey the output contract exactly.",
    "If you cannot satisfy the contract, still return valid JSON that best attempts to satisfy it; never output prose.",
  ].join(" ");

  const userPrompt = [
    "Task objective:",
    "Convert the supplied PDF highlights into multiple-choice flashcards for spaced repetition.",
    "",
    buildContractBlock(),
    "",
    buildRulesBlock(),
    "",
    "Valid example:",
    JSON.stringify(exampleSchema, null, 2),
    "",
    "Invalid example and why it is invalid:",
    JSON.stringify(invalidExample, null, 2),
    "The invalid example fails because it contains duplicate options, the correctOptionIndex points to the wrong answer, and it invents topic IDs / weak topic labels.",
    "",
    "Domain context:",
    JSON.stringify({
      taskContext: input.taskContext,
      existingTopics: input.existingTopics,
    }, null, 2),
    "",
    "Input highlights:",
    JSON.stringify(input.highlights, null, 2),
    "",
    "Final response instruction:",
    "Return a single JSON object with the exact contract above. No markdown. No commentary. No partial JSON.",
  ].join("\n");

  return { systemPrompt, userPrompt };
};

export const buildPdfFlashcardRepairPromptPackage = (input: {
  taskContext: PdfFlashcardTaskContextInput;
  highlights: PdfFlashcardHighlightInput[];
  existingTopics: PdfFlashcardTopicInput[];
  previousRawOutput: string;
  validationResult: PdfFlashcardValidationResult;
}): PdfFlashcardPromptPackage => {
  const systemPrompt = [
    "You are repairing a previously invalid structured JSON response.",
    "Preserve fields that already satisfy the contract.",
    "Fix only the broken fields and return one valid JSON object only.",
  ].join(" ");

  const userPrompt = [
    "Repair objective:",
    "The previous flashcard JSON failed validation. Fix it without changing correct fields unnecessarily.",
    "",
    buildContractBlock(),
    "",
    buildRulesBlock(),
    "",
    "Validation failures:",
    JSON.stringify({
      category: input.validationResult.category,
      reasons: input.validationResult.reasons,
      candidateFailures: input.validationResult.candidateFailures,
    }, null, 2),
    "",
    "Domain context:",
    JSON.stringify({
      taskContext: input.taskContext,
      existingTopics: input.existingTopics,
      highlights: input.highlights,
    }, null, 2),
    "",
    "Previous invalid output:",
    input.previousRawOutput,
    "",
    "Return only a corrected JSON object with root key `candidates`.",
  ].join("\n");

  return { systemPrompt, userPrompt };
};

export const buildPdfFlashcardRegenerationPromptPackage = (input: {
  taskContext: PdfFlashcardTaskContextInput;
  highlights: PdfFlashcardHighlightInput[];
  existingTopics: PdfFlashcardTopicInput[];
  priorAttempts: PdfFlashcardRetryAttempt[];
}): PdfFlashcardPromptPackage => {
  const systemPrompt = [
    "You are retrying a failed flashcard generation task.",
    "Previous attempts violated the required contract.",
    "Generate a fresh response from scratch and strictly obey the schema.",
  ].join(" ");

  const userPrompt = [
    "Fresh regeneration objective:",
    "Ignore the wording mistakes from previous outputs and generate a new valid JSON object from scratch.",
    "",
    buildContractBlock(),
    "",
    buildRulesBlock(),
    "",
    "Failure summary from prior attempts:",
    JSON.stringify(
      input.priorAttempts.map((attempt) => ({
        stage: attempt.stage,
        category: attempt.result.category,
        reasons: attempt.result.reasons,
        candidateFailures: attempt.result.candidateFailures,
      })),
      null,
      2
    ),
    "",
    "Domain context:",
    JSON.stringify({
      taskContext: input.taskContext,
      existingTopics: input.existingTopics,
      highlights: input.highlights,
    }, null, 2),
    "",
    "Return one JSON object only. No markdown. No prose. No extra keys outside the contract.",
  ].join("\n");

  return { systemPrompt, userPrompt };
};

const pushFailure = (
  failures: Map<string, PdfFlashcardCandidateFailure>,
  candidate: { highlightId: string; pageNumber: number },
  category: PdfFlashcardFailureCategory,
  reason: string
) => {
  const key = `${candidate.highlightId}:${candidate.pageNumber}`;
  const current =
    failures.get(key) ||
    {
      highlightId: candidate.highlightId,
      pageNumber: candidate.pageNumber,
      categories: [],
      reasons: [],
    };
  if (!current.categories.includes(category)) current.categories.push(category);
  if (!current.reasons.includes(reason)) current.reasons.push(reason);
  failures.set(key, current);
};

const isSentenceLike = (value: string) => /[.!?]/.test(value) || value.trim().split(/\s+/).length > 6;

const isMalformedOption = (value: string) => {
  const text = compact(value);
  if (!text) return true;
  if (text.length < 4) return true;
  if (/^[^a-zA-Z0-9]+$/.test(text)) return true;
  if (/\b(?:option|answer)\b\s*[a-d]?$/i.test(text)) return true;
  if (!/[a-zA-Z]/.test(text)) return true;
  if (/^[a-z]+\S+[a-z]+$/i.test(text) && !/\s/.test(text) && text.length > 18) return true;
  if (/(.)\1\1{2,}/i.test(text)) return true;
  return false;
};

const questionLooksLikeHighlight = (question: string, highlightText: string) => {
  const q = normalizeOption(question.replace(/\?+$/, ""));
  const h = normalizeOption(highlightText.replace(/[.?!]+$/g, ""));
  return q && h && (q === h || h.includes(q) || q.includes(h));
};

export const validatePdfFlashcardPayload = (input: {
  rawContent: string;
  highlights: PdfFlashcardHighlightInput[];
  validTopicIds: Set<string>;
}): PdfFlashcardValidationResult => {
  const rawContent = String(input.rawContent || "");
  const reasons: string[] = [];
  const candidateFailures = new Map<string, PdfFlashcardCandidateFailure>();
  const highlightById = new Map(input.highlights.map((highlight) => [highlight.highlightId, highlight] as const));

  const parsedUnknown = tryParsePayload(rawContent);
  if (!parsedUnknown) {
    const category: PdfFlashcardFailureCategory = looksTruncated(rawContent) ? "truncation_failure" : "parse_failure";
    return {
      ok: false,
      category,
      candidates: [],
      reasons: [
        category === "truncation_failure"
          ? "Model output appears truncated or incomplete."
          : "Model output could not be parsed as strict JSON.",
      ],
      candidateFailures: [],
      rawContent,
    };
  }

  const parsed = payloadSchema.safeParse(normalizeParsedPayload(parsedUnknown));
  if (!parsed.success) {
    return {
      ok: false,
      category: "schema_failure",
      candidates: [],
      reasons: parsed.error.issues.map((issue) => `${issue.path.join(".") || "root"}: ${issue.message}`),
      candidateFailures: [],
      rawContent,
    };
  }

  const payload = parsed.data;
  const seenHighlightIds = new Set<string>();
  const acceptedCandidates: PdfFlashcardCandidate[] = [];

  for (const candidate of payload.candidates) {
    const normalizedCandidate: PdfFlashcardCandidate = {
      highlightId: compact(candidate.highlightId),
      pageNumber: candidate.pageNumber,
      question: compact(candidate.question),
      answer: compact(candidate.answer),
      options: candidate.options.map((option) => compact(option)) as [string, string, string, string],
      correctOptionIndex: candidate.correctOptionIndex,
      explanation: compact(candidate.explanation),
      matchedTopicIds: candidate.matchedTopicIds.map((topicId) => compact(topicId)),
      newTopics: candidate.newTopics.map((topic) => compact(topic)),
    };

    const sourceHighlight = highlightById.get(normalizedCandidate.highlightId);
    const optionSet = new Set(normalizedCandidate.options.map((option) => normalizeOption(option)));
    const correctOption = normalizedCandidate.options[normalizedCandidate.correctOptionIndex];
    const candidateKey = {
      highlightId: normalizedCandidate.highlightId,
      pageNumber: normalizedCandidate.pageNumber,
    };

    if (seenHighlightIds.has(normalizedCandidate.highlightId)) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "Duplicate candidate for the same highlightId.");
    } else {
      seenHighlightIds.add(normalizedCandidate.highlightId);
    }

    if (!sourceHighlight) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "Candidate references an unknown highlightId.");
    } else {
      if (sourceHighlight.pageNumber !== normalizedCandidate.pageNumber) {
        pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "Candidate pageNumber does not match the source highlight.");
      }
      if (questionLooksLikeHighlight(normalizedCandidate.question, sourceHighlight.text)) {
        pushFailure(candidateFailures, candidateKey, "quality_failure", "Question is too close to the original highlight text.");
      }
    }

    if (optionSet.size !== 4) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "Options must contain exactly 4 unique values.");
    }

    if (compact(correctOption) !== normalizedCandidate.answer) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "answer must exactly match options[correctOptionIndex].");
    }

    if (normalizedCandidate.matchedTopicIds.some((topicId) => !input.validTopicIds.has(topicId))) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "matchedTopicIds contains an unknown topic ID.");
    }

    if (normalizedCandidate.newTopics.some((topic) => isSentenceLike(topic))) {
      pushFailure(candidateFailures, candidateKey, "semantic_contract_failure", "newTopics must be short labels, not sentences.");
    }

    if (normalizedCandidate.newTopics.some((topic) => normalizeFlashcardTopicName(topic).length < 3)) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "newTopics contains a weak or empty label.");
    }

    if (normalizedCandidate.options.some((option) => isMalformedOption(option))) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "One or more options are malformed or low quality.");
    }

    const duplicateNewTopics = new Set(normalizedCandidate.newTopics.map((topic) => normalizeFlashcardTopicName(topic)));
    if (duplicateNewTopics.size !== normalizedCandidate.newTopics.length) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "newTopics contains duplicate labels.");
    }

    if (normalizeOption(normalizedCandidate.explanation) === normalizeOption(normalizedCandidate.answer)) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "Explanation must justify the answer, not just repeat it.");
    }

    if (normalizedCandidate.explanation.split(/\s+/).length < 5) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "Explanation is too thin to justify the answer.");
    }

    if (normalizedCandidate.question.split(/\s+/).length < 5) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "Question is too thin.");
    }

    if (normalizedCandidate.options.some((option) => normalizeOption(option) === normalizeOption(normalizedCandidate.question))) {
      pushFailure(candidateFailures, candidateKey, "quality_failure", "An option duplicates the question wording.");
    }

    if (!candidateFailures.has(`${candidateKey.highlightId}:${candidateKey.pageNumber}`)) {
      acceptedCandidates.push(normalizedCandidate);
    }
  }

  for (const highlight of input.highlights) {
    if (!seenHighlightIds.has(highlight.highlightId)) {
      reasons.push(`Missing candidate for highlight ${highlight.highlightId} on page ${highlight.pageNumber}.`);
    }
  }

  const candidateFailureList = Array.from(candidateFailures.values());
  const hasSemanticFailure = candidateFailureList.some((failure) => failure.categories.includes("semantic_contract_failure"));
  const hasQualityFailure = candidateFailureList.some((failure) => failure.categories.includes("quality_failure"));

  if (reasons.length > 0 || candidateFailureList.length > 0 || acceptedCandidates.length !== input.highlights.length) {
    return {
      ok: false,
      category: hasSemanticFailure ? "semantic_contract_failure" : hasQualityFailure ? "quality_failure" : "schema_failure",
      candidates: acceptedCandidates,
      reasons: [
        ...reasons,
        ...candidateFailureList.flatMap((failure) =>
          failure.reasons.map((reason) => `${failure.highlightId} (page ${failure.pageNumber}): ${reason}`)
        ),
      ],
      candidateFailures: candidateFailureList,
      rawContent,
    };
  }

  return {
    ok: true,
    category: null,
    candidates: acceptedCandidates,
    reasons: [],
    candidateFailures: [],
    rawContent,
  };
};
