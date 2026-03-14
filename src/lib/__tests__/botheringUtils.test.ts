import assert from "node:assert/strict";
import test from "node:test";

import {
  getConstraintLinkTargetType,
  getEffectiveConstraintTasks,
} from "@/lib/botheringUtils";
import type { MindsetPoint } from "@/types/workout";

test("externally imposed constraints derive tasks from linked mismatches", () => {
  const point: MindsetPoint = {
    id: "constraint_1",
    text: "Funds are limited",
    constraintType: "externally-imposed",
    linkedMismatchIds: ["m1"],
    tasks: [],
  };
  const mismatch = new Map<string, MindsetPoint>([
    [
      "m1",
      {
        id: "m1",
        text: "Need higher-value skill",
        tasks: [{ id: "t1", type: "upskill", details: "Study pricing" }],
      },
    ],
  ]);

  const tasks = getEffectiveConstraintTasks(point, mismatch, new Map());
  assert.equal(getConstraintLinkTargetType(point), "mismatch");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].details, "Study pricing");
});

test("self-imposed constraints derive tasks from linked externals", () => {
  const point: MindsetPoint = {
    id: "constraint_2",
    text: "I keep acting smaller than required",
    constraintType: "self-imposed",
    linkedExternalIds: ["e1"],
    tasks: [],
  };
  const external = new Map<string, MindsetPoint>([
    [
      "e1",
      {
        id: "e1",
        text: "Career opportunities are being missed",
        tasks: [{ id: "t2", type: "deepwork", details: "Ship portfolio update" }],
      },
    ],
  ]);

  const tasks = getEffectiveConstraintTasks(point, new Map(), external);
  assert.equal(getConstraintLinkTargetType(point), "external");
  assert.equal(tasks.length, 1);
  assert.equal(tasks[0].details, "Ship portfolio update");
});
