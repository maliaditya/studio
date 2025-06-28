"use client";

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Package, Wrench, Repeat, Handshake, Check } from 'lucide-react';

function LeverageSystemPageContent() {
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
