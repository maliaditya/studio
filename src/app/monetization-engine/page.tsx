
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

function MonetizationEnginePageContent() {
  const { brandingTasks } = useAuth();

  const leadGenItems = [
    "Post CTAs (“DM me”, “Link in bio”)",
    "Join job boards, freelance platforms",
    "Send 5 cold DMs daily with custom value",
  ];

  const offerSystemItems = [
    "Freelance Service",
    "Productized Offer",
    "Job Search (Portfolio + Resume Funnel)",
    "Coach/Guide (Session Booking)",
  ];

  const salesSystemItems = [
    "Auto-reply template for inbound DMs",
    "Pricing sheet or calendar link",
    "Portfolio/demo breakdown to convert leads",
  ];
  
  const publishedBundles = useMemo(() => {
    return (brandingTasks || []).filter(task => 
        task.sharingStatus?.twitter &&
        task.sharingStatus?.linkedin &&
        task.sharingStatus?.devto
    );
  }, [brandingTasks]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Monetization Engine
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A framework to convert your attention, skills, and branding into income.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lead Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Magnet className="h-6 w-6 text-primary" />
              Lead Generation
            </CardTitle>
            <CardDescription>Attract and capture opportunities.</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2 text-md text-foreground/90">Published Content to Promote</h4>
            {publishedBundles.length > 0 ? (
                <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
                    {publishedBundles.map(bundle => (
                        <li key={bundle.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                            <Package className="h-4 w-4 text-green-500 flex-shrink-0" />
                            <span>{bundle.name}</span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground mb-6">No published content bundles yet. Publish content from the Personal Branding page to see it here.</p>
            )}
            <Separator className="my-4"/>
            <h4 className="font-semibold mb-3 text-md text-foreground/90">Lead Generation Actions</h4>
            <ul className="space-y-3">
              {leadGenItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Offer System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Package className="h-6 w-6 text-primary" />
              Offer System
            </CardTitle>
            <CardDescription>Define what you sell or provide.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {offerSystemItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Sales System */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageCircle className="h-6 w-6 text-primary" />
              Sales System
            </CardTitle>
            <CardDescription>Convert leads into commitments.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {salesSystemItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function MonetizationEnginePage() {
    return (
        <AuthGuard>
            <MonetizationEnginePageContent />
        </AuthGuard>
    )
}
