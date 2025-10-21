
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { BrainCircuit } from 'lucide-react';
import type { CoreSkill, MicroSkill } from '@/types/workout';

const XP_PER_LEVEL = 100; // 100 minutes of logged time = 1 level

interface GamifiedSkill extends MicroSkill {
  level: number;
  xp: number;
  progressToNextLevel: number;
}

interface GamifiedSpecialization extends CoreSkill {
  gamifiedMicroSkills: GamifiedSkill[];
  totalLevel: number;
}

function GamifiedSkillsPageContent() {
  const { 
    coreSkills, 
    offerizationPlans,
    upskillDefinitions,
    deepWorkDefinitions,
    getDescendantLeafNodes
  } = useAuth();

  const gamifiedSpecializations = useMemo((): GamifiedSpecialization[] => {
    const plannedSpecIds = new Set(Object.keys(offerizationPlans || {}));
    
    return coreSkills
      .filter(skill => skill.type === 'Specialization' && plannedSpecIds.has(skill.id))
      .map(spec => {
        let totalLevel = 0;
        
        const gamifiedMicroSkills = spec.skillAreas.flatMap(area =>
          area.microSkills.map(microSkill => {
            
            const upskillCuriosities = upskillDefinitions.filter(def => def.category === microSkill.name);
            const deepWorkIntentions = deepWorkDefinitions.filter(def => def.category === microSkill.name);
            
            const upskillLeafNodes = upskillCuriosities.flatMap(curiosity => getDescendantLeafNodes(curiosity.id, 'upskill'));
            const deepWorkLeafNodes = deepWorkIntentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));

            const upskillMinutes = upskillLeafNodes.reduce((sum, node) => sum + (node.loggedDuration || 0), 0);
            const deepWorkMinutes = deepWorkLeafNodes.reduce((sum, node) => sum + (node.loggedDuration || 0), 0);
            
            const totalMinutes = upskillMinutes + deepWorkMinutes;
            const level = Math.floor(totalMinutes / XP_PER_LEVEL);
            const progressToNextLevel = (totalMinutes % XP_PER_LEVEL);

            totalLevel += level;

            return {
              ...microSkill,
              level,
              xp: totalMinutes,
              progressToNextLevel,
            };
          })
        );
        
        return {
          ...spec,
          gamifiedMicroSkills,
          totalLevel,
        };
      })
      .sort((a, b) => b.totalLevel - a.totalLevel);
  }, [coreSkills, offerizationPlans, upskillDefinitions, deepWorkDefinitions, getDescendantLeafNodes]);

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
                {spec.gamifiedMicroSkills.map(ms => (
                    <Card key={ms.id} className="flex flex-col">
                        <CardHeader>
                            <CardTitle className="text-base">{ms.name}</CardTitle>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col justify-end">
                            <div>
                                <div className="flex justify-between items-center mb-1 text-sm">
                                <p className="font-medium text-foreground">
                                    <span className="font-bold text-primary">Lvl {ms.level}</span>
                                </p>
                                <p className="text-muted-foreground text-xs">
                                    ({ms.xp % XP_PER_LEVEL} / {XP_PER_LEVEL} XP)
                                </p>
                                </div>
                                <Progress value={ms.progressToNextLevel} />
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
