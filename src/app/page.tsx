
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, HeartPulse, Briefcase, TrendingUp, DollarSign, GitMerge, Package, Share2, Rocket, LayoutDashboard, BookCopy, Magnet, Activity as ActivityIcon } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

const featureCards = [
    {
      icon: <HeartPulse className="h-8 w-8 mb-4 text-red-500" />,
      title: 'Health & Fitness',
      description: 'Track workouts, plan your diet, and monitor physical progress.',
      link: '/workout-tracker'
    },
    {
      icon: <TrendingUp className="h-8 w-8 mb-4 text-blue-500" />,
      title: 'Skill Acquisition',
      description: 'Systematically acquire new skills and track your learning journey.',
      link: '/upskill'
    },
    {
      icon: <Briefcase className="h-8 w-8 mb-4 text-green-500" />,
      title: 'Strategic Projects',
      description: 'Connect skills to projects and manage your deep work sessions.',
      link: '/deep-work'
    },
    {
      icon: <DollarSign className="h-8 w-8 mb-4 text-yellow-500" />,
      title: 'Monetization Engine',
      description: 'Turn projects into products, services, and content.',
      link: '/monetization-engine'
    }
];

const FlowCard = ({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children?: React.ReactNode }) => (
  <div className="flex flex-col items-center p-4 border rounded-lg bg-card shadow-sm w-64 text-center h-full">
    <div className="text-primary">{icon}</div>
    <h3 className="mt-2 font-semibold text-foreground">{title}</h3>
    <p className="mt-1 text-xs text-muted-foreground flex-grow">{description}</p>
    {children}
  </div>
);

const FeatureList = ({ features }: { features: string[] }) => (
    <div className="mt-3 pt-3 border-t w-full">
        <ul className="text-left text-xs list-disc list-inside space-y-1 text-muted-foreground">
            {features.map((feature, i) => <li key={i}>{feature}</li>)}
        </ul>
    </div>
);

const StrategicOverviewDiagram = () => {
    return (
        <div className="flex items-start justify-center p-8 overflow-x-auto bg-muted/30 rounded-lg">
            <div className="flex flex-row items-center gap-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<HeartPulse size={32} />} title="1. Health" description="Track workouts, diet, and physical progress.">
                        <FeatureList features={["Workout Plans", "Exercise Library", "Diet Planning", "Weight Tracking"]} />
                    </FlowCard>
                    <FlowCard icon={<BookCopy size={32} />} title="2. Upskill" description="Structured learning and skill acquisition.">
                        <FeatureList features={["Topic & Goal Setting", "Session Logging", "Progress Visualization"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<Briefcase size={32} />} title="3. Deep Work" description="Apply skills to focus areas, creating tangible value.">
                        <FeatureList features={["Focus Area Management", "Skill Integration", "Time Tracking", "Ready for Branding Pipeline"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<Share2 size={32} />} title="4a. Personal Branding" description="Bundle completed Deep Work into shareable content.">
                        <FeatureList features={["Content Bundling", "Creation Workflow (4-stage)", "Publishing Checklist"]} />
                    </FlowCard>
                    <FlowCard icon={<Package size={32} />} title="4b. Productization & Offerization" description="Systematically plan products and services.">
                        <FeatureList features={["Gap Analysis", "Product/Service Definition", "Release Planning"]} />
                    </FlowCard>
                     <FlowCard icon={<Magnet size={32} />} title="4c. Lead Gen & Offer System" description="Define and track outreach and service offerings.">
                        <FeatureList features={["Daily Action Tracking", "Service Offer Definition"]} />
                    </FlowCard>
                </div>

                 <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<LayoutDashboard size={32} />} title="5. Dashboard" description="Your daily command center for all activities.">
                        <FeatureList features={["Time-Slotted Agenda", "Productivity Snapshot", "Activity Heatmap"]} />
                    </FlowCard>
                    <FlowCard icon={<GitMerge size={32} />} title="6. Strategic Views" description="High-level visualization of all plans.">
                        <FeatureList features={["Strategic Matrix", "Interactive Mind Map"]} />
                    </FlowCard>
                </div>

            </div>
        </div>
    );
};


export default function LandingPage() {
  const { currentUser } = useAuth();
  const router = useRouter();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (currentUser) {
      const hideLanding = localStorage.getItem('lifeos_hide_landing_page');
      if (hideLanding === 'true') {
        router.push('/my-plate');
      }
    }
  }, [currentUser, router]);
  
  const handleProceed = () => {
    if (dontShowAgain && currentUser) {
        localStorage.setItem('lifeos_hide_landing_page', 'true');
    }
    router.push(currentUser ? "/my-plate" : "/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow">
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-background via-muted/50 to-background"></div>
            <div className="relative container mx-auto px-4 py-24 md:py-32 text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                >
                    <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-6" />
                    <h1 className="text-4xl md:text-6xl font-bold tracking-tighter text-foreground">
                    Your Personal OS for Growth
                    </h1>
                    <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                    LifeOS is an all-in-one dashboard to systematically manage your health, skills, and strategic projects. Turn ambition into tangible results.
                    </p>
                    <div className="mt-8 flex flex-col items-center justify-center gap-4">
                        <Button onClick={handleProceed} size="lg" className="text-base font-semibold">
                            {currentUser ? 'Go to Dashboard' : 'Launch Your LifeOS'} <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                        {currentUser && (
                            <div className="flex items-center space-x-2">
                                <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
                                <Label htmlFor="dont-show-again" className="text-sm font-normal text-muted-foreground">Don't show this again</Label>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </section>

        <section className="py-20 bg-background">
            <div className="container mx-auto px-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {featureCards.map((card, index) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className="text-center h-full border-0 bg-muted/30 hover:bg-muted/60 transition-all hover:shadow-lg">
                            <CardHeader className="items-center">
                                {card.icon}
                                <CardTitle className="text-lg">{card.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{card.description}</p>
                            </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </div>
            </div>
        </section>
        
        <section className="container mx-auto px-4 py-20">
            <div className="grid md:grid-cols-1 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight">The LifeOS Flywheel</h2>
                    <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                        A seamless pipeline from skill acquisition to value creation. What you learn is applied, and what you apply can be monetized.
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7, delay: 0.2 }}
                    className="mt-8"
                >
                    <StrategicOverviewDiagram />
                </motion.div>
            </div>
        </section>
      </main>
      
      <footer className="border-t bg-muted/50">
          <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} LifeOS. All systems operational.
          </div>
      </footer>
    </div>
  );
}
