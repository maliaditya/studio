"use client";

import React, { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";
import { Brain } from "lucide-react";
import { parseISO, startOfDay, differenceInDays } from "date-fns";

export function BotheringsCard() {
  const { mindsetCards } = useAuth();

  const activeBotherings = useMemo(() => {
    const sources = ["mindset_botherings_mismatch", "mindset_botherings_constraint", "mindset_botherings_external"];
    return sources
      .map((id) => mindsetCards.find((c) => c.id === id))
      .flatMap((card) => card?.points || [])
      .filter((point) => (point.tasks?.length || 0) > 0 && !point.completed);
  }, [mindsetCards]);

  const getDaysLeftLabel = (endDate?: string) => {
    if (!endDate) return "No end date";
    const target = parseISO(endDate);
    if (Number.isNaN(target.getTime())) return "No end date";
    const today = startOfDay(new Date());
    const diff = differenceInDays(target, today);
    if (diff < 0) return `Overdue ${Math.abs(diff)}d`;
    if (diff === 0) return "Due today";
    return `${diff}d left`;
  };

  return (
    <Card className="bg-card/50">
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle className="flex items-center gap-2 text-primary">
            <Brain />
            Botherings
          </CardTitle>
          <CardDescription>Active botherings with linked tasks.</CardDescription>
        </div>
      </CardHeader>
      <CardContent>
        {activeBotherings.length === 0 ? (
          <div className="text-center text-sm text-muted-foreground py-4">
            No active botherings.
          </div>
        ) : (
          <ul className="space-y-3">
            {activeBotherings.map((b) => (
              <li key={b.id} className="rounded-lg border border-muted/40 bg-muted/20 p-3">
                <div className="text-sm font-semibold">{b.text}</div>
                <div className="mt-2 text-xs text-muted-foreground inline-flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-full border border-amber-400/40 text-amber-300/90 bg-amber-400/10">
                    {getDaysLeftLabel(b.endDate)}
                  </span>
                  <span>{(b.tasks?.filter((t) => t.completed).length || 0)}/{b.tasks?.length || 0} done</span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
