
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
import { Heart, ArrowLeft } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface SupportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onIncrementCount: () => void;
}

export function SupportModal({ isOpen, onOpenChange, onIncrementCount }: SupportModalProps) {
  const isMobile = useIsMobile();
  const [showQr, setShowQr] = useState(false);

  useEffect(() => {
    // Reset QR view when the modal is closed to ensure it starts fresh next time.
    if (!isOpen) {
      setShowQr(false);
    }
  }, [isOpen]);
  
  const handleCoffeeClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onIncrementCount();
    window.open('https://www.buymeacoffee.com/adityamali98', '_blank', 'noopener,noreferrer');
  };

  const handleUpiClick = (event: React.MouseEvent<HTMLElement>) => {
    event.preventDefault();
    onIncrementCount();

    if (isMobile) {
      // On mobile, attempt to open the UPI app directly.
      window.open('upi://pay?pa=adityamali33@okaxis&pn=Aditya%20Mali&cu=INR', '_blank', 'noopener,noreferrer');
    } else {
      // On desktop, show the QR code.
      setShowQr(true);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-red-500" /> Support the Project
          </DialogTitle>
          <DialogDescription>
            {showQr
              ? "Scan the QR code below to pay with any UPI app. Thanks for your support!"
              : "Your support helps keep this project alive. Clicking a link will open a new tab and count as one contribution. Thank you!"}
          </DialogDescription>
        </DialogHeader>

        {showQr ? (
          <div className="flex flex-col items-center justify-center gap-4 py-4">
            <Image
              src="/QRcode.jpg"
              data-ai-hint="qr code"
              alt="UPI QR Code - Add upi-qr-code.png to the /public folder to display it here."
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
      </DialogContent>
    </Dialog>
  );
}
