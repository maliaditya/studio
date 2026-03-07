import assert from "node:assert/strict";
import test from "node:test";
import { buildShivQuery, resolveShivAnswer } from "@/lib/shiv/router";

type GoldenCase = {
  q: string;
  expectIncludes: string[];
};

const appContext = {
  meta: { todayKey: "2026-03-06", currentSlot: "Afternoon" },
  today: {
    tasks: [
      { id: "t1", details: "Learn OpenGL", slot: "Afternoon", completed: false, type: "upskill" },
      { id: "t2", details: "C++ practice", slot: "Night", completed: false, type: "upskill" },
    ],
  },
  routines: {
    upcoming: [
      { id: "r1", details: "Hair Cutting", slot: "Afternoon", nextDate: "2026-03-20", nextInDays: 14, recurrence: "every 14 days" },
      { id: "r2", details: "Start Car: if not used in this week.", slot: "Morning", nextDate: "2026-03-07", nextInDays: 1, recurrence: "weekly" },
    ],
    dueToday: [],
  },
  botherings: {
    bySource: {
      external: [{ id: "b1", text: "Task overload", completed: false, hasTodayLinkedTask: true, hasCurrentSlotLinkedTask: true }],
      mismatch: [],
      constraint: [],
    },
  },
  data: {
    health: {
      latestWeightLog: { date: "2026-03-05", weight: 72.4 },
    },
    resources: [{ id: "res1", name: "OpenGL Book", type: "pdf", folderId: "f1" }],
    resourceFolders: [{ id: "f1", name: "Graphics" }],
    logsSummary: { upskillLogsCount: 5, deepWorkLogsCount: 2, workoutLogsCount: 1, mindsetLogsCount: 0 },
  },
  settings: {
    routines: [
      { id: "r1", details: "Hair Cutting", routine: { type: "custom", repeatInterval: 14, repeatUnit: "day" } },
      { id: "r2", details: "Start Car: if not used in this week.", routine: { type: "weekly" } },
    ],
    shivDynamicTaskAliases: {},
  },
} as Record<string, unknown>;

const golden: GoldenCase[] = [
  { q: "what is my current weight", expectIncludes: ["current weight", "72.4"] },
  { q: "when is hair cutting next scheduled", expectIncludes: ["hair cutting", "days remaining"] },
  { q: "what are today tasks", expectIncludes: ["today tasks", "learn opengl"] },
  { q: "find resource opengl", expectIncludes: ["opengl book"] },
  { q: "what is next date", expectIncludes: ["next scheduled item"] },
];

test("golden eval: faithfulness/intent quality threshold", async () => {
  let passed = 0;
  for (const item of golden) {
    const query = buildShivQuery(item.q, [], appContext);
    const decision = await resolveShivAnswer(query, appContext, { provider: "none", model: "" });
    const answer = String(decision.answer || "").toLowerCase();
    const matched = item.expectIncludes.some((needle) => answer.includes(needle.toLowerCase()));
    if (matched) passed += 1;
  }
  const score = passed / golden.length;
  assert.ok(score >= 0.8, `Golden eval score dropped: ${score.toFixed(2)} < 0.80`);
});
