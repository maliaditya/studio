
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Wrench, Repeat, Handshake, Check, Briefcase } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';

function LeverageSystemPageContent() {
  const { deepWorkDefinitions } = useAuth();

  const productizationItems = [
    "Convert OpenGL/CUDA demos to paid courses, kits, templates",
  ];

  const toolBuildingItems = [
    "Create reusable tools (e.g., shaders, engines, compute frameworks)",
    "Launch on Gumroad, Itch.io, Ko-fi",
  ];

  const contentLeverageItems = [
    "One post → newsletter → video → email funnel → passive lead gen",
  ];

  const partnershipItems = [
    "Collaborate with creators or companies",
    "Revenue share, cross-promotion, affiliate",
  ];

  const publishedBundles = useMemo(() => {
    return (deepWorkDefinitions || []).filter(task => 
        task.isReadyForBranding &&
        task.sharingStatus?.twitter &&
        task.sharingStatus?.linkedin &&
        task.sharingStatus?.devto
    );
  }, [deepWorkDefinitions]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Leverage System
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Make your assets and money work even when you don’t.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Productization */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Package className="h-6 w-6 text-primary" />
              Productization
            </CardTitle>
            <CardDescription>Convert demos into paid products.</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2 text-md text-foreground/90">Completed Deep Work Projects</h4>
            <p className="text-sm text-muted-foreground mb-4">These projects are potential candidates for courses, templates, or kits.</p>
            {deepWorkDefinitions.length > 0 ? (
                <ul className="space-y-2 mb-6 max-h-48 overflow-y-auto pr-2">
                    {deepWorkDefinitions.map(def => (
                        <li key={def.id} className="flex items-center gap-3 text-sm p-2 rounded-md bg-muted/50">
                            <Briefcase className="h-4 w-4 text-primary flex-shrink-0" />
                            <span className="truncate" title={`${def.name} (${def.category})`}>{def.name} <span className="text-muted-foreground/80">({def.category})</span></span>
                        </li>
                    ))}
                </ul>
            ) : (
                <p className="text-sm text-muted-foreground mb-6">No deep work projects found. Complete projects on the Deep Work page.</p>
            )}
            <Separator className="my-4"/>
            <h4 className="font-semibold mb-3 text-md text-foreground/90">Productization Ideas</h4>
            <ul className="space-y-3">
              {productizationItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Tool Building */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Wrench className="h-6 w-6 text-primary" />
              Tool Building
            </CardTitle>
            <CardDescription>Create and sell reusable tools.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {toolBuildingItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                   <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Content Leverage */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Repeat className="h-6 w-6 text-primary" />
              Content Leverage
            </CardTitle>
            <CardDescription>Repurpose content for passive lead generation.</CardDescription>
          </CardHeader>
          <CardContent>
            <h4 className="font-semibold mb-2 text-md text-foreground/90">Published Content for Repurposing</h4>
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
                <p className="text-sm text-muted-foreground mb-6">No published content yet. Mark items as 'Ready for Branding' and publish them to see them here.</p>
            )}
            <Separator className="my-4"/>
            <h4 className="font-semibold mb-3 text-md text-foreground/90">Leverage Strategies</h4>
            <ul className="space-y-3">
              {contentLeverageItems.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                   <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        
        {/* Partnerships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Handshake className="h-6 w-6 text-primary" />
              Partnerships
            </CardTitle>
            <CardDescription>Collaborate for mutual growth.</CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3">
              {partnershipItems.map((item, index) => (
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


export default function LeverageSystemPage() {
    return (
        <AuthGuard>
            <LeverageSystemPageContent />
        </AuthGuard>
    )
}
