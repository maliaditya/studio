"use client";

import { AuthGuard } from '@/components/AuthGuard';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';
import { BrainCircuit, Sunrise, Sun, Sunset, Moon, MoonStar, CloudSun } from 'lucide-react';
import { useState, useEffect } from 'react';

const slots = [
  { name: 'Late Night', time: '12 AM - 4 AM', icon: <Moon className="h-6 w-6 text-indigo-400" /> },
  { name: 'Dawn', time: '4 AM - 8 AM', icon: <Sunrise className="h-6 w-6 text-orange-400" /> },
  { name: 'Morning', time: '8 AM - 12 PM', icon: <Sun className="h-6 w-6 text-yellow-400" /> },
  { name: 'Afternoon', time: '12 PM - 4 PM', icon: <CloudSun className="h-6 w-6 text-sky-500" /> },
  { name: 'Evening', time: '4 PM - 8 PM', icon: <Sunset className="h-6 w-6 text-purple-500" /> },
  { name: 'Night', time: '8 PM - 12 AM', icon: <MoonStar className="h-6 w-6 text-indigo-500" /> }
];

function HomePageContent() {
  const { currentUser } = useAuth();
  const [currentSlot, setCurrentSlot] = useState('');

  useEffect(() => {
    const getSlot = () => {
      const currentHour = new Date().getHours();
      if (currentHour >= 0 && currentHour < 4) return 'Late Night';
      if (currentHour >= 4 && currentHour < 8) return 'Dawn';
      if (currentHour >= 8 && currentHour < 12) return 'Morning';
      if (currentHour >= 12 && currentHour < 16) return 'Afternoon';
      if (currentHour >= 16 && currentHour < 20) return 'Evening';
      return 'Night';
    };
    
    setCurrentSlot(getSlot());

    const interval = setInterval(() => {
      setCurrentSlot(getSlot());
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <Card className="max-w-5xl mx-auto shadow-lg border-0 bg-transparent">
        <CardHeader className="text-center">
            <BrainCircuit className="mx-auto h-16 w-16 text-primary mb-4" />
            <CardTitle className="text-3xl font-bold">Welcome to LifeOS</CardTitle>
            <CardDescription className="text-lg text-muted-foreground">
                Hello, <span className="font-semibold text-primary">{currentUser?.username}</span>! Here's a look at your day.
            </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
              {slots.map((slot) => (
                <Card 
                  key={slot.name} 
                  className={`transition-all duration-300 ease-in-out transform hover:-translate-y-1 ${
                    currentSlot === slot.name 
                    ? 'ring-2 ring-primary shadow-2xl bg-card' 
                    : 'shadow-md bg-card/60'
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-lg font-medium">{slot.name}</CardTitle>
                    {slot.icon}
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {slot.time}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      { currentSlot === slot.name ? "This is your current focus block." : "Plan your activities for this block."}
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
