
"use client";

import React, { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { Package, ArrowRight, DraftingCompass, Calendar, Check } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { format, parseISO } from 'date-fns';

function ProductsPageContent() {
  const { productizationPlans, deepWorkDefinitions } = useAuth();
  const router = useRouter();

  const allReleases = useMemo(() => {
    return Object.entries(productizationPlans || {})
      .flatMap(([topic, plan]) => 
        (plan.releases || []).map(release => {
            const features = (release.focusAreaIds || []).map(id => deepWorkDefinitions.find(def => def.id === id)?.name).filter(Boolean) as string[];
            return { ...release, topic, features: features };
        })
      )
      .sort((a, b) => new Date(a.launchDate).getTime() - new Date(b.launchDate).getTime());
  }, [productizationPlans, deepWorkDefinitions]);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">
          Defined Product Releases
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          A complete overview of all your planned product releases and roadmaps.
        </p>
      </div>

      {allReleases.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {allReleases.map(release => (
            <Card key={release.id} className="flex flex-col">
              <CardHeader>
                <div className="flex justify-between items-start gap-2">
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5 text-primary" />
                      {release.name}
                    </CardTitle>
                    <Badge variant="secondary" className="flex items-center gap-1.5 whitespace-nowrap">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(release.launchDate), 'MMM dd, yyyy')}
                    </Badge>
                </div>
                <CardDescription>From topic: <span className="font-medium text-foreground">{release.topic}</span></CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 flex-grow">
                <div>
                  <h4 className="font-semibold text-sm mb-2">Description</h4>
                  <p className="text-sm text-muted-foreground">{release.description || 'No description provided.'}</p>
                </div>
                {release.features && release.features.length > 0 && (
                    <div>
                        <h4 className="font-semibold text-sm mb-2">Features</h4>
                         <ul className="space-y-2">
                            {release.features.map((feature, index) => (
                                <li key={index} className="flex items-start gap-2 text-sm">
                                    <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                    <span className="text-muted-foreground">{feature}</span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
              </CardContent>
              <CardFooter className="flex flex-col gap-2 p-4">
                <Button variant="outline" className="w-full" onClick={() => router.push('/productization')}>
                    Edit in Productization <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center text-muted-foreground p-12 border-2 border-dashed rounded-lg">
          <DraftingCompass className="h-16 w-16 mb-4" />
          <h3 className="text-xl font-semibold text-foreground">No Products Defined Yet</h3>
          <p className="mt-2 mb-4 max-w-md">
            Go to the Productization page to turn your deep work into concrete product roadmaps.
          </p>
          <Button onClick={() => router.push('/productization')}>
            Create Your First Product Plan <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}

export default function ProductsPage() {
  return ( <AuthGuard> <ProductsPageContent /> </AuthGuard> );
}
