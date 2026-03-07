import assert from "node:assert/strict";
import test from "node:test";
import type { ShivEvidence } from "@/lib/shiv/types";
import { buildShivQuery } from "@/lib/shiv/router";
import { groundingGuard, relevanceGuard } from "@/lib/shiv/guards";

const evidence: ShivEvidence[] = [
  {
    id: "r1",
    domain: "routine",
    name: "Hair Cutting",
    text: "Hair Cutting next date",
    aliases: ["haircut"],
    payload: {},
    score: 1,
    matchReason: "exact",
  },
];

test("relevance guard fails for unrelated answer", () => {
  const query = buildShivQuery("when is hair cutting next", [], {});
  const guard = relevanceGuard(query, "Your current weight is 70.");
  assert.equal(guard.passed, false);
});

test("grounding guard fails when no evidence mention", () => {
  const guard = groundingGuard("The answer is tomorrow.", evidence);
  assert.equal(guard.passed, false);
});
