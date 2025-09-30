

"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { Heart, ArrowLeft, Calendar, Rocket, Loader2 } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import type { Release } from '@/types/workout';
import { format, parseISO } from 'date-fns';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';

interface SupportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SupportModal({ isOpen, onOpenChange }: SupportModalProps) {
  const isMobile = useIsMobile();
  const [showQr, setShowQr] = useState(false);
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Reset state when the modal is closed to ensure it starts fresh next time.
    if (!isOpen) {
      setShowQr(false);
      setIsLoading(true); // Reset loading state
      setReleases([]); // Clear old data
    } else {
      // Fetch releases when modal opens
      const fetchReleases = async () => {
        setIsLoading(true);
        try {
          const response = await fetch('/api/publish-releases');
          if (!response.ok) throw new Error('Failed to fetch releases');
          const data = await response.json();
          const futureReleases = (data.releases || [])
            .filter((r: Release) => {
              try {
                // Ensure date is valid and in the future or today
                const launchDate = parseISO(r.launchDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Set to beginning of today for comparison
                return launchDate >= today;
              } catch {
                return false;
              }
            })
            .sort((a: Release, b: Release) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
          setReleases(futureReleases);
        } catch (error) {
          console.error("Failed to fetch releases:", error);
          // Silently fail, don't show an error to the user in the support modal
        } finally {
          setIsLoading(false);
        }
      };

      fetchReleases();
    }
  }, [isOpen]);
  
  const handleCoffeeClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    window.open('https://www.buymeacoffee.com/adityamali98', '_blank', 'noopener,noreferrer');
  };

  const handleUpiClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();

    if (isMobile) {
      // On mobile, attempt to open the UPI app directly.
      window.open('upi://pay?pa=adityamali33@okaxis&pn=Aditya%20Mali&cu=INR', '_blank', 'noopener,noreferrer');
    } else {
      // On desktop, show the QR code.
      setShowQr(true);
    }
  };
  
  const renderReleases = () => {
    if (isLoading) {
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
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-red-500" /> Support for Future Releases
          </DialogTitle>
          <DialogDescription>
            {showQr
              ? "Scan the QR code below to pay with any UPI app. Your contribution directly supports the development of these upcoming Dock features. Thank you!"
              : "Your support helps bring the features below to life. If you see something you're excited about, please consider contributing to the project's development."}
          </DialogDescription>
        </DialogHeader>

        {showQr ? (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <Image
              src="/QRcode.jpg"
              data-ai-hint="qr code"
              alt="UPI QR Code"
              width={250}
              height={250}
              className="rounded-lg border bg-white p-2"
            />
            <Button variant="outline" onClick={() => setShowQr(false)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to options
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <a 
              href="https://www.buymeacoffee.com/adityamali98" 
              target="_blank" 
              rel="noopener noreferrer"
              onClick={handleCoffeeClick}
            >
              <img className="h-12 w-auto" src="https://img.buymeacoffee.com/button-api/?text=By me a coffee&emoji=&slug=adityamali98&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Keep this project alive" />
            </a>
            <Button 
              onClick={handleUpiClick} 
              className="h-12 w-auto px-6 bg-[#FFDD00] text-black hover:bg-[#FFDD00]/90 font-bold text-lg rounded-lg shadow-md"
            >
                Support via UPI
            </Button>
          </div>
        )}
        
        {renderReleases()}
        
      </DialogContent>
    </Dialog>
  );
}
