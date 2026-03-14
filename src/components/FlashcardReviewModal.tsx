"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { getFlashcardResourcesForTask } from "@/lib/flashcards";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FlashcardMcqPanel } from "@/components/FlashcardMcqPanel";

interface FlashcardReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  taskKey?: string | null;
  title?: string;
}

export function FlashcardReviewModal({
  open,
  onOpenChange,
  taskKey,
  title,
}: FlashcardReviewModalProps) {
  const { resources, settings } = useAuth();
  const flashcards = useMemo(
    () => getFlashcardResourcesForTask(resources, settings, taskKey),
    [resources, settings, taskKey]
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (!open) return;
    setCurrentIndex(0);
  }, [open, taskKey]);

  useEffect(() => {
    if (currentIndex < flashcards.length) return;
    setCurrentIndex(Math.max(0, flashcards.length - 1));
  }, [currentIndex, flashcards.length]);

  const activeFlashcard = flashcards[currentIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{title ? `${title} Flashcards` : "Flashcard Review"}</DialogTitle>
        </DialogHeader>
        {!activeFlashcard?.flashcard ? (
          <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
            No flashcards are linked to this task yet.
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>
                Card {currentIndex + 1} of {flashcards.length}
              </span>
              <span>
                Page {activeFlashcard.flashcard.pageNumber} · {activeFlashcard.flashcard.specializationName}
              </span>
            </div>
            <div className="rounded-2xl border bg-card p-6 shadow-sm">
              <FlashcardMcqPanel
                key={`${activeFlashcard.id}-${currentIndex}`}
                flashcard={activeFlashcard.flashcard}
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setCurrentIndex((prev) => Math.max(0, prev - 1));
                }}
                disabled={currentIndex === 0}
              >
                <ChevronLeft className="mr-1.5 h-4 w-4" />
                Previous
              </Button>
              <Button
                onClick={() => {
                  setCurrentIndex((prev) => Math.min(flashcards.length - 1, prev + 1));
                }}
                disabled={currentIndex >= flashcards.length - 1}
              >
                Next
                <ChevronRight className="ml-1.5 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
