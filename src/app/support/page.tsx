

"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, Loader2, Rocket, Calendar } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Release } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { trackSupportMetric } from '@/lib/metricsClient';
import { cn } from '@/lib/utils';
import { fetchAppConfig } from '@/lib/appConfigClient';
import { DESKTOP_PLAN_DISPLAY_PRICE, formatDesktopPlanPrice } from '@/lib/desktopAccess';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

type TierId = 'supporter' | 'backer' | 'champion' | 'custom';

const SUPPORT_TIERS: Array<{ id: TierId; title: string; amountInr: number; tagline: string }> = [
    { id: 'supporter', title: 'Supporter', amountInr: 199, tagline: 'Quick thank-you boost' },
    { id: 'backer', title: 'Backer', amountInr: 499, tagline: 'Most common support level' },
    { id: 'champion', title: 'Champion', amountInr: 1499, tagline: 'Big push for faster shipping' },
];
const SUPPORT_AMOUNT_FORMATTER = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
});

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

export default function SupportPage() {
    const { toast } = useToast();
    const { currentUser } = useAuth();
    const [count, setCount] = useState<number | null>(null);
    const [hasSupported, setHasSupported] = useState(false);
    const [releases, setReleases] = useState<Release[]>([]);
    const [isLoadingReleases, setIsLoadingReleases] = useState(true);
    const [selectedTier, setSelectedTier] = useState<TierId>('backer');
    const [customAmountInput, setCustomAmountInput] = useState('99');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [desktopPlanDisplayPrice, setDesktopPlanDisplayPrice] = useState(DESKTOP_PLAN_DISPLAY_PRICE);

    useEffect(() => {
        let cancelled = false;

        const loadAppConfig = async () => {
            try {
                const config = await fetchAppConfig();
                if (!cancelled && typeof config.desktopPlanPriceInr === 'number') {
                    setDesktopPlanDisplayPrice(formatDesktopPlanPrice(config.desktopPlanPriceInr));
                }
            } catch {
                // Keep the default display price.
            }
        };

        void loadAppConfig();
        return () => {
            cancelled = true;
        };
    }, []);

    const parseCustomAmount = (): number => {
        const parsed = Number(customAmountInput);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const selectedAmountInr =
        selectedTier === 'custom'
            ? parseCustomAmount()
            : (SUPPORT_TIERS.find((tier) => tier.id === selectedTier)?.amountInr ?? 499);

    const isCustomAmountValid = selectedTier !== 'custom' || selectedAmountInr >= 99;

    const trackSupportEvent = async (
        event: 'support_page_view' | 'support_cta_click' | 'donation_intent',
        channel?: 'razorpay',
        amountInr?: number
    ) => {
        try {
            await trackSupportMetric(event, channel, amountInr);
        } catch {
            // Metrics should never block support flow.
        }
    };

    useEffect(() => {
        const fetchCount = async () => {
            try {
                const response = await fetch('/api/support-count');
                const data = await response.json();
                setCount(data.count);
            } catch (error) {
                console.error("Failed to fetch support count:", error);
            }
        };

        const fetchReleases = async () => {
            setIsLoadingReleases(true);
            try {
              const response = await fetch('/api/publish-releases');
              if (!response.ok) throw new Error('Failed to fetch releases');
              const data = await response.json();
              const futureReleases = (data.releases || [])
                .filter((r: Release) => {
                  try {
                    const launchDate = parseISO(r.launchDate);
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    return launchDate >= today;
                  } catch {
                    return false;
                  }
                })
                .sort((a: Release, b: Release) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
              setReleases(futureReleases);
            } catch (error) {
              console.error("Failed to fetch releases:", error);
            } finally {
              setIsLoadingReleases(false);
            }
        };

        fetchCount();
        fetchReleases();

        const supportViewSessionKey = 'metrics_support_page_view_sent';
        const hasTrackedView = sessionStorage.getItem(supportViewSessionKey);
        if (!hasTrackedView) {
            void trackSupportEvent('support_page_view');
            sessionStorage.setItem(supportViewSessionKey, '1');
        }

        const supported = localStorage.getItem('has_supported_dock');
        if (supported) {
            setHasSupported(true);
        }
    }, []);

    const markSupporterIfNeeded = async () => {
        if (hasSupported) {
            return;
        }

        try {
            const response = await fetch('/api/support-count', { method: 'POST' });
            const data = await response.json();
            setCount(data.count);
            safeSetLocalStorageItem('has_supported_dock', 'true');
            setHasSupported(true);
        } catch (error) {
            console.error("Failed to update support count:", error);
        }
    };

    const handleRazorpayClick = async () => {
        if (!isCustomAmountValid) return;
        setIsProcessingPayment(true);
        void trackSupportEvent('support_cta_click', 'razorpay', selectedAmountInr);

        try {
            const startResponse = await fetch('/api/support-payment/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amountInr: selectedAmountInr,
                    username: currentUser?.username,
                    email: currentUser?.email,
                }),
            });
            const startResult = await startResponse.json().catch(() => null) as {
                error?: string;
                sessionId?: string;
                checkoutData?: {
                    keyId?: string;
                    orderId?: string;
                    amount?: number;
                    currency?: string;
                    name?: string;
                    description?: string;
                    prefill?: { name?: string; contact?: string; email?: string };
                } | null;
            } | null;

            if (!startResponse.ok || !startResult?.sessionId || !startResult.checkoutData?.keyId || !startResult.checkoutData?.orderId) {
                throw new Error(startResult?.error || 'Failed to start Razorpay support checkout.');
            }

            const scriptLoaded = await loadRazorpayScript();
            if (!scriptLoaded || !(window as any).Razorpay) {
                throw new Error('Failed to load Razorpay Checkout.');
            }

            await new Promise<void>((resolve, reject) => {
                const razorpay = new (window as any).Razorpay({
                    key: startResult.checkoutData!.keyId,
                    amount: startResult.checkoutData!.amount,
                    currency: startResult.checkoutData!.currency,
                    name: startResult.checkoutData!.name || 'Dock',
                    description: startResult.checkoutData!.description || 'Support Dock',
                    order_id: startResult.checkoutData!.orderId,
                    prefill: startResult.checkoutData!.prefill,
                    readonly: {
                        contact: Boolean(startResult.checkoutData?.prefill?.contact),
                        email: Boolean(startResult.checkoutData?.prefill?.email),
                    },
                    modal: {
                        ondismiss: () => reject(new Error('Razorpay checkout was cancelled.')),
                    },
                    handler: async (paymentResponse: {
                        razorpay_payment_id: string;
                        razorpay_order_id: string;
                        razorpay_signature: string;
                    }) => {
                        const confirmResponse = await fetch('/api/support-payment/confirm', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sessionId: startResult.sessionId,
                                providerSessionId: paymentResponse.razorpay_payment_id,
                                providerOrderId: paymentResponse.razorpay_order_id,
                                providerSignature: paymentResponse.razorpay_signature,
                                amountInr: selectedAmountInr,
                            }),
                        });
                        const confirmResult = await confirmResponse.json().catch(() => null) as { error?: string; success?: boolean; message?: string } | null;

                        if (!confirmResponse.ok || !confirmResult?.success) {
                            reject(new Error(confirmResult?.error || confirmResult?.message || 'Razorpay payment verification failed.'));
                            return;
                        }

                        await markSupporterIfNeeded();
                        void trackSupportEvent('donation_intent', 'razorpay', selectedAmountInr);
                        toast({
                            title: 'Support Received',
                            description: confirmResult.message || `Thanks for supporting Dock with ${SUPPORT_AMOUNT_FORMATTER.format(selectedAmountInr)}.`,
                        });
                        resolve();
                    },
                    theme: {
                        color: '#4F5DFF',
                    },
                });

                razorpay.open();
            });
        } catch (error) {
            toast({
                title: 'Payment Error',
                description: error instanceof Error ? error.message : 'Failed to open Razorpay support checkout.',
                variant: 'destructive',
            });
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const renderReleases = () => {
        if (isLoadingReleases) {
          return (
            <div className="flex justify-center items-center h-24">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          );
        }
        
        if (releases.length === 0) {
          return (
            <>
              <Separator className="my-4" />
              <p className="text-sm text-center text-muted-foreground py-4">
                No upcoming releases are planned at the moment. Your support will help fund what's next!
              </p>
            </>
          );
        }
    
        return (
          <>
            <Separator className="my-4" />
            <div className="space-y-3">
              <h4 className="font-semibold text-center text-sm flex items-center justify-center gap-2"><Rocket className="h-4 w-4"/> Upcoming Dock Releases</h4>
              <ul className="space-y-3">
                {releases.map(release => (
                  <li key={release.id} className="text-sm p-3 rounded-md bg-muted/50">
                    <div className="flex justify-between items-center">
                        <span className="font-medium">{release.name}</span>
                        <Badge variant="secondary" className="flex items-center gap-1.5">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(release.launchDate), 'MMM dd')}
                        </Badge>
                    </div>
                    {release.features && release.features.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-muted-foreground/20">
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground text-xs">
                                {release.features.map((feature, index) => (
                                    <li key={index}>{feature}</li>
                                ))}
                            </ul>
                        </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </>
        );
    };

    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-4">
            <Card className="w-full max-w-md shadow-2xl">
                <CardHeader>
                    <CardTitle className="flex items-center justify-center gap-2 text-2xl">
                        <Heart className="text-red-500" /> Pricing & Support
                    </CardTitle>
                    <CardDescription className="text-center pt-2">
                        {`Dock web stays free. Desktop access is ${desktopPlanDisplayPrice} yearly. If you want to support development beyond that, you can contribute below.`}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    <div className="space-y-4">
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                            {SUPPORT_TIERS.map((tier) => (
                                <button
                                    key={tier.id}
                                    type="button"
                                    onClick={() => setSelectedTier(tier.id)}
                                    className={cn(
                                        "rounded-lg border p-3 text-left transition-colors",
                                        selectedTier === tier.id
                                            ? "border-primary bg-primary/10"
                                            : "border-border bg-muted/30 hover:bg-muted/50"
                                    )}
                                >
                                    <p className="text-sm font-semibold">{tier.title}</p>
                                    <p className="text-lg font-bold">{SUPPORT_AMOUNT_FORMATTER.format(tier.amountInr)}</p>
                                    <p className="text-[11px] text-muted-foreground">{tier.tagline}</p>
                                </button>
                            ))}
                        </div>

                        <div className={cn(
                            "rounded-lg border p-3",
                            selectedTier === 'custom' ? "border-primary bg-primary/10" : "border-border bg-muted/30"
                        )}>
                            <div className="flex items-center justify-between gap-3">
                                <button
                                    type="button"
                                    onClick={() => setSelectedTier('custom')}
                                    className="text-left"
                                >
                                    <p className="text-sm font-semibold">Custom</p>
                                    <p className="text-[11px] text-muted-foreground">Minimum {SUPPORT_AMOUNT_FORMATTER.format(99)}</p>
                                </button>
                                <div className="flex items-center gap-1">
                                    <span className="text-sm text-muted-foreground">Rs.</span>
                                    <Input
                                        type="number"
                                        min={99}
                                        step="1"
                                        value={customAmountInput}
                                        onChange={(e) => {
                                            setSelectedTier('custom');
                                            setCustomAmountInput(e.target.value);
                                        }}
                                        className="h-9 w-24"
                                    />
                                </div>
                            </div>
                            {!isCustomAmountValid && (
                                <p className="mt-2 text-xs text-destructive">Custom amount must be at least {SUPPORT_AMOUNT_FORMATTER.format(99)}.</p>
                            )}
                        </div>

                        <p className="text-center text-xs text-muted-foreground">
                            Selected amount: <strong className="text-foreground">{SUPPORT_AMOUNT_FORMATTER.format(selectedAmountInr)}</strong>
                        </p>

                        <div className="flex flex-col items-center justify-center gap-3">
                            <Button
                                onClick={handleRazorpayClick}
                                disabled={!isCustomAmountValid || isProcessingPayment}
                                className="h-11 w-full bg-[#0B72E7] text-white hover:bg-[#0B72E7]/90 font-bold rounded-lg shadow-md"
                            >
                                {isProcessingPayment
                                    ? 'Opening Razorpay...'
                                    : `Pay with Razorpay (${SUPPORT_AMOUNT_FORMATTER.format(selectedAmountInr)})`}
                            </Button>
                        </div>
                    </div>
                </CardContent>
                
                <CardFooter className="flex flex-col items-center justify-center gap-4">
                     <div className="text-center text-xs text-muted-foreground">
                        {count !== null ? (
                            <p>
                                You'll be joining <strong className="text-primary">{count}</strong> other supporter{count !== 1 ? 's' : ''}. Thank you!
                            </p>
                        ) : (
                            <p>Loading support count...</p>
                        )}
                    </div>
                </CardFooter>
                 {renderReleases()}
            </Card>
        </div>
    );
}
