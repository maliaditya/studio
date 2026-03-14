import { NextResponse } from "next/server";
import { getAiConfigFromSettings } from "@/lib/ai/config";
import { runChatWithProvider } from "@/lib/ai/providerRouter";
import type { AiRequestConfig } from "@/types/ai";

export const dynamic = "force-dynamic";

const extractJson = (value: string) => {
  const text = String(value || "").trim();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    const match = text.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
};

export async function POST(request: Request) {
  try {
    const desktopHeader = request.headers.get("x-studio-desktop");
    const isDesktopRuntime = desktopHeader === "1";
    const body = await request.json().catch(() => ({}));
    const text = typeof body?.text === "string" ? body.text.trim() : "";
    const aiConfigInput = (body?.aiConfig || {}) as Partial<AiRequestConfig>;

    if (!text) {
      return NextResponse.json({ error: "Bothering text is required." }, { status: 400 });
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

    const systemPrompt = [
      "You are a bothering root-cause finder.",
      "A real bothering is grounded in current life, presently unresolved, concrete enough to work on, and not merely an urge, desire, fantasy, identity statement, or moralized should/ought/need claim.",
      "You must determine whether the input is an END bothering or a MEANS bothering.",
      "END means it points directly to the real problem that needs resolution. Once solved, the bothering disappears.",
      "MEANS means the statement is being used to point toward something else, such as a desired tool, knowledge, object, or vague frustration, while the real underlying problem is still hidden.",
      "A real bothering must describe the end-state problem or the actual unresolved condition, not just a proposed means, tool, object, strategy, or desire.",
      "You must explicitly distinguish between means and end.",
      "You must also classify the root blocker as external, mismatch, constraint, or unclear.",
      "External means the friction mainly comes from the environment, events, other people, or body-world interaction.",
      "External botherings should be solved with the interaction method: change the interaction with the environment.",
      "Mismatch means the friction mainly comes from a knowledge, understanding, or skill gap.",
      "Mismatch botherings should be solved with the learning method: increase capability through study and practice.",
      "Constraint means the friction mainly comes from time, money, hardware, tools, access, policy, or structural limitation.",
      "Constraint botherings should be solved with the resource method: use resource strategy to remove or work around the limitation.",
      "Classify based on the root blocker, not the emotion, not the proposed solution, and not the desired outcome.",
      "Examples of means: car, job title, app, relationship, money amount, course, tool, shortcut, plan, purchase, status, specific object.",
      "Examples of end-level botherings: transportation is unreliable, income is unstable, work is blocked, health is declining, there is no quiet place to study, deadlines are being missed.",
      "If the sentence is a means, classify it as invalid unless the underlying end-state bothering is clearly stated.",
      "Reject sentences that are mainly desire, urge, wish, fantasy, vague self-judgment, abstract philosophy, or future-only aspiration.",
      "When the sentence is invalid or incomplete, generate 3 to 5 clarifying questions that help the user move from means, desire, or vagueness toward the concrete end-level bothering.",
      "The questions should ask what outcome the user actually wants, what is specifically blocked, and whether the block comes from environment, capability gap, or constraint.",
      "Also generate one best next question for immediate chat use.",
      "The next question should ask about the actual blocked condition, not ask for a solution.",
      "If the bothering is END, provide the real root problem and a short resolution strategy.",
      "If valid, rewrite into neutral ego-less grounded wording.",
      "Provide 2 to 4 short options when possible.",
      "Return strict JSON only.",
    ].join(" ");

    const userPrompt = `
Analyze this bothering:
"${text}"

Decision rules:
- "valid" means it is a current grounded bothering.
- "needs_rephrase" means there is a real bothering here but wording is ego-heavy, vague, or distorted.
- "invalid" means it is not a bothering.
- bothering_classification must be one of: end, means, unclear
- classification must be one of: bothering, desire, urge, goal, ought, unclear
- means_vs_end must be one of: means, end, mixed, unclear
- bothering_type must be one of: external, mismatch, constraint, unclear
- solution_method must be one of: interaction, learning, resource, unclear
- If the sentence is mostly a means, mark it invalid and infer the likely end-level bothering.
- Before classifying bothering_type, determine the attempted action, the root blocker, and whether that blocker is mainly environment/interference, capability gap, or resource/structural limitation.
- For MEANS, do not solve the problem yet. Explain why it is a means and ask clarifying questions that uncover the END bothering.
- For END, identify the actual root problem, the correct solution method, and give a short resolution strategy.
- Map types to methods:
  - external -> interaction
  - mismatch -> learning
  - constraint -> resource
- recommendedMethods should match the diagnosed type:
  - interaction: communication, boundary setting, changing environment, adjusting schedule, ignoring or detaching when necessary
  - learning: study, practice, experiment, break problem into smaller pieces, build mental models
  - resource: acquire resources, save money, borrow equipment, use alternatives, delay execution, optimize time
- options must be short grounded ego-less phrasings, no first-person identity language, no motivational fluff.
- options must always express the end-level bothering, never the means.
- Never output options like "a car is desired", "a vehicle is needed", "money is wanted", "a course is needed", "a job is needed".
- Prefer concrete present-state formulations such as "Transportation is unreliable.", "Daily travel is blocked.", "Income is unstable.", "Study material is unavailable."
- If invalid, explain why briefly and provide up to 2 suggestions for converting it into a real bothering if possible.
- If invalid or incomplete, clarifyingQuestions must contain 3 to 5 probing questions.
- If invalid or incomplete, nextQuestion should be a sharp follow-up such as asking what problem this is meant to solve, what is currently blocked, or what concrete friction is happening now.
- nextQuestion should be under 20 words and directly usable in chat.

Return JSON with exactly this shape:
{
  "status": "valid" | "needs_rephrase" | "invalid",
  "bothering_classification": "end" | "means" | "unclear",
  "classification": "bothering" | "desire" | "urge" | "goal" | "ought" | "unclear",
  "means_vs_end": "means" | "end" | "mixed" | "unclear",
  "bothering_type": "external" | "mismatch" | "constraint" | "unclear",
  "solutionMethod": "interaction" | "learning" | "resource" | "unclear",
  "recommendedMethods": ["method 1", "method 2"],
  "rootProblem": "short description or empty string",
  "resolutionStrategy": "short strategy or empty string",
  "reason": "short reason",
  "options": ["option 1", "option 2"],
  "suggestions": ["suggestion 1"],
  "clarifyingQuestions": ["question 1", "question 2"],
  "bestOption": "best option or empty string",
  "nextQuestion": "short follow-up question or empty string"
}
`.trim();

    const result = await runChatWithProvider(
      aiConfig,
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      { temperature: 0.1, format: "json" }
    );

    if (!result.ok) {
      return NextResponse.json(
        {
          error: "Unable to validate bothering.",
          details: String(result.details || "AI provider call failed."),
        },
        { status: 502 }
      );
    }

    const parsed = extractJson(result.content || "");
    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json({ error: "Invalid validator response format." }, { status: 502 });
    }

    const status = parsed.status === "valid" || parsed.status === "needs_rephrase" || parsed.status === "invalid"
      ? parsed.status
      : "invalid";
    const botheringClassification =
      parsed.bothering_classification === "end" ||
      parsed.bothering_classification === "means" ||
      parsed.bothering_classification === "unclear"
        ? parsed.bothering_classification
        : "unclear";
    const classification =
      typeof parsed.classification === "string" ? parsed.classification : "unclear";
    const meansVsEnd =
      parsed.means_vs_end === "means" ||
      parsed.means_vs_end === "end" ||
      parsed.means_vs_end === "mixed" ||
      parsed.means_vs_end === "unclear"
        ? parsed.means_vs_end
        : "unclear";
    const botheringType =
      parsed.bothering_type === "external" ||
      parsed.bothering_type === "mismatch" ||
      parsed.bothering_type === "constraint" ||
      parsed.bothering_type === "unclear"
        ? parsed.bothering_type
        : "unclear";
    const solutionMethod =
      parsed.solutionMethod === "interaction" ||
      parsed.solutionMethod === "learning" ||
      parsed.solutionMethod === "resource" ||
      parsed.solutionMethod === "unclear"
        ? parsed.solutionMethod
        : "unclear";
    const recommendedMethods = Array.isArray(parsed.recommendedMethods)
      ? parsed.recommendedMethods.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 6)
      : [];
    const rootProblem = typeof parsed.rootProblem === "string" ? parsed.rootProblem.trim() : "";
    const resolutionStrategy = typeof parsed.resolutionStrategy === "string" ? parsed.resolutionStrategy.trim() : "";
    const reason = typeof parsed.reason === "string" ? parsed.reason.trim() : "";
    const options = Array.isArray(parsed.options)
      ? parsed.options.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 4)
      : [];
    const suggestions = Array.isArray(parsed.suggestions)
      ? parsed.suggestions.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 3)
      : [];
    const clarifyingQuestions = Array.isArray(parsed.clarifyingQuestions)
      ? parsed.clarifyingQuestions.map((item: unknown) => String(item || "").trim()).filter(Boolean).slice(0, 5)
      : [];
    const bestOption = typeof parsed.bestOption === "string" ? parsed.bestOption.trim() : "";
    const nextQuestion = typeof parsed.nextQuestion === "string" ? parsed.nextQuestion.trim() : "";

    return NextResponse.json({
      status,
      botheringClassification,
      classification,
      meansVsEnd,
      botheringType,
      solutionMethod,
      recommendedMethods,
      rootProblem,
      resolutionStrategy,
      reason,
      options,
      suggestions,
      clarifyingQuestions,
      bestOption,
      nextQuestion,
      provider: result.provider,
      model: result.model,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: "Unable to validate bothering.",
        details: message,
      },
      { status: 500 }
    );
  }
}
