
"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface UserSettings {
  carryForward: boolean;
}

export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const { currentUser } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({ carryForward: false });

  const settingsKey = currentUser ? `lifeos_settings_${currentUser.username}` : null;

  useEffect(() => {
    if (isOpen && settingsKey) {
      try {
        const storedSettings = localStorage.getItem(settingsKey);
        if (storedSettings) {
          setSettings(JSON.parse(storedSettings));
        } else {
          // Initialize with default if no settings are found
          setSettings({ carryForward: false });
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
        setSettings({ carryForward: false });
      }
    }
  }, [isOpen, settingsKey]);

  const handleSettingChange = (key: keyof UserSettings, value: boolean) => {
    if (!settingsKey) return;
    
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    try {
      localStorage.setItem(settingsKey, JSON.stringify(newSettings));
      toast({
        title: "Setting Saved",
        description: `Your preferences have been updated.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Could not save your setting.",
        variant: "destructive",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Application Settings</DialogTitle>
          <DialogDescription>
            Manage your application preferences here. Changes are saved automatically.
          </DialogDescription>
        </DialogHeader>
        <div className="py-4">
          <div className="flex items-center justify-between space-x-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label htmlFor="carry-forward" className="text-base">Carry-forward Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically copy yesterday's activities to today's empty schedule.
              </p>
            </div>
            <Switch
              id="carry-forward"
              checked={settings.carryForward}
              onCheckedChange={(checked) => handleSettingChange('carryForward', checked)}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
