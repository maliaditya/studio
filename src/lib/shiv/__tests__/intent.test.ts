import assert from "node:assert/strict";
import test from "node:test";
import { detectIntentSlots } from "@/lib/shiv/intent";

test("detectIntentSlots recognizes schedule days remaining", () => {
  const intent = detectIntentSlots("how many days remaining for car servicing");
  assert.equal(intent.intentId, "schedule.days_remaining");
  assert.equal(intent.metric, "days_remaining");
  assert.equal(intent.timeScope, "unspecified");
  assert.equal(intent.expectedDomains.includes("routine"), true);
});

test("detectIntentSlots recognizes current weight", () => {
  const intent = detectIntentSlots("what is my current weight");
  assert.equal(intent.intentId, "health.current_weight");
  assert.deepEqual(intent.expectedDomains, ["health"]);
});

test("detectIntentSlots recognizes current slot botherings", () => {
  const intent = detectIntentSlots("what are my current slot botherings");
  assert.equal(intent.intentId, "botherings.list");
  assert.equal(intent.timeScope, "current_slot");
});
