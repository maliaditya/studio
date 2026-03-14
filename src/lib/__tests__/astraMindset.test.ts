import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceMindsetSession,
  applyMindsetAnswerToSession,
  buildAstraMindsetPrompts,
  createEmptyMindsetSession,
  formatMindsetCompletionMessage,
  getCurrentMindsetPrompt,
} from "@/lib/astraMindset";

const buildInput = () => ({
  pathId: "reality_interpretation_debugger" as const,
  username: "astra-user",
  taskOptions: [
    {
      id: "task_1",
      label: "Fix demo bug",
      description: "Mismatch • Demo release • today",
    },
  ],
  botheringOptions: [
    {
      id: "bothering_1",
      label: "I feel shaken after the failed demo",
      description: "Mismatch • 1 linked task • linked today",
    },
  ],
});

test("buildAstraMindsetPrompts includes dynamic link choices and searchable pickers", () => {
  const prompts = buildAstraMindsetPrompts(buildInput());
  const linkPrompt = prompts.find((prompt) => prompt.id === "link:source");
  const taskPrompt = prompts.find((prompt) => prompt.id === "link:task");
  const botheringPrompt = prompts.find((prompt) => prompt.id === "link:bothering");
  const bodyPrompt = prompts.find((prompt) => prompt.id === "step5:body_state");

  assert.ok(linkPrompt);
  assert.ok(taskPrompt);
  assert.ok(botheringPrompt);
  assert.ok(bodyPrompt);
  assert.deepEqual(
    linkPrompt!.choices?.map((choice) => choice.value),
    ["bothering", "task", "standalone"]
  );
  assert.equal(taskPrompt!.pickerItems?.[0]?.label, "Fix demo bug");
  assert.equal(botheringPrompt!.pickerItems?.[0]?.label, "I feel shaken after the failed demo");
  assert.equal(bodyPrompt!.multiSelect, true);
});

test("advanceMindsetSession skips optional prompts for standalone, no evidence, and no custom body state", () => {
  const prompts = buildAstraMindsetPrompts(buildInput());
  let session = createEmptyMindsetSession("reality_interpretation_debugger", prompts);

  const linkPrompt = getCurrentMindsetPrompt(session, prompts);
  assert.equal(linkPrompt?.id, "link:source");

  session = applyMindsetAnswerToSession(session, linkPrompt!, "standalone");
  session = advanceMindsetSession(session, prompts);
  assert.equal(session.cursor.stepId, "step1:observable_category");

  const evidencePrompt = prompts.find((prompt) => prompt.id === "step3:evidence_status");
  session.cursor.stepId = evidencePrompt!.id;
  session.cursor.stepIndex = prompts.findIndex((prompt) => prompt.id === evidencePrompt!.id);
  session = applyMindsetAnswerToSession(session, evidencePrompt!, "none");
  session = advanceMindsetSession(session, prompts);
  assert.equal(session.cursor.stepId, "step4:future_projection_choice");

  const bodyPrompt = prompts.find((prompt) => prompt.id === "step5:body_state");
  session.cursor.stepId = bodyPrompt!.id;
  session.cursor.stepIndex = prompts.findIndex((prompt) => prompt.id === bodyPrompt!.id);
  session = applyMindsetAnswerToSession(session, bodyPrompt!, ["tight_chest"], {
    label: "Tight chest",
  });
  session = advanceMindsetSession(session, prompts);
  assert.equal(session.cursor.stepId, "step6:thought_observation");
});

test("applyMindsetAnswerToSession builds structured summary and completion message", () => {
  const prompts = buildAstraMindsetPrompts(buildInput());
  let session = createEmptyMindsetSession("reality_interpretation_debugger", prompts);

  const answerById = (promptId: string, value: string | string[], label?: string) => {
    const prompt = prompts.find((entry) => entry.id === promptId);
    assert.ok(prompt, `Expected prompt ${promptId}`);
    session = applyMindsetAnswerToSession(session, prompt!, value, label ? { label } : undefined);
    session.cursor.stepId = prompt!.id;
    session.cursor.stepIndex = prompts.findIndex((entry) => entry.id === prompt!.id);
    session = advanceMindsetSession(session, prompts);
  };

  answerById("link:source", "task");
  answerById("link:task", "task_1", "Fix demo bug");
  answerById("step1:observable_category", "task_failed");
  answerById("step1:observable_detail", "My code crashed during the demo.");
  answerById("step2:interpretation_choice", "they_think_badly_of_me");
  answerById("step2:interpretation_detail", "Everyone thinks I am incompetent.");
  answerById("step3:evidence_status", "none");
  answerById("step4:future_projection_choice", "loss");
  answerById("step4:future_projection_detail", "I may lose my job.");
  answerById("step5:body_state", ["fast_heartbeat", "tight_chest"], "Fast heartbeat | Tight chest");
  answerById("step6:thought_observation", "yes_clearly");
  answerById("step7:body_observation", "partly");
  answerById("step8:witness_detection", "awareness");
  answerById("step9:identity_correction", "awareness");
  answerById("step10:action_category", "fix_or_repair");

  const actionPrompt = prompts.find((prompt) => prompt.id === "step10:action_detail");
  assert.ok(actionPrompt);
  session = applyMindsetAnswerToSession(session, actionPrompt!, "Fix the crash and prepare a fallback demo.");
  session.cursor.stepId = actionPrompt!.id;
  session.cursor.stepIndex = prompts.findIndex((prompt) => prompt.id === actionPrompt!.id);
  session = advanceMindsetSession(session, prompts);

  assert.equal(session.status, "completed");
  assert.equal(session.linkTarget.type, "task");
  assert.equal(session.linkTarget.label, "Fix demo bug");
  assert.equal(session.summary.observableReality, "My code crashed during the demo.");
  assert.equal(session.summary.mindInterpretation, "Everyone thinks I am incompetent.");
  assert.equal(session.summary.evidenceStatus, "No direct evidence");
  assert.deepEqual(session.summary.bodyState, ["Fast heartbeat", "Tight chest"]);
  assert.equal(
    session.summary.conclusion,
    "The mind added a story beyond the facts. Reality now requires only the next action."
  );

  const completionText = formatMindsetCompletionMessage(session);
  assert.match(completionText, /Observable Reality: My code crashed during the demo\./);
  assert.match(completionText, /Grounded Action: Fix the crash and prepare a fallback demo\./);
});
