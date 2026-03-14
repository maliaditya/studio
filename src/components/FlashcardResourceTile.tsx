"use client";

import React from "react";
import { Layers3, Sparkles } from "lucide-react";
import type { Resource } from "@/types/workout";
import { getFlashcardOptions, isFlashcardMultipleChoice } from "@/lib/flashcards";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface FlashcardResourceTileProps {
  resource: Resource;
  className?: string;
  onClick?: () => void;
  footer?: React.ReactNode;
}

export function FlashcardResourceTile({
  resource,
  className,
  onClick,
  footer,
}: FlashcardResourceTileProps) {
  const flashcard = resource.flashcard;
  const question = flashcard?.question || resource.name || "Untitled flashcard";
  const answer = flashcard?.answer || resource.description || "";
  const options = getFlashcardOptions(flashcard);
  const isMcq = isFlashcardMultipleChoice(flashcard);
  const pageNumber = flashcard?.pageNumber;
  const topicCount = flashcard?.topicIds?.length || 0;

  return (
    <Card
      className={cn(
        "h-full overflow-hidden rounded-2xl border-orange-500/20 bg-gradient-to-br from-orange-500/10 via-background to-amber-500/5",
        onClick && "cursor-pointer transition-shadow hover:shadow-lg",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-400 text-zinc-950 shadow-sm">
            <Layers3 className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-orange-300">
              <Sparkles className="h-3.5 w-3.5" />
              Flash Card
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              {pageNumber ? `Page ${pageNumber}` : "Generated from PDF highlights"}
              {topicCount > 0 ? ` · ${topicCount} topic${topicCount === 1 ? "" : "s"}` : ""}
            </div>
          </div>
        </div>
        <CardTitle className="line-clamp-3 text-lg leading-snug">{question}</CardTitle>
      </CardHeader>
      <CardContent className="flex h-full flex-col">
        <p className="line-clamp-5 flex-1 text-sm leading-relaxed text-muted-foreground">
          {isMcq
            ? `${options.length} choices available. Open the card to answer and submit.`
            : answer || "No answer available."}
        </p>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </CardContent>
    </Card>
  );
}
