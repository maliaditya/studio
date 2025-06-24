"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { Dumbbell, Heart } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useRouter } from 'next/navigation';
import { SupportModal } from './SupportModal';

export function Header() {
  const { currentUser, loading } = useAuth();
  const router = useRouter();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary mr-6">
            <Dumbbell className="h-7 w-7" />
            <span>Workout Tracker</span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Button onClick={() => setIsSupportModalOpen(true)} variant="outline" size="sm">
              <Heart className="mr-2 h-4 w-4 text-red-500" />
              Support this project
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
      <SupportModal isOpen={isSupportModalOpen} onOpenChange={setIsSupportModalOpen} />
    </>
  );
}
