
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
      <div className="container flex h-16 items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary mr-6">
          <Dumbbell className="h-7 w-7" />
          <span>Workout Tracker</span>
        </Link>
        
        <div className="flex items-center gap-4">
          {loading ? (
             <div className="h-8 w-20 animate-pulse bg-muted rounded-md"></div>
          ) : currentUser ? (
            <UserProfile />
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
