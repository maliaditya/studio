
"use client";

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from './ui/label';

interface DemoTokenModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
  onSubmit: (token: string) => void;
}

export function DemoTokenModal({ isOpen, onOpenChange, onSubmit }: DemoTokenModalProps) {
  const [token, setToken] = useState('');

  const handleSubmit = () => {
    onSubmit(token);
    onOpenChange(false);
    setToken('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Demo Account Update</DialogTitle>
          <DialogDescription>
            Please provide the override token to update the read-only demo account data.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <Label htmlFor="demo-token" className="sr-only">
            Demo Override Token
          </Label>
          <Input
            id="demo-token"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="Enter your override token"
            autoFocus
          />
        </div>
        <DialogFooter>
          <Button type="submit" onClick={handleSubmit} disabled={!token.trim()}>
            Submit and Push Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
