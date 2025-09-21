

"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { BrainCircuit, Heart, Settings, ChevronDown, Search, Play, Library } from 'lucide-react';
import { UserProfile } from './UserProfile';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { useRouter, usePathname } from 'next/navigation';
import { SupportModal } from './SupportModal';
import { cn } from '@/lib/utils';
import { DemoTokenModal } from './DemoTokenModal';
import { SettingsModal } from './SettingsModal';
import { SaveStatusWidget } from './SaveStatusWidget';
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import type { Resource, AudioAnnotation } from '@/types/workout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const GlobalSearch = ({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) => {
  const { resources, openGeneralPopup, setPlaybackRequest } = useAuth();
  const [query, setQuery] = useState('');

  const searchResults = useMemo(() => {
    if (!query) return [];
    
    const results: { resource: Resource, annotation: ResourcePoint }[] = [];
    
    resources.forEach(resource => {
      if (resource.points) {
        resource.points.forEach(point => {
          if (point.type === 'timestamp' && point.text.toLowerCase().includes(query.toLowerCase())) {
            results.push({ resource, annotation: point });
          }
        });
      }
    });

    return results;
  }, [query, resources]);

  const handleSelect = (resource: Resource, annotation: ResourcePoint, e: React.MouseEvent) => {
    if (annotation.timestamp !== undefined) {
      setPlaybackRequest({
        resourceId: resource.id,
        timestamp: annotation.timestamp,
        endTime: annotation.endTime,
      });
      openGeneralPopup(resource.id, e);
    }
    setOpen(false);
    setQuery('');
  };
  
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [setOpen])

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search audio notes..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Audio Annotations">
          {searchResults.map(({ resource, annotation }) => (
            <CommandItem 
              key={annotation.id}
              onSelect={(e) => handleSelect(resource, annotation, e as any)}
              className="flex justify-between items-center"
            >
              <div className="flex-grow min-w-0">
                <p className="font-medium truncate">{annotation.text}</p>
                <p className="text-xs text-muted-foreground truncate">{resource.name}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-4">
                <span className="text-xs text-muted-foreground font-mono">
                  {formatTime(annotation.timestamp || 0)}
                  {annotation.endTime && ` - ${formatTime(annotation.endTime)}`}
                </span>
                <Play className="h-4 w-4 text-primary" />
              </div>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
};


function NavigationMenu() {
  const [isClient, setIsClient] = useState(false);
  const [activePath, setActivePath] = useState('');
  const pathname = usePathname();

  useEffect(() => {
    setIsClient(true);
    setActivePath(pathname);
  }, [pathname]);

  const navLinks = [
    { href: '/my-plate', label: 'Dashboard' },
    { href: '/timetable', label: 'Timetable' },
    { href: '/workout-tracker', label: 'Workout' },
    { href: '/skill', label: 'Skill' },
    { href: '/deep-work', label: 'Deep Work' },
    { href: '/resources', label: 'Resources' },
  ];

  const dropdownLinks = [
    { href: '/strategic-planning', label: 'Planning' },
    { href: '/path', label: 'Path' },
    { href: '/portfolio', label: 'Portfolio' },
    { href: '/purpose', label: 'Purpose' },
    { href: '/patterns', label: 'Patterns' },
    { href: '/mind-programming', label: 'Mind Programming' },
    { href: '/personal-branding', label: 'Branding' },
    { href: '/charts', label: 'Charts' },
    { href: '/timesheet', label: 'Timesheet' },
  ];
  
  if (!isClient) {
    return null; // Don't render on the server
  }

  return (
    <nav className="hidden md:flex items-center gap-4">
      {navLinks.map(link => (
        <Link
          key={link.href}
          href={link.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary",
            activePath === link.href ? "text-primary" : "text-muted-foreground"
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
  );
}


export function Header() {
  const { 
    currentUser, 
    loading, 
    isDemoTokenModalOpen, 
    setIsDemoTokenModalOpen, 
    pushDemoDataWithToken,
  } = useAuth();
  const router = useRouter();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  
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
          
          <div className="flex-grow flex items-center justify-center gap-4">
            {currentUser && <NavigationMenu />}
            {currentUser && (
              <>
                <Button variant="outline" className="gap-2 text-muted-foreground" onClick={() => setIsSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                  Search Notes...
                  <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                    <span className="text-xs">⌘</span>K
                  </kbd>
                </Button>
              </>
            )}
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
      <GlobalSearch open={isSearchOpen} setOpen={setIsSearchOpen} />
    </>
  );
}
