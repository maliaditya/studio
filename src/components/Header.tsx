
"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { BrainCircuit, Heart, Settings } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { SupportModal } from './SupportModal';
import { cn } from '@/lib/utils';
import { DemoTokenModal } from './DemoTokenModal';
import { SettingsModal } from './SettingsModal';

export function Header() {
  const { 
    currentUser, 
    loading, 
    isDemoTokenModalOpen, 
    setIsDemoTokenModalOpen, 
    pushDemoDataWithToken,
  } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  const navLinks = [
    { href: '/', label: 'Dashboard' },
    { href: '/workout-tracker', label: 'Workout Tracker' },
    { href: '/upskill', label: 'Upskill' },
    { href: '/deep-work', label: 'Deep Work' },
    { href: '/personal-branding', label: 'Branding' },
    { href: '/resources', label: 'Resources' },
    { href: '/productization', label: 'Productization' },
    { href: '/offerization', label: 'Offerization' },
    { href: '/matrix', label: 'Matrix' },
    { href: '/mind-map', label: 'Mind Map' },
    { href: '/canvas', label: 'Canvas' },
    { href: '/kanban', label: 'Kanban' },
    { href: '/timesheet', label: 'Timesheet' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary mr-6">
              <BrainCircuit className="h-8 w-8" />
              <span>LifeOS</span>
            </Link>
            <nav className="hidden md:flex items-center gap-4">
              {navLinks.map(link => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium transition-colors hover:text-primary",
                    pathname === link.href ? "text-primary" : "text-muted-foreground"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              onClick={() => setIsSupportModalOpen(true)}
              variant="secondary"
              size="sm"
            >
              <Heart className="mr-2 h-4 w-4 text-destructive" />
              Support
            </Button>
            
            {loading ? (
               <div className="h-8 w-20 animate-pulse bg-muted rounded-md"></div>
            ) : currentUser ? (
              <div>
                <UserProfile onSettingsClick={() => setIsSettingsModalOpen(true)} />
              </div>
            ) : (
              <Button onClick={() => router.push('/login')} variant="outline">
                Login
              </Button>
            )}
          </div>
        </div>
      </header>
      <SupportModal 
        isOpen={isSupportModalOpen} 
        onOpenChange={setIsSupportModalOpen} 
      />
      <DemoTokenModal
        isOpen={isDemoTokenModalOpen}
        onOpenChange={setIsDemoTokenModalOpen}
        onSubmit={pushDemoDataWithToken}
      />
      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
    </>
  );
}
