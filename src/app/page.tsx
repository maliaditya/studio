
"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, HeartPulse, Briefcase, TrendingUp, DollarSign, GitMerge, Share2, LayoutDashboard, BookCopy, Activity as ActivityIcon, Download, Sparkles, CheckCircle2, Laptop } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

const WINDOWS_EXE_URL = "https://github.com/maliaditya/studio/releases/download/v1.0.0/Studio.Setup.0.1.0.exe";

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
      link: '/strategic-planning'
    }
];

const heroBullets = [
  "Convert friction into clear next actions",
  "Run routines, projects, learning, and review in one loop",
  "Use local or API AI enhancements with explicit control",
];

const quickStats = [
  { label: "Execution Layers", value: "8" },
  { label: "AI-Enhanced Flows", value: "2" },
  { label: "Desktop Release", value: "v1.0.0" },
];

const heroPanelItems = [
  { title: "Botherings -> Routine Links", detail: "Friction gets mapped to executable tasks." },
  { title: "Timeslot-Driven Execution", detail: "Today cards align to your routine schedule." },
  { title: "AI Review Loop", detail: "Explain and rebalance from your real logs." },
];

const FlowCard = ({ icon, title, description, children }: { icon: React.ReactNode, title: string, description: string, children?: React.ReactNode }) => (
  <div className="flex flex-col items-center p-4 border rounded-xl bg-card/80 shadow-sm w-64 text-center h-full backdrop-blur-sm">
    <div className="text-primary/90">{icon}</div>
    <h3 className="mt-2 font-semibold text-foreground text-sm">{title}</h3>
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
        <div className="flex items-start justify-center p-8 overflow-x-auto bg-muted/20 rounded-2xl border border-border/60">
            <div className="flex flex-row items-center gap-8">
                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<HeartPulse size={32} />} title="1. Core States" description="Track your core state signals daily.">
                        <FeatureList features={["Energy + mood awareness", "Daily state signals", "Behavior-state relation", "Self-regulation baseline"]} />
                    </FlowCard>
                    <FlowCard icon={<BrainCircuit size={32} />} title="2. Bothering" description="Capture friction and connect it to action.">
                        <FeatureList features={["External/Mismatch/Constraint botherings", "Bothering to routine links", "Bothering to tasks mapping", "Friction visibility"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<BookCopy size={32} />} title="3. Learning System" description="Skill Tree and learning plans connected to botherings and everyday tasks.">
                        <FeatureList features={["Skill Tree -> Learning Plans", "Plans linked to botherings", "Botherings linked to everyday tasks", "Execution-ready learning flow"]} />
                    </FlowCard>
                </div>

                <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<Share2 size={32} />} title="4. Timesheet & Habit Tracker" description="Track consistency and daily execution quality.">
                        <FeatureList features={["Timesheet logging", "Habit tracking", "Completion trend visibility", "Consistency feedback"]} />
                    </FlowCard>
                    <FlowCard icon={<Briefcase size={32} />} title="5. Resource + Canvas System" description="Knowledge and work context in one connected layer.">
                        <FeatureList features={["Resource cards + folders", "Canvas-linked notes", "Nested popup context", "Cross-linking support"]} />
                    </FlowCard>
                     <FlowCard icon={<ActivityIcon size={32} />} title="6. AI Review Loop (Desktop)" description="AI reviews logs and suggests execution improvements.">
                        <FeatureList features={["Routine rebalance suggestions", "History-aware recommendations", "Guarded apply flow", "Local Ollama integration"]} />
                    </FlowCard>
                </div>

                 <ArrowRight className="w-10 h-10 text-muted-foreground/30 shrink-0" />

                <div className="flex flex-col items-center gap-4 text-center">
                    <FlowCard icon={<LayoutDashboard size={32} />} title="7. Command Center" description="One place to run your whole day.">
                        <FeatureList features={["Today view", "Agenda control", "Cross-module actions", "Execution monitoring"]} />
                    </FlowCard>
                    <FlowCard icon={<GitMerge size={32} />} title="8. Local First Backup + Git Sync" description="Keep data safe and portable by default.">
                        <FeatureList features={["Local-first persistence", "Backup/export flow", "Git sync support", "Cross-device recovery"]} />
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
  const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const [downloadUrl, setDownloadUrl] = useState(WINDOWS_EXE_URL);
  const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);

  useEffect(() => {
    if (currentUser) {
      const hideLanding = localStorage.getItem('dock_hide_landing_page');
      if (hideLanding === 'true') {
        router.push('/my-plate');
      }
    }
  }, [currentUser, router]);

  useEffect(() => {
    if (isDesktopRuntime) return;
    let isMounted = true;
    const loadLatestRelease = async () => {
      try {
        const res = await fetch("/api/latest-windows-release", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { url?: string };
        if (isMounted && typeof data.url === "string" && data.url.length > 0) {
          setDownloadUrl(data.url);
        }
      } catch {
        // Keep fallback URL.
      }
    };
    const loadDownloadCount = async () => {
      try {
        const res = await fetch("/api/download-count", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { count?: number };
        if (isMounted) setDownloadCount(typeof data.count === "number" ? data.count : 0);
      } catch {
        // Ignore API failures and keep count hidden.
      }
    };
    void loadLatestRelease();
    void loadDownloadCount();
    return () => {
      isMounted = false;
    };
  }, [isDesktopRuntime]);

  const handleDownloadClick = async () => {
    try {
      const res = await fetch("/api/download-count", { method: "POST" });
      if (!res.ok) return;
      const data = (await res.json()) as { count?: number };
      if (typeof data.count === "number") {
        setDownloadCount(data.count);
      } else {
        setDownloadCount((prev) => (typeof prev === "number" ? prev + 1 : 1));
      }
    } catch {
      setDownloadCount((prev) => (typeof prev === "number" ? prev + 1 : 1));
    }
  };
  
  const handleProceed = () => {
    if (dontShowAgain && currentUser) {
        safeSetLocalStorageItem('dock_hide_landing_page', 'true');
    }
    router.push(currentUser ? "/my-plate" : "/login");
  };

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-grow">
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.16),transparent_40%),radial-gradient(circle_at_82%_15%,rgba(59,130,246,0.16),transparent_40%),linear-gradient(to_bottom,rgba(17,24,39,0.55),rgba(2,6,23,0.95))]" />
            <div className="relative container mx-auto px-4 py-20 md:py-24">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-200">
                            <Sparkles className="h-3.5 w-3.5" />
                            Personal Operating System
                        </div>
                        <div className="mt-6 flex items-center gap-3 text-primary">
                            <BrainCircuit className="h-10 w-10" />
                            <span className="text-sm font-medium uppercase tracking-[0.22em] text-muted-foreground">Dock Platform</span>
                        </div>
                        <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl md:text-6xl">
                            Build execution momentum every day, not just plans.
                        </h1>
                        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
                            Dock connects your botherings, tasks, schedules, routines, learning plans, resources, and AI review loop into one system so daily action compounds.
                        </p>
                        <ul className="mt-6 grid gap-2 sm:grid-cols-2">
                            {heroBullets.map((bullet) => (
                                <li key={bullet} className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                                    {bullet}
                                </li>
                            ))}
                        </ul>
                        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
                            {currentUser ? (
                                <Button onClick={handleProceed} size="lg" className="text-base font-semibold">
                                    Go to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            ) : (
                                <Button onClick={() => router.push('/login')} size="lg" className="text-base font-semibold">
                                    Launch Your Dock <ArrowRight className="ml-2 h-5 w-5" />
                                </Button>
                            )}
                            {!isDesktopRuntime ? (
                                <>
                                    <Button asChild variant="outline" size="lg" className="text-base font-semibold">
                                        <a href={downloadUrl} target="_blank" rel="noopener noreferrer" onClick={handleDownloadClick}>
                                            <Download className="mr-2 h-4 w-4" />
                                            Download for Windows
                                        </a>
                                    </Button>
                                    {downloadCount !== null ? (
                                        <div className="text-sm text-muted-foreground">
                                            Downloads: <span className="font-semibold text-foreground">{downloadCount.toLocaleString()}</span>
                                        </div>
                                    ) : null}
                                </>
                            ) : null}
                        </div>
                        {currentUser && (
                            <div className="mt-4 flex items-center gap-2">
                                <Checkbox id="dont-show-again" checked={dontShowAgain} onCheckedChange={(checked) => setDontShowAgain(!!checked)} />
                                <Label htmlFor="dont-show-again" className="text-sm font-normal text-muted-foreground">Don&apos;t show this again</Label>
                            </div>
                        )}
                        <div className="mt-8 grid max-w-xl grid-cols-3 gap-3">
                            {quickStats.map((stat) => (
                                <div key={stat.label} className="rounded-lg border border-border/60 bg-background/50 p-3 text-center backdrop-blur-sm">
                                    <div className="text-lg font-semibold text-foreground">{stat.value}</div>
                                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{stat.label}</div>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.1 }}
                        className="mx-auto w-full max-w-md lg:max-w-none"
                    >
                        <Card className="border-border/60 bg-card/70 backdrop-blur-md shadow-2xl shadow-black/35">
                            <CardHeader>
                                <CardTitle className="flex items-center justify-between text-lg">
                                    <span>Dock In Action</span>
                                    <Laptop className="h-5 w-5 text-emerald-300" />
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {heroPanelItems.map((item) => (
                                    <div key={item.title} className="rounded-lg border border-border/60 bg-background/55 p-3">
                                        <p className="text-sm font-semibold text-foreground">{item.title}</p>
                                        <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
                                    </div>
                                ))}
                                <div className="rounded-lg border border-emerald-400/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                                    Desktop includes local Ollama support. Web supports API-based AI providers via settings.
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                </div>
            </div>
        </section>

        <section className="relative py-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,0.96)_0%,rgba(2,6,23,0.985)_30%,rgba(2,6,23,1)_100%)]" />
            <div className="relative container mx-auto px-4">
                <div className="mb-10 text-center">
                    <h2 className="text-3xl font-bold tracking-tight">Four Core Systems</h2>
                    <p className="mx-auto mt-3 max-w-2xl text-muted-foreground">
                        Start with one system or run all four together. Everything shares the same execution context.
                    </p>
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
                        <Card className="text-center h-full border border-border/60 bg-muted/20 hover:bg-muted/45 transition-all hover:shadow-xl hover:shadow-black/15">
                            <CardHeader className="items-center">
                                {card.icon}
                                <CardTitle className="text-lg">{card.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <p className="text-sm text-muted-foreground">{card.description}</p>
                                <Button variant="ghost" className="w-full" onClick={() => router.push(card.link)}>
                                    Open Module <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </CardContent>
                        </Card>
                      </motion.div>
                    ))}
                </div>
            </div>
        </section>
        
        <section className="relative py-20">
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(2,6,23,1)_0%,rgba(3,10,28,0.98)_100%)]" />
            <div className="relative container mx-auto px-4">
            <div className="grid md:grid-cols-1 gap-12 items-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight">The Dock Flywheel</h2>
                    <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                        Closed-loop execution: signal capture -> bothering mapping -> routine and skill execution -> resource context -> AI-assisted rebalance -> strategic visibility.
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
            </div>
        </section>
      </main>
      
      <footer className="border-t border-border/60 bg-[rgba(3,10,28,0.96)]">
          <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Dock. All systems operational.
          </div>
      </footer>
    </div>
  );
}
