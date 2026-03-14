import assert from "node:assert/strict";
import test from "node:test";

import {
  advanceJournalSession,
  applyJournalAnswerToSession,
  buildAstraJournalPrompts,
  createEmptyDailyJournalSession,
  getLinkedStopperIdsForTask,
} from "@/lib/astraJournal";

const dateKey = "2026-03-11";

const buildBaseInput = () =>
  ({
    dateKey,
    currentSlot: "Evening",
    username: "astra-user",
    schedule: {
      [dateKey]: {
        Dawn: [],
        Morning: [
          {
            id: "task_completed",
            type: "deepwork",
            details: "Ship feature",
            completed: true,
            slot: "Morning",
          },
        ],
        Afternoon: [
          {
            id: "task_incomplete",
            type: "upskill",
            details: "Learn rendering",
            completed: false,
            slot: "Afternoon",
          },
        ],
      },
    },
    activityDurations: {
      task_completed: "1h",
    },
    mindsetCards: [],
    missedSlotReviews: {},
    offerizationPlans: {},
    skillAcquisitionPlans: [],
    coreSkills: [],
    upskillDefinitions: [],
    deepWorkDefinitions: [],
    projects: [],
  }) as any;

test("buildAstraJournalPrompts generates empty, completed remainder, and incomplete slot prompts", () => {
  const prompts = buildAstraJournalPrompts(buildBaseInput());
  const dawnPrompt = prompts.find((prompt) => prompt.id === "slot:Dawn:overview");
  const morningPrompt = prompts.find((prompt) => prompt.id === "slot:Morning:overview");
  const afternoonPrompt = prompts.find((prompt) => prompt.id === "slot:Afternoon:overview");
  const blockerPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:blocker");
  const nextActionPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:next_action");
  const rescheduleSlotPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:reschedule_slot");
  const slotFeelingPrompt = prompts.find((prompt) => prompt.id === "slot:Afternoon:feeling");

  assert.ok(dawnPrompt);
  assert.ok(morningPrompt);
  assert.ok(afternoonPrompt);
  assert.ok(blockerPrompt);
  assert.ok(nextActionPrompt);
  assert.ok(rescheduleSlotPrompt);
  assert.ok(slotFeelingPrompt);
  assert.match(dawnPrompt!.prompt, /nothing scheduled in Dawn/i);
  assert.match(morningPrompt!.prompt, /remaining 3 hours/i);
  assert.match(afternoonPrompt!.prompt, /1 incomplete/i);
  assert.deepEqual(
    blockerPrompt!.choices?.map((choice) => choice.value),
    [
      "got distracted",
      "low energy",
      "got interrupted by something else",
      "did not know the next step",
      "it felt too big or heavy",
      "avoided it",
      "needed a missing resource or input",
      "other",
    ]
  );
  assert.deepEqual(
    nextActionPrompt!.choices?.map((choice) => choice.value),
    [
      "finish a smaller part",
      "move it to another slot",
      "reschedule it for tomorrow",
      "drop it for now",
    ]
  );
  assert.match(
    (rescheduleSlotPrompt!.choices || []).map((choice) => choice.label).join(" | "),
    /Today Evening/i
  );
  assert.match(
    (rescheduleSlotPrompt!.choices || []).map((choice) => choice.label).join(" | "),
    /Tomorrow Morning/i
  );
  assert.deepEqual(
    slotFeelingPrompt!.choices?.map((choice) => choice.label),
    ["1 Very bad", "2 Bad", "3 Mixed", "4 Okay", "5 Good"]
  );
});

test("buildAstraJournalPrompts omits bothering prompts even when botherings exist", () => {
  const input = buildBaseInput();
  input.currentSlot = "Night";
  input.mindsetCards = [
    {
      id: "mindset_botherings_mismatch",
      title: "Mismatch",
      icon: "Brain",
      points: [
        {
          id: "bother_1",
          text: "I freeze when I need to make rendering progress",
          mismatchType: "action-sequencing",
          tasks: [
            {
              id: "upskill_task",
              type: "upskill",
              details: "Learn rendering",
              dateKey,
              slotName: "Morning",
            },
            {
              id: "deepwork_task",
              type: "deepwork",
              details: "Ship feature",
              dateKey,
              slotName: "Afternoon",
            },
          ],
        },
      ],
    },
    {
      id: "mindset_botherings_external",
      title: "External",
      icon: "Brain",
      points: [
        {
          id: "bother_future_only",
          text: "Need to fix tomorrow's errand",
          tasks: [
            {
              id: "task_future_only",
              type: "essentials",
              details: "Fix tomorrow's errand",
              dateKey,
              slotName: "Night",
            },
          ],
        },
      ],
    },
  ];

  const prompts = buildAstraJournalPrompts(input);

  assert.equal(
    prompts.some((prompt) => prompt.id.startsWith("bothering:")),
    false
  );
  assert.ok(prompts.find((prompt) => prompt.id === "task:task_incomplete:reason_category"));
});

test("applyJournalAnswerToSession stores structured slot and task data", () => {
  const prompts = buildAstraJournalPrompts(buildBaseInput());
  const slotPrompt = prompts.find((prompt) => prompt.id === "slot:Afternoon:overview");
  const taskReasonPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:reason_category");
  const taskStopperPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:stopper");
  const rescheduleSlotPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:reschedule_slot");

  assert.ok(slotPrompt);
  assert.ok(taskReasonPrompt);
  assert.ok(taskStopperPrompt);
  assert.ok(rescheduleSlotPrompt);

  let session = createEmptyDailyJournalSession(dateKey, prompts);
  session = applyJournalAnswerToSession(session, slotPrompt!, "I drifted into admin work.");
  session = applyJournalAnswerToSession(session, taskReasonPrompt!, "admin");
  session = applyJournalAnswerToSession(session, taskStopperPrompt!, "yes", {
    linkedStopperIds: ["stopper_1"],
  });
  session = applyJournalAnswerToSession(session, rescheduleSlotPrompt!, `${dateKey}::Evening`);

  const slotReview = session.slotReviews.find((review) => review.slotName === "Afternoon");
  const taskReview = slotReview?.taskReflections.find((review) => review.taskId === "task_incomplete");

  assert.equal(slotReview?.note, "I drifted into admin work.");
  assert.deepEqual(slotReview?.linkedStopperIds, ["stopper_1"]);
  assert.equal(taskReview?.missReasonCategory, "admin");
  assert.deepEqual(taskReview?.linkedStopperIds, ["stopper_1"]);
  assert.equal(taskReview?.rescheduleDateKey, dateKey);
  assert.equal(taskReview?.rescheduleSlotName, "Evening");
  assert.equal(taskReview?.rescheduleFit, "not_needed");
});

test("advanceJournalSession only asks reschedule prompts when move is selected", () => {
  const input = buildBaseInput();
  input.schedule[dateKey].Evening = [
    {
      id: "task_evening_existing",
      type: "essentials",
      details: "Existing evening task",
      completed: false,
      slot: "Evening",
    },
  ];
  const prompts = buildAstraJournalPrompts(input);
  const nextActionPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:next_action");
  const rescheduleSlotPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:reschedule_slot");
  const rescheduleFitPrompt = prompts.find((prompt) => prompt.id === "task:task_incomplete:reschedule_fit");

  assert.ok(nextActionPrompt);
  assert.ok(rescheduleSlotPrompt);
  assert.ok(rescheduleFitPrompt);

  let session = createEmptyDailyJournalSession(dateKey, prompts);
  session.cursor.stepId = nextActionPrompt!.id;
  session.cursor.stepIndex = prompts.findIndex((prompt) => prompt.id === nextActionPrompt!.id);
  session = applyJournalAnswerToSession(session, nextActionPrompt!, "drop it for now");
  session = advanceJournalSession(session, prompts);
  assert.notEqual(session.cursor.stepId, rescheduleSlotPrompt!.id);

  session = createEmptyDailyJournalSession(dateKey, prompts);
  session.cursor.stepId = nextActionPrompt!.id;
  session.cursor.stepIndex = prompts.findIndex((prompt) => prompt.id === nextActionPrompt!.id);
  session = applyJournalAnswerToSession(session, nextActionPrompt!, "move it to another slot");
  session = advanceJournalSession(session, prompts);
  assert.equal(session.cursor.stepId, rescheduleSlotPrompt!.id);

  session = applyJournalAnswerToSession(session, rescheduleSlotPrompt!, `${dateKey}::Evening`);
  session = advanceJournalSession(session, prompts);
  assert.equal(session.cursor.stepId, rescheduleFitPrompt!.id);
});

test("getLinkedStopperIdsForTask returns stoppers linked through bothering tasks", () => {
  const stopperIds = getLinkedStopperIdsForTask(
    ["task_incomplete"],
    [
      {
        id: "mindset_botherings_external",
        title: "External",
        icon: "Brain",
        points: [
          {
            id: "bother_2",
            text: "Need to respond to a blocker",
            linkedUrgeIds: ["urge_1"],
            linkedResistanceIds: ["resistance_1"],
            tasks: [
              {
                id: "task_incomplete",
                type: "upskill",
                details: "Learn rendering",
              },
            ],
          },
        ],
      },
    ] as any
  );

  assert.deepEqual(stopperIds.sort(), ["resistance_1", "urge_1"]);
});
