import assert from "node:assert/strict";
import test from "node:test";
import { meaningfulStems, normalizeText } from "@/lib/shiv/normalize";

test("normalizeText removes punctuation and lowercases", () => {
  assert.equal(normalizeText("When IS Hair-Cutting scheduled?"), "when is hair cutting scheduled");
});

test("meaningfulStems keeps stable stem for typos close enough", () => {
  const stems = meaningfulStems("haicutting schedule");
  assert.ok(stems.includes("haicutt") || stems.includes("haicut"));
});
