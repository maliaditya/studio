import { runChatWithProvider, type ChatMessage } from "@/lib/ai/providerRouter";
import { toPlainText } from "@/lib/shiv/normalize";
import type { ShivEvidence, ShivLanguage, ShivQuery } from "@/lib/shiv/types";
import type { AiRequestConfig } from "@/types/ai";

const languageInstruction = (language: ShivLanguage) => {
  if (language === "hindi") return "Reply in Hindi only.";
  if (language === "hinglish") return "Reply in Hinglish only (Roman script).";
  if (language === "english") return "Reply in English only.";
  return "Reply in the same language as the user question. If unsure, use English.";
};

const buildEvidenceBundle = (evidence: ShivEvidence[]) =>
  evidence.slice(0, 12).map((item, index) => ({
    eid: `E${index + 1}`,
    domain: item.domain,
    name: item.name,
    content: toPlainText(String(item.text || "")).slice(0, 900),
    source: String(item.payload?.source || ""),
  }));

export const runShivAiFallback = async (
  query: ShivQuery,
  evidence: ShivEvidence[],
  aiConfig: AiRequestConfig,
  options?: { languageInstructionOverride?: string }
): Promise<
  | { ok: true; answer: string; provider: string; model: string }
  | { ok: false; error: string; details?: string }
> => {
  if (!evidence.length) {
    return { ok: false, error: "No evidence available for AI fallback." };
  }

  const bundle = buildEvidenceBundle(evidence);

  const systemPrompt = `You are Astra, a grounded assistant for Dock app.
You must answer ONLY using the provided evidence JSON.
Rules:
1. Do not invent facts.
2. If evidence is insufficient, say what is missing.
3. Mention at least one evidence entity name in the answer.
4. Output plain text only (no markdown bullets or formatting symbols).
5. Keep answer specific and concise.
6. Never explain JSON structure, field names, IDs, or metadata unless user explicitly asks for debug/structure.
7. Answer the user question directly first. Do not summarize all evidence unless asked.
8. Never include evidence IDs (E1, E2...) in the answer.
${languageInstruction(query.language)}
${options?.languageInstructionOverride ? `\n${options.languageInstructionOverride}` : ""}`;

  const messages: ChatMessage[] = [
    { role: "system", content: systemPrompt },
    ...query.history.slice(-6).map((message) => ({ role: message.role, content: message.content })),
    {
      role: "user",
      content: `Question: ${query.question}\n\nEvidence:\n${JSON.stringify(bundle, null, 2)}`,
    },
  ];

  const result = await runChatWithProvider(aiConfig, messages, { temperature: 0.1 });

  if (!result.ok) {
    return {
      ok: false,
      error: "AI fallback provider call failed.",
      details: result.details,
    };
  }

  const answer = toPlainText(result.content || "");
  if (!answer) {
    return { ok: false, error: "AI fallback returned empty answer." };
  }

  return {
    ok: true,
    answer,
    provider: result.provider,
    model: result.model,
  };
};
