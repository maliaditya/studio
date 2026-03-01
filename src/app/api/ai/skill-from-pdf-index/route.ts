import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const extractJson = (raw: string) => {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) return raw.slice(firstBrace, lastBrace + 1);
  return raw.trim();
};

const repairBrokenOutlineSpacing = (input: string) => {
  let output = input.replace(/\s+/g, " ").trim();
  const looksBrokenCaps = /(?:^|\s)[A-Z]\s+[A-Z]{2,}/.test(output);
  if (!looksBrokenCaps) return output;

  // Join split uppercase fragments like "T HE" => "THE", "M ASS" => "MASS", "-A GGREGATE" => "-AGGREGATE".
  for (let i = 0; i < 8; i += 1) {
    const prev = output;
    output = output.replace(/\b([A-Z])\s+([A-Z]{2,})\b/g, "$1$2");
    output = output.replace(/-([A-Z])\s+([A-Z]{2,})\b/g, "-$1$2");
    if (output === prev) break;
  }
  return output.replace(/\s*-\s*/g, "-").replace(/\s+/g, " ").trim();
};

const normalizeName = (value: unknown) =>
  repairBrokenOutlineSpacing(
    String(value || "")
      .replace(/\s+/g, " ")
      .trim()
  );

type GeneratedMicro = { name: string; curiosities: string[] };
type GeneratedArea = { name: string; microSkills: GeneratedMicro[] };
type CuriosityMatch = { matchedMicroSkillName: string; curiosities: string[] };
type BciModel = { boundary: string[]; contents: string[]; invariant: string[] };
const normalizeKey = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ");

const stripSectionPrefix = (value: string) => value.replace(/^\d+(?:\.\d+){0,6}\s+/, "").trim();

type NumberedIndexRow = { section: string; title: string; depth: number };

function extractNumberedIndexRows(extractedText: string): NumberedIndexRow[] {
  const lines = extractedText
    .split("\n")
    .map((line) =>
      line
        .replace(/^---\s*Page\s*\d+\s*---$/i, "")
        .replace(/\.{2,}\s*\d+\s*$/, "")
        .replace(/\s+\d+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 3);

  const rows: NumberedIndexRow[] = [];
  lines.forEach((line) => {
    const numbered = line.match(/^(\d+(?:\.\d+){0,6})\s+(.+)$/);
    if (!numbered) return;
    const section = numbered[1];
    const title = normalizeName(numbered[2]).replace(/[.:]\s*$/, "");
    if (!title) return;
    rows.push({ section, title, depth: section.split(".").length });
  });
  return rows;
}

function applyIndexNumbering(skillAreas: GeneratedArea[], extractedText: string): GeneratedArea[] {
  const rows = extractNumberedIndexRows(extractedText);
  if (rows.length === 0) return skillAreas;

  const titleToBestSection = new Map<string, { section: string; depth: number }>();
  rows.forEach((row) => {
    const key = normalizeKey(stripSectionPrefix(row.title));
    const existing = titleToBestSection.get(key);
    if (!existing || row.depth < existing.depth) {
      titleToBestSection.set(key, { section: row.section, depth: row.depth });
    }
  });

  const withSection = (name: string) => {
    const plain = stripSectionPrefix(normalizeName(name));
    if (!plain) return normalizeName(name);
    const key = normalizeKey(plain);
    const hit = titleToBestSection.get(key);
    if (!hit) return plain;
    return `${hit.section} ${plain}`;
  };

  return skillAreas.map((area) => ({
    name: withSection(area.name),
    microSkills: area.microSkills.map((micro) => ({
      name: withSection(micro.name),
      curiosities: micro.curiosities.map((curiosity) => withSection(curiosity)),
    })),
  }));
}

function parseGenerationPayload(content: string): { skillAreaName: string; microSkills: string[] } | null {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    skillAreaName?: unknown;
    skillName?: unknown;
    microSkills?: unknown;
    microskills?: unknown;
    skills?: unknown;
  };
  const rawAreaName = normalizeName(parsed.skillAreaName || parsed.skillName || "PDF Index Skill");
  const rawList =
    (Array.isArray(parsed.microSkills) && parsed.microSkills) ||
    (Array.isArray(parsed.microskills) && parsed.microskills) ||
    (Array.isArray(parsed.skills) && parsed.skills) ||
    [];
  const names = rawList
    .map((item) => (typeof item === "string" ? item : typeof item?.name === "string" ? item.name : ""))
    .map((name) => normalizeName(name))
    .filter((name) => name.length >= 2);
  const unique = Array.from(new Set(names));
  if (!rawAreaName || unique.length === 0) return null;
  return { skillAreaName: rawAreaName, microSkills: unique.slice(0, 80) };
}

function parseHierarchyPayload(content: string): GeneratedArea[] | null {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    skills?: unknown;
    skillAreas?: unknown;
    areas?: unknown;
  };

  const rawSkills =
    (Array.isArray(parsed.skills) && parsed.skills) ||
    (Array.isArray(parsed.skillAreas) && parsed.skillAreas) ||
    (Array.isArray(parsed.areas) && parsed.areas) ||
    [];

  const normalized = rawSkills
    .map((raw) => {
      const name = normalizeName((raw as any)?.name || (raw as any)?.skill || (raw as any)?.title);
      const rawMicros =
        (Array.isArray((raw as any)?.microSkills) && (raw as any).microSkills) ||
        (Array.isArray((raw as any)?.microskills) && (raw as any).microskills) ||
        (Array.isArray((raw as any)?.subtopics) && (raw as any).subtopics) ||
        (Array.isArray((raw as any)?.topics) && (raw as any).topics) ||
        [];
      const microSkills = rawMicros
        .map((item: unknown) => {
          if (typeof item === "string") {
            const n = normalizeName(item);
            return n ? { name: n, curiosities: [] } : null;
          }
          const n = normalizeName((item as any)?.name || (item as any)?.title || (item as any)?.topic);
          const rawCuriosities =
            (Array.isArray((item as any)?.curiosities) && (item as any).curiosities) ||
            (Array.isArray((item as any)?.subtopics) && (item as any).subtopics) ||
            (Array.isArray((item as any)?.children) && (item as any).children) ||
            [];
          const curiosities = Array.from(
            new Set(
              rawCuriosities
                .map((c: unknown) => normalizeName(typeof c === "string" ? c : (c as any)?.name || (c as any)?.title))
                .filter((v: string) => v.length >= 2)
            )
          ).slice(0, 120);
          if (!n) return null;
          return { name: n, curiosities };
        })
        .filter((v): v is GeneratedMicro => !!v)
        .slice(0, 120);
      if (!name || microSkills.length === 0) return null;
      return { name, microSkills };
    })
    .filter((item): item is GeneratedArea => !!item);

  if (normalized.length > 0) return normalized.slice(0, 40);

  const fallback = parseGenerationPayload(content);
  if (!fallback) return null;
  return [
    {
      name: fallback.skillAreaName,
      microSkills: fallback.microSkills.map((m) => ({ name: m, curiosities: [] })),
    },
  ];
}

function parseCuriositiesPayload(content: string): string[] | null {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    curiosities?: unknown;
    subtopics?: unknown;
    topics?: unknown;
  };
  const raw =
    (Array.isArray(parsed.curiosities) && parsed.curiosities) ||
    (Array.isArray(parsed.subtopics) && parsed.subtopics) ||
    (Array.isArray(parsed.topics) && parsed.topics) ||
    [];
  const list = Array.from(
    new Set(
      raw
        .map((item) => normalizeName(typeof item === "string" ? item : (item as any)?.name || (item as any)?.title))
        .filter((value) => value.length >= 2)
    )
  ).slice(0, 120);
  return list.length > 0 ? list : null;
}

function parseBciPayload(content: string): BciModel | null {
  const jsonText = extractJson(content);
  const parsed = JSON.parse(jsonText) as {
    boundary?: unknown;
    contents?: unknown;
    invariant?: unknown;
    invariants?: unknown;
  };
  const toList = (value: unknown) =>
    Array.from(
      new Set(
        (Array.isArray(value) ? value : [])
          .map((item) => normalizeName(typeof item === "string" ? item : (item as any)?.text || (item as any)?.name || ""))
          .filter((v) => v.length >= 2)
      )
    ).slice(0, 24);

  const boundary = toList(parsed.boundary);
  const contents = toList(parsed.contents);
  const invariant = toList(parsed.invariant ?? parsed.invariants);
  if (boundary.length === 0 && contents.length === 0 && invariant.length === 0) return null;
  return { boundary, contents, invariant };
}

function buildBciFallback(contextLines: string[]): BciModel {
  const cleaned = contextLines
    .map((line) => line.replace(/^\d+(?:\.\d+){0,6}\s+/, "").replace(/\s+/g, " ").trim())
    .filter((line) => line.length >= 3);
  const deduped = Array.from(new Set(cleaned));
  return {
    boundary: [
      "Defines when this topic starts and ends in your workflow.",
      "Entry: prerequisites are ready and context is initialized.",
      "Exit: expected output is produced and handoff is complete.",
    ],
    contents: deduped.slice(0, 10),
    invariant: [
      "State remains valid throughout the topic lifecycle.",
      "Transitions happen through explicit steps/events only.",
      "Outcome criteria stay consistent from start to end.",
    ],
  };
}

function resolveSectionContext(extractedText: string, targetTopic: string): { matchedName: string; lines: string[] } | null {
  const rows = extractNumberedIndexRows(extractedText);
  if (rows.length === 0) return null;

  const targetNormalized = normalizeName(targetTopic);
  const sectionMatch = targetNormalized.match(/^(\d+(?:\.\d+){1,6})(?=\s|$)/);
  let selectedRow: NumberedIndexRow | null = null;

  if (sectionMatch?.[1]) {
    selectedRow = rows.find((row) => row.section === sectionMatch[1]) || null;
  }
  if (!selectedRow) {
    const targetKey = normalizeKey(stripSectionPrefix(targetNormalized) || targetNormalized);
    const exactRows = rows.filter((row) => normalizeKey(stripSectionPrefix(row.title) || row.title) === targetKey);
    if (exactRows.length > 0) {
      exactRows.sort((a, b) => a.depth - b.depth);
      selectedRow = exactRows[0];
    }
  }
  if (!selectedRow) return null;

  const parentDepth = selectedRow.depth;
  const prefix = `${selectedRow.section}.`;
  const scoped = rows
    .filter((row) => row.section === selectedRow!.section || (row.section.startsWith(prefix) && row.depth <= parentDepth + 2))
    .map((row) => `${row.section} ${row.title}`.trim())
    .slice(0, 240);

  return {
    matchedName: `${selectedRow.section} ${selectedRow.title}`.trim(),
    lines: scoped,
  };
}

function pickCuriositiesBySectionPrefix(extractedText: string, targetMicroSkill: string): CuriosityMatch | null {
  const lines = extractedText
    .split("\n")
    .map((line) =>
      line
        .replace(/^---\s*Page\s*\d+\s*---$/i, "")
        .replace(/\.{2,}\s*\d+\s*$/, "")
        .replace(/\s+\d+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 3);

  type Row = { section: string; title: string };
  const rows: Row[] = [];
  for (const line of lines) {
    const numbered = line.match(/^(\d+(?:\.\d+){1,6})\s+(.+)$/);
    if (!numbered) continue;
    const section = numbered[1];
    const title = normalizeName(numbered[2]).replace(/[.:]\s*$/, "");
    if (!title) continue;
    rows.push({ section, title });
  }

  if (rows.length === 0) return null;

  const targetNormalized = normalizeName(targetMicroSkill);
  const targetSection = targetNormalized.match(/^(\d+(?:\.\d+){1,6})(?=\s|$)/)?.[1] || null;
  let selectedSection = targetSection;
  let matchedLabel = targetNormalized;

  if (selectedSection) {
    const rowForSection = rows.find((row) => row.section === selectedSection);
    if (rowForSection) {
      matchedLabel = `${rowForSection.section} ${rowForSection.title}`.trim();
    }
  } else {
    const targetKey = normalizeKey(stripSectionPrefix(targetNormalized) || targetNormalized);
    const candidates = rows.filter((row) => normalizeKey(stripSectionPrefix(row.title) || row.title) === targetKey);
    if (candidates.length === 0) return null;

    // Prefer "topic-like" depth (e.g. 2.1) over deeper rows when multiple exact matches exist.
    const scored = candidates
      .map((c) => ({ row: c, depth: c.section.split(".").length }))
      .sort((a, b) => a.depth - b.depth);
    selectedSection = scored[0].row.section;
    matchedLabel = `${scored[0].row.section} ${scored[0].row.title}`.trim();
  }

  if (!selectedSection) return null;
  const selectedDepth = selectedSection.split(".").length;
  const prefix = `${selectedSection}.`;

  const curiosities = rows
    .filter((row) => row.section.startsWith(prefix) && row.section.split(".").length === selectedDepth + 1)
    .map((row) => `${row.section} ${row.title}`.trim())
    .filter((title, index, arr) => arr.findIndex((v) => normalizeKey(v) === normalizeKey(title)) === index)
    .slice(0, 160);

  if (curiosities.length === 0) return null;
  return { matchedMicroSkillName: matchedLabel, curiosities };
}

function pickCuriositiesForMicroSkill(skillAreas: GeneratedArea[], targetMicroSkill: string): CuriosityMatch | null {
  const targetKey = normalizeKey(targetMicroSkill);
  if (!targetKey) return null;

  const candidates: Array<{ name: string; curiosities: string[]; score: number }> = [];

  skillAreas.forEach((area) => {
    area.microSkills.forEach((micro) => {
      const microKey = normalizeKey(micro.name);
      if (!microKey) return;
      const exact = microKey === targetKey;
      if (!exact) return;
      const score = (exact ? 1000 : 0) + Math.min(250, micro.curiosities.length * 5) - Math.abs(microKey.length - targetKey.length);
      candidates.push({ name: micro.name, curiosities: micro.curiosities, score });
    });
  });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => b.score - a.score);
  const best = candidates[0];
  return {
    matchedMicroSkillName: best.name,
    curiosities: Array.from(new Set(best.curiosities.map((c) => normalizeName(c)).filter((c) => c.length >= 2))).slice(0, 120),
  };
}

function parseHierarchyFromTextFallback(extractedText: string): GeneratedArea[] {
  const lines = extractedText
    .split("\n")
    .map((line) =>
      line
        .replace(/^---\s*Page\s*\d+\s*---$/i, "")
        .replace(/\.{2,}\s*\d+\s*$/, "")
        .replace(/\s+\d+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 3);

  const topRows: Array<{ section: string; title: string }> = [];
  const secondRows: Array<{ section: string; title: string }> = [];
  const thirdRows: Array<{ section: string; title: string }> = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[•\-–]\s*/, "").trim();
    if (!line) continue;
    const numbered = line.match(/^(\d+(?:\.\d+){0,5})\s+(.+)$/);
    if (!numbered) continue;
    const section = numbered[1];
    const title = normalizeName(numbered[2]).replace(/[.:]\s*$/, "");
    if (!title) continue;
    const depth = section.split(".").length;
    if (depth === 1) topRows.push({ section, title });
    else if (depth === 2) secondRows.push({ section, title });
    else thirdRows.push({ section, title });
  }

  const hasPartStructure =
    topRows.length >= 2 &&
    topRows.filter((row) => /^part\b/i.test(row.title) || /\bpart\s+[ivxlcdm\d]+\b/i.test(row.title)).length >=
      Math.max(2, Math.floor(topRows.length * 0.5));

  // Part-driven hierarchy: Part -> Topic -> Subtopic
  if (hasPartStructure) {
    const skillsByPart = new Map<string, GeneratedArea>();
    const microsByTopicKey = new Map<string, GeneratedMicro>();
    const chapterLike = (title: string) => /^chapter\b/i.test(title) || /^appendix\b/i.test(title);

    topRows.forEach((part) => {
      skillsByPart.set(part.section, { name: part.title, microSkills: [] });
    });

    secondRows.forEach((topic) => {
      const partKey = topic.section.split(".")[0];
      const skill = skillsByPart.get(partKey);
      if (!skill) return;
      const micro: GeneratedMicro = { name: topic.title, curiosities: [] };
      skill.microSkills.push(micro);
      microsByTopicKey.set(topic.section, micro);
    });

    // Typical case: depth-3 rows are subtopics.
    if (thirdRows.length > 0) {
      thirdRows.forEach((sub) => {
        const topicKey = sub.section.split(".").slice(0, 2).join(".");
        const micro = microsByTopicKey.get(topicKey);
        if (!micro) return;
        if (!micro.curiosities.some((c) => c.toLowerCase() === sub.title.toLowerCase())) {
          micro.curiosities.push(sub.title);
        }
      });
    } else {
      // Some PDFs place chapter + section at same depth under Part.
      // In that case, treat "Chapter ..." rows as micro-skills and following sibling rows as curiosities.
      const rowsByPart = new Map<string, Array<{ section: string; title: string }>>();
      secondRows.forEach((row) => {
        const partKey = row.section.split(".")[0];
        if (!rowsByPart.has(partKey)) rowsByPart.set(partKey, []);
        rowsByPart.get(partKey)!.push(row);
      });

      rowsByPart.forEach((rows, partKey) => {
        let currentMicro: GeneratedMicro | null = null;
        rows.forEach((row) => {
          const skill = skillsByPart.get(partKey);
          if (!skill) return;
          if (chapterLike(row.title)) {
            currentMicro = skill.microSkills.find((m) => m.name.toLowerCase() === row.title.toLowerCase()) || null;
            if (!currentMicro) {
              currentMicro = { name: row.title, curiosities: [] };
              skill.microSkills.push(currentMicro);
            }
            return;
          }
          if (currentMicro) {
            if (!currentMicro.curiosities.some((c) => c.toLowerCase() === row.title.toLowerCase())) {
              currentMicro.curiosities.push(row.title);
            }
          }
        });
      });
    }

    const partResult = Array.from(skillsByPart.values())
      .map((skill) => ({
        name: skill.name,
        microSkills: skill.microSkills
          .map((m) => ({
            name: m.name,
            curiosities: Array.from(new Set(m.curiosities.map((c) => normalizeName(c)))).filter((c) => c.length >= 2),
          }))
          .filter((m) => m.name.length >= 2),
      }))
      .filter((skill) => skill.name.length >= 2 && skill.microSkills.length > 0)
      .slice(0, 60);

    if (partResult.length > 0) return partResult;
  }

  const skillsByKey = new Map<string, GeneratedArea>();
  const lastSkillBySection = new Map<string, string>();
  let lastSkillKey = "";

  for (const rawLine of lines) {
    const line = rawLine.replace(/^[•\-–]\s*/, "").trim();
    if (!line) continue;

    const numbered = line.match(/^(\d+(?:\.\d+){0,4})\s+(.+)$/);
    if (numbered) {
      const section = numbered[1];
      const title = normalizeName(numbered[2]).replace(/[.:]\s*$/, "");
      if (!title) continue;
      const parts = section.split(".");
      if (parts.length === 1) {
        const key = parts[0];
        if (!skillsByKey.has(key)) {
          skillsByKey.set(key, { name: title, microSkills: [] });
        }
        lastSkillBySection.set(parts[0], key);
        lastSkillKey = key;
      } else {
        const top = parts[0];
        const parentKey = lastSkillBySection.get(top) || top;
        if (!skillsByKey.has(parentKey)) {
          skillsByKey.set(parentKey, { name: `Topic ${top}`, microSkills: [] });
        }
        const target = skillsByKey.get(parentKey)!;
        if (!target.microSkills.some((m) => m.name.toLowerCase() === title.toLowerCase())) {
          target.microSkills.push({ name: title, curiosities: [] });
        }
        lastSkillKey = parentKey;
      }
      continue;
    }

    const chapter = line.match(/^chapter\s+(\d+)\s*[:\-]?\s*(.+)$/i);
    if (chapter) {
      const key = chapter[1];
      const name = normalizeName(chapter[2]);
      if (name) {
        if (!skillsByKey.has(key)) {
          skillsByKey.set(key, { name, microSkills: [] });
        }
        lastSkillBySection.set(key, key);
        lastSkillKey = key;
      }
      continue;
    }

    if (lastSkillKey && line.length <= 90) {
      const target = skillsByKey.get(lastSkillKey);
      if (target && !target.microSkills.some((m) => m.name.toLowerCase() === line.toLowerCase())) {
        target.microSkills.push({ name: line, curiosities: [] });
      }
    }
  }

  const result = Array.from(skillsByKey.values())
    .map((skill) => ({
      name: skill.name,
      microSkills: skill.microSkills
        .map((m) => ({
          name: normalizeName(m.name),
          curiosities: Array.from(new Set(m.curiosities.map((c) => normalizeName(c)))).filter((c) => c.length >= 2),
        }))
        .filter((m) => m.name.length >= 2)
        .slice(0, 120),
    }))
    .filter((skill) => skill.name.length >= 2 && skill.microSkills.length > 0)
    .slice(0, 40);

  return result;
}

function parseGenericLinesFallback(extractedText: string): GeneratedArea[] {
  const lines = extractedText
    .split("\n")
    .map((line) =>
      line
        .replace(/^---\s*Page\s*\d+\s*---$/i, "")
        .replace(/\.{2,}\s*\d+\s*$/, "")
        .replace(/\s+\d+\s*$/, "")
        .replace(/\s+/g, " ")
        .trim()
    )
    .filter((line) => line.length >= 3 && /[A-Za-z]/.test(line));

  const unique = Array.from(new Set(lines.map((line) => normalizeName(line))))
    .filter((line) => line.length >= 3 && line.length <= 120)
    .slice(0, 60);

  if (unique.length === 0) return [];
  return [
    {
      name: "PDF Topics",
      microSkills: unique.slice(0, 50).map((u) => ({ name: u, curiosities: [] })),
    },
  ];
}

function splitSingleSkillIfNeeded(
  parsed: GeneratedArea[],
  extractedText: string
): GeneratedArea[] {
  if (parsed.length !== 1) return parsed;
  const textHierarchy = parseHierarchyFromTextFallback(extractedText);
  if (textHierarchy.length >= 2) return textHierarchy;
  return parsed;
}

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";

    const body = await request.json().catch(() => ({}));
    const specializationName = normalizeName(body?.specializationName);
    const targetMicroSkill = normalizeName(body?.targetMicroSkill);
    const targetMode = normalizeName(body?.targetMode);
    const extractedTextRaw = String(body?.extractedText || "");
    const extractedText = extractedTextRaw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").trim();
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!specializationName) {
      return NextResponse.json({ error: "specializationName is required." }, { status: 400 });
    }
    if (!extractedText) {
      return NextResponse.json({ error: "extractedText is required." }, { status: 400 });
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
      return NextResponse.json({ error: "AI provider is not set. Choose a provider in Settings > AI Settings." }, { status: 400 });
    }
    if (aiConfig.provider === "openai" && !aiConfig.openaiApiKey) {
      return NextResponse.json({ error: "OpenAI API key is required when provider is OpenAI." }, { status: 400 });
    }
    if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
      return NextResponse.json({ error: "Ollama base URL is required when provider is Ollama." }, { status: 400 });
    }
    if (aiConfig.provider === "perplexity" && !aiConfig.perplexityApiKey) {
      return NextResponse.json({ error: "Perplexity API key is required when provider is Perplexity." }, { status: 400 });
    }
    if (aiConfig.provider === "anthropic" && !aiConfig.anthropicApiKey) {
      return NextResponse.json({ error: "Anthropic API key is required when provider is Anthropic." }, { status: 400 });
    }

    if (targetMicroSkill) {
      if (targetMode === "bci") {
        const sectionContext = resolveSectionContext(extractedText, targetMicroSkill);
        const contextLines = sectionContext?.lines || extractedText.split("\n").slice(0, 220);
        const matchedMicroSkill = sectionContext?.matchedName || targetMicroSkill;

        const bciSystemPrompt =
          "You convert a technical topic into Boundary/Contents/Invariant model. Return strict JSON only.";
        const bciUserPrompt = `Specialization: ${specializationName}
Target topic: ${matchedMicroSkill}

Task:
Using the PDF context lines, produce this exact model:
- Boundary: start/end of existence and lifecycle limits.
- Contents: what exists inside boundary, responsibilities, interactions.
- Invariant: truths that must never change.

Rules:
- Keep each bullet concise and practical.
- Remove duplicates and noise.
- Return JSON only.

Required JSON shape:
{
  "boundary": ["..."],
  "contents": ["..."],
  "invariant": ["..."]
}

Context lines:
${contextLines.join("\n").slice(0, 24000)}`;

        const aiResponse = await runChatWithProvider(
          aiConfig,
          [
            { role: "system", content: bciSystemPrompt },
            { role: "user", content: bciUserPrompt },
          ],
          { format: "json", temperature: 0.2 }
        );

        let model: BciModel | null = null;
        let usedFallback = false;
        if (aiResponse.ok && aiResponse.content) {
          try {
            model = parseBciPayload(aiResponse.content);
          } catch {
            model = null;
          }
        }
        if (!model) {
          model = buildBciFallback(contextLines);
          usedFallback = true;
        }

        return NextResponse.json({
          microSkillName: targetMicroSkill,
          matchedMicroSkill,
          bci: model,
          meta: {
            provider: aiResponse.provider,
            model: aiResponse.model || aiConfig.model,
            usedFallback,
            targeted: true,
            mode: "bci",
          },
        });
      }

      const prefixScoped = pickCuriositiesBySectionPrefix(extractedText, targetMicroSkill);
      if (prefixScoped && prefixScoped.curiosities.length > 0) {
        return NextResponse.json({
          microSkillName: targetMicroSkill,
          matchedMicroSkill: prefixScoped.matchedMicroSkillName,
          curiosities: prefixScoped.curiosities,
          meta: {
            provider: "parser",
            model: "section-prefix",
            usedFallback: true,
            targeted: true,
          },
        });
      }

      const textHierarchy = parseHierarchyFromTextFallback(extractedText);
      const textMatch = pickCuriositiesForMicroSkill(textHierarchy, targetMicroSkill);
      if (textMatch && textMatch.curiosities.length > 0) {
        return NextResponse.json({
          microSkillName: targetMicroSkill,
          matchedMicroSkill: textMatch.matchedMicroSkillName,
          curiosities: textMatch.curiosities,
          meta: {
            provider: "parser",
            model: "toc-fallback",
            usedFallback: true,
            targeted: true,
          },
        });
      }

      const targetedSystemPrompt =
        "You extract focused subtopics/curiosities for one target micro-skill from PDF index lines. Return strict JSON only.";
      const targetedUserPrompt = `Specialization: ${specializationName}
Target micro-skill: ${targetMicroSkill}

Task:
From the PDF index/table-of-contents lines, identify entries that are subtopics under the target micro-skill.
Return concise curiosity names only.

Rules:
- Keep only items directly under the target micro-skill.
- Remove duplicates and noisy entries.
- Do not return the target micro-skill name itself.
- Return JSON only.

Required JSON shape:
{
  "curiosities": ["Curiosity 1", "Curiosity 2"]
}

PDF extracted lines:
${extractedText.slice(0, 24000)}`;

      const aiResponse = await runChatWithProvider(
        aiConfig,
        [
          { role: "system", content: targetedSystemPrompt },
          { role: "user", content: targetedUserPrompt },
        ],
        { format: "json", temperature: 0.2 }
      );

      let curiosities: string[] | null = null;
      let matchedMicroSkill = targetMicroSkill;
      let usedFallback = false;

      if (aiResponse.ok && aiResponse.content) {
        try {
          curiosities = parseCuriositiesPayload(aiResponse.content);
          if (!curiosities) {
            const hierarchy = parseHierarchyPayload(aiResponse.content);
            if (hierarchy && hierarchy.length > 0) {
              const match = pickCuriositiesForMicroSkill(hierarchy, targetMicroSkill);
              if (match) {
                curiosities = match.curiosities;
                matchedMicroSkill = match.matchedMicroSkillName;
              }
            }
          }
        } catch {
          curiosities = null;
        }
      }

      if (!curiosities || curiosities.length === 0) {
        const fallback = pickCuriositiesForMicroSkill(textHierarchy, targetMicroSkill);
        if (fallback && fallback.curiosities.length > 0) {
          curiosities = fallback.curiosities;
          matchedMicroSkill = fallback.matchedMicroSkillName;
          usedFallback = true;
        }
      }

      if (!curiosities || curiosities.length === 0) {
        return NextResponse.json(
          {
            error: "Unable to derive curiosities for the target micro-skill from PDF text.",
            details: aiResponse.ok
              ? aiResponse.content?.slice(0, 400) || "Model output did not contain curiosity entries."
              : aiResponse.details || "Provider call failed and fallback parser found no matching entries.",
          },
          { status: 422 }
        );
      }

      return NextResponse.json({
        microSkillName: targetMicroSkill,
        matchedMicroSkill,
        curiosities,
        meta: {
          provider: aiResponse.provider,
          model: aiResponse.model || aiConfig.model,
          usedFallback,
          targeted: true,
        },
      });
    }

    const systemPrompt =
      "You convert a PDF table-of-contents/index into a skill hierarchy. Return strict JSON only.";
    const userPrompt = `Specialization: ${specializationName}

Task:
Read the PDF index/table-of-contents lines and build hierarchy.
You must detect structure intelligently:
- If document is Part-based: Part = skill area, Topic = micro-skill, Subtopic = curiosity.
- Otherwise: Topic = skill area, Subtopic = micro-skill.

Rules:
- Prefer concise, actionable names.
- Remove duplicates and very broad/irrelevant items.
- Keep names human-friendly and title case when possible.
- Preserve hierarchy from the index as much as possible.
- Return JSON only.

Required JSON shape:
{
  "skills": [
    {
      "name": "Skill area",
      "microSkills": [
        {
          "name": "Micro-skill",
          "curiosities": ["Curiosity 1", "Curiosity 2"]
        }
      ]
    }
  ]
}

PDF extracted lines:
${extractedText.slice(0, 24000)}`;

    const textHierarchy = parseHierarchyFromTextFallback(extractedText);
    if (textHierarchy.length >= 2) {
      const numbered = applyIndexNumbering(textHierarchy, extractedText);
      return NextResponse.json({
        skillAreas: numbered,
        meta: {
          provider: "parser",
          model: "toc-fallback",
          usedFallback: true,
        },
      });
    }

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { format: "json", temperature: 0.2 }
    );

    let parsed: GeneratedArea[] | null = null;
    let usedFallback = false;

    if (aiResponse.ok && aiResponse.content) {
      try {
        parsed = parseHierarchyPayload(aiResponse.content);
        if (parsed && parsed.length > 0) {
          parsed = splitSingleSkillIfNeeded(parsed, extractedText);
        }
      } catch {
        parsed = null;
      }
    }

    if (!parsed || parsed.length === 0) {
      const fallback = textHierarchy;
      if (fallback.length > 0) {
        parsed = fallback;
        usedFallback = true;
      }
    }

    if (!parsed || parsed.length === 0) {
      const generic = parseGenericLinesFallback(extractedText);
      if (generic.length > 0) {
        parsed = generic;
        usedFallback = true;
      }
    }

    if (!parsed || parsed.length === 0) {
      return NextResponse.json(
        {
          error: "Unable to derive skills from PDF text.",
          details: aiResponse.ok
            ? aiResponse.content?.slice(0, 400) || "Model output was empty and fallback parser found no lines."
            : aiResponse.details || "Provider call failed and fallback parser found no lines.",
        },
        { status: 422 }
      );
    }

    const numberedParsed = applyIndexNumbering(parsed, extractedText);

    return NextResponse.json({
      skillAreas: numberedParsed,
      meta: {
        provider: aiResponse.provider,
        model: aiResponse.model || aiConfig.model,
        usedFallback,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: "Failed to generate skills from linked PDF.", details: message }, { status: 500 });
  }
}
