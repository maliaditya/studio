import assert from "node:assert/strict";
import test from "node:test";
import { buildShivIndex } from "@/lib/shiv/indexBuilder";
import { buildShivQuery } from "@/lib/shiv/router";
import { retrieveEvidence } from "@/lib/shiv/retriever";

test("retriever ranks matching routine above others", () => {
  const appContext = {
    meta: { todayKey: "2026-03-06", currentSlot: "Morning" },
    routines: {
      upcoming: [
        { id: "r1", details: "Hair Cutting", nextDate: "2026-03-20", nextInDays: 14, slot: "Afternoon" },
        { id: "r2", details: "Car Service", nextDate: "2026-03-12", nextInDays: 6, slot: "Morning" },
      ],
    },
  } as Record<string, unknown>;

  const query = buildShivQuery("when is hair cutting next sheduled", [], appContext);
  const index = buildShivIndex(appContext);
  const found = retrieveEvidence(query, index);

  assert.ok(found.global.length > 0);
  assert.equal(found.global[0].name, "Hair Cutting");
});
