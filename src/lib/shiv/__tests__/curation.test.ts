import assert from "node:assert/strict";
import test from "node:test";
import { buildShivIndex } from "@/lib/shiv/indexBuilder";
import { buildShivQuery, resolveShivAnswer } from "@/lib/shiv/router";

test("resolveShivAnswer avoids cross-domain answer for weight question", async () => {
  const appContext = {
    meta: { todayKey: "2026-03-06", currentSlot: "Morning" },
    data: { health: { latestWeightLog: { date: "2026-03-05", weight: 72.4 } } },
    routines: { upcoming: [{ id: "r1", details: "Hair Cutting", nextDate: "2026-03-20", nextInDays: 14 }] },
    settings: { routines: [{ id: "r1", details: "Hair Cutting", routine: { type: "custom", repeatInterval: 14, repeatUnit: "day" } }] },
  } as Record<string, unknown>;

  const query = buildShivQuery("what is my current weight", [], appContext);
  const decision = await resolveShivAnswer(query, appContext, { provider: "none", model: "" });
  assert.equal(decision.path, "deterministic");
  assert.match(decision.answer.toLowerCase(), /current weight/);
  assert.doesNotMatch(decision.answer.toLowerCase(), /hair cutting/);
});

test("resolveShivAnswer asks clarify on ambiguous schedule task", async () => {
  const appContext = {
    meta: { todayKey: "2026-03-06", currentSlot: "Morning" },
    routines: {
      upcoming: [
        { id: "r1", details: "Hair Cutting", nextDate: "2026-03-20", nextInDays: 14 },
        { id: "r2", details: "Hair Cut", nextDate: "2026-03-21", nextInDays: 15 },
      ],
    },
    settings: {
      routines: [
        { id: "r1", details: "Hair Cutting", routine: { type: "custom", repeatInterval: 14, repeatUnit: "day" } },
        { id: "r2", details: "Hair Cut", routine: { type: "custom", repeatInterval: 14, repeatUnit: "day" } },
      ],
    },
  } as Record<string, unknown>;

  const query = buildShivQuery("when is hair next scheduled", [], appContext);
  const decision = await resolveShivAnswer(query, appContext, { provider: "none", model: "" });
  assert.equal(decision.path, "clarify");
  assert.match(decision.answer.toLowerCase(), /which one do you mean/);
});
