"use client";

import React, { useEffect, useMemo, useState } from "react";
import { CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import type { FlashcardResourceData } from "@/types/workout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { getFlashcardCorrectOptionIndex, getFlashcardOptions, isFlashcardMultipleChoice } from "@/lib/flashcards";

interface FlashcardMcqPanelProps {
  flashcard?: FlashcardResourceData | null;
  className?: string;
}

export function FlashcardMcqPanel({ flashcard, className }: FlashcardMcqPanelProps) {
  const [selectedOption, setSelectedOption] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const options = useMemo(() => getFlashcardOptions(flashcard), [flashcard]);
  const correctOptionIndex = useMemo(
    () => getFlashcardCorrectOptionIndex(flashcard, options),
    [flashcard, options]
  );
  const isMcq = useMemo(() => isFlashcardMultipleChoice(flashcard), [flashcard]);
  const selectedOptionIndex = Number(selectedOption);
  const isSelectionValid =
    selectedOption !== "" &&
    Number.isInteger(selectedOptionIndex) &&
    selectedOptionIndex >= 0 &&
    selectedOptionIndex < options.length;
  const isCorrect = submitted && isSelectionValid && selectedOptionIndex === correctOptionIndex;
  const answeredWrong = submitted && isSelectionValid && selectedOptionIndex !== correctOptionIndex;
  const explanation = String(flashcard?.explanation || flashcard?.sourceText || "").trim();

  useEffect(() => {
    setSelectedOption("");
    setSubmitted(false);
  }, [flashcard?.generatedAt, flashcard?.question, flashcard?.pageNumber]);

  if (!flashcard) {
    return (
      <div className={cn("rounded-xl border border-dashed p-6 text-sm text-muted-foreground", className)}>
        No flashcard data available.
      </div>
    );
  }

  if (!isMcq || options.length === 0 || correctOptionIndex < 0) {
    return (
      <div className={cn("rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-background to-amber-500/5 p-5", className)}>
        <div className="text-[11px] font-medium uppercase tracking-wide text-orange-300">
          Front
        </div>
        <div className="mt-2 text-xl font-semibold leading-snug text-foreground">
          {flashcard.question}
        </div>
        <div className="mt-6 text-[11px] font-medium uppercase tracking-wide text-orange-300">
          Back
        </div>
        <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {flashcard.answer || "No answer available."}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("rounded-2xl border border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-background to-amber-500/5 p-5", className)}>
      <div className="text-[11px] font-medium uppercase tracking-wide text-orange-300">
        MCQ
      </div>
      <div className="mt-2 text-xl font-semibold leading-snug text-foreground">
        {flashcard.question}
      </div>
      <RadioGroup
        value={selectedOption}
        onValueChange={(value) => {
          if (submitted) return;
          setSelectedOption(value);
        }}
        className="mt-6 space-y-3"
      >
        {options.map((option, index) => {
          const optionId = `${flashcard.sessionId}-${flashcard.sourceHighlightId}-${index}`;
          const isSelected = selectedOption === String(index);
          const isCorrectChoice = submitted && index === correctOptionIndex;
          const isIncorrectChoice = submitted && isSelected && index !== correctOptionIndex;
          return (
            <Label
              key={optionId}
              htmlFor={optionId}
              className={cn(
                "flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors",
                submitted && "cursor-default",
                isCorrectChoice
                  ? "border-emerald-500/50 bg-emerald-500/12 text-emerald-50"
                  : isIncorrectChoice
                    ? "border-red-500/50 bg-red-500/12 text-red-50"
                    : isSelected
                      ? "border-orange-400/50 bg-orange-500/10 text-foreground"
                      : "border-border/70 bg-background/60 text-foreground hover:bg-background"
              )}
            >
              <RadioGroupItem
                id={optionId}
                value={String(index)}
                disabled={submitted}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Option {String.fromCharCode(65 + index)}
                </div>
                <div className="mt-1 text-sm leading-relaxed">
                  {option}
                </div>
              </div>
            </Label>
          );
        })}
      </RadioGroup>
      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          onClick={() => setSubmitted(true)}
          disabled={!isSelectionValid || submitted}
        >
          Submit Answer
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => {
            setSelectedOption("");
            setSubmitted(false);
          }}
          disabled={!submitted && !selectedOption}
        >
          <RotateCcw className="mr-1.5 h-4 w-4" />
          Reset
        </Button>
      </div>
      {submitted && (
        <div
          className={cn(
            "mt-5 rounded-xl border px-4 py-3",
            isCorrect
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-50"
              : "border-red-500/40 bg-red-500/10 text-red-50"
          )}
        >
          <div className="flex items-center gap-2 text-sm font-medium">
            {isCorrect ? <CheckCircle2 className="h-4 w-4" /> : <XCircle className="h-4 w-4" />}
            {isCorrect ? "Correct answer" : "Incorrect answer"}
          </div>
          <div className="mt-2 text-sm leading-relaxed">
            Correct option: {options[correctOptionIndex]}
          </div>
          {answeredWrong && isSelectionValid && (
            <div className="mt-1 text-sm leading-relaxed text-red-100/90">
              Your choice: {options[selectedOptionIndex]}
            </div>
          )}
        </div>
      )}
      {submitted && explanation && (
        <div className="mt-4 rounded-xl border border-border/70 bg-background/50 p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            Explanation
          </div>
          <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
}
