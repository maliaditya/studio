
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
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Copy } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onOpenChange: (isOpen: boolean) => void;
}

interface UserSettings {
  carryForward: boolean;
  autoPush: boolean;
  autoPushLimit: number;
  carryForwardEssentials: boolean;
  carryForwardNutrition: boolean;
}

export function SettingsModal({ isOpen, onOpenChange }: SettingsModalProps) {
  const { currentUser, theme, setTheme } = useAuth();
  const { toast } = useToast();
  const [settings, setSettings] = useState<UserSettings>({ 
    carryForward: false,
    autoPush: false,
    autoPushLimit: 100,
    carryForwardEssentials: false,
    carryForwardNutrition: false,
  });

  const settingsKey = currentUser ? `lifeos_settings_${currentUser.username}` : null;

  useEffect(() => {
    if (isOpen && settingsKey) {
      try {
        const storedSettings = localStorage.getItem(settingsKey);
        if (storedSettings) {
          const parsedSettings = JSON.parse(storedSettings);
          setSettings({
            carryForward: parsedSettings.carryForward || false,
            autoPush: parsedSettings.autoPush || false,
            autoPushLimit: parsedSettings.autoPushLimit || 100,
            carryForwardEssentials: parsedSettings.carryForwardEssentials || false,
            carryForwardNutrition: parsedSettings.carryForwardNutrition || false,
          });
        } else {
          setSettings({ carryForward: false, autoPush: false, autoPushLimit: 100, carryForwardEssentials: false, carryForwardNutrition: false });
        }
      } catch (error) {
        console.error("Failed to load settings from localStorage", error);
        setSettings({ carryForward: false, autoPush: false, autoPushLimit: 100, carryForwardEssentials: false, carryForwardNutrition: false });
      }
    }
  }, [isOpen, settingsKey]);

  const handleSettingChange = (key: keyof UserSettings, value: boolean | number) => {
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
    toast({
        title: "Theme Changed",
        description: `Switched to the new theme.`,
    });
  };

  const handleResetLandingPage = () => {
    localStorage.removeItem('lifeos_hide_landing_page');
    toast({
      title: "Preference Reset",
      description: "The landing page will now be shown on your next visit.",
    });
  };

  const handleCopyTemplate = () => {
    const template = {
      "name": "Name of the Specialization",
      "skillAreas": [
        {
          "name": "Name of Skill Area 1",
          "purpose": "A brief description of what this skill area is for.",
          "microSkills": [
            {
              "name": "Name of Micro-Skill 1.1",
              "curiosities": [
                {
                  "name": "Curiosity Name (e.g., Learn CUDA Basics)",
                  "description": "Optional description for the curiosity.",
                  "link": "https://example.com/resource",
                  "estimatedDuration": 120,
                  "objectives": [
                    {
                      "name": "Objective Name (e.g., Understand Memory Management)",
                      "description": "Optional description.",
                      "link": "",
                      "estimatedDuration": 60,
                      "visualizations": [
                        {
                          "name": "Visualization Task (e.g., Code a simple kernel)",
                          "description": "Specific, loggable task.",
                          "link": "",
                          "estimatedDuration": 30
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    };
    navigator.clipboard.writeText(JSON.stringify(template, null, 2));
    toast({
      title: "Template Copied",
      description: "The JSON template for skill upload has been copied to your clipboard.",
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
              className="grid grid-cols-3 gap-4"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="default" id="theme-default" />
                <Label htmlFor="theme-default" className="font-normal">Default</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="matrix" id="theme-matrix" />
                <Label htmlFor="theme-matrix" className="font-normal">Matrix</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="ad-dark" id="theme-ad-dark" />
                <Label htmlFor="theme-ad-dark" className="font-normal">Ad Dark</Label>
              </div>
            </RadioGroup>
          </div>
          
           <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">Cloud Sync</Label>
              <p className="text-sm text-muted-foreground">
                Manage how your data is synced to the cloud.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="auto-push"
                checked={settings.autoPush}
                onCheckedChange={(checked) => handleSettingChange('autoPush', checked)}
              />
              <Label htmlFor="auto-push" className="font-normal">
                Auto Push to Cloud
              </Label>
            </div>
             <div className="flex items-center space-x-2">
              <Label htmlFor="auto-push-limit" className="font-normal flex-shrink-0">
                Push when changes reach:
              </Label>
              <Input
                id="auto-push-limit"
                type="number"
                value={settings.autoPushLimit}
                onChange={(e) => handleSettingChange('autoPushLimit', parseInt(e.target.value, 10) || 0)}
                className="w-24 h-8"
                disabled={!settings.autoPush}
              />
            </div>
          </div>

          <div className="space-y-4 rounded-lg border p-4">
            <div className="space-y-0.5">
              <Label className="text-base">General</Label>
              <p className="text-sm text-muted-foreground">
                Manage general application behavior.
              </p>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                id="carry-forward"
                checked={settings.carryForward}
                onCheckedChange={(checked) => handleSettingChange('carryForward', checked)}
              />
              <Label htmlFor="carry-forward" className="font-normal">
                Carry-forward yesterday's incomplete tasks.
              </Label>
            </div>
             <div className="flex items-center space-x-2">
              <Switch
                id="carry-forward-essentials"
                checked={settings.carryForwardEssentials}
                onCheckedChange={(checked) => handleSettingChange('carryForwardEssentials', checked)}
              />
              <Label htmlFor="carry-forward-essentials" className="font-normal">
                Carry-forward daily essentials.
              </Label>
            </div>
            <div className="flex items-center space-x-2">
                <Switch
                    id="carry-forward-nutrition"
                    checked={settings.carryForwardNutrition}
                    onCheckedChange={(checked) => handleSettingChange('carryForwardNutrition', checked)}
                />
                <Label htmlFor="carry-forward-nutrition" className="font-normal">
                    Carry-forward Nutrition tasks.
                </Label>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="reset-landing" className="font-normal">
                Show the welcome page on next visit.
              </Label>
              <Button id="reset-landing" variant="outline" size="sm" onClick={handleResetLandingPage}>
                Reset
              </Button>
            </div>
            <Separator />
            <div className="flex items-center justify-between">
              <Label htmlFor="copy-template" className="font-normal">
                Copy skill upload JSON template.
              </Label>
              <Button id="copy-template" variant="outline" size="sm" onClick={handleCopyTemplate}>
                <Copy className="mr-2 h-4 w-4" />
                Copy Template
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
