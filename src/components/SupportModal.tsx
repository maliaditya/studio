"use client";

import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from './ui/button';
import { Heart } from 'lucide-react';

interface SupportModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

export function SupportModal({ isOpen, onOpenChange }: SupportModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Heart className="text-red-500" /> Support the Project
          </DialogTitle>
          <DialogDescription>
            Your support helps keep this project alive and running. Thank you for considering a contribution!
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center gap-4 py-4">
          <a href="https://www.buymeacoffee.com/adityamali98" target="_blank" rel="noopener noreferrer">
            <img className="h-12 w-auto" src="https://img.buymeacoffee.com/button-api/?text=Keep this project alive&emoji=&slug=adityamali98&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="Keep this project alive" />
          </a>
          <Button asChild variant="outline" className="w-full max-w-xs">
            <a href="upi://pay?pa=9765402942@ybl&pn=YourName&cu=INR">
              Support via UPI
            </a>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
