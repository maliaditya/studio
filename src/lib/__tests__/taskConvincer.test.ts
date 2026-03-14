import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTaskConvincerFallback,
  buildTaskConvincerPrompt,
} from "@/lib/taskConvincer";

test("buildTaskConvincerPrompt includes constraint, mismatch, and bci context", () => {
  const prompt = buildTaskConvincerPrompt(
    {
      taskName: "Advanced Graphics Programming",
      taskType: "upskill",
      slotName: "Afternoon",
      linkedBotherings: [
        { type: "constraint", text: "I have 100 days to meaningfully improve my graphics skill." },
        { type: "mismatch", text: "I do not understand how Vulkan talks to the driver." },
      ],
    },
    {
      boundary: ["The work starts when the Vulkan study context is entered."],
      contents: ["Pipeline stages and driver interaction."],
      invariant: ["Progress only counts when understanding becomes executable."],
    }
  );

  assert.match(prompt, /Current Task:\s+Advanced Graphics Programming/i);
  assert.match(prompt, /I have 100 days to meaningfully improve my graphics skill/i);
  assert.match(prompt, /I do not understand how Vulkan talks to the driver/i);
  assert.match(prompt, /Pipeline stages and driver interaction/i);
  assert.match(prompt, /Today's Focus Hint/i);
});

test("buildTaskConvincerFallback produces structured sections", () => {
  const script = buildTaskConvincerFallback(
    {
      taskName: "Truth without apology",
      slotName: "Night",
      linkedBotherings: [{ type: "mismatch", text: "I still avoid the difficult philosophical parts." }],
      learningContext: {
        specializationName: "Advaita understanding",
      },
    },
    null
  );

  assert.match(script, /^WHY THIS TASK EXISTS/m);
  assert.match(script, /^BCI VISUALIZATION/m);
  assert.match(script, /Use the Night slot/i);
  assert.match(script, /Advaita understanding/i);
});
