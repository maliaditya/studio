
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import type { ProductizationPlan } from '@/types/workout';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

interface MatrixRow {
    topic: string;
    classification: 'product' | 'service';
    gapTypes: string[];
    whatYouCanFill: string;
    coreSolution: string;
    format: string | string[];
    status: 'In Progress' | 'Defined' | 'Planning';
    outcomeGoal: string;
}

function MatrixPageContent() {
  const { deepWorkTopicMetadata, productizationPlans, offerizationPlans } = useAuth();

  const matrixData = useMemo(() => {
    const data: MatrixRow[] = [];

    Object.entries(deepWorkTopicMetadata).forEach(([topic, metadata]) => {
      let plan: ProductizationPlan | undefined;
      let format: string | string[] = '-';
      
      if (metadata.classification === 'product') {
        plan = productizationPlans[topic];
        if (plan) {
            format = plan.productType || '-';
        }
      } else if (metadata.classification === 'service') {
        plan = offerizationPlans[topic];
        if (plan) {
            format = plan.offerTypes || [];
        }
      }

      if (plan && plan.gapAnalysis) {
        const isDefined = metadata.classification === 'product'
            ? !!plan.productType
            : !!(plan.offerTypes && plan.offerTypes.length > 0);

        const status: MatrixRow['status'] = (plan.releases && plan.releases.length > 0)
          ? 'In Progress'
          : isDefined ? 'Defined' : 'Planning';
        
        data.push({
          topic,
          classification: metadata.classification,
          gapTypes: plan.gapAnalysis.gapTypes || [],
          whatYouCanFill: plan.gapAnalysis.whatYouCanFill || '-',
          coreSolution: plan.gapAnalysis.coreSolution || '-',
          format,
          status,
          outcomeGoal: plan.gapAnalysis.outcomeGoal || '-',
        });
      }
    });

    return data;
  }, [deepWorkTopicMetadata, productizationPlans, offerizationPlans]);
  
  const renderTextAsList = (text: string, className?: string) => {
    if (!text || text.trim() === '-' || text.trim() === '') {
      return <p className={cn("text-sm text-muted-foreground", className)}>-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className={cn("list-disc list-inside space-y-1 text-sm text-muted-foreground", className)}>
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item.trim()}</li>
          ))}
        </ul>
      );
    }
    return <p className={cn("text-sm text-muted-foreground", className)}>{text}</p>;
  };

  const getStatusVariant = (status: MatrixRow['status']): "destructive" | "secondary" | "outline" => {
    switch (status) {
      case 'In Progress': return 'destructive';
      case 'Defined': return 'secondary';
      case 'Planning':
      default: return 'outline';
    }
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Matrix</CardTitle>
          <CardDescription>A consolidated view of all your defined product and service initiatives based on your gap analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          {matrixData.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {matrixData.map((row) => (
                    <Card key={row.topic} className="flex flex-col shadow-md hover:shadow-lg transition-shadow">
                        <CardHeader>
                            <div className="flex justify-between items-start gap-4">
                                <CardTitle className="text-lg flex items-center gap-2">
                                  <span>{row.topic}</span>
                                  <Badge variant="outline" className="capitalize text-xs font-medium">{row.classification}</Badge>
                                </CardTitle>
                                <Badge variant={getStatusVariant(row.status)}>{row.status}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="flex-grow flex flex-col space-y-4">
                             <div>
                                <h4 className="font-semibold text-sm">Format</h4>
                                {Array.isArray(row.format) ? (
                                    row.format.length > 0 ? (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {row.format.map((f, i) => <Badge key={`${f}-${i}`} variant="secondary" className="text-xs">{f}</Badge>)}
                                        </div>
                                    ) : (
                                        <p className="text-sm font-medium mt-1">-</p>
                                    )
                                ) : (
                                    <p className="text-sm font-medium mt-1">{row.format}</p>
                                )}
                            </div>
                            <Separator/>
                            <div className='flex-grow'>
                                <h4 className="font-semibold text-sm mb-2">Gap Analysis</h4>
                                {row.gapTypes.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mb-3">
                                        {row.gapTypes.map((gt, i) => <Badge key={`${gt}-${i}`} variant="outline" className="text-xs whitespace-nowrap">{gt}</Badge>)}
                                    </div>
                                )}
                                <h5 className="font-medium text-xs text-muted-foreground">What You Can Fill</h5>
                                {renderTextAsList(row.whatYouCanFill)}
                            </div>
                            <Separator/>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Core Solution</h4>
                                {renderTextAsList(row.coreSolution, "text-foreground font-medium")}
                            </div>
                             <Separator/>
                            <div>
                                <h4 className="font-semibold text-sm mb-1">Outcome Goal</h4>
                                {renderTextAsList(row.outcomeGoal)}
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
           ) : (
            <div className="h-48 flex items-center justify-center text-center text-muted-foreground border-2 border-dashed rounded-lg">
                <p>No product or service plans with gap analysis defined. <br/> Go to Productization or Offerization to get started.</p>
            </div>
           )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function MatrixPage() {
    return (
        <AuthGuard>
            <MatrixPageContent />
        </AuthGuard>
    )
}
