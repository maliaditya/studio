
"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { useState, useEffect } from 'react';

const quadrants = [
  { name: 'Morning', time: '6:00 AM - 12:00 PM', icon: <Sunrise className="h-6 w-6 text-amber-500" /> },
  { name: 'Afternoon', time: '12:00 PM - 6:00 PM', icon: <Sun className="h-6 w-6 text-yellow-500" /> },
  { name: 'Evening', time: '6:00 PM - 12:00 AM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '12:00 AM - 6:00 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> }
];

function HomePageContent() {
  const { currentUser } = useAuth();
  const [currentQuadrant, setCurrentQuadrant] = useState('');

  useEffect(() => {
    const getQuadrant = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 6 && currentHour < 12) return 'Morning';
      if (currentHour >= 12 && currentHour < 18) return 'Afternoon';
      if (currentHour >= 18 && currentHour < 24) return 'Evening';
      return 'Night';
    };
    
    setCurrentQuadrant(getQuadrant());

    const interval = setInterval(() => {
      setCurrentQuadrant(getQuadrant());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-4xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader className="text-center">
            <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Welcome to LifeOS</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
                Hello, <span className="font-semibold text-primary">{currentUser?.username}</span>! Here's a look at your day.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
              {quadrants.map((quad) => (
                <Card 
                  key={quad.name} 
                  className={`transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${
                    currentQuadrant === quad.name 
                    ? 'ring-2 ring-primary shadow-2xl bg-card' 
                    : 'shadow-md bg-card/60'
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium">{quad.name}</CardTitle>
                    {quad.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {quad.time}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      { currentQuadrant === quad.name ? "This is your current focus block." : "Plan your activities for this block."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function Page() {
    return ( <AuthGuard> <HomePageContent /> </AuthGuard> );
}
