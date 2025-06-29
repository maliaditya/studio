
"use client";

import React, { useMemo } from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import type { ProductizationPlan } from '@/types/workout';
import { cn } from '@/lib/utils';

interface MatrixRow {
    topic: string;
    classification: 'product' | 'service';
    gapTypes: string[];
    whatYouCanFill: string;
    coreSolution: string;
    offerType: string;
    status: 'In Progress' | 'Defined' | 'Planning';
    outcomeGoal: string;
}

function MatrixPageContent() {
  const { deepWorkTopicMetadata, productizationPlans, offerizationPlans } = useAuth();

  const matrixData = useMemo(() => {
    const data: MatrixRow[] = [];

    Object.entries(deepWorkTopicMetadata).forEach(([topic, metadata]) => {
      let plan: ProductizationPlan | undefined;
      if (metadata.classification === 'product') {
        plan = productizationPlans[topic];
      } else if (metadata.classification === 'service') {
        plan = offerizationPlans[topic];
      }

      if (plan && plan.gapAnalysis) {
        const status: MatrixRow['status'] = (plan.releases && plan.releases.length > 0)
          ? 'In Progress'
          : plan.productType ? 'Defined' : 'Planning';
        
        data.push({
          topic,
          classification: metadata.classification,
          gapTypes: plan.gapAnalysis.gapTypes || [],
          whatYouCanFill: plan.gapAnalysis.whatYouCanFill || '-',
          coreSolution: plan.gapAnalysis.coreSolution || '-',
          offerType: plan.productType || '-',
          status,
          outcomeGoal: plan.gapAnalysis.outcomeGoal || '-',
        });
      }
    });

    return data;
  }, [deepWorkTopicMetadata, productizationPlans, offerizationPlans]);
  
  const renderTextAsList = (text: string, className?: string) => {
    if (!text || text.trim() === '-' || text.trim() === '') {
      return <p className={cn("text-xs text-muted-foreground", className)}>-</p>;
    }
  
    if (text.includes('\n')) {
      return (
        <ul className={cn("list-disc list-inside space-y-1 text-xs", className)}>
          {text.split('\n').filter(line => line.trim()).map((item, index) => (
            <li key={index}>{item.trim()}</li>
          ))}
        </ul>
      );
    }
    return <p className={cn("text-xs", className)}>{text}</p>;
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader>
          <CardTitle>Strategic Matrix</CardTitle>
          <CardDescription>A consolidated view of all your defined product and service initiatives based on your gap analysis.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[150px]">Topic</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Gap Type</TableHead>
                  <TableHead>What You Can Fill</TableHead>
                  <TableHead>Core Solution</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Outcome Goal</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {matrixData.length > 0 ? (
                  matrixData.map((row) => (
                    <TableRow key={row.topic}>
                      <TableCell className="font-medium align-top">{row.topic}</TableCell>
                      <TableCell className="align-top">
                        <p className="font-medium text-xs">{row.offerType}</p>
                        <Badge variant={row.classification === 'product' ? 'default' : 'secondary'} className="capitalize text-xs mt-1">{row.classification}</Badge>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="flex flex-wrap gap-1">
                          {row.gapTypes.map((gt, i) => <Badge key={`${gt}-${i}`} variant="outline" className="text-xs whitespace-nowrap">{gt}</Badge>)}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        {renderTextAsList(row.whatYouCanFill)}
                      </TableCell>
                      <TableCell className="align-top">
                        {renderTextAsList(row.coreSolution, "font-semibold")}
                      </TableCell>
                       <TableCell className="align-top">
                          <Badge variant={row.status === 'In Progress' ? 'destructive' : 'outline'}>{row.status}</Badge>
                       </TableCell>
                      <TableCell className="align-top">
                        {renderTextAsList(row.outcomeGoal)}
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      No product or service plans with gap analysis defined. Go to Productization or Offerization to get started.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
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
