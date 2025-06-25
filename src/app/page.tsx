"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit } from 'lucide-react';

function HomePageContent() {
  const { currentUser } = useAuth();
  
  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
       <Card className="max-w-4xl mx-auto shadow-lg">
        <CardHeader className="text-center">
            <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Welcome to LifeOS</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
                Your personal dashboard for growth and productivity.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="text-center">
                <p className="text-lg">
                    Welcome, <span className="font-semibold text-primary">{currentUser?.username}</span>!
                </p>
                <p className="mt-2 text-muted-foreground">
                    Select an option from the navigation bar to get started. More modules coming soon!
                </p>
            </div>
        </CardContent>
       </Card>
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}
