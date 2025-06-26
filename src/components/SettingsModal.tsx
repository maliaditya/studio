
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
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Separator } from './ui/separator';

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
  const [theme, setTheme] = useState('default');

  const settingsKey = currentUser ? `lifeos_settings_${currentUser.username}` : null;
  const themeKey = 'lifeos_theme'; // Theme is global, not user-specific for now

  useEffect(() => {
    if (isOpen) {
      if (settingsKey) {
        try {
          const storedSettings = localStorage.getItem(settingsKey);
          if (storedSettings) {
            setSettings(JSON.parse(storedSettings));
          } else {
            setSettings({ carryForward: false });
          }
        } catch (error) {
          console.error("Failed to load settings from localStorage", error);
          setSettings({ carryForward: false });
        }
      }
      const storedTheme = localStorage.getItem(themeKey) || 'default';
      setTheme(storedTheme);
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

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    localStorage.setItem(themeKey, newTheme);
    const root = window.document.documentElement;
    
    // Remove all theme classes before adding the new one
    root.classList.remove('theme-matrix');
    
    if (newTheme === 'matrix') {
      root.classList.add('theme-matrix');
    }

    toast({
        title: "Theme Changed",
        description: `Switched to ${newTheme.charAt(0).toUpperCase() + newTheme.slice(1)} theme.`,
    });
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
        <div className="py-4 space-y-6">
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Theme</Label>
              <p className="text-sm text-muted-foreground">
                Select a visual theme for the application.
              </p>
            </div>
            <RadioGroup
              value={theme}
              onValueChange={handleThemeChange}
              className="flex items-center space-x-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="theme-default" />
                <Label htmlFor="theme-default" className="font-normal">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="matrix" id="theme-matrix" />
                <Label htmlFor="theme-matrix" className="font-normal">Matrix</Label>
              </div>
            </RadioGroup>
          </div>
          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Carry-forward Tasks</Label>
              <p className="text-sm text-muted-foreground">
                Automatically copy yesterday's activities to today's empty schedule.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="carry-forward"
                checked={settings.carryForward}
                onCheckedChange={(checked) => handleSettingChange('carryForward', checked)}
              />
              <Label htmlFor="carry-forward" className="font-normal">
                {settings.carryForward ? "Enabled" : "Disabled"}
              </Label>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
