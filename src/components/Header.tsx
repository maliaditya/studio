
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
import type { Resource, AudioAnnotation, ResourcePoint } from '@/types/workout';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const GlobalSearch = ({ open, setOpen }: { open: boolean, setOpen: (open: boolean) => void }) => {
  const { resources, openGeneralPopup, setPlaybackRequest } = useAuth();
  const [query, setQuery] = useState('');

  const { audioResults, cardResults } = useMemo(() => {
    if (!query) return { audioResults: [], cardResults: [] };
    
    const lowerCaseQuery = query.toLowerCase();
    const audioResults: { resource: Resource, annotation: ResourcePoint }[] = [];
    const cardResults: { resource: Resource, point?: ResourcePoint }[] = [];
    const addedCardIds = new Set<string>();

    resources.forEach(resource => {
      if (resource.name && resource.name.toLowerCase().includes(lowerCaseQuery) && !addedCardIds.has(resource.id)) {
        cardResults.push({ resource });
        addedCardIds.add(resource.id);
      }

      // Search card points
      if (resource.points) {
        resource.points.forEach(point => {
          if (point.text && point.text.toLowerCase().includes(lowerCaseQuery)) {
            if (point.type === 'timestamp') {
              audioResults.push({ resource, annotation: point });
            } else if (!addedCardIds.has(resource.id)) {
              cardResults.push({ resource, point });
              addedCardIds.add(resource.id);
            }
          }
        });
      }
    });

    return { audioResults, cardResults };
  }, [query, resources]);

  const handleSelect = (item: { resource: Resource, annotation?: ResourcePoint }, e: React.MouseEvent) => {
    const { resource, annotation } = item;
    
    if (annotation && annotation.timestamp !== undefined) {
      setPlaybackRequest({
        resourceId: resource.id,
        timestamp: annotation.timestamp,
        endTime: annotation.endTime,
      });
    }
    openGeneralPopup(resource.id, e);
    
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
        placeholder="Search notes and cards..." 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {cardResults.length > 0 && (
          <CommandGroup heading="Resource Cards">
            {cardResults.map(({ resource, point }) => (
              <CommandItem 
                key={resource.id + (point?.id || '')}
                onSelect={(e) => handleSelect({ resource }, e as any)}
                className="flex justify-between items-center"
              >
                <div className="flex-grow min-w-0">
                  <p className="font-medium truncate">{resource.name}</p>
                  {point && (
                    <p className="text-xs text-muted-foreground truncate">
                      <span className='font-semibold'>Match:</span> {point.text}
                    </p>
                  )}
                </div>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {audioResults.length > 0 && (
          <CommandGroup heading="Audio Annotations">
            {audioResults.map(({ resource, annotation }) => (
              <CommandItem 
                key={annotation.id}
                onSelect={(e) => handleSelect({ resource, annotation }, e as any)}
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
        )}
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
    { href: '/resources', label: 'Resources' },
    { href: '/skill', label: 'Skill Tree' },
    { href: '/strategic-planning', label: 'Strategy' },
    { href: '/code-of-conduct', label: 'Code of Conduct' },
  ];

  if (!isClient) {
    return <div className="flex items-center gap-4 h-8 w-96 bg-muted rounded-md animate-pulse" />;
  }

  return (
    <nav className="hidden md:flex items-center gap-2">
      {navLinks.map((link) => (
        <Button
          key={link.href}
          asChild
          variant={activePath === link.href ? 'default' : 'ghost'}
          size="sm"
        >
          <Link href={link.href}>{link.label}</Link>
        </Button>
      ))}
       <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="flex items-center gap-1">
            More <ChevronDown className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem asChild><Link href="/workout-tracker">Workout Tracker</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/mind-programming">Mind Programming</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/upskill">Upskill</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/deep-work">Deep Work</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/personal-branding">Branding</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/lead-generation">Lead Gen</Link></DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild><Link href="/formalization">Formalization</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/patterns">Patterns</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/purpose">Purpose</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/path">Path</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/charts">Charts</Link></DropdownMenuItem>
          <DropdownMenuItem asChild><Link href="/timesheet">Timesheet</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

export function Header() {
  const { currentUser, signOut, isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken } = useAuth();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center">
        <Link href="/" className="flex items-center gap-2 mr-6">
          <BrainCircuit className="h-6 w-6 text-primary" />
          <span className="font-bold hidden sm:inline-block">Dock</span>
        </Link>

        {currentUser && <NavigationMenu />}

        <div className="flex flex-1 items-center justify-end gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsSearchOpen(true)}>
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
            </Button>
            
            <GlobalSearch open={isSearchOpen} setOpen={setIsSearchOpen} />

            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setIsSupportModalOpen(true)}>
                <Heart className="mr-2 h-4 w-4 text-red-500" />
                Support
            </Button>
          
            {currentUser && <SaveStatusWidget />}

            <UserProfile onSettingsClick={() => setIsSettingsModalOpen(true)} />
        </div>
      </div>
      <SupportModal isOpen={isSupportModalOpen} onOpenChange={setIsSupportModalOpen} />
      <DemoTokenModal isOpen={isDemoTokenModalOpen} onOpenChange={setIsDemoTokenModalOpen} onSubmit={pushDemoDataWithToken} />
      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
    </header>
  );
}
