
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowRight, BrainCircuit, Heart, HeartPulse, Briefcase, TrendingUp, DollarSign, GitMerge, Share2, LayoutDashboard, BookCopy, Activity as ActivityIcon, Sparkles, CheckCircle2, Laptop, PhoneCall, Download } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { motion } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { LoadingScreen } from '@/components/LoadingScreen';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { fetchAppConfig } from '@/lib/appConfigClient';
import { DESKTOP_PAYMENT_METHODS, DESKTOP_PLAN_DISPLAY_PRICE, formatDesktopPlanPrice, type DesktopPaymentProvider } from '@/lib/desktopAccess';

const SETUP_CALL_URL = process.env.NEXT_PUBLIC_SETUP_CALL_URL || "https://buymeacoffee.com/adityamali98/e/515325";
const IS_EXTERNAL_SETUP_CALL_URL = /^https?:\/\//i.test(SETUP_CALL_URL);

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

const ORGANIZATION_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Dock",
  url: "https://vdock.vercel.app",
  sameAs: ["https://github.com/maliaditya/studio"],
};

const SOFTWARE_APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Dock",
  applicationCategory: "ProductivityApplication",
  operatingSystem: "Web, Windows",
  url: "https://vdock.vercel.app",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  description:
    "Dock is a personal execution system connecting planning, routines, deep work, resources, and strategy.",
};

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
    const {
        currentUser,
        loading,
        desktopAccess,
        desktopAccessLoading,
        ensureCloudSession,
        startDesktopCheckout,
        confirmDesktopCheckout,
        refreshDesktopAccess,
    } = useAuth();
  const router = useRouter();
    const { toast } = useToast();
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const [isPageReady, setIsPageReady] = useState(false);
    const [isDesktopAccessDialogOpen, setIsDesktopAccessDialogOpen] = useState(false);
    const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<DesktopPaymentProvider>('razorpay');
    const [isProcessingDesktopAction, setIsProcessingDesktopAction] = useState(false);
    const [isDownloadingDesktop, setIsDownloadingDesktop] = useState(false);
    const [needsDesktopReauth, setNeedsDesktopReauth] = useState(false);
    const [desktopPlanDisplayPrice, setDesktopPlanDisplayPrice] = useState(DESKTOP_PLAN_DISPLAY_PRICE);
    const [downloadCount, setDownloadCount] = useState<number | null>(null);
  const isDesktopRuntime = typeof window !== "undefined" && Boolean((window as any)?.studioDesktop?.isDesktop);

    const loadRazorpayScript = async () => {
        if (typeof window === 'undefined') return false;
        if ((window as any).Razorpay) return true;

        return await new Promise<boolean>((resolve) => {
            const existing = document.querySelector('script[data-razorpay-checkout="true"]') as HTMLScriptElement | null;
            if (existing) {
                existing.addEventListener('load', () => resolve(true), { once: true });
                existing.addEventListener('error', () => resolve(false), { once: true });
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.async = true;
            script.dataset.razorpayCheckout = 'true';
            script.onload = () => resolve(true);
            script.onerror = () => resolve(false);
            document.body.appendChild(script);
        });
    };

  useEffect(() => {
        let cancelled = false;

        const loadAppConfig = async () => {
            try {
                const config = await fetchAppConfig();
                if (!cancelled && typeof config.desktopPlanPriceInr === 'number') {
                    setDesktopPlanDisplayPrice(formatDesktopPlanPrice(config.desktopPlanPriceInr));
                }
            } catch {
                // Keep the built-in fallback display price.
            }
        };

        void loadAppConfig();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        const loadDownloadCount = async () => {
            try {
                const response = await fetch('/api/download-count', {
                    cache: 'no-store',
                });
                const result = await response.json().catch(() => null);
                if (!response.ok || typeof result?.count !== 'number') {
                    return;
                }
                if (!cancelled) {
                    setDownloadCount(result.count);
                }
            } catch {
                // Keep the count hidden if the endpoint is unavailable.
            }
        };

        void loadDownloadCount();
        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
    if (loading) return;
    if (currentUser) {
      const hideLanding = localStorage.getItem('dock_hide_landing_page');
      if (hideLanding === 'true') {
        router.replace('/my-plate');
        return;
      }
    }
    setIsPageReady(true);
  }, [currentUser, loading, router]);

  useEffect(() => {
    if (isPageReady) return;
    const timeoutId = window.setTimeout(() => {
      setIsPageReady(true);
      console.warn("[landing] Startup loading watchdog released the splash screen.");
    }, 9000);
    return () => window.clearTimeout(timeoutId);
  }, [isPageReady]);

    useEffect(() => {
        if (desktopAccess.currentSession?.provider) {
            setSelectedPaymentMethod(desktopAccess.currentSession.provider);
        }
    }, [desktopAccess.currentSession?.provider]);

  const handleProceed = () => {
    if (dontShowAgain && currentUser) {
        safeSetLocalStorageItem('dock_hide_landing_page', 'true');
    }
    router.push(currentUser ? "/my-plate" : "/login");
  };

    const openDesktopReauthDialog = () => {
        setNeedsDesktopReauth(true);
        setIsPaymentDialogOpen(false);
        setIsDesktopAccessDialogOpen(true);
    };

    const openPaymentMethodsDialog = () => {
        setNeedsDesktopReauth(false);
        setIsDesktopAccessDialogOpen(false);
        setIsPaymentDialogOpen(true);
    };

    const isDesktopReauthError = (message: string) =>
        /cloud sign-in expired|sign in again|session expired/i.test(message);

    const handleDesktopDownload = async () => {
        setIsDownloadingDesktop(true);
        try {
            let response = await fetch('/api/latest-windows-release', {
                credentials: 'include',
                cache: 'no-store',
                headers: currentUser?.username ? { 'x-local-username': currentUser.username } : undefined,
            });
            if (response.status === 401) {
                const refreshed = await ensureCloudSession();
                if (!refreshed.success) {
                    openDesktopReauthDialog();
                    throw new Error(refreshed.message);
                }
                response = await fetch('/api/latest-windows-release', {
                    credentials: 'include',
                    cache: 'no-store',
                    headers: currentUser?.username ? { 'x-local-username': currentUser.username } : undefined,
                });
            }
            const result = await response.json().catch(() => null);
            if (!response.ok || !result?.url) {
                if (response.status === 401 && result?.error) {
                    openDesktopReauthDialog();
                }
                throw new Error(result?.error || 'Failed to fetch the desktop installer.');
            }

            try {
                const countResponse = await fetch('/api/download-count', {
                    method: 'POST',
                });
                const countResult = await countResponse.json().catch(() => null);
                if (countResponse.ok && typeof countResult?.count === 'number') {
                    setDownloadCount(countResult.count);
                }
            } catch {
                // Download access should continue even if the counter update fails.
            }

            window.open(result.url, '_blank', 'noopener,noreferrer');
            toast({ title: 'Desktop Download Ready', description: 'Your installer link has been opened.' });
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to fetch the desktop installer.';
            if (isDesktopReauthError(message)) {
                return;
            }
            toast({
                title: 'Desktop Download Failed',
                description: message,
                variant: 'destructive',
            });
        } finally {
            setIsDownloadingDesktop(false);
        }
    };

    const handleDesktopPricingClick = async () => {
        if (desktopAccess.hasAccess) {
            await handleDesktopDownload();
            return;
        }
        if (currentUser) {
            openPaymentMethodsDialog();
            return;
        }
        setNeedsDesktopReauth(false);
        setIsDesktopAccessDialogOpen(true);
    };

    const handleDesktopCheckoutAction = async () => {
        if (!currentUser) {
            setIsDesktopAccessDialogOpen(true);
            return;
        }

        setIsProcessingDesktopAction(true);
        try {
            if (selectedPaymentMethod === 'razorpay' || selectedPaymentMethod === 'upi') {
                const razorpayProvider = selectedPaymentMethod;
                const result = await startDesktopCheckout(razorpayProvider);
                if (!result.success) {
                    if (isDesktopReauthError(result.message)) {
                        openDesktopReauthDialog();
                        return;
                    }
                    throw new Error(result.message);
                }
                if (!result.sessionId) {
                    throw new Error('Razorpay checkout session was not created.');
                }
                const checkoutData = result.checkoutData as {
                    keyId?: string;
                    orderId?: string;
                    amount?: number;
                    currency?: string;
                    name?: string;
                    description?: string;
                    method?: 'card' | 'upi';
                    prefill?: { name?: string; contact?: string; email?: string };
                } | null;
                if (!checkoutData?.keyId || !checkoutData?.orderId || !checkoutData?.amount || !checkoutData?.currency) {
                    throw new Error('Razorpay checkout details were not returned.');
                }

                const scriptLoaded = await loadRazorpayScript();
                if (!scriptLoaded || !(window as any).Razorpay) {
                    throw new Error('Failed to load Razorpay Checkout.');
                }

                await new Promise<void>((resolve, reject) => {
                    const upiOnlyConfig = checkoutData.method === 'upi'
                        ? {
                              display: {
                                  blocks: {
                                      upi: {
                                          name: 'Pay Using UPI',
                                          instruments: [{ method: 'upi' }],
                                      },
                                  },
                                  sequence: ['block.upi'],
                                  preferences: {
                                      show_default_blocks: false,
                                  },
                              },
                          }
                        : {};

                    const razorpay = new (window as any).Razorpay({
                        key: checkoutData.keyId,
                        amount: checkoutData.amount,
                        currency: checkoutData.currency,
                        name: checkoutData.name || 'Dock',
                        description: checkoutData.description || 'Desktop yearly access',
                        order_id: checkoutData.orderId,
                        prefill: checkoutData.prefill,
                        readonly: {
                            contact: Boolean(checkoutData.prefill?.contact),
                            email: Boolean(checkoutData.prefill?.email),
                        },
                        modal: {
                            ondismiss: () => reject(new Error('Razorpay checkout was cancelled.')),
                        },
                        ...upiOnlyConfig,
                        handler: async (paymentResponse: {
                            razorpay_payment_id: string;
                            razorpay_order_id: string;
                            razorpay_signature: string;
                        }) => {
                            const confirmation = await confirmDesktopCheckout(result.sessionId!, razorpayProvider, {
                                providerSessionId: paymentResponse.razorpay_payment_id,
                                providerOrderId: paymentResponse.razorpay_order_id,
                                providerSignature: paymentResponse.razorpay_signature,
                            });

                            if (!confirmation.success) {
                                reject(new Error(confirmation.message));
                                return;
                            }

                            await refreshDesktopAccess();
                            toast({
                                title: 'Desktop Access Unlocked',
                                description: confirmation.message,
                            });
                            resolve();
                        },
                    });

                    razorpay.open();
                });

                setIsPaymentDialogOpen(false);
                    return;
            }

            const pendingSession =
                desktopAccess.currentSession?.status === 'pending' && desktopAccess.currentSession.provider === selectedPaymentMethod
                    ? desktopAccess.currentSession
                    : null;

            if (pendingSession) {
                const result = await confirmDesktopCheckout(pendingSession.id, pendingSession.provider);
                if (!result.success) {
                    if (isDesktopReauthError(result.message)) {
                        openDesktopReauthDialog();
                        return;
                    }
                    throw new Error(result.message);
                }
                toast({ title: 'Desktop Access Unlocked', description: result.message });
                await refreshDesktopAccess();
                return;
            }

            const result = await startDesktopCheckout(selectedPaymentMethod);
            if (!result.success) {
                if (isDesktopReauthError(result.message)) {
                    openDesktopReauthDialog();
                    return;
                }
                throw new Error(result.message);
            }
            toast({
                title: 'Payment Session Created',
                description: 'The checkout session is recorded. Confirm the placeholder payment step to unlock desktop access.',
            });
        } catch (error) {
            toast({
                title: 'Desktop Checkout Failed',
                description: error instanceof Error ? error.message : 'Unable to continue desktop checkout.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessingDesktopAction(false);
        }
    };

    useEffect(() => {
        if (!currentUser || needsDesktopReauth || !isDesktopAccessDialogOpen) {
            return;
        }

        openPaymentMethodsDialog();
    }, [currentUser, needsDesktopReauth, isDesktopAccessDialogOpen]);

    const pendingSelectedSession =
        desktopAccess.currentSession?.status === 'pending' && desktopAccess.currentSession.provider === selectedPaymentMethod
            ? desktopAccess.currentSession
            : null;
    const paymentActionLabel = desktopAccess.hasAccess
        ? 'Download Desktop'
        : selectedPaymentMethod === 'razorpay'
        ? 'Pay With Razorpay'
        : selectedPaymentMethod === 'upi'
        ? 'Pay With UPI'
        : pendingSelectedSession
        ? 'Confirm Placeholder Payment'
        : 'Create Payment Session';

  if (!isPageReady) {
    return (
      <LoadingScreen
        label="Preparing Dock..."
        subLabel="Checking session and loading your startup experience."
      />
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ORGANIZATION_SCHEMA) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(SOFTWARE_APP_SCHEMA) }}
      />
      <main className="flex-grow">
        <section className="relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(34,197,94,0.16),transparent_40%),radial-gradient(circle_at_82%_15%,rgba(59,130,246,0.16),transparent_40%),linear-gradient(to_bottom,rgba(17,24,39,0.55),rgba(2,6,23,0.95))]" />
            <div className="relative container mx-auto px-4 py-20 md:py-24">
                <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
                    <motion.div
                        initial={false}
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
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium text-foreground">
                            <span className="text-emerald-300">Web</span>
                            <span className="text-muted-foreground">Free</span>
                          </div>
                          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/50 px-3 py-1 text-xs font-medium text-foreground">
                            <span className="text-primary">Desktop</span>
                                                        <span className="text-muted-foreground">{desktopPlanDisplayPrice} yearly</span>
                          </div>
                        </div>
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
                            <Button asChild variant="outline" size="lg" className="text-base font-semibold">
                                <Link href="/support">
                                    <Heart className="mr-2 h-4 w-4" />
                                Pricing & Support
                                </Link>
                            </Button>
                            <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                className="text-base font-semibold"
                                onClick={() => void handleDesktopPricingClick()}
                            >
                                <Download className="mr-2 h-4 w-4" />
                                Download for Windows
                            </Button>
                            <Button asChild variant="outline" size="lg" className="text-base font-semibold">
                                {IS_EXTERNAL_SETUP_CALL_URL ? (
                                    <a href={SETUP_CALL_URL} target="_blank" rel="noopener noreferrer">
                                        <PhoneCall className="mr-2 h-4 w-4" />
                                        Book 1:1 Setup Call
                                    </a>
                                ) : (
                                    <Link href={SETUP_CALL_URL}>
                                        <PhoneCall className="mr-2 h-4 w-4" />
                                        Book 1:1 Setup Call
                                    </Link>
                                )}
                            </Button>
                        </div>
                            <div className="mt-6 grid max-w-2xl gap-3 sm:grid-cols-2">
                              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 p-4 backdrop-blur-sm">
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-200">Web</p>
                                <p className="mt-2 text-2xl font-bold text-foreground">Free</p>
                                <p className="mt-1 text-sm text-muted-foreground">Use Dock on the web at no cost.</p>
                              </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => void handleDesktopPricingClick()}
                                                                className="rounded-2xl border border-primary/20 bg-primary/10 p-4 text-left backdrop-blur-sm transition-colors hover:border-primary/40 hover:bg-primary/15"
                                                            >
                                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Desktop</p>
                                <p className="mt-2 text-2xl font-bold text-foreground">{desktopPlanDisplayPrice} yearly</p>
                                                                <p className="mt-1 text-sm text-muted-foreground">Annual desktop access billed once per year.</p>
                                                                {downloadCount !== null && (
                                                                    <p className="mt-2 text-xs text-muted-foreground">Downloads: {downloadCount.toLocaleString()}</p>
                                                                )}
                                                                <p className="mt-3 text-xs font-medium text-primary">
                                                                    {desktopAccess.hasAccess
                                                                        ? isDownloadingDesktop
                                                                            ? 'Preparing your download...'
                                                                            : 'Access unlocked. Click to download.'
                                                                        : desktopAccess.status === 'pending'
                                                                        ? 'Payment session pending. Click to continue.'
                                                                        : 'Click to unlock desktop access'}
                                                                </p>
                                                            </button>
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
                        <div className="mt-4">
                            <Link href="/changelog" className="text-sm text-primary underline underline-offset-4">
                                View latest changelog updates
                            </Link>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={false}
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
                        initial={false}
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
                    initial={false}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.7 }}
                    className="text-center"
                >
                    <h2 className="text-3xl font-bold tracking-tight">The Dock Flywheel</h2>
                    <p className="mt-4 text-muted-foreground max-w-3xl mx-auto">
                        Closed-loop execution: signal capture {"->"} bothering mapping {"->"} routine and skill execution {"->"} resource context {"->"} AI-assisted rebalance {"->"} strategic visibility.
                    </p>
                </motion.div>
                <motion.div
                    initial={false}
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

                <Dialog open={isDesktopAccessDialogOpen} onOpenChange={setIsDesktopAccessDialogOpen}>
                    <DialogContent className="sm:max-w-md">
                        <DialogHeader>
                            <DialogTitle>
                                {needsDesktopReauth ? 'Sign In Again' : currentUser ? 'Continue To Payment' : 'Unlock Desktop Access'}
                            </DialogTitle>
                            <DialogDescription>
                                {needsDesktopReauth
                                  ? 'Your cloud session expired. Sign in again to continue with desktop payment or download.'
                                  : currentUser
                                  ? 'Your account is already signed in. Continue to choose a payment method for desktop access.'
                                  : 'Sign in or create an account first. After that, you can continue to the desktop payment flow.'}
                            </DialogDescription>
                        </DialogHeader>
                        {currentUser?.username && (
                            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                Signed in as <span className="font-semibold text-foreground">{currentUser.username}</span>
                            </div>
                        )}
                        {currentUser && !needsDesktopReauth ? (
                            <button
                                type="button"
                                onClick={openPaymentMethodsDialog}
                                className="rounded-xl border border-primary/40 bg-primary/10 p-4 text-left transition-colors hover:border-primary/60 hover:bg-primary/15"
                            >
                                <p className="text-sm font-semibold text-foreground">Open Payment Methods</p>
                                <p className="mt-1 text-sm text-muted-foreground">
                                    Choose card, UPI, or PayPal and continue the desktop checkout flow.
                                </p>
                            </button>
                        ) : (
                            <div className={`grid gap-3 ${needsDesktopReauth ? '' : 'sm:grid-cols-2'}`}>
                                <button
                                  type="button"
                                  onClick={() => router.push('/login?mode=login')}
                                  className="rounded-xl border border-border/60 bg-background/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-background"
                                >
                                    <p className="text-sm font-semibold text-foreground">Login</p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {needsDesktopReauth ? 'Sign in again to restore your cloud session.' : 'Access your existing Dock account.'}
                                    </p>
                                </button>
                                {!needsDesktopReauth && (
                                  <button
                                      type="button"
                                      onClick={() => router.push('/login?mode=register')}
                                      className="rounded-xl border border-border/60 bg-background/60 p-4 text-left transition-colors hover:border-primary/40 hover:bg-background"
                                  >
                                      <p className="text-sm font-semibold text-foreground">Register</p>
                                      <p className="mt-1 text-sm text-muted-foreground">Create a new account to buy desktop access.</p>
                                  </button>
                                )}
                            </div>
                        )}
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsDesktopAccessDialogOpen(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>

                <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
                    <DialogContent className="sm:max-w-lg">
                        <DialogHeader>
                            <DialogTitle>Desktop Payment</DialogTitle>
                            <DialogDescription>
                                Select a payment method for desktop access. Entitlement is now stored server-side and download access is gated behind it.
                            </DialogDescription>
                        </DialogHeader>
                        {currentUser?.username && (
                            <div className="rounded-lg border border-border/60 bg-muted/20 px-3 py-2 text-sm text-muted-foreground">
                                Purchasing as <span className="font-semibold text-foreground">{currentUser.username}</span>
                            </div>
                        )}
                        <div className="space-y-3">
                            {DESKTOP_PAYMENT_METHODS.map((method) => (
                                <button
                                    key={method.id}
                                    type="button"
                                    onClick={() => setSelectedPaymentMethod(method.id)}
                                    className={cn(
                                        'w-full rounded-xl border p-4 text-left transition-colors',
                                        selectedPaymentMethod === method.id
                                            ? 'border-primary bg-primary/10'
                                            : 'border-border/60 bg-background/60 hover:border-primary/30 hover:bg-background'
                                    )}
                                >
                                    <p className="text-sm font-semibold text-foreground">{method.title}</p>
                                    <p className="mt-1 text-sm text-muted-foreground">{method.description}</p>
                                </button>
                            ))}
                            <div className="rounded-xl border border-dashed border-border/60 bg-muted/20 p-4 text-sm text-muted-foreground">
                                Selected plan: <span className="font-semibold text-foreground">Desktop • {desktopPlanDisplayPrice} yearly</span>
                                                                <div className="mt-2">Selected method: <span className="font-semibold text-foreground">{DESKTOP_PAYMENT_METHODS.find((method) => method.id === selectedPaymentMethod)?.title || 'Unknown'}</span></div>
                                                                <div className="mt-2">
                                                                    {desktopAccess.hasAccess
                                                                        ? 'This account already has desktop access.'
                                                                        : pendingSelectedSession
                                                                        ? 'A pending checkout session exists for this provider. Confirm it to unlock the download.'
                                                                        : 'This creates a Razorpay checkout session. Access is enabled for one year after server-side payment signature verification.'}
                                                                </div>
                                                                {desktopAccess.currentSession?.id && !desktopAccess.hasAccess && (
                                                                    <div className="mt-2 text-xs text-muted-foreground">
                                                                        Current session: <span className="font-medium text-foreground">{desktopAccess.currentSession.id}</span>
                                                                    </div>
                                                                )}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>
                                Cancel
                            </Button>
                                                        <Button
                                                            type="button"
                                                            onClick={() => {
                                                                if (desktopAccess.hasAccess) {
                                                                    void handleDesktopDownload();
                                                                    return;
                                                                }
                                                                void handleDesktopCheckoutAction();
                                                            }}
                                                            disabled={desktopAccessLoading || isProcessingDesktopAction || isDownloadingDesktop}
                                                        >
                                                                {desktopAccessLoading || isProcessingDesktopAction || isDownloadingDesktop ? 'Please wait...' : paymentActionLabel}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
      </main>
      
      <footer className="border-t border-border/60 bg-[rgba(3,10,28,0.96)]">
          <div className="container mx-auto px-4 py-6 text-center text-muted-foreground text-sm">
              &copy; {new Date().getFullYear()} Dock. All systems operational.
          </div>
      </footer>
    </div>
  );
}
