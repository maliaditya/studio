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

const buildJsonRepairPrompt = (raw: string) =>
  [
    "You are a JSON repair assistant.",
    "Fix the following content into valid JSON that matches this schema exactly:",
    "{",
    '  "type": "hierarchy",',
    '  "root": {',
    '    "label": "string",',
    '    "children": [',
    '      {',
    '        "label": "string",',
    '        "children": [ ... ]',
    "      }",
    "    ]",
    "  }",
    "}",
    "",
    "Rules:",
    "- Output JSON only (no markdown, no commentary).",
    "- Use double quotes for all keys and string values.",
    "- Remove trailing commas.",
    "- If the content is incomplete, best-effort repair it into the schema above.",
    "",
    "Content to repair:",
    raw,
  ].join("\n");

const ALLOWED_SECTION_LABELS = new Set([
  "Purpose",
  "Contains",
  "Uses",
  "Produces",
  "Linked To",
  "Depends On",
  "Flow",
  "Properties",
  "Behavior",
  "Examples",
]);

const GENERIC_WRAPPER_LABELS = new Set([
  "description",
  "details",
  "detail",
  "overview",
  "general info",
  "general information",
  "summary",
  "aspects",
  "aspect",
  "features",
  "feature",
  "notes",
  "misc",
  "categories",
  "category",
  "groups",
  "group",
  "items",
  "item",
  "types",
  "type",
  "parts",
  "role",
  "relations",
]);

const RELATION_BRANCH_LABELS = new Set([
  "Contains",
  "Uses",
  "Produces",
  "Linked To",
  "Depends On",
]);

const normalizeFlowStepLabel = (label: string, index: number) => {
  if (/^step\s+\d+\s*:/i.test(label)) {
    return label;
  }
  return `Step ${index + 1}: ${label}`;
};

const dedupeByLabel = (nodes: NonNullable<DiagramBlueprint["root"]["children"]>) => {
  const seen = new Set<string>();
  return nodes.filter((node) => {
    const key = node.label.trim().toLowerCase();
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const refineNode = (node: DiagramBlueprint["root"], depth = 0): DiagramBlueprint["root"] | null => {
  const label = node.label.trim();
  if (!label) return null;

  const rawChildren = Array.isArray(node.children) ? node.children : [];
  const refinedChildren = dedupeByLabel(
    rawChildren
      .map((child) => refineNode(child, depth + 1))
      .filter(Boolean) as NonNullable<DiagramBlueprint["root"]["children"]>
  );

  if (depth > 0 && GENERIC_WRAPPER_LABELS.has(label.toLowerCase())) {
    if (refinedChildren.length === 1) {
      return refinedChildren[0];
    }
    if (refinedChildren.length > 1) {
      return {
        label,
        children: refinedChildren,
      };
    }
    return null;
  }

  if (ALLOWED_SECTION_LABELS.has(label) && refinedChildren.length === 0) {
    return null;
  }

  if (label === "Flow") {
    const flowChildren = refinedChildren.map((child, index) => ({
      ...child,
      label: normalizeFlowStepLabel(child.label, index),
    }));
    return flowChildren.length > 0 ? { label, children: flowChildren } : null;
  }

  if (RELATION_BRANCH_LABELS.has(label) && refinedChildren.length === 0) {
    return null;
  }

  if (refinedChildren.length === 1 && !ALLOWED_SECTION_LABELS.has(label) && depth > 0) {
    const onlyChild = refinedChildren[0];
    if (!ALLOWED_SECTION_LABELS.has(onlyChild.label)) {
      return {
        label,
        children: [onlyChild],
      };
    }
  }

  return refinedChildren.length > 0 ? { label, children: refinedChildren } : { label };
};

const refineMeaningTree = (blueprint: DiagramBlueprint): DiagramBlueprint | null => {
  const root = refineNode(blueprint.root);
  if (!root) return null;
  return {
    type: "hierarchy",
    root,
  };
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const blocks = Array.isArray(body?.blocks) ? body.blocks : null;
    const context = typeof body?.context === "string" ? body.context.trim() : "";
    const structuredDiagram = Boolean(body?.structuredDiagram);
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text && !blocks?.length) {
      return NextResponse.json({ error: "Explanation text is required." }, { status: 400 });
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
    const aiConfigWithTimeout: AiRequestConfig = {
      ...aiConfig,
      requestTimeoutMs: Math.max(aiConfig.requestTimeoutMs || 0, 90000),
    };

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

    const trimmedText = text.length > 3000 ? `${text.slice(0, 3000)}…` : text;

    const plannerPrompt =
      "You are a diagram planner.\n\n" +
      "Convert the following content into a compact console-friendly meaning tree.\n\n" +
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
      "Goal:\n" +
      "- Build a meaning tree, not just a category tree\n" +
      "- Categories are for organization\n" +
      "- Relations are for understanding\n" +
      "- Flow is for process\n\n" +
      "Allowed optional sub-branches for a concept node:\n" +
      "- Purpose\n" +
      "- Contains\n" +
      "- Uses\n" +
      "- Produces\n" +
      "- Linked To\n" +
      "- Depends On\n" +
      "- Flow\n" +
      "- Properties\n" +
      "- Behavior\n" +
      "- Examples\n\n" +
      "Rules:\n" +
      "- Do not explain\n" +
      "- Do not summarize in paragraphs\n" +
      "- Infer the main technical concept as the root\n" +
      "- Preserve specific technical terms from the source whenever possible\n" +
      "- Prefer source-grounded relations over generic grouping\n" +
      "- Do not only group nouns into categories\n" +
      "- Only add optional sub-branches when they clearly fit the node\n" +
      "- Do not force the same labels under every node\n" +
      "- Keep each leaf to one short line\n" +
      "- No paragraphs\n" +
      "- If the source describes a workflow, create a separate Flow branch with ordered steps\n" +
      "- Prefer direct relation leaves such as contains → X, uses → X, produces → X, linked to → X, depends on → X\n" +
      "- Avoid vague umbrella nodes unless clearly justified by the source\n" +
      "- Avoid filler nodes such as Description, Details, Aspects, Overview, Misc, Parts, Role, Relations\n" +
      "- Preserve hierarchy without erasing source meaning\n" +
      "- Keep the tree shallow, compact, and readable in console form\n" +
      "- Every node should add distinct meaning\n" +
      "- Output valid JSON only\n\n" +
      "Content:\n" +
      (context ? `Context: ${context}\n\n` : "") +
      trimmedText;

    const structuredDiagramPrompt =
      "You are a console-diagram planner.\n\n" +
      "Convert the provided processed explanation into a compact, console-friendly meaning tree.\n" +
      "Preserve source terminology. Prefer meaningful relationships over generic grouping.\n\n" +
      "Return JSON only with this schema:\n" +
      "{\n" +
      "  \"type\": \"hierarchy\",\n" +
      "  \"root\": {\n" +
      "    \"label\": \"string\",\n" +
      "    \"children\": [\n" +
      "      { \"label\": \"string\", \"children\": [ ... ] }\n" +
      "    ]\n" +
      "  }\n" +
      "}\n\n" +
      "Strict rules:\n" +
      "- Prefer relations over grouping using: uses ->, produces ->, compares ->, transforms ->, applies ->, smooths ->, defines ->, stores ->, samples ->.\n" +
      "- Use \"contains\" only for true structural ownership.\n" +
      "- Always extract the core rule if present (comparison/condition/equation/test) as its own leaf.\n" +
      "- Detect stages/passes and represent as \"Pass 1\", \"Pass 2\" when present.\n" +
      "- Flow must be a single flat \"Flow\" node with Step 1, Step 2… and never nested.\n" +
      "- Preserve source-specific terms.\n" +
      "- Keep the diagram compact and avoid redundant repetition.\n" +
      "- Output valid JSON only.\n\n" +
      "Content:\n" +
      (context ? `Context: ${context}\n\n` : "") +
      trimmedText;

    const blocksPlannerPrompt =
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
      JSON.stringify(blocks || [], null, 2);

    const plannerMessages: ChatMessage[] = [
      { role: "system", content: "You output valid JSON only." },
      {
        role: "user",
        content: blocks?.length
          ? blocksPlannerPrompt
          : structuredDiagram
          ? structuredDiagramPrompt
          : plannerPrompt,
      },
    ];

    const plannerResponse = await runChatWithProvider(aiConfigWithTimeout, plannerMessages, { temperature: 0.1 });
    if (!plannerResponse.ok) {
      return NextResponse.json(
        {
          error: `${plannerResponse.provider === "openai" ? "OpenAI" : plannerResponse.provider === "ollama" ? "Ollama" : plannerResponse.provider === "perplexity" ? "Perplexity" : plannerResponse.provider === "anthropic" ? "Anthropic" : "AI"} call failed (model ${plannerResponse.model || aiConfig.model}).`,
          details: plannerResponse.details || "Provider call failed.",
        },
        { status: 502 }
      );
    }

    const plannerRaw = plannerResponse.content?.trim();
    if (!plannerRaw) {
      return NextResponse.json({ error: "Provider returned an empty blueprint." }, { status: 502 });
    }

    let blueprint: DiagramBlueprint | null = null;
    let parseError: string | null = null;
    try {
      const extracted = extractJsonPayload(plannerRaw);
      const parsed = parseJsonWithRecovery(extracted);
      blueprint = sanitizeBlueprint(parsed);
    } catch (error) {
      parseError = error instanceof Error ? error.message : "Unknown error";
    }

    if (!blueprint) {
      const repairMessages: ChatMessage[] = [
        { role: "system", content: "You output valid JSON only." },
        { role: "user", content: buildJsonRepairPrompt(plannerRaw || "") },
      ];
      const repairResponse = await runChatWithProvider(aiConfigWithTimeout, repairMessages, { temperature: 0 });
      if (repairResponse.ok && repairResponse.content) {
        try {
          const extracted = extractJsonPayload(repairResponse.content.trim());
          const parsed = parseJsonWithRecovery(extracted);
          blueprint = sanitizeBlueprint(parsed);
        } catch (error) {
          parseError = error instanceof Error ? error.message : "Unknown error";
        }
      }
    }

    if (!blueprint) {
      return NextResponse.json(
        {
          error: "Failed to parse diagram blueprint JSON.",
          details: parseError || "Provider returned invalid JSON.",
        },
        { status: 502 }
      );
    }

    if (!blueprint) {
      return NextResponse.json(
        {
          diagramText: "Diagram error: planner JSON did not match the expected hierarchy schema.",
          blueprint: null,
          model: plannerResponse.model,
          provider: plannerResponse.provider,
        },
        { status: 200 }
      );
    }

    const refinedBlueprint = refineMeaningTree(blueprint) || blueprint;
    const normalizedBlueprint = normalizeDiagramLabels(refinedBlueprint);
    const diagramText = renderAsciiTree(normalizedBlueprint);
    return NextResponse.json({
      diagramText,
      blueprint: normalizedBlueprint,
      model: plannerResponse.model,
      provider: plannerResponse.provider,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to create diagram.",
        details: message,
      },
      { status: 500 }
    );
  }
}
