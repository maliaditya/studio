
"use client";

import React, { useState, useMemo, useEffect } from 'react';
import Link from 'next/link';
import { BrainCircuit, Heart, Settings, ChevronDown, Search, Play, Library, Info, Repeat } from 'lucide-react';
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
import type { Resource, AudioAnnotation, ResourcePoint, MicroSkill } from '@/types/workout';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { format, isBefore, isToday, startOfToday, addDays, parseISO, differenceInDays } from 'date-fns';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

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
    { href: '/gamified-skills', label: 'Gamified Skills' },
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
          <DropdownMenuItem asChild><Link href="/code-of-conduct">Code of Conduct</Link></DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </nav>
  );
}

function UpcomingSkillsModal({ isOpen, onOpenChange }: { isOpen: boolean, onOpenChange: (open: boolean) => void }) {
    const { coreSkills, deepWorkDefinitions, getDescendantLeafNodes, scheduleTaskFromMindMap, currentSlot } = useAuth();
    const { toast } = useToast();

    const DOUBLING_INTERVALS = [1, 2, 4, 8, 16, 32, 64, 128];

    const repetitionSkillsWithDates = useMemo(() => {
        const repetitionSkills = coreSkills.flatMap(cs => 
            cs.skillAreas.flatMap(sa => 
                sa.microSkills.filter(ms => ms.isReadyForRepetition)
            )
        );

        const skillsToReview = repetitionSkills.map(skill => {
            const intentions = deepWorkDefinitions.filter(def => def.category === skill.name);
            const mainIntention = intentions.find(i => !deepWorkDefinitions.some(d => d.linkedDeepWorkIds?.includes(i.id)));
            const allLeafNodes = intentions.flatMap(intention => getDescendantLeafNodes(intention.id, 'deepwork'));
            const completionDates = new Set<string>();
            allLeafNodes.forEach(node => {
                if (node.last_logged_date) completionDates.add(node.last_logged_date);
            });
            const sortedDates = Array.from(completionDates).map(d => parseISO(d)).sort((a, b) => a.getTime() - b.getTime());

            let reps = 0;
            let lastReviewDate = sortedDates.length > 0 ? sortedDates[0] : new Date();

            if (sortedDates.length > 0) {
                reps = 1;
                for (let i = 1; i < sortedDates.length; i++) {
                    const daysBetween = differenceInDays(sortedDates[i], lastReviewDate);
                    if (daysBetween <= (DOUBLING_INTERVALS[reps - 1] || 128)) {
                        reps++;
                    } else {
                        reps = 1;
                    }
                    lastReviewDate = sortedDates[i];
                }
            }

            const nextInterval = DOUBLING_INTERVALS[reps] || 128;
            const nextReviewDate = addDays(lastReviewDate, nextInterval);

            return {
                ...skill,
                mainIntentionId: mainIntention?.id,
                nextReviewDate: sortedDates.length > 0 ? nextReviewDate : new Date(),
                isOverdue: sortedDates.length > 0 && isBefore(nextReviewDate, startOfToday()),
            };
        });

        return skillsToReview.sort((a, b) => a.nextReviewDate.getTime() - b.nextReviewDate.getTime());
    }, [coreSkills, deepWorkDefinitions, getDescendantLeafNodes]);

    const handleScheduleClick = (skill: { mainIntentionId?: string, name: string }) => {
        if (skill.mainIntentionId) {
            scheduleTaskFromMindMap(skill.mainIntentionId, 'deepwork', currentSlot);
        } else {
            toast({
                title: "Cannot Schedule",
                description: `No main intention found for "${skill.name}".`,
                variant: "destructive",
            });
        }
    };
    
    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Repeat className="h-5 w-5 text-blue-500" />
                        Upcoming Skills for Review
                    </DialogTitle>
                    <DialogDescription>
                        This is your spaced repetition queue. Review these skills to strengthen your memory.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    <ScrollArea className="h-80">
                        <ul className="space-y-3 pr-4">
                            {repetitionSkillsWithDates.map(skill => (
                                <li key={skill.id} className="flex items-center justify-between p-2 rounded-md border bg-muted/30">
                                    <div>
                                        <p className="font-semibold">{skill.name}</p>
                                        <p className={cn("text-xs", skill.isOverdue ? "text-destructive font-semibold" : "text-muted-foreground")}>
                                            Due: {format(skill.nextReviewDate, 'PPP')}
                                        </p>
                                    </div>
                                    <Button size="sm" onClick={() => handleScheduleClick(skill)}>Schedule</Button>
                                </li>
                            ))}
                            {repetitionSkillsWithDates.length === 0 && (
                                <p className="text-center text-muted-foreground pt-12">No skills are ready for repetition.</p>
                            )}
                        </ul>
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export function Header() {
  const { currentUser, signOut, isDemoTokenModalOpen, setIsDemoTokenModalOpen, pushDemoDataWithToken } = useAuth();
  const [isSupportModalOpen, setIsSupportModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isUpcomingSkillsModalOpen, setIsUpcomingSkillsModalOpen] = useState(false);

  return (
    <>
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

              <Button variant="ghost" size="icon" className="h-8 w-8 bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 hover:text-blue-600" onClick={() => setIsUpcomingSkillsModalOpen(true)}>
                  <Info className="h-4 w-4" />
                  <span className="sr-only">Upcoming Skills</span>
              </Button>

              <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => setIsSupportModalOpen(true)}>
                  <Heart className="mr-2 h-4 w-4 text-red-500" />
                  Support
              </Button>
            
              {currentUser && <SaveStatusWidget />}

              <UserProfile onSettingsClick={() => setIsSettingsModalOpen(true)} />
          </div>
        </div>
      </header>
      <SupportModal isOpen={isSupportModalOpen} onOpenChange={setIsSupportModalOpen} />
      <DemoTokenModal isOpen={isDemoTokenModalOpen} onOpenChange={setIsDemoTokenModalOpen} onSubmit={pushDemoDataWithToken} />
      <SettingsModal isOpen={isSettingsModalOpen} onOpenChange={setIsSettingsModalOpen} />
      <UpcomingSkillsModal isOpen={isUpcomingSkillsModalOpen} onOpenChange={setIsUpcomingSkillsModalOpen} />
    </>
  );
}
