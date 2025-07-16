
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Heart, Briefcase, TrendingUp, DollarSign, GitMerge, Package, Share2, Rocket, LayoutDashboard, BookCopy, Magnet, Activity as ActivityIcon, HeartPulse } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import React from 'react';

const featureCards = [
    {
      icon: <Heart className="h-8 w-8 text-red-500" />,
      title: 'Health',
      description: 'Track workouts, plan your diet, and monitor your physical progress towards your health goals.',
      link: '/workout-tracker'
    },
    {
      icon: <TrendingUp className="h-8 w-8 text-blue-500" />,
      title: 'Growth',
      description: 'Systematically acquire new skills, track your learning hours, and visualize your upskilling journey.',
      link: '/upskill'
    },
    {
      icon: <Briefcase className="h-8 w-8 text-green-500" />,
      title: 'Strategy',
      description: 'Connect skills to projects, plan your deep work, and build a strategic map of your ambitions.',
      link: '/deep-work'
    },
    {
      icon: <DollarSign className="h-8 w-8 text-yellow-500" />,
      title: 'Monetization',
      description: 'Turn your completed projects into tangible products, services, and content to build your personal brand.',
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

  return (
    <div className="flex flex-col min-h-screen">
      <main className="flex-grow">
        <section className="container mx-auto px-4 py-20 md:py-32 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <BrainCircuit className="mx-auto h-20 w-20 text-primary mb-4" />
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              LifeOS: Your Personal Operating System
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
              An all-in-one dashboard to systematically manage your growth, productivity, and personal projects. From health tracking to monetizing your skills, LifeOS provides the framework for a structured and goal-oriented life.
            </p>
            <div className="mt-8 flex justify-center gap-4">
              <Button asChild size="lg">
                <Link href={currentUser ? "/my-plate" : "/login"}>
                  {currentUser ? 'Go to Dashboard' : 'Get Started'} <ArrowRight className="ml-2 h-5 w-5" />
                </Link>
              </Button>
            </div>
          </motion.div>
        </section>

        <section className="bg-muted/50 py-20">
            <div className="container mx-auto px-4">
                <div className="text-center mb-12">
                    <h2 className="text-3xl font-bold">The Four Pillars of LifeOS</h2>
                    <p className="text-muted-foreground mt-2">A holistic approach to personal development.</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {featureCards.map((card, index) => (
                      <motion.div
                        key={card.title}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 0.5, delay: index * 0.1 }}
                      >
                        <Card className="text-center h-full hover:shadow-xl hover:-translate-y-1 transition-all">
                            <CardHeader className="items-center">
                                {card.icon}
                                <CardTitle>{card.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <CardDescription>{card.description}</CardDescription>
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
                    <h2 className="text-3xl font-bold">From Learning to Earning</h2>
                    <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                        LifeOS is built on a simple but powerful premise: what you learn should be applied, and what you apply can be monetized. Our integrated modules create a seamless pipeline from skill acquisition to value creation.
                    </p>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
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
      
      <footer className="border-t">
          <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} LifeOS. All rights reserved.
          </div>
      </footer>
    </div>
  );
}
