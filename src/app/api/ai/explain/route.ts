import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider, type ChatMessage } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";
import { parseJsonWithRecovery } from "@/lib/jsonRecovery";
import { renderAsciiTree, sanitizeBlueprint, type DiagramBlueprint } from "@/lib/renderAsciiTree";
import { normalizeDiagramLabels } from "@/lib/normalizeDiagramLabels";

export const dynamic = "force-dynamic";

const extractJsonPayload = (raw: string) => {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  const candidate = fenced ? fenced[1] : raw;
  const first = candidate.indexOf("{");
  const last = candidate.lastIndexOf("}");
  if (first !== -1 && last !== -1 && last > first) {
    return candidate.slice(first, last + 1);
  }
  return candidate;
};

const SHAPES = [
  "concept",
  "pipeline",
  "workflow",
  "architecture",
  "system",
  "comparison",
  "algorithm",
  "theory",
  "mixed",
] as const;
type Shape = (typeof SHAPES)[number];

const getBlockSetForShape = (shape: Shape): string[] => {
  switch (shape) {
    case "pipeline":
    case "workflow":
      return ["stage", "input", "output", "transformation", "parameter", "flow", "relation"];
    case "architecture":
    case "system":
      return ["component", "responsibility", "dependency", "interface", "relation", "flow", "attribute"];
    case "comparison":
      return ["entity", "similarity", "difference", "tradeoff", "relation"];
    case "algorithm":
      return ["goal", "input", "output", "step", "invariant", "complexity", "relation"];
    case "theory":
      return ["principle", "construct", "relation", "application", "example", "attribute"];
    case "concept":
      return ["definition", "attribute", "relation", "example", "action"];
    case "mixed":
    default:
      return ["entity", "definition", "attribute", "relation", "action", "flow", "group", "example", "component", "stage"];
  }
};

const normalizeShape = (raw: string): Shape => {
  const value = raw.trim().toLowerCase();
  return (SHAPES as readonly string[]).includes(value) ? (value as Shape) : "mixed";
};

const chunkText = (input: string, maxChars: number) => {
  const chunks: string[] = [];
  const lines = input.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  let buffer = "";
  for (const line of lines) {
    if (!buffer) {
      buffer = line;
      continue;
    }
    if ((buffer + "\n\n" + line).length > maxChars) {
      chunks.push(buffer);
      buffer = line;
    } else {
      buffer += "\n\n" + line;
    }
  }
  if (buffer) chunks.push(buffer);
  return chunks.length > 0 ? chunks : [input];
};

const getBlockKey = (block: any) => {
  if (!block || typeof block !== "object") return "";
  const type = String(block.type || "").toLowerCase();
  const core =
    String(block.entity || "") +
    "|" +
    String(block.name || "") +
    "|" +
    String(block.from || "") +
    "|" +
    String(block.to || "") +
    "|" +
    String(block.action || "") +
    "|" +
    String(block.text || "");
  return `${type}|${core}`.toLowerCase().replace(/\s+/g, " ").trim();
};

const fallbackExtractBlocks = (input: string) => {
  const text = input.replace(/\s+/g, " ").trim();
  if (!text) return [];
  const sentences = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  const firstLine = input.split(/\n+/).map((l) => l.trim()).find(Boolean) || "";
  const topicGuess = (firstLine || sentences[0] || "Topic")
    .replace(/[:\-–—].*$/, "")
    .split(" ")
    .slice(0, 6)
    .join(" ")
    .trim();

  const blocks: any[] = [];
  const flowSteps: { order: number; action: string }[] = [];
  let lastEntity = topicGuess || "Topic";

  const relationVerbs = [
    "contains",
    "uses",
    "depends on",
    "produces",
    "transforms into",
    "affects",
    "linked to",
    "includes",
  ];

  const pickSubject = (sentence: string) => {
    const words = sentence.split(" ").slice(0, 6).join(" ");
    const cleaned = words.replace(/[^a-zA-Z0-9\s_-]/g, "").trim();
    return cleaned.length >= 3 ? cleaned : lastEntity;
  };

  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const isFlow =
      /\b(step|first|then|next|finally|after|before|in order)\b/.test(lower);
    if (isFlow) {
      flowSteps.push({ order: flowSteps.length + 1, action: sentence });
      continue;
    }

    const defMatch = sentence.match(/^(.+?)\s+(is|are|means|refers to)\s+(.+)$/i);
    if (defMatch) {
      const entity = defMatch[1].trim();
      const textDef = defMatch[3].trim();
      if (entity && textDef && textDef.length <= 160) {
        blocks.push({ type: "definition", entity, text: textDef });
        lastEntity = entity;
        continue;
      }
    }

    const relVerb = relationVerbs.find((verb) => lower.includes(` ${verb} `));
    if (relVerb) {
      const parts = sentence.split(new RegExp(`\\b${relVerb}\\b`, "i"));
      const from = parts[0] ? parts[0].trim() : pickSubject(sentence);
      const to = parts[1] ? parts[1].trim() : "";
      if (to && to.length <= 120) {
        blocks.push({ type: "relation", from: from || lastEntity, relation: relVerb, to });
        lastEntity = from || lastEntity;
        continue;
      }
    }

    const attrMatch = sentence.match(/^(.+?)\s+(has|have|with)\s+(.+)$/i);
    if (attrMatch) {
      const entity = attrMatch[1].trim() || lastEntity;
      const value = attrMatch[3].trim();
      if (value && value.length <= 120) {
        blocks.push({ type: "attribute", entity, name: attrMatch[2].toLowerCase(), value });
        lastEntity = entity;
        continue;
      }
    }

    const actionMatch = sentence.match(/^(.+?)\s+(applies|computes|converts|calculates|maps|samples|updates|renders|generates)\s+(.+)$/i);
    if (actionMatch) {
      const actor = actionMatch[1].trim() || lastEntity;
      const action = actionMatch[2].toLowerCase();
      const target = actionMatch[3].trim();
      if (target.length <= 120) {
        blocks.push({ type: "action", actor, action, target });
      }
      lastEntity = actor;
      continue;
    }
  }

  if (flowSteps.length > 0) {
    blocks.push({ type: "flow", steps: flowSteps });
  }

  if (blocks.length === 0 && sentences[0]) {
    blocks.push({ type: "definition", entity: topicGuess || "Topic", text: sentences[0] });
  }

  return blocks;
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    const question = typeof body?.question === "string" ? body.question.trim() : "";
    const history = Array.isArray(body?.history) ? body.history : [];
    const layeredExplain = Boolean(body?.layeredExplain);
    const includeDiagram = Boolean(body?.includeDiagram);
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text) {
      return NextResponse.json({ error: "Selected text is required." }, { status: 400 });
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
    if (aiConfig.provider === "openai" && !aiConfig.openaiApiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is required when provider is OpenAI." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
      return NextResponse.json(
        { error: "Ollama base URL is required when provider is Ollama." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "perplexity" && !aiConfig.perplexityApiKey) {
      return NextResponse.json(
        { error: "Perplexity API key is required when provider is Perplexity." },
        { status: 400 }
      );
    }
    if (aiConfig.provider === "anthropic" && !aiConfig.anthropicApiKey) {
      return NextResponse.json(
        { error: "Anthropic API key is required when provider is Anthropic." },
        { status: 400 }
      );
    }

    const systemPrompt =
      "You explain technical text clearly and briefly. Use markdown. Use **bold** for key terms and --- for section separators when needed. Do not add roleplay headings or persona phrases like 'MiddleSchool Math Teacher Mode Activated'. Keep the tone neutral and professional.";
    const userPrompt = question
      ? `Context: ${context}\n\nSelected text:\n${text}\n\nUser question:\n${question}\n\nAnswer the user question based on the selected text.`
      : context
      ? `Context: ${context}\n\nSelected text:\n${text}\n\nExplain this selected text in a clear way.`
      : `Selected text:\n${text}\n\nExplain this selected text in a clear way.`;

    if (layeredExplain) {
      const aiConfigWithTimeout: AiRequestConfig = {
        ...aiConfig,
        requestTimeoutMs: Math.max(aiConfig.requestTimeoutMs || 0, 90000),
      };

      const detectorPrompt =
        "You are a classifier for text understanding.\n\n" +
        "Detect domain and knowledge shape.\n\n" +
        "Return JSON only with this schema:\n" +
        "{\n" +
        "  \"domain\": \"graphics|math|philosophy|os|ai|biology|business|education|general\",\n" +
        "  \"shape\": \"concept|pipeline|workflow|architecture|system|comparison|algorithm|theory|mixed\",\n" +
        "  \"confidence\": 0-1,\n" +
        "  \"evidence\": { \"phrases\": [\"...\"] }\n" +
        "}\n\n" +
        "Rules:\n" +
        "- Choose the closest domain; use general if unclear.\n" +
        "- Choose the most dominant shape; use mixed if multiple compete.\n" +
        "- Evidence phrases must be short spans from the text.\n\n" +
        "Text:\n" +
        (context ? `Context: ${context}\n\n` : "") +
        text;

      const detectorResponse = await runChatWithProvider(
        aiConfigWithTimeout,
        [
          { role: "system", content: "You output valid JSON only." },
          { role: "user", content: detectorPrompt },
        ],
        { temperature: 0 }
      );
      if (!detectorResponse.ok) {
        return NextResponse.json(
          {
            error: `${detectorResponse.provider === "openai" ? "OpenAI" : detectorResponse.provider === "ollama" ? "Ollama" : detectorResponse.provider === "perplexity" ? "Perplexity" : detectorResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${detectorResponse.model || aiConfig.model}).`,
            details: detectorResponse.details || "Provider call failed.",
          },
          { status: 502 }
        );
      }

      const detectionRaw = detectorResponse.content?.trim() || "";
      let detection: any = null;
      try {
        const extracted = extractJsonPayload(detectionRaw);
        detection = parseJsonWithRecovery(extracted);
      } catch {
        detection = null;
      }
      const domain = String(detection?.domain || "general").trim().toLowerCase();
      const shape = normalizeShape(String(detection?.shape || "mixed"));
      const blockSet = getBlockSetForShape(shape);

      const extractionPrompt =
        "You extract compact, source-grounded building blocks from text.\n\n" +
        "Use ONLY these block types:\n" +
        blockSet.map((b) => `- ${b}`).join("\n") +
        "\n\n" +
        "Return JSON only as an array of blocks. Each block must be source-grounded and compact.\n" +
        "Schema guidelines by type:\n" +
        "- definition: { type: \"definition\", entity: \"...\", text: \"...\" }\n" +
        "- attribute: { type: \"attribute\", entity: \"...\", name: \"...\", value?: \"...\" }\n" +
        "- relation: { type: \"relation\", from: \"...\", relation: \"...\", to: \"...\" }\n" +
        "- action: { type: \"action\", actor: \"...\", action: \"...\", target?: \"...\" }\n" +
        "- stage: { type: \"stage\", name: \"...\", input?: \"...\", output?: \"...\", transform?: \"...\" }\n" +
        "- flow: { type: \"flow\", steps: [ { order: number, action: \"...\" } ] }\n" +
        "- component: { type: \"component\", name: \"...\", responsibility?: \"...\" }\n" +
        "- interface: { type: \"interface\", component: \"...\", interface: \"...\" }\n" +
        "- dependency: { type: \"dependency\", from: \"...\", to: \"...\" }\n" +
        "- similarity/difference/tradeoff: { type: \"similarity\", entities: [\"...\"], text: \"...\" } etc.\n" +
        "- principle/construct/application/goal/input/output/step/invariant/complexity/example/entity/group: keep fields minimal.\n\n" +
        "Rules:\n" +
        "- Do not invent facts.\n" +
        "- Prefer concrete entities and actions.\n" +
        "- Keep each block to one short line of content.\n" +
        "- If flow is present in the text, include a flow block.\n\n" +
        "Context:\n" +
        `Domain: ${domain}\n` +
        `Shape: ${shape}\n\n` +
        "Text:\n" +
        (context ? `Context: ${context}\n\n` : "") +
        text;

      const extractionResponse = await runChatWithProvider(
        aiConfigWithTimeout,
        [
          { role: "system", content: "You output valid JSON only." },
          { role: "user", content: extractionPrompt },
        ],
        { temperature: 0.1 }
      );
      if (!extractionResponse.ok) {
        return NextResponse.json(
          {
            error: `${extractionResponse.provider === "openai" ? "OpenAI" : extractionResponse.provider === "ollama" ? "Ollama" : extractionResponse.provider === "perplexity" ? "Perplexity" : extractionResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${extractionResponse.model || aiConfig.model}).`,
            details: extractionResponse.details || "Provider call failed.",
          },
          { status: 502 }
        );
      }

      const blocksRaw = extractionResponse.content?.trim() || "[]";
      let blocks: any[] = [];
      try {
        const extracted = extractJsonPayload(blocksRaw);
        const parsed = parseJsonWithRecovery(extracted);
        blocks = Array.isArray(parsed) ? parsed : [];
      } catch {
        blocks = [];
      }

      if (blocks.length === 0) {
        const repairPrompt =
          "You are a JSON repair assistant.\n\n" +
          "Convert the following content into a valid JSON array of blocks.\n\n" +
          "Rules:\n" +
          "- Output JSON only (no markdown).\n" +
          "- Use double quotes.\n" +
          "- Remove trailing commas.\n" +
          "- If a block is unclear, drop it rather than inventing.\n\n" +
          "Content to repair:\n" +
          blocksRaw;
        const repairResponse = await runChatWithProvider(
          aiConfigWithTimeout,
          [
            { role: "system", content: "You output valid JSON only." },
            { role: "user", content: repairPrompt },
          ],
          { temperature: 0 }
        );
        if (repairResponse.ok && repairResponse.content) {
          try {
            const extracted = extractJsonPayload(repairResponse.content.trim());
            const parsed = parseJsonWithRecovery(extracted);
            blocks = Array.isArray(parsed) ? parsed : [];
          } catch {
            blocks = [];
          }
        }
      }

      if (blocks.length === 0) {
        const retryText = text.length > 2000 ? text.slice(0, 2000) : text;
        const retryPrompt =
          "You extract compact, source-grounded building blocks from text.\n\n" +
          "Use ONLY these block types:\n" +
          blockSet.map((b) => `- ${b}`).join("\n") +
          "\n\n" +
          "Return JSON only as an array of blocks. Include at least 8 blocks when possible.\n" +
          "Each block must be grounded in the source text.\n\n" +
          "Text:\n" +
          (context ? `Context: ${context}\n\n` : "") +
          retryText;
        const retryResponse = await runChatWithProvider(
          aiConfigWithTimeout,
          [
            { role: "system", content: "You output valid JSON only." },
            { role: "user", content: retryPrompt },
          ],
          { temperature: 0.1 }
        );
        if (retryResponse.ok && retryResponse.content) {
          try {
            const extracted = extractJsonPayload(retryResponse.content.trim());
            const parsed = parseJsonWithRecovery(extracted);
            blocks = Array.isArray(parsed) ? parsed : [];
          } catch {
            blocks = [];
          }
        }
      }

      if (blocks.length === 0) {
        const chunks = chunkText(text, 1800);
        const collected: any[] = [];
        for (const chunk of chunks) {
          const chunkPrompt =
            "You extract compact, source-grounded building blocks from text.\n\n" +
            "Use ONLY these block types:\n" +
            blockSet.map((b) => `- ${b}`).join("\n") +
            "\n\n" +
            "Return JSON only as an array of blocks. Include at least 6 blocks when possible.\n" +
            "Each block must be grounded in the source text.\n\n" +
            "Text:\n" +
            (context ? `Context: ${context}\n\n` : "") +
            chunk;
          const chunkResponse = await runChatWithProvider(
            aiConfigWithTimeout,
            [
              { role: "system", content: "You output valid JSON only." },
              { role: "user", content: chunkPrompt },
            ],
            { temperature: 0.1 }
          );
          if (!chunkResponse.ok || !chunkResponse.content) continue;
          try {
            const extracted = extractJsonPayload(chunkResponse.content.trim());
            const parsed = parseJsonWithRecovery(extracted);
            if (Array.isArray(parsed)) {
              collected.push(...parsed);
            }
          } catch {
            // ignore bad chunk
          }
        }
        const deduped = new Map<string, any>();
        for (const block of collected) {
          const key = getBlockKey(block);
          if (!key || deduped.has(key)) continue;
          deduped.set(key, block);
        }
        blocks = Array.from(deduped.values());
      }

      if (blocks.length === 0) {
        blocks = fallbackExtractBlocks(text);
      }

      if (blocks.length === 0) {
        return NextResponse.json(
          {
            error: "Block extraction failed.",
            details:
              "Extractor returned an empty block set after repair and chunked extraction. Try a shorter input or split into sections.",
          },
          { status: 502 }
        );
      }

      const explanationPrompt =
        "Explain the text using only the provided blocks. Be concise, clear, and avoid speculation.";

      const explanationResponse = await runChatWithProvider(
        aiConfigWithTimeout,
        [
          { role: "system", content: explanationPrompt },
          {
            role: "user",
            content:
              "Blocks JSON:\n" +
              JSON.stringify(blocks, null, 2) +
              "\n\nRender the explanation now.",
          },
        ],
        { temperature: 0.1 }
      );
      if (!explanationResponse.ok) {
        return NextResponse.json(
          {
            error: `${explanationResponse.provider === "openai" ? "OpenAI" : explanationResponse.provider === "ollama" ? "Ollama" : explanationResponse.provider === "perplexity" ? "Perplexity" : explanationResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${explanationResponse.model || aiConfig.model}).`,
            details: explanationResponse.details || "Provider call failed.",
          },
          { status: 502 }
        );
      }

      const explanation = explanationResponse.content?.trim() || "";
      if (!explanation) {
        return NextResponse.json({ error: "Provider returned an empty response." }, { status: 502 });
      }

      let diagramText = "";
      if (includeDiagram) {
        const diagramPrompt =
          "You are a diagram planner.\n\n" +
          "Convert the following structured building blocks into a compact console-friendly meaning tree.\n\n" +
          "Return this schema exactly:\n" +
          "{\n" +
          "  \"type\": \"hierarchy\",\n" +
          "  \"root\": {\n" +
          "    \"label\": \"string\",\n" +
          "    \"children\": [\n" +
          "      {\n" +
          "        \"label\": \"string\",\n" +
          "        \"children\": [ ... ]\n" +
          "      }\n" +
          "    ]\n" +
          "  }\n" +
          "}\n\n" +
          "Rules:\n" +
          "- Use the blocks as the only source of truth.\n" +
          "- Prefer concrete entities as nodes.\n" +
          "- Render attributes as leaf labels prefixed with \"attr: \".\n" +
          "- Render relations as \"verb -> target\".\n" +
          "- Render actions/transformations as \"transforms -> X into Y\" or \"action -> target\".\n" +
          "- Only add a Flow branch if blocks explicitly include flow steps.\n" +
          "- Keep the tree compact and readable.\n" +
          "- Output valid JSON only.\n\n" +
          "Blocks JSON:\n" +
          JSON.stringify(blocks, null, 2);

        const diagramResponse = await runChatWithProvider(
          aiConfigWithTimeout,
          [
            { role: "system", content: "You output valid JSON only." },
            { role: "user", content: diagramPrompt },
          ],
          { temperature: 0.1 }
        );
        if (diagramResponse.ok && diagramResponse.content) {
          try {
            const extracted = extractJsonPayload(diagramResponse.content.trim());
            const parsed = parseJsonWithRecovery(extracted);
            const blueprint = sanitizeBlueprint(parsed as DiagramBlueprint);
            if (blueprint) {
              const normalized = normalizeDiagramLabels(blueprint);
              diagramText = renderAsciiTree(normalized);
            }
          } catch {
            diagramText = "";
          }
        }
      }

      return NextResponse.json({
        explanation,
        diagramText,
        blocks,
        detection: {
          domain,
          shape,
          confidence: typeof detection?.confidence === "number" ? detection.confidence : undefined,
          evidence: detection?.evidence || undefined,
        },
        blockSet,
        model: explanationResponse.model,
        provider: explanationResponse.provider,
      });
    }

    const normalizedHistory: ChatMessage[] = history
      .filter(
        (m: any) =>
          m &&
          (m.role === "user" || m.role === "assistant") &&
          typeof m.content === "string" &&
          m.content.trim().length > 0
      )
      .slice(-8)
      .map((m: any) => ({ role: m.role, content: String(m.content).trim() }));

    const aiResponse = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        ...normalizedHistory,
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1 }
    );
    if (!aiResponse.ok) {
      return NextResponse.json(
        {
          error: `${aiResponse.provider === "openai" ? "OpenAI" : aiResponse.provider === "ollama" ? "Ollama" : aiResponse.provider === "perplexity" ? "Perplexity" : aiResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${aiResponse.model || aiConfig.model}).`,
          details: aiResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }
    const explanation = aiResponse.content?.trim();

    if (!explanation) {
      return NextResponse.json({ error: "Provider returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ explanation, model: aiResponse.model, provider: aiResponse.provider });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to get AI explanation.",
        details: message,
      },
      { status: 500 }
    );
  }
}
