
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit } from 'lucide-react';
import type { CoreSkill, SkillArea, MicroSkill } from '@/types/workout';

const XP_PER_LEVEL = 100;
const XP_PER_LEAF_NODE = 25; // Each completed leaf task (Visualization/Action) is worth 25 XP.

interface GamifiedSkillArea extends SkillArea {
  totalLevel: number;
  totalXP: number;
  progressToNextLevel: number;
  completedMicroSkills: number;
  totalMicroSkills: number;
}

interface GamifiedSpecialization extends CoreSkill {
  gamifiedSkillAreas: GamifiedSkillArea[];
  totalLevel: number;
}

function GamifiedSkillsPageContent() {
  const { 
    coreSkills, 
    offerizationPlans,
    upskillDefinitions,
    deepWorkDefinitions,
    getDescendantLeafNodes,
    permanentlyLoggedTaskIds,
  } = useAuth();

  const gamifiedSpecializations = useMemo((): GamifiedSpecialization[] => {
    const plannedSpecIds = new Set(Object.keys(offerizationPlans || {}));
    
    return coreSkills
      .filter(skill => skill.type === 'Specialization' && plannedSpecIds.has(skill.id))
      .map(spec => {
        let specializationTotalLevel = 0;
        
        const gamifiedSkillAreas = spec.skillAreas.map(area => {
          let areaTotalXP = 0;
          let completedMicroSkillsCount = 0;
          const totalMicroSkillsCount = area.microSkills.length;
          
          area.microSkills.forEach(microSkill => {
            const upskillCuriosities = upskillDefinitions.filter(def => def.category === microSkill.name);
            const deepWorkIntentions = deepWorkDefinitions.filter(def => def.category === microSkill.name);
            
            const upskillLeafNodes = upskillCuriosities.flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
            const deepWorkLeafNodes = deepWorkIntentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            
            const allLeafNodes = [...upskillLeafNodes, ...deepWorkLeafNodes];

            const completedUpskillNodes = upskillLeafNodes.filter(node => permanentlyLoggedTaskIds.has(node.id));
            const completedDeepWorkNodes = deepWorkLeafNodes.filter(node => permanentlyLoggedTaskIds.has(node.id));
            
            areaTotalXP += (completedUpskillNodes.length + completedDeepWorkNodes.length) * XP_PER_LEAF_NODE;

            if (allLeafNodes.length > 0 && allLeafNodes.every(node => permanentlyLoggedTaskIds.has(node.id))) {
                completedMicroSkillsCount++;
            }
          });

          const areaTotalLevel = Math.floor(areaTotalXP / XP_PER_LEVEL);
          const areaProgressToNextLevel = areaTotalXP % XP_PER_LEVEL;

          specializationTotalLevel += areaTotalLevel;

          return {
            ...area,
            totalLevel: areaTotalLevel,
            totalXP: areaTotalXP,
            progressToNextLevel: areaProgressToNextLevel,
            completedMicroSkills: completedMicroSkillsCount,
            totalMicroSkills: totalMicroSkillsCount,
          };
        });
        
        return {
          ...spec,
          gamifiedSkillAreas,
          totalLevel: specializationTotalLevel,
        };
      })
      .sort((a, b) => b.totalLevel - a.totalLevel);
  }, [coreSkills, offerizationPlans, upskillDefinitions, deepWorkDefinitions, getDescendantLeafNodes, permanentlyLoggedTaskIds]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Gamified Skills</h1>
        <p className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto">
          Your specializations transformed into a skill-tree. Gain XP and level up by logging time in your Upskill and Deep Work sessions.
        </p>
      </div>

      {gamifiedSpecializations.length > 0 ? (
        <div className="space-y-12">
          {gamifiedSpecializations.map(spec => (
            <div key={spec.id}>
                <div className="flex items-center gap-4 mb-6">
                    <BrainCircuit className="h-8 w-8 text-primary" />
                    <div>
                        <h2 className="text-2xl font-bold">{spec.name}</h2>
                        <Badge variant="secondary">Total Level: {spec.totalLevel}</Badge>
                    </div>
                </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {spec.gamifiedSkillAreas.map(area => (
                    <Card key={area.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">{area.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-end">
                            <div>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="text-sm font-medium text-foreground">
                                        <span className="font-bold text-primary">Lvl {area.totalLevel}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        ({area.totalXP % XP_PER_LEVEL} / {XP_PER_LEVEL} XP)
                                    </p>
                                </div>
                                <Progress value={area.progressToNextLevel} />
                                {area.totalMicroSkills > 0 && (
                                    <div className="mt-3 text-right">
                                        <Badge variant="outline">
                                            {area.completedMicroSkills} / {area.totalMicroSkills} Micro-Skills
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 border-2 border-dashed rounded-lg">
          <p className="text-muted-foreground">No specializations with learning plans found.</p>
          <p className="text-sm mt-2">Go to "Strategic Planning" → "Offerization" to create a plan for a specialization.</p>
        </div>
      )}
    </div>
  );
}

export default function GamifiedSkills() {
    return (
        <AuthGuard>
            <GamifiedSkillsPageContent />
        </AuthGuard>
    )
}
