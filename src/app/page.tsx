
"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Heart, Briefcase, TrendingUp, DollarSign, GitMerge, Package } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';

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
            <div className="grid md:grid-cols-2 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <h2 className="text-3xl font-bold">From Learning to Earning</h2>
                    <p className="mt-4 text-muted-foreground">
                        LifeOS is built on a simple but powerful premise: what you learn should be applied, and what you apply can be monetized. Our integrated modules create a seamless pipeline from skill acquisition to value creation.
                    </p>
                    <ul className="mt-6 space-y-4">
                        <li className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-full"><GitMerge className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-semibold">Connect Everything</h4>
                                <p className="text-sm text-muted-foreground">Link learning tasks to deep work projects, and projects to content bundles, creating a clear and actionable mind map of your strategy.</p>
                            </div>
                        </li>
                        <li className="flex items-start gap-4">
                            <div className="flex-shrink-0 bg-primary/10 text-primary p-2 rounded-full"><Package className="h-5 w-5" /></div>
                            <div>
                                <h4 className="font-semibold">Systematize Your Genius</h4>
                                <p className="text-sm text-muted-foreground">Use the Productization and Offerization frameworks to turn your unique knowledge into sellable products and services.</p>
                            </div>
                        </li>
                    </ul>
                </motion.div>
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                >
                    <Card className="shadow-2xl">
                        <CardContent className="p-6">
                           <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                               <img src="https://placehold.co/600x400.png" data-ai-hint="dashboard product" alt="LifeOS Dashboard Screenshot" className="rounded-md"/>
                           </div>
                        </CardContent>
                    </Card>
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
