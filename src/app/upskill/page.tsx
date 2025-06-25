"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { BookOpenCheck } from 'lucide-react';

function UpskillPageContent() {
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-primary">
            <BookOpenCheck />
            Upskill Zone
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            This is the Upskill page. Content for tracking your learning and skills development will be added here later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function UpskillPage() {
    return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}
