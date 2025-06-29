
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Package, PlusCircle } from 'lucide-react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { ExerciseCategory, ExerciseDefinition, GapAnalysis } from '@/types/workout';
import { productTypes, GAP_TYPES } from '@/lib/constants';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';


function ProductizationPageContent() {
  const { deepWorkDefinitions, setDeepWorkDefinitions, productizationPlans, setProductizationPlans, deepWorkTopicMetadata } = useAuth();
  const { toast } = useToast();
  const [newActionTasks, setNewActionTasks] = useState<Record<string, string>>({});

  const topics = useMemo(() => {
    const topicMap = new Map<string, { name: string; category: string }[]>();
    (deepWorkDefinitions || []).forEach(def => {
      // Exclude bundles themselves from being productized
      if (Array.isArray(def.focusAreas)) return;
      
      const topic = def.category;
      if (!topicMap.has(topic)) {
        topicMap.set(topic, []);
      }
      topicMap.get(topic)!.push(def);
    });
    return Array.from(topicMap.entries()).filter(([topic]) => {
        return deepWorkTopicMetadata[topic]?.classification === 'product';
    });
  }, [deepWorkDefinitions, deepWorkTopicMetadata]);

  const handleProductTypeChange = (topic: string, productType: string) => {
    setProductizationPlans(prev => ({
        ...prev,
        [topic]: { ...(prev[topic] || {}), productType }
    }));
    toast({ title: "Product Type Set!", description: `Set to "${productType}" for ${topic}.` });
  };
  
  const handleActionTaskChange = (topic: string, value: string) => {
    setNewActionTasks(prev => ({ ...prev, [topic]: value }));
  };

  const handleAddActionTask = (e: React.FormEvent, topic: string) => {
    e.preventDefault();
    const taskName = newActionTasks[topic]?.trim();
    if (!taskName) {
        toast({ title: 'Error', description: 'Task name cannot be empty.', variant: "destructive" });
        return;
    }

    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === taskName.toLowerCase() && def.category === topic)) {
        toast({ title: 'Error', description: 'This task already exists for this topic.', variant: "destructive" });
        return;
    }

    const newDef: ExerciseDefinition = {
        id: `def_${Date.now()}_${Math.random()}`,
        name: taskName,
        category: topic as ExerciseCategory,
    };

    setDeepWorkDefinitions(prev => [...prev, newDef]);
    setNewActionTasks(prev => ({ ...prev, [topic]: '' }));
    toast({ title: 'Task Added to Deep Work', description: `"${taskName}" is now in your Deep Work library under "${topic}".` });
  };

  const handleGapAnalysisChange = (topic: string, field: keyof GapAnalysis, value: string) => {
    setProductizationPlans(prev => ({
      ...prev,
      [topic]: {
        ...(prev[topic] || {}),
        gapAnalysis: {
          ...(prev[topic]?.gapAnalysis || { gapType: '', whatYouCanFill: '', coreSolution: '', outcomeGoal: '' }),
          [field]: value
        }
      }
    }));
  };

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold tracking-tight text-primary">
            Productization
          </h1>
          <p className="mt-4 text-lg text-muted-foreground">
            Turn your deep work topics into valuable products.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {topics.map(([topic, focusAreas]) => {
            const plan = productizationPlans[topic] || {};
            const selectedProductType = plan.productType;
            const gapAnalysis = plan.gapAnalysis;
            
            return (
                <Card key={topic} className="flex flex-col">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                        <Briefcase className="h-5 w-5 text-primary"/>
                        {topic}
                    </CardTitle>
                    <CardDescription>{focusAreas.length} focus area(s)</CardDescription>
                </CardHeader>
                <CardContent className="flex-grow space-y-4">
                    <div className="text-sm text-muted-foreground">
                        <h4 className="font-semibold text-foreground mb-2">Focus Areas:</h4>
                        <ul className="list-disc list-inside space-y-1">
                            {focusAreas.map(fa => <li key={fa.id}>{fa.name}</li>)}
                        </ul>
                    </div>

                    <div className="pt-4 border-t">
                        <h4 className="font-semibold text-foreground mb-2">Type of Product</h4>
                        <Select value={selectedProductType || ''} onValueChange={(value) => handleProductTypeChange(topic, value)}>
                            <SelectTrigger>
                                <SelectValue placeholder="Select a product type..." />
                            </SelectTrigger>
                            <SelectContent>
                                {productTypes.map((group) => (
                                <SelectGroup key={group.group || group.title}>
                                    <SelectLabel>{group.group || group.title}</SelectLabel>
                                    {group.items.map(item => (
                                        <SelectItem key={item.name} value={item.name}>{item.name}</SelectItem>
                                    ))}
                                </SelectGroup>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedProductType && (
                            <p className="text-xs text-muted-foreground mt-2">
                                {productTypes.flatMap(g => g.items).find(i => i.name === selectedProductType)?.description}
                            </p>
                        )}
                    </div>
                    
                    {selectedProductType && (
                        <>
                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-foreground mb-2">Gap Analysis</h4>
                             <p className="text-xs text-muted-foreground mb-4">Answer these questions to define your product strategy.</p>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor={`gapType-${topic}`} className="text-sm">Gap Type</Label>
                                    <Select value={gapAnalysis?.gapType || ''} onValueChange={(value) => handleGapAnalysisChange(topic, 'gapType', value)}>
                                        <SelectTrigger id={`gapType-${topic}`}>
                                            <SelectValue placeholder="Select a gap type..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {GAP_TYPES.map(group => (
                                                <SelectGroup key={group.group}>
                                                    <SelectLabel>{group.group}</SelectLabel>
                                                    {group.items.map(item => (
                                                        <SelectItem key={item} value={item}>{item}</SelectItem>
                                                    ))}
                                                </SelectGroup>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor={`fill-${topic}`} className="text-sm">What You Can Fill</Label>
                                    <Textarea id={`fill-${topic}`} value={gapAnalysis?.whatYouCanFill || ''} onChange={(e) => handleGapAnalysisChange(topic, 'whatYouCanFill', e.target.value)} placeholder="How can you specifically address this gap?" />
                                </div>
                                <div>
                                    <Label htmlFor={`solution-${topic}`} className="text-sm">Core Solution / Offer</Label>
                                    <Textarea id={`solution-${topic}`} value={gapAnalysis?.coreSolution || ''} onChange={(e) => handleGapAnalysisChange(topic, 'coreSolution', e.target.value)} placeholder="What is the core product or service?" />
                                </div>
                                <div>
                                    <Label htmlFor={`goal-${topic}`} className="text-sm">Outcome Goal</Label>
                                    <Textarea id={`goal-${topic}`} value={gapAnalysis?.outcomeGoal || ''} onChange={(e) => handleGapAnalysisChange(topic, 'outcomeGoal', e.target.value)} placeholder="What is the desired result?" />
                                </div>
                            </div>
                        </div>

                        <div className="pt-4 border-t">
                            <h4 className="font-semibold text-foreground mb-2">Action Tasks</h4>
                            <form onSubmit={(e) => handleAddActionTask(e, topic)} className="flex items-center gap-2">
                                <Input 
                                    placeholder="New task for this product..."
                                    value={newActionTasks[topic] || ''}
                                    onChange={(e) => handleActionTaskChange(topic, e.target.value)}
                                />
                                <Button type="submit" size="icon" className="flex-shrink-0">
                                    <PlusCircle className="h-5 w-5"/>
                                </Button>
                            </form>
                            <p className="text-xs text-muted-foreground mt-2">
                                Added tasks will appear in your Deep Work library under the "{topic}" topic.
                            </p>
                        </div>
                        </>
                    )}
                </CardContent>
                </Card>
            )
          })}
        </div>
      </div>
    </>
  );
}

export default function ProductizationPage() {
    return (
        <AuthGuard>
            <ProductizationPageContent />
        </AuthGuard>
    )
}
