
"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ArrowRight, DraftingCompass, Copy } from 'lucide-react';
import { useRouter } from 'next/navigation';

function OfferSystemPageContent() {
  const { offerizationPlans, copyOffer } = useAuth();
  const router = useRouter();

  const allOffers = useMemo(() => {
    return Object.entries(offerizationPlans || {})
      .flatMap(([topic, plan]) => 
        (plan.offers || []).map(offer => ({ ...offer, topic }))
      );
  }, [offerizationPlans]);

  const renderTextAsList = (text: string) => {
    if (!text || text.trim() === '') {
      return <p className="text-sm text-muted-foreground">-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item}</li>
          ))}
        </ul>
      );
    }
    return <p className="text-sm text-muted-foreground">{text}</p>;
  };
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Defined Service Offers
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A complete overview of all your tangible service offerings.
        </p>
      </div>

      {allOffers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allOffers.map(offer => (
            <Card key={offer.id} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-primary" />
                  {offer.name}
                </CardTitle>
                <CardDescription>From topic: <span className="font-medium text-foreground">{offer.topic}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div>
                  <h4 className="font-semibold text-sm mb-1">Outcome</h4>
                  {renderTextAsList(offer.outcome)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Audience</h4>
                  {renderTextAsList(offer.audience)}
                </div>
                <div>
                  <h4 className="font-semibold text-sm mb-1">Core Deliverables</h4>
                  {renderTextAsList(offer.deliverables)}
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                      <h4 className="font-semibold text-sm mb-1">Timeline</h4>
                      <p className="text-sm text-muted-foreground">{offer.timeline || '-'}</p>
                    </div>
                     <div>
                      <h4 className="font-semibold text-sm mb-1">Price</h4>
                      <p className="text-sm font-bold text-foreground">{offer.price || '-'}</p>
                    </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-2 p-4">
                <Button variant="outline" className="w-full" onClick={() => copyOffer(offer.topic, offer.id)}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Offer
                </Button>
                <Button variant="outline" className="w-full" onClick={() => router.push('/offerization')}>
                    Edit in Offerization <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
          <DraftingCompass className="h-16 w-16 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Offers Defined Yet</h3>
          <p className="mt-2 mb-4 max-w-md">
            Go to the Offerization page to turn your services into concrete, well-defined offers that you can present to clients.
          </p>
          <Button onClick={() => router.push('/offerization')}>
            Create Your First Offer <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function OfferSystemPage() {
  return ( <AuthGuard> <OfferSystemPageContent /> </AuthGuard> );
}
