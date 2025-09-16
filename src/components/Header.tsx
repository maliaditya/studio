
"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { BrainCircuit, Heart, Settings, Eye, EyeOff, ChevronDown } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { SupportModal } from './SupportModal';
import { cn } from '@/lib/utils';
import { DemoTokenModal } from './DemoTokenModal';
import { SettingsModal } from './SettingsModal';
import { SaveStatusWidget } from './SaveStatusWidget';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [isClient, setIsClient] = useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  

  const navLinks = [
    { href: '/my-plate', label: 'Dashboard' },
    { href: '/charts', label: 'Charts' },
    { href: '/timesheet', label: 'Timesheet' },
    { href: '/workout-tracker', label: 'Workout' },
    { href: '/skill', label: 'Skill' },
    { href: '/deep-work', label: 'Deep Work' },
    { href: '/strategic-planning', label: 'Planning' },
    { href: '/resources', label: 'Resources' },
  ];

  const dropdownLinks = [
    { href: '/path', label: 'Path' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/purpose', label: 'Purpose' },
    { href: '/patterns', label: 'Patterns' },
    { href: '/mind-programming', label: 'Mind Programming' },
    { href: '/personal-branding', label: 'Branding' },
  ];

  return (
    <>
      <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
              <BrainCircuit className="h-8 w-8" />
              <span>LifeOS</span>
            </Link>
          </div>
          
          <div className="flex-grow flex items-center justify-center">
            <nav className={cn("hidden md:flex items-center gap-4", !currentUser && "hidden")}>
                {navLinks.map(link => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "text-sm font-medium transition-colors hover:text-primary",
                      (isClient && pathname === link.href) ? "text-primary" : "text-muted-foreground"
                    )}
                  >
                    {link.label}
                  </Link>
                ))}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className="text-sm font-medium text-muted-foreground hover:text-primary focus:text-primary data-[state=open]:text-primary gap-1">
                      Strategy
                      <ChevronDown className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    {dropdownLinks.map(link => (
                       <DropdownMenuItem key={link.href} asChild>
                         <Link href={link.href}>{link.label}</Link>
                       </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            {currentUser && <SaveStatusWidget />}
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
