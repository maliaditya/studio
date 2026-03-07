import assert from "node:assert/strict";
import test from "node:test";
import { mergeTaskAliasMaps, normalizeTaskAliasMap, sanitizeGeneratedTaskAliases } from "@/lib/shiv/taskAliases";

test("mergeTaskAliasMaps is additive and preserves existing aliases", () => {
  const merged = mergeTaskAliasMaps(
    { "hair cutting": ["hair cut", "haicutting"] },
    { "hair cutting": ["hair cutting task", "hair cut"] }
  );

  assert.deepEqual(merged["hair cutting"], ["hair cut", "haicutting", "hair cutting task"]);
});

test("normalizeTaskAliasMap collapses task key variants", () => {
  const normalized = normalizeTaskAliasMap({ " Hair-Cutting ": ["Hair Cut"] });
  assert.ok(normalized["hair cutting"]);
  assert.deepEqual(normalized["hair cutting"], ["hair cut"]);
});

test("sanitizeGeneratedTaskAliases removes invalid aliases and caps output", () => {
  const input = {
    "Hair Cutting": ["", "a", "hair cutting", "hair cut", "haicutting", "!!!!"],
  };
  const out = sanitizeGeneratedTaskAliases(input, ["Hair Cutting"]);
  assert.deepEqual(out["hair cutting"], ["hair cut", "haicutting"]);
});
