
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
import type { ExerciseCategory, ExerciseDefinition } from '@/types/workout';

const productTypes = [
  {
    group: "Digital Products (High Scalability, Low Cost)",
    items: [
      { name: "Ebooks / Guides", description: "Package your knowledge into a written format for detailed, step-by-step instructions." },
      { name: "Online Courses", description: "Create video or text-based courses to teach a skill, suitable for platforms like Udemy or Gumroad." },
      { name: "Code Templates & Starter Kits", description: "Sell pre-written code to help others start projects faster. Distribute on Gumroad, GitHub, etc." },
      { name: "Notion / Life OS Systems", description: "Bundle and sell your productivity systems and templates for others to use." },
    ]
  },
  {
    group: "Service-Backed Products (Mid-Effort, Semi-Passive)",
    items: [
      { name: "Technical Resume Website Templates", description: "Sell resume funnel templates with integrated developer portfolio sections." },
      { name: "Custom Shader or Graphics Pack", description: "Sell presets, shader packs, or graphical assets for engines like Three.js, Unity, or Unreal." },
      { name: "Landing Page + Sales System Kits", description: "Provide a complete one-page funnel template for freelancers or small businesses." },
      { name: "AI Workflow Bundles", description: "Create and sell prompt libraries or automated workflows for specific industries (e.g., AI calorie estimator for coaches)." },
    ]
  },
  {
    group: "Creator Assets",
    items: [
      { name: "Shortform Content Packs", description: "Repurpose your key learnings into content packs for social media platforms like LinkedIn or Instagram." },
      { name: "Viral Dev Showcase Templates", description: "Provide a Canva and copy bundle to help developers promote their projects with a proven hook and demo format." },
    ]
  },
  {
    group: "Freemium → Paid Model",
    items: [
      { name: "Free with Paid Upgrade", description: "Offer a free version (e.g., starter code, basic template) with an upgrade path to a Pro version with more features or support." },
    ]
  },
  {
    group: "Community-as-a-Product",
    items: [
      { name: "Private Community", description: "Charge for access to a private group (e.g., Discord) with curated resources, expert feedback, and networking." },
      { name: "Live Sessions / Office Hours", description: "Offer regularly scheduled live code reviews or Q&A sessions for a specific niche." },
    ]
  },
  {
    group: "Niche Tools / Apps",
    items: [
      { name: "SaaS Application", description: "Develop and sell a software-as-a-service application, potentially based on one of your existing tracker tools." },
      { name: "CLI Tool / IDE Extension", description: "Build a command-line tool or VSCode extension to solve a specific developer problem." },
      { name: "Browser Extension", description: "Create a browser extension that assists with a specific task, such as an AI-based developer assistant." },
    ]
  },
  {
    title: "Subscription Models",
    items: [
      { name: "Paid Newsletter", description: "Share your expertise through a subscription newsletter, including code snippets, tech breakdowns, and project deep dives." },
      { name: "Sponsorship Platform", description: "Use Patreon or GitHub Sponsors to offer exclusive content, source code access, or early demos to paying supporters." },
    ]
  }
];


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
            const selectedProductType = productizationPlans[topic]?.productType;
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
