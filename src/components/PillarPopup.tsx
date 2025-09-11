
"use client";

import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, GripVertical, Brain, HeartPulse, HandHeart, TrendingUp, Workflow } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useDraggable } from '@dnd-kit/core';
import type { PillarPopupState, HabitEquation } from '@/types/workout';
import { ScrollArea } from './ui/scroll-area';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface PillarPopupProps {
  popupState: PillarPopupState;
  onClose: () => void;
}

const PILLAR_ICONS: Record<string, React.ReactNode> = {
    'Mind': <Brain className="h-6 w-6 text-blue-500" />,
    'Body': <HeartPulse className="h-6 w-6 text-red-500" />,
    'Heart': <HandHeart className="h-6 w-6 text-pink-500" />,
    'Spirit': <TrendingUp className="h-6 w-6 text-purple-500" />,
};

const pillars = [
    { name: 'Mind', attributes: ['Focus', 'Learning', 'Creativity'] },
    { name: 'Body', attributes: ['Health', 'Strength', 'Energy'] },
    { name: 'Heart', attributes: ['Relationships', 'Emotional Health'] },
    { name: 'Spirit', attributes: ['Meaning', 'Contribution', 'Legacy'] },
];

export function PillarPopup({ popupState, onClose }: PillarPopupProps) {
  const { coreSkills, projects, metaRules, openRuleDetailPopup, pillarEquations } = useAuth();
  const { pillarName, x, y } = popupState;

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: `pillar-popup-${pillarName}`,
  });

  const style: React.CSSProperties = {
    position: 'fixed',
    top: y,
    left: x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: 90,
  };

  const pillarData = useMemo(() => {
    const mainPillar = pillars.find(p => p.name === pillarName);
    if (!mainPillar) return null;

    const allPillarNames = [mainPillar.name, ...mainPillar.attributes];

    const linkedSpecializations = coreSkills.filter(s => s.purposePillar && allPillarNames.includes(s.purposePillar));
    const linkedProjects = projects.filter(p => p.purposePillar && allPillarNames.includes(p.purposePillar));
    const linkedRules = metaRules.filter(r => r.purposePillar && allPillarNames.includes(r.purposePillar));
    const linkedRuleIds = new Set(linkedRules.map(r => r.id));
    
    const linkedEquations = (pillarEquations[pillarName] || []).filter(eq => 
        (eq.metaRuleIds || []).some(ruleId => linkedRuleIds.has(ruleId))
    );

    return {
      icon: PILLAR_ICONS[pillarName],
      specializations: linkedSpecializations,
      projects: linkedProjects,
      rules: linkedRules,
      equations: linkedEquations,
    };
  }, [pillarName, coreSkills, projects, metaRules, pillarEquations]);

  if (!pillarData) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card className="w-96 shadow-2xl border-2 border-primary/30 bg-card">
        <CardHeader className="p-3 relative cursor-grab" {...listeners}>
          <div className="flex justify-between items-center">
            <CardTitle className="text-lg flex items-center gap-3">
              {pillarData.icon}
              {pillarName} Pillar
            </CardTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 flex-shrink-0" onPointerDown={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <ScrollArea className="h-96 pr-2">
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-sm mb-2">Specializations</h4>
                {pillarData.specializations.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {pillarData.specializations.map(spec => <li key={spec.id} className="p-1 rounded-md bg-muted/50">{spec.name}</li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">None linked.</p>}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Projects</h4>
                 {pillarData.projects.length > 0 ? (
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    {pillarData.projects.map(proj => <li key={proj.id} className="p-1 rounded-md bg-muted/50">{proj.name}</li>)}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">None linked.</p>}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Meta-Rules</h4>
                 {pillarData.rules.length > 0 ? (
                  <ul className="space-y-1">
                    {pillarData.rules.map(rule => (
                      <li key={rule.id}>
                        <button
                          className="text-left text-xs text-muted-foreground hover:text-primary w-full p-1 rounded"
                          onClick={(e) => openRuleDetailPopup(rule.id, e)}
                        >
                          {rule.text}
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-xs text-muted-foreground">None linked.</p>}
              </div>
              <div>
                <h4 className="font-semibold text-sm mb-2">Rule Equations</h4>
                 {pillarData.equations.length > 0 ? (
                  <Accordion type="multiple" className="w-full">
                    {pillarData.equations.map((eq: HabitEquation) => (
                      <AccordionItem value={eq.id} key={eq.id} className="border p-2 rounded-md bg-muted/30">
                        <AccordionTrigger className="text-sm font-semibold hover:no-underline p-0">
                          {eq.outcome}
                        </AccordionTrigger>
                        <AccordionContent className="pt-2">
                          <ul className="space-y-1 pl-2 border-l-2 ml-2">
                             {(eq.metaRuleIds || []).map(id => {
                                const rule = metaRules.find(r => r.id === id);
                                return rule ? (
                                    <li key={id}>
                                      <button
                                        className="text-left text-xs text-muted-foreground hover:text-primary w-full p-1 rounded"
                                        onClick={(e) => openRuleDetailPopup(rule.id, e)}
                                      >
                                        {rule.text}
                                      </button>
                                    </li>
                                ) : null
                             })}
                          </ul>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                ) : <p className="text-xs text-muted-foreground">None linked.</p>}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
