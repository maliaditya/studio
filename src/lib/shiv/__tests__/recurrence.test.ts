import assert from "node:assert/strict";
import test from "node:test";
import { buildShivQuery } from "@/lib/shiv/router";
import { buildShivIndex } from "@/lib/shiv/indexBuilder";
import { retrieveEvidence } from "@/lib/shiv/retriever";
import { runDeterministicHandlers } from "@/lib/shiv/ruleHandlers";

test("schedule.when_next computes strict future for next", () => {
  const appContext = {
    meta: { todayKey: "2026-03-06", currentSlot: "Morning" },
    settings: {
      routines: [
        {
          id: "hair-routine",
          details: "Hair Cutting",
          routine: { type: "custom", repeatInterval: 14, repeatUnit: "day" },
        },
      ],
    },
    recentSchedule: {
      "2026-03-06": {
        Afternoon: [{ id: "hair-routine_2026-03-06", details: "Hair Cutting" }],
      },
    },
    routines: {
      upcoming: [{ id: "hair-routine", details: "Hair Cutting", nextDate: "2026-03-06", nextInDays: 0, slot: "Afternoon" }],
    },
  } as Record<string, unknown>;

  const query = buildShivQuery("when is hair cutting next sheduled", [], appContext);
  const index = buildShivIndex(appContext);
  const retrieved = retrieveEvidence(query, index);
  const result = runDeterministicHandlers({
    query,
    index,
    evidence: retrieved.global,
    byDomain: retrieved.byDomain,
  });

  assert.ok(result);
  assert.equal(result?.handlerId, "schedule.when_next");
  assert.match(result?.answer || "", /next scheduled/i);
  assert.match(result?.answer || "", /Mar\s+20\s+-\s+2026/i);
});
