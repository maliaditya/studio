import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTaskBciContextLines,
  buildTaskBciFallback,
  parseTaskBciPayload,
} from "@/lib/taskBci";

test("parseTaskBciPayload reads strict json arrays", () => {
  const model = parseTaskBciPayload(`{
    "boundary": ["Create renderer context", "Destroy renderer context"],
    "contents": ["Pipeline state", "Buffers"],
    "invariant": ["State changes through explicit events"]
  }`);

  assert.ok(model);
  assert.deepEqual(model?.boundary, ["Create renderer context", "Destroy renderer context"]);
  assert.deepEqual(model?.contents, ["Pipeline state", "Buffers"]);
  assert.deepEqual(model?.invariant, ["State changes through explicit events"]);
});

test("buildTaskBciFallback keeps the subject tied to task and bothering context", () => {
  const fallback = buildTaskBciFallback({
    taskName: "Study graphics pipeline",
    parentTaskName: "Graphics pipeline mental model",
    linkedBotherings: [{ type: "mismatch", text: "I do not understand how rendering flows" }],
    resourceNames: ["GPU Gems"],
  });

  assert.match(fallback.boundary.join(" "), /Graphics pipeline mental model/i);
  assert.match(fallback.contents.join(" "), /GPU Gems/i);
  assert.match(fallback.invariant.join(" "), /real purpose/i);
});

test("buildTaskBciContextLines includes learning and project context", () => {
  const lines = buildTaskBciContextLines({
    taskName: "Implement deferred renderer",
    taskType: "deepwork",
    linkedBotherings: [{ type: "constraint", text: "Current graphics skill is not enough" }],
    learningContext: {
      specializationName: "Graphics Rendering",
      targetDate: "2026-08-01",
      requiredHours: 180,
      books: ["Real-Time Rendering"],
    },
    projectContext: {
      projectName: "Engine rewrite",
      releaseNames: ["Renderer v2 (2026-06-01)"],
      workflowStageSummary: ["Renderer v2: idea 2, code 5, break 1, fix 0"],
    },
  });

  assert.ok(lines.some((line) => /Graphics Rendering/.test(line)));
  assert.ok(lines.some((line) => /Engine rewrite/.test(line)));
  assert.ok(lines.some((line) => /constraint/i.test(line)));
});
