
"use client";

import React from 'react';
import Link from 'next/link';
import { Dumbbell } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';

export function Header() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary mr-6">
          <Dumbbell className="h-7 w-7" />
          <span>Workout Tracker</span>
        </Link>
        
        <div className="flex items-center gap-4">
          <a href="https://www.buymeacoffee.com/adityamali98" target="_blank" rel="noopener noreferrer">
            <img className="h-10 w-auto" src="https://img.buymeacoffee.com/button-api/?text=Keep this project alive&amp;emoji=&amp;slug=adityamali98&amp;button_colour=FFDD00&amp;font_colour=000000&amp;font_family=Cookie&amp;outline_colour=000000&amp;coffee_colour=ffffff" alt="Keep this project alive" />
          </a>
          <Button asChild variant="outline">
            <a href="upi://pay?pa=9765402942@ybl&pn=YourName&cu=INR">
              Support via UPI
            </a>
          </Button>
          {loading ? (
             <div className="h-8 w-20 animate-pulse bg-muted rounded-md"></div>
          ) : currentUser ? (
            <div data-tour="user-profile">
              <UserProfile />
            </div>
          ) : (
            <Button onClick={() => router.push('/login')} variant="outline">
              Login
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
