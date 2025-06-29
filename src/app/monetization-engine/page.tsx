
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Check, Magnet, Package, MessageCircle, ArrowRight } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

function MonetizationEnginePageContent() {
  const { deepWorkDefinitions, leadGenDefinitions, offerSystemDefinitions } = useAuth();
  const router = useRouter();

  const salesSystemItems = [
    "Auto-reply template for inbound DMs",
    "Pricing sheet or calendar link",
    "Portfolio/demo breakdown to convert leads",
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
          Monetization Engine
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A framework to convert your attention, skills, and branding into income.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Lead Generation */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Magnet className="h-6 w-6 text-primary" />
              Lead Generation
            </CardTitle>
            <CardDescription>Attract and capture opportunities by consistently performing these actions.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-3">
              {leadGenDefinitions.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
           <CardFooter>
            <Button className="w-full" onClick={() => router.push('/lead-generation')}>
              Go to Lead Gen Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Offer System */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <Package className="h-6 w-6 text-primary" />
              Offer System
            </CardTitle>
            <CardDescription>
              <span className="font-semibold block mt-2">"What do you offer?"</span>
              This is your product/service definition — what people are hiring you for.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
            <ul className="space-y-3">
              {offerSystemDefinitions.map((item, index) => (
                <li key={index} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-green-500 mt-1 flex-shrink-0" />
                  <span className="text-muted-foreground">{item.name}</span>
                </li>
              ))}
            </ul>
          </CardContent>
          <CardFooter>
             <Button className="w-full" onClick={() => router.push('/offer-system')}>
              Go to Offer System Dashboard <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </CardFooter>
        </Card>

        {/* Sales System */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <MessageCircle className="h-6 w-6 text-primary" />
              Sales System
            </CardTitle>
            <CardDescription>Convert leads into commitments.</CardDescription>
          </CardHeader>
          <CardContent className="flex-grow">
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
