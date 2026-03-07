import assert from "node:assert/strict";
import test from "node:test";
import { POST } from "@/app/api/ai/ask-shiv/route";

test("ask-shiv route returns meta for deterministic path", async () => {
  const request = new Request("http://localhost/api/ai/ask-shiv", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-studio-desktop": "1",
    },
    body: JSON.stringify({
      question: "what is my current weight",
      history: [],
      aiConfig: { provider: "none", model: "" },
      appContext: {
        meta: { todayKey: "2026-03-06", currentSlot: "Morning" },
        data: {
          health: {
            latestWeightLog: { date: "2026-03-05", weight: 72.4 },
          },
        },
      },
    }),
  });

  const response = await POST(request);
  assert.equal(response.status, 200);
  const json = (await response.json()) as Record<string, unknown>;
  assert.equal(typeof json.answer, "string");
  assert.equal(typeof json.meta, "object");
});
