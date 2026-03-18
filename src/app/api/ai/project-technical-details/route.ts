import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const stripCodeFences = (value: string) =>
  value
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

const SECTION_TITLES = [
  "Problem / Goal",
  "System Architecture",
  "Core Implementation",
  "Technologies Used",
  "Optimization / Challenges",
  "Result / Output",
] as const;

type TechnicalSection = {
  title: (typeof SECTION_TITLES)[number];
  content: string[];
};

type SkillsUsedEntry = {
  specialization?: string;
  skillArea?: string;
  skillAreaPurpose?: string;
  microSkill?: string;
  intentions?: string[];
};

type DoneCardEntry = {
  title?: string;
  description?: string;
  checklist?: string[];
};

const normalizeLineForComparison = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeSections = (input: unknown): TechnicalSection[] => {
  const entries = Array.isArray(input) ? input : [];
  return SECTION_TITLES.map((title) => {
    const match = entries.find(
      (item) => item && typeof item === "object" && typeof (item as { title?: unknown }).title === "string" && (item as { title: string }).title.trim().toLowerCase() === title.toLowerCase()
    ) as { title?: string; content?: unknown } | undefined;

    const rawContent = Array.isArray(match?.content)
      ? match!.content.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim())
      : [];

    const seen = new Set<string>();
    const content = rawContent.filter((item) => {
      const normalized = normalizeLineForComparison(item);
      if (!normalized || seen.has(normalized)) return false;
      seen.add(normalized);
      return true;
    });

    return { title, content };
  });
};

const parseSections = (raw: string) => {
  const cleaned = stripCodeFences(raw);
  try {
    const parsed = JSON.parse(cleaned) as { sections?: unknown };
    return normalizeSections(parsed?.sections);
  } catch {
    return SECTION_TITLES.map((title) => ({
      title,
      content: [],
    }));
  }
};

export async function POST(request: Request) {
  try {
    const isDesktopRuntime = request.headers.get("x-studio-desktop") === "1";
    const body = await request.json().catch(() => ({}));
    const project = body?.project ?? null;
    const skillsUsed = Array.isArray(body?.skillsUsed) ? (body.skillsUsed as SkillsUsedEntry[]) : [];
    const doneCards = Array.isArray(body?.doneCards) ? (body.doneCards as DoneCardEntry[]) : [];
    const existingSections = Array.isArray(body?.existingSections) ? body.existingSections : [];
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!project || typeof project !== "object") {
      return NextResponse.json({ error: "Project context is required." }, { status: 400 });
    }

    const aiConfig = getAiConfigFromSettings(
      {
        ai: {
          provider: aiConfigInput.provider,
          model: aiConfigInput.model,
          ollamaBaseUrl: aiConfigInput.ollamaBaseUrl,
          openaiApiKey: aiConfigInput.openaiApiKey,
          openaiBaseUrl: aiConfigInput.openaiBaseUrl,
          perplexityApiKey: aiConfigInput.perplexityApiKey,
          perplexityBaseUrl: aiConfigInput.perplexityBaseUrl,
          anthropicApiKey: aiConfigInput.anthropicApiKey,
          anthropicBaseUrl: aiConfigInput.anthropicBaseUrl,
          requestTimeoutMs: aiConfigInput.requestTimeoutMs,
        },
      },
      isDesktopRuntime
    );

    if (aiConfig.provider === "none") {
      return NextResponse.json(
        { error: "AI provider is not set. Choose a provider in Settings > AI Settings." },
        { status: 400 }
      );
    }

    const projectDescription =
      typeof (project as { description?: unknown }).description === "string"
        ? (project as { description: string }).description.trim()
        : "";

    const normalizedSkills = skillsUsed.map((entry) => ({
      specialization: typeof entry?.specialization === "string" ? entry.specialization.trim() : "",
      skillArea: typeof entry?.skillArea === "string" ? entry.skillArea.trim() : "",
      skillAreaPurpose: typeof entry?.skillAreaPurpose === "string" ? entry.skillAreaPurpose.trim() : "",
      microSkill: typeof entry?.microSkill === "string" ? entry.microSkill.trim() : "",
      intentions: Array.isArray(entry?.intentions)
        ? entry.intentions.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    }));

    const normalizedDoneCards = doneCards.map((entry) => ({
      title: typeof entry?.title === "string" ? entry.title.trim() : "",
      description: typeof entry?.description === "string" ? entry.description.trim() : "",
      checklist: Array.isArray(entry?.checklist)
        ? entry.checklist.filter((item): item is string => typeof item === "string" && item.trim()).map((item) => item.trim())
        : [],
    }));
    const normalizedExistingSections = normalizeSections(existingSections);

    const systemPrompt = [
      "You generate structured technical details for a project management popup.",
      "Use only the provided project description, skills-used rows, done-card descriptions, and completed checklist text.",
      "You will also receive existing technical-detail points that the user has already accepted.",
      "Never rewrite, replace, paraphrase, shorten, or remove the existing accepted points.",
      "Generate only additional points that add new information beyond the existing points.",
      "Do not generate points that are redundant, overlapping, or near-duplicates of existing points in the same section.",
      "Extract evidence directly from the input. Do not infer missing implementation details.",
      "Do not invent frameworks, architecture, optimization work, algorithms, shaders, compute logic, technologies, or outcomes unless they are clearly supported by the input.",
      "The output must follow this exact structure and section order:",
      "1 Problem / Goal",
      "2 System Architecture",
      "3 Core Implementation",
      "4 Technologies Used",
      "5 Optimization / Challenges",
      "6 Result / Output",
      "Section rules:",
      "Problem / Goal: use the project description only. If the description is empty or vague, keep it empty.",
      "System Architecture: use only skills-used data. Check whether the skills/intention text supports any of these: Components, Responsibilities, Data Flow, Interfaces, Execution Flow. Only include the sub-parts that are clearly supported. If nothing in skills-used data supports architecture, keep this section empty.",
      "Core Implementation: use done-card descriptions and completed checklist text only. Extract implementation details, concrete work completed, logic, UI behavior, algorithms, rendering work, compute work, or engineering steps. If the done-card text is too generic, keep this section empty.",
      "For Core Implementation, prefer this pattern whenever the evidence supports it: Action + Technology + System + Result.",
      "For Core Implementation, avoid weak generic lines such as 'Responsible for writing shaders', 'Used OpenGL and CUDA', or 'Worked on graphics rendering'.",
      "For Core Implementation, every line should sound like an engineering implementation note, not a resume keyword list.",
      "Technologies Used: use specialization names, skill area names, and micro-skill names from skills-used data. Do not add technologies that are not literally present or strongly named in those fields.",
      "Optimization / Challenges: only fill this if the skills-used data or done-card text explicitly mentions optimization, performance, debugging, bottlenecks, fixes, constraints, tradeoffs, or challenges.",
      "Result / Output: summarize the shipped artifact or completed outcome from the project description and done-card evidence. If there is no clear outcome, keep it empty.",
      "Map the skills-used data into the structure carefully instead of forcing every section to be filled.",
      "If a section already has strong existing points and you have nothing new to add, return an empty content array for that section.",
      "If a section is not clearly supported by the input data, return an empty content array for that section.",
      "It is acceptable for most sections to be empty if the source data does not support them.",
      "For each section return at most 2 new concise lines only.",
      "Keep every line short, factual, and grounded in the source data, but rewrite it into a polished professional sentence.",
      "Decorate the wording lightly: improve clarity, grammar, casing, and phrasing without changing the meaning or adding unsupported claims.",
      "Turn raw fragments like 'React Components' into cleaner lines like 'Built with reusable React components.' only if that wording is directly supported by the input.",
      "Turn raw fragments like 'Next js' into cleaner lines like 'Implemented using Next.js.' only if that wording is directly supported by the input.",
      "Prefer complete sentences over labels or fragments.",
      "Do not output placeholders, meta-comments, or negative filler such as 'No explicit optimization or challenges mentioned'.",
      "If a section lacks support, leave it empty instead of explaining that it is empty.",
      "Do not restate the same sentence across multiple sections.",
      "Do not turn intentions into fake architecture unless the wording truly supports architecture concepts.",
      "Do not include markdown headings or extra prose outside the JSON.",
      "Return strict JSON with exactly this shape:",
      "{\"sections\":[{\"title\":\"Problem / Goal\",\"content\":[\"...\",\"...\"]},{\"title\":\"System Architecture\",\"content\":[\"...\",\"...\"]},{\"title\":\"Core Implementation\",\"content\":[\"...\",\"...\"]},{\"title\":\"Technologies Used\",\"content\":[\"...\",\"...\"]},{\"title\":\"Optimization / Challenges\",\"content\":[\"...\",\"...\"]},{\"title\":\"Result / Output\",\"content\":[\"...\",\"...\"]}]}",
    ].join(" ");

    const userPrompt = JSON.stringify(
      {
        task: "Generate structured technical details for the project.",
        project: {
          ...(project as Record<string, unknown>),
          description: projectDescription,
        },
        sourceGuide: {
          problemGoal: "Use project.description only.",
          systemArchitecture: "Use only skillsUsed rows. Look for components, responsibilities, data flow, interfaces, execution flow.",
          coreImplementation: "Use only doneCards descriptions and doneCards completed checklist text.",
          technologiesUsed: "Use specialization, skillArea, and microSkill names from skillsUsed.",
          optimizationChallenges: "Use only explicit optimization, performance, debugging, bottleneck, constraint, or challenge evidence.",
          resultOutput: "Use project description + doneCards to describe the finished output if supported.",
        },
        existingSections: normalizedExistingSections,
        skillsUsed: normalizedSkills,
        doneCards: normalizedDoneCards,
      },
      null,
      2
    );

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.2, format: "json" }
    );

    if (!aiResponse.ok) {
      return NextResponse.json(
        { error: "AI provider call failed.", details: aiResponse.details || "Provider call failed." },
        { status: 502 }
      );
    }

    const sections = parseSections(aiResponse.content || "");

    return NextResponse.json({
      sections,
      provider: aiResponse.provider,
      model: aiResponse.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to generate project technical details.",
        details: message,
      },
      { status: 500 }
    );
  }
}
