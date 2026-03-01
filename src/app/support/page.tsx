

"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft, Loader2, Rocket, Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import type { Release } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';
import { trackSupportMetric } from '@/lib/metricsClient';
import { cn } from '@/lib/utils';

type TierId = 'supporter' | 'backer' | 'champion' | 'custom';

const SUPPORT_TIERS: Array<{ id: TierId; title: string; amountUsd: number; tagline: string }> = [
    { id: 'supporter', title: 'Supporter', amountUsd: 5, tagline: 'Quick thank-you boost' },
    { id: 'backer', title: 'Backer', amountUsd: 15, tagline: 'Most common support level' },
    { id: 'champion', title: 'Champion', amountUsd: 49, tagline: 'Big push for faster shipping' },
];
const BMC_PROFILE_URL = 'https://buymeacoffee.com/adityamali98';
const DEFAULT_BMC_TIER_URLS: Record<Exclude<TierId, 'custom'>, string> = {
    supporter: 'https://buymeacoffee.com/adityamali98/e/515315',
    backer: 'https://buymeacoffee.com/adityamali98/e/515318',
    champion: 'https://buymeacoffee.com/adityamali98/e/515322',
};

const BMC_TIER_URLS: Partial<Record<TierId, string | undefined>> = {
    supporter: process.env.NEXT_PUBLIC_BMC_SUPPORTER_URL || DEFAULT_BMC_TIER_URLS.supporter,
    backer: process.env.NEXT_PUBLIC_BMC_BACKER_URL || DEFAULT_BMC_TIER_URLS.backer,
    champion: process.env.NEXT_PUBLIC_BMC_CHAMPION_URL || DEFAULT_BMC_TIER_URLS.champion,
    custom: process.env.NEXT_PUBLIC_BMC_CUSTOM_URL || BMC_PROFILE_URL,
};

export default function SupportPage() {
    const isMobile = useIsMobile();
    const [showQr, setShowQr] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [hasSupported, setHasSupported] = useState(false);
    const [releases, setReleases] = useState<Release[]>([]);
    const [isLoadingReleases, setIsLoadingReleases] = useState(true);
    const [selectedTier, setSelectedTier] = useState<TierId>('backer');
    const [customAmountInput, setCustomAmountInput] = useState('3');

    const parseCustomAmount = (): number => {
        const parsed = Number(customAmountInput);
        return Number.isFinite(parsed) ? parsed : 0;
    };

    const selectedAmountUsd =
        selectedTier === 'custom'
            ? parseCustomAmount()
            : (SUPPORT_TIERS.find((tier) => tier.id === selectedTier)?.amountUsd ?? 15);

    const isCustomAmountValid = selectedTier !== 'custom' || selectedAmountUsd >= 3;
    const selectedTierBmcUrl = BMC_TIER_URLS[selectedTier];
    const hasTierSpecificBmcCheckout = typeof selectedTierBmcUrl === 'string' && selectedTierBmcUrl.trim().length > 0;

    const trackSupportEvent = async (
        event: 'support_page_view' | 'support_cta_click' | 'donation_intent',
        channel?: 'buymeacoffee' | 'upi',
        amountUsd?: number
    ) => {
        try {
            await trackSupportMetric(event, channel, amountUsd);
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

    const handleUpiClick = async () => {
        if (!isCustomAmountValid) return;
        void trackSupportEvent('support_cta_click', 'upi', selectedAmountUsd);
        await markSupporterIfNeeded();
        void trackSupportEvent('donation_intent', 'upi', selectedAmountUsd);

        if (isMobile) {
            window.open('upi://pay?pa=adityamali33@okaxis&pn=Aditya%20Mali&cu=INR', '_blank', 'noopener,noreferrer');
        } else {
            setShowQr(true);
        }
    };

    const handleBuyMeCoffeeClick = async () => {
        if (!isCustomAmountValid) return;
        if (!hasTierSpecificBmcCheckout) return;
        void trackSupportEvent('support_cta_click', 'buymeacoffee', selectedAmountUsd);
        await markSupporterIfNeeded();
        void trackSupportEvent('donation_intent', 'buymeacoffee', selectedAmountUsd);

        const finalUrl = selectedTierBmcUrl!.trim();
        window.open(finalUrl, '_blank', 'noopener,noreferrer');
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
                        <Heart className="text-red-500" /> Support the Project
                    </CardTitle>
                    <CardDescription className="text-center pt-2">
                        {showQr
                            ? "Scan the QR code to pay with any UPI app. Your contribution directly supports the development of the features below. Thank you!"
                            : "Choose a supporter tier. Stage 1 is donations-only: no paywall, no feature gating."}
                    </CardDescription>
                </CardHeader>

                <CardContent>
                    {showQr ? (
                        <div className="flex flex-col items-center justify-center gap-4">
                            <Image
                                src="/QRcode.jpg"
                                data-ai-hint="qr code"
                                alt="UPI QR Code"
                                width={250}
                                height={250}
                                className="rounded-lg border bg-white p-2"
                            />
                            <p className="text-xs text-center text-muted-foreground">
                                Selected support amount: <strong className="text-foreground">${selectedAmountUsd.toFixed(2)}</strong>
                            </p>
                        </div>
                    ) : (
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
                                        <p className="text-lg font-bold">${tier.amountUsd}</p>
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
                                        <p className="text-[11px] text-muted-foreground">Minimum $3</p>
                                    </button>
                                    <div className="flex items-center gap-1">
                                        <span className="text-sm text-muted-foreground">$</span>
                                        <Input
                                            type="number"
                                            min={3}
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
                                    <p className="mt-2 text-xs text-destructive">Custom amount must be at least $3.</p>
                                )}
                            </div>

                            <p className="text-center text-xs text-muted-foreground">
                                Selected amount: <strong className="text-foreground">${selectedAmountUsd.toFixed(2)} USD</strong>
                            </p>
                            <p className="text-center text-[11px] text-muted-foreground">
                                {hasTierSpecificBmcCheckout
                                    ? "Tier-specific Buy Me a Coffee checkout is configured for this selection."
                                    : "Buy Me a Coffee cannot enforce selected tier on profile links. Configure tier URLs to enable exact-amount BMC checkout."}
                            </p>

                            <div className="flex flex-col items-center justify-center gap-3">
                                <Button
                                    onClick={handleBuyMeCoffeeClick}
                                    disabled={!isCustomAmountValid || !hasTierSpecificBmcCheckout}
                                    className="h-11 w-full bg-[#FFDD00] text-black hover:bg-[#FFDD00]/90 font-bold rounded-lg shadow-md"
                                >
                                    {hasTierSpecificBmcCheckout
                                        ? `Buy Me a Coffee ($${selectedAmountUsd.toFixed(0)})`
                                        : "Buy Me a Coffee (Configure Tier URL)"}
                                </Button>
                                <Button
                                    onClick={handleUpiClick}
                                    disabled={!isCustomAmountValid}
                                    variant="outline"
                                    className="h-11 w-full font-semibold rounded-lg"
                                >
                                    Support via UPI
                                </Button>
                            </div>
                        </div>
                    )}
                </CardContent>
                
                <CardFooter className="flex flex-col items-center justify-center gap-4">
                     {showQr && (
                         <Button variant="outline" onClick={() => setShowQr(false)} className="w-full">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back to options
                        </Button>
                     )}
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
