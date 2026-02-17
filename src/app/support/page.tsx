

"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Heart, ArrowLeft, Loader2, Rocket, Calendar } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import type { Release } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { safeSetLocalStorageItem } from '@/lib/safeStorage';

export default function SupportPage() {
    const isMobile = useIsMobile();
    const [showQr, setShowQr] = useState(false);
    const [count, setCount] = useState<number | null>(null);
    const [hasSupported, setHasSupported] = useState(false);
    const [releases, setReleases] = useState<Release[]>([]);
    const [isLoadingReleases, setIsLoadingReleases] = useState(true);

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

        const supported = localStorage.getItem('has_supported_dock');
        if (supported) {
            setHasSupported(true);
        }
    }, []);

    const handleSupportClick = async () => {
        if (hasSupported) {
            handleUpiClick();
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
        } finally {
            handleUpiClick();
        }
    };

    const handleUpiClick = () => {
        if (isMobile) {
            window.open('upi://pay?pa=adityamali33@okaxis&pn=Aditya%20Mali&cu=INR', '_blank', 'noopener,noreferrer');
        } else {
            setShowQr(true);
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
                        <Heart className="text-red-500" /> Support the Project
                    </CardTitle>
                    <CardDescription className="text-center pt-2">
                        {showQr
                            ? "Scan the QR code to pay with any UPI app. Your contribution directly supports the development of the features below. Thank you!"
                            : "Your support helps bring the features below to life. If you see something you're excited about, please consider contributing to the project's development."}
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
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center gap-4">
                             <a 
                                href="https://www.buymeacoffee.com/adityamali98" 
                                target="_blank" 
                                rel="noopener noreferrer"
                            >
                                <img className="h-12 w-auto" src="https://img.buymeacoffee.com/button-api/?text=Buy me a coffee&emoji=&slug=adityamali98&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Keep this project alive" />
                            </a>
                            <Button 
                                onClick={handleSupportClick}
                                className="h-12 w-auto px-6 bg-[#FFDD00] text-black hover:bg-[#FFDD00]/90 font-bold text-lg rounded-lg shadow-md"
                            >
                                Support via UPI
                            </Button>
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
