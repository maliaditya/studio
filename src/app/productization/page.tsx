
"use client";

import React, { useState, useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { useAuth } from '@/contexts/AuthContext';
import { Briefcase, Package, Save } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

const productizationIdeas = [
  {
    title: "1. Digital Products (High Scalability, Low Cost)",
    items: [
      { name: "a. Ebooks / Guides", examples: ["“Mastering GPU Particles in Three.js”", "“Beginner to Pro in OpenGL: A Modular Approach”"], tools: "Canva, Notion, Gumroad, Amazon KDP" },
      { name: "b. Online Courses", platforms: "Udemy, Gumroad, Teachable, Skillshare", examples: ["C++ OpenGL Game Engine from Scratch", "CUDA + OpenGL Interop for Particle Physics", "Electron App with React + SQL for Tracking Systems"] },
      { name: "c. Code Templates & Starter Kits", where: "Gumroad, GitHub Sponsors, itch.io", examples: ["OpenGL Scene Manager Boilerplate", "Three.js GPGPU Particle System Starter Pack", "Electron.js + SQLite Daily Tracker Kit"] },
      { name: "d. Notion / Life OS Systems", examples: ["Deep Work & Personal Branding System"], tools: "Gumroad, Notion Marketplaces" },
    ]
  },
  {
    title: "2. Service-Backed Products (Mid-Effort, Semi-Passive)",
    items: [
      { name: "a. Technical Resume Website Templates", examples: ["Sell resume funnel templates with dev portfolio integration."] },
      { name: "b. Custom Shader or Graphics Pack", examples: ["Sell presets or shader packs for Three.js, Unity, Unreal."] },
      { name: "c. Landing Page + Sales System Kits", examples: ["Freelancer One-Page Funnel Template"] },
      { name: "d. AI Workflow Bundles", examples: ["Offline AI Calorie Estimator for Fitness Coaches", "Content Automation GPT Prompt Library"] },
    ]
  },
  {
    title: "3. Creator Assets",
    items: [
      { name: "a. Shortform Content Packs", examples: ["For LinkedIn/Instagram: Repurpose your learnings.", "Product Idea: “30 Days of GPU Learning Prompts” for tech creators"] },
      { name: "b. Viral Dev Showcase Templates", examples: ["Canva + Copy bundle to promote projects with a hook + demo format."] },
    ]
  },
  {
    title: "4. Freemium → Paid Model",
    items: [
      { name: "Offer something free with upgrade:", examples: ["Free starter code → Pro version with tutorials + Discord access", "Free Notion template → Upgrade with automation & systemized tracking"] },
    ]
  },
  {
    title: "5. Community-as-a-Product",
    items: [
      { name: "a. Private Discord Group for GPU & Game Engine Builders", examples: ["Charge for access to curated resources, feedback, and networking."] },
      { name: "b. Live Code Review or Office Hours", examples: ["Monthly sessions for shader/game devs"] },
    ]
  },
  {
    title: "6. Niche Tools / Apps",
    items: [
      { name: "Electron App SaaS:", examples: ["Turn your daily tracker into a web-based productivity system."] },
      { name: "CLI Tool / VSCode Extension:", examples: ["OpenGL boilerplate initializer", "GPGPU Visual Debugger"] },
      { name: "Chrome Extension:", examples: ["AI-based dev assistant for shaders / GLSL snippets"] },
    ]
  },
  {
    title: "7. Subscription Models",
    items: [
      { name: "a. Paid Newsletter", examples: ["“Graphics Dev Weekly by Aditya”", "Include: Code snippets, new tech breakdowns, project deep dives"] },
      { name: "b. Patreon / GitHub Sponsors", examples: ["Behind-the-scenes content, source code access, early demos"] },
    ]
  }
];

function ProductizationPageContent() {
  const { deepWorkDefinitions, productizationPlans, setProductizationPlans, deepWorkTopicMetadata } = useAuth();
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [currentPlan, setCurrentPlan] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const topics = useMemo(() => {
    const topicMap = new Map<string, { name: string; category: string }[]>();
    (deepWorkDefinitions || []).forEach(def => {
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

  const handleOpenModal = (topic: string) => {
    setSelectedTopic(topic);
    setCurrentPlan(productizationPlans[topic]?.plan || '');
    setIsModalOpen(true);
  };

  const handleSavePlan = () => {
    if (selectedTopic) {
      setProductizationPlans(prev => ({
        ...prev,
        [selectedTopic]: { plan: currentPlan }
      }));
      setIsModalOpen(false);
      setSelectedTopic(null);
      setCurrentPlan('');
    }
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
          {topics.map(([topic, focusAreas]) => (
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
                 {productizationPlans[topic]?.plan && (
                    <div className="pt-4 border-t">
                        <h4 className="font-semibold text-foreground mb-2">My Plan:</h4>
                        <p className="text-sm whitespace-pre-wrap bg-muted/50 p-3 rounded-md">{productizationPlans[topic].plan}</p>
                    </div>
                 )}
              </CardContent>
              <div className="p-6 pt-0">
                 <Button className="w-full" onClick={() => handleOpenModal(topic)}>
                    <Package className="mr-2 h-4 w-4" />
                    {productizationPlans[topic]?.plan ? 'Edit Plan' : 'Create a Plan'}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      </div>

       <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Productization Plan for: {selectedTopic}</DialogTitle>
            <DialogDescription>
              Use the ideas below to formulate a plan for turning this topic into a product.
            </DialogDescription>
          </DialogHeader>
          <div className="grid md:grid-cols-2 gap-6 flex-grow min-h-0">
            <div className="flex flex-col gap-4">
                <h3 className="font-semibold">Your Plan</h3>
                <Textarea
                    placeholder="Describe your product, target audience, and monetization strategy..."
                    value={currentPlan}
                    onChange={(e) => setCurrentPlan(e.target.value)}
                    className="flex-grow"
                />
            </div>
            <div className="flex flex-col gap-4 min-h-0">
                <h3 className="font-semibold">Idea Library</h3>
                <ScrollArea className="flex-grow pr-4">
                     <Accordion type="single" collapsible className="w-full">
                        {productizationIdeas.map((idea, index) => (
                        <AccordionItem value={`item-${index}`} key={idea.title}>
                            <AccordionTrigger>{idea.title}</AccordionTrigger>
                            <AccordionContent>
                            <ul className="space-y-4">
                                {idea.items.map(item => (
                                <li key={item.name}>
                                    <h5 className="font-semibold text-foreground">{item.name}</h5>
                                    {item.examples && <p className="text-xs text-muted-foreground mt-1"><strong>Examples:</strong> {item.examples.join(', ')}</p>}
                                    {item.tools && <p className="text-xs text-muted-foreground mt-1"><strong>Tools:</strong> {item.tools}</p>}
                                    {item.platforms && <p className="text-xs text-muted-foreground mt-1"><strong>Platforms:</strong> {item.platforms}</p>}
                                    {item.where && <p className="text-xs text-muted-foreground mt-1"><strong>Where:</strong> {item.where}</p>}
                                </li>
                                ))}
                            </ul>
                            </AccordionContent>
                        </AccordionItem>
                        ))}
                    </Accordion>
                </ScrollArea>
            </div>
          </div>
          <DialogFooter>
            <Button onClick={handleSavePlan}><Save className="mr-2 h-4 w-4"/>Save Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
