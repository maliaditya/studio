
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronDown, CalendarIcon, TrendingUp, Loader2, Briefcase, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, LineChart as LineChartIcon, Unlink, GitMerge, Clock, Lightbulb, Flag, Bolt } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, addDays, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, DeepWorkTopicMetadata, Resource, ResourceFolder } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Progress } from '@/components/ui/progress';
import { FocusAreaProgressModal } from '@/components/FocusAreaProgressModal';
import { MindMapViewer } from '@/components/MindMapViewer';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";


const getFaviconUrl = (link: string): string | undefined => {
  try {
    let url = link;
    if (!url.startsWith('http')) {
      url = `https://${url}`;
    }
    const urlObject = new URL(url);
    return `https://www.google.com/s2/favicons?domain=${urlObject.hostname}&sz=32`;
  } catch (e) {
    return undefined;
  }
};

const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const getYouTubeEmbedUrl = (url: string): string | null => {
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;

        if (urlObj.hostname.includes('youtube.com')) {
            videoId = urlObj.searchParams.get('v');
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        // Silently fail for invalid URLs
    }
    return null;
};

const isNotionUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) {
        return false;
    }
};

const isObsidianUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'share.note.sx';
    } catch (e) {
        return false;
    }
};

function DeepWorkPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    exportData,
    allDeepWorkLogs, setAllDeepWorkLogs,
    allUpskillLogs, setAllUpskillLogs,
    deepWorkDefinitions, setDeepWorkDefinitions,
    upskillDefinitions, setUpskillDefinitions,
    deepWorkTopicMetadata, setDeepWorkTopicMetadata,
    updateTopic, deleteTopic,
    resources, setResources,
    resourceFolders,
    topicGoals,
  } = useAuth();

  const [newTopicName, setNewTopicName] = useState('');
  
  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionHours, setEditingDefinitionHours] = useState('');
  
  const [editingTopic, setEditingTopic] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [newTopicNameForEdit, setNewTopicNameForEdit] = useState('');
  const [newTopicClassificationForEdit, setNewTopicClassificationForEdit] = useState<'product' | 'service'>('product');

  // State for adding a focus area inline
  const [addingFocusToTopic, setAddingFocusToTopic] = useState<string | null>(null);
  const [newFocusAreaName, setNewFocusAreaName] = useState('');
  const [newFocusAreaHours, setNewFocusAreaHours] = useState('');

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());

  // Edit states for linked items
  const [editingUpskill, setEditingUpskill] = useState<ExerciseDefinition | null>(null);
  const [editedUpskillData, setEditedUpskillData] = useState<Partial<ExerciseDefinition>>({});
  const [editingResource, setEditingResource] = useState<Resource | null>(null);
  const [editedResourceData, setEditedResourceData] = useState<Partial<Resource>>({});

  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [contextMenu, setContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: string; // The topic name
  } | null>(null);

  const focusAreaContextMenuRef = useRef<HTMLDivElement>(null);
  const [focusAreaContextMenu, setFocusAreaContextMenu] = useState<{
    mouseX: number;
    mouseY: number;
    item: ExerciseDefinition;
  } | null>(null);

  const [visibilityFilters, setVisibilityFilters] = useState<Set<'intention' | 'objective' | 'action'>>(new Set(['intention']));

  // Mind map modal state
  const [isMindMapModalOpen, setIsMindMapModalOpen] = useState(false);
  const [mindMapRootId, setMindMapRootId] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) {
            setContextMenu(null);
        }
        if (focusAreaContextMenuRef.current && !focusAreaContextMenuRef.current.contains(event.target as Node)) {
            setFocusAreaContextMenu(null);
        }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
        document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [contextMenuRef, focusAreaContextMenuRef]);

  const handleContextMenu = (e: React.MouseEvent, topic: string) => {
    e.preventDefault();
    e.stopPropagation();
    setFocusAreaContextMenu(null); // Close other menu
    setContextMenu({
      mouseX: e.clientX,
      mouseY: e.clientY,
      item: topic,
    });
  };

  const handleFocusAreaContextMenu = (e: React.MouseEvent, item: ExerciseDefinition) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu(null); // Close other menu
    setFocusAreaContextMenu({
        mouseX: e.clientX,
        mouseY: e.clientY,
        item: item,
    });
  };

  const toggleTopicExpansion = useCallback((topic: string) => {
    setExpandedTopics(prev => {
        const newSet = new Set(prev);
        if (newSet.has(topic)) {
            newSet.delete(topic);
        } else {
            newSet.add(topic);
        }
        return newSet;
    });
  }, []);

  useEffect(() => {
    if (editingTopic) {
      setNewTopicNameForEdit(editingTopic);
      setNewTopicClassificationForEdit(deepWorkTopicMetadata[editingTopic]?.classification || 'product');
    }
  }, [editingTopic, deepWorkTopicMetadata]);

  useEffect(() => {
    if (editingUpskill) setEditedUpskillData(editingUpskill);
  }, [editingUpskill]);

  useEffect(() => {
    if (editingResource) setEditedResourceData(editingResource);
  }, [editingResource]);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{
    isOpen: boolean;
    exercise: ExerciseDefinition | null;
    pageType: 'deepwork' | 'upskill';
  }>({ isOpen: false, exercise: null, pageType: 'deepwork' });
  const [isFocusAreaProgressModalOpen, setIsFocusAreaProgressModalOpen] = useState(false);
  const [isFocusAreaTimesheetModalOpen, setIsFocusAreaTimesheetModalOpen] = useState(false);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  // New state for right panel view
  const [viewMode, setViewMode] = useState<'session' | 'library'>('session');
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);

  // State for the "Manage Links" functionality
  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'upskill' | 'deepwork' | 'resource', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemTopic, setNewLinkedItemTopic] = useState('');
  const [newLinkedItemDescription, setNewLinkedItemDescription] = useState('');
  const [newLinkedItemLink, setNewLinkedItemLink] = useState('');
  const [newLinkedItemHours, setNewLinkedItemHours] = useState('');
  const [newLinkedItemFolderId, setNewLinkedItemFolderId] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [linkResourceFolderId, setLinkResourceFolderId] = useState<string>('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(deepWorkDefinitions.map(def => def.category));
    const topicsFromMeta = new Set(Object.keys(deepWorkTopicMetadata));
    return Array.from(new Set([...topicsFromDefs, ...topicsFromMeta])).sort();
  }, [deepWorkDefinitions, deepWorkTopicMetadata]);

  // A memoized set of all focus area IDs that are linked as children.
  const linkedDeepWorkChildIds = useMemo(() =>
    new Set<string>(deepWorkDefinitions.flatMap(def => def.linkedDeepWorkIds || []))
  , [deepWorkDefinitions]);

  const handleVisibilityFilterChange = (filter: 'intention' | 'objective' | 'action') => {
    setVisibilityFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(filter)) {
            newSet.delete(filter);
        } else {
            newSet.add(filter);
        }
        return newSet;
    });
  };

  const topicsWithFocusAreas = useMemo(() => {
    const effectiveFilters = visibilityFilters.size === 0 ? new Set(['intention']) : visibilityFilters;

    const visibleDefinitions = deepWorkDefinitions.filter(def => {
        const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isLinkedAsChild = linkedDeepWorkChildIds.has(def.id);

        const isIntention = isParent && !isLinkedAsChild;
        const isObjective = isParent && isLinkedAsChild;
        const isAction = !isParent;

        if (effectiveFilters.has('intention') && isIntention) return true;
        if (effectiveFilters.has('objective') && isObjective) return true;
        if (effectiveFilters.has('action') && isAction) return true;
        
        return false;
    });
    
    const grouped: { [key: string]: ExerciseDefinition[] } = {};
    visibleDefinitions.forEach(def => {
        if (!grouped[def.category]) {
            grouped[def.category] = [];
        }
        grouped[def.category].push(def);
    });

    return allKnownTopics.map(topic => [topic, grouped[topic] || []] as [string, ExerciseDefinition[]]);
  }, [allKnownTopics, deepWorkDefinitions, linkedDeepWorkChildIds, visibilityFilters]);


  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  }

  const totalLoggedTime = useMemo(() => {
      if (!selectedFocusArea) return 0;

      let totalMinutes = 0;
      const allDefIdsToSum = new Set<string>([selectedFocusArea.id, ...(selectedFocusArea.linkedDeepWorkIds || [])]);
      const allUpskillIdsToSum = new Set<string>(selectedFocusArea.linkedUpskillIds || []);

      if (allDeepWorkLogs) {
          allDeepWorkLogs.forEach(log => {
              log.exercises.forEach(ex => {
                  if (allDefIdsToSum.has(ex.definitionId)) {
                      ex.loggedSets.forEach(set => {
                          totalMinutes += set.weight;
                      });
                  }
              });
          });
      }

      if (allUpskillLogs && allUpskillIdsToSum.size > 0) {
          allUpskillLogs.forEach(log => {
              log.exercises.forEach(ex => {
                  if (allUpskillIdsToSum.has(ex.definitionId)) {
                      ex.loggedSets.forEach(set => {
                          totalMinutes += set.reps;
                      });
                  }
              });
          });
      }
      
      return totalMinutes;
  }, [selectedFocusArea, allUpskillLogs, allDeepWorkLogs]);
  
  const totalEstimatedHours = useMemo(() => {
    if (!selectedFocusArea) return 0;
    let totalHours = 0;
    (selectedFocusArea.linkedDeepWorkIds || []).forEach(id => {
      const def = deepWorkDefinitions.find(d => d.id === id);
      if (def?.estimatedHours) {
        totalHours += def.estimatedHours;
      }
    });
    (selectedFocusArea.linkedUpskillIds || []).forEach(id => {
      const def = upskillDefinitions.find(d => d.id === id);
      if (def?.estimatedHours) {
        totalHours += def.estimatedHours;
      }
    });
    return totalHours;
  }, [selectedFocusArea, deepWorkDefinitions, upskillDefinitions]);

  const totalScopeHours = (selectedFocusArea?.estimatedHours || 0) + totalEstimatedHours;
  
  const getUpskillLoggedMinutes = useCallback((definitionId: string) => {
    if (!allUpskillLogs) return 0;
    let totalMinutes = 0;
    allUpskillLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if (ex.definitionId === definitionId) {
                totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0); // reps is duration for upskill
            }
        });
    });
    return totalMinutes;
  }, [allUpskillLogs]);

  const getDeepWorkLoggedMinutes = useCallback((definition: ExerciseDefinition) => {
      let totalMinutes = 0;
      if (!definition) return 0;
  
      // This includes the definition itself and any of its linked children.
      const allDeepWorkDefIdsToSum = new Set<string>([definition.id, ...(definition.linkedDeepWorkIds || [])]);
      const allUpskillDefIdsToSum = new Set<string>(definition.linkedUpskillIds || []);
  
      if (allDeepWorkLogs) {
          allDeepWorkLogs.forEach(log => {
              log.exercises.forEach(ex => {
                  if (allDeepWorkDefIdsToSum.has(ex.definitionId)) {
                      ex.loggedSets.forEach(set => {
                          totalMinutes += set.weight; // duration for deep work
                      });
                  }
              });
          });
      }
  
      if (allUpskillLogs) {
          allUpskillLogs.forEach(log => {
              log.exercises.forEach(ex => {
                  if (allUpskillDefIdsToSum.has(ex.definitionId)) {
                      ex.loggedSets.forEach(set => {
                          totalMinutes += set.reps; // duration for upskill
                      });
                  }
              });
          });
      }
      return totalMinutes;
  }, [allDeepWorkLogs, allUpskillLogs]);

  const timesheetData = useMemo(() => {
    if (!selectedFocusArea) return [];

    const allDefIds = new Set([
        selectedFocusArea.id,
        ...(selectedFocusArea.linkedDeepWorkIds || []),
        ...(selectedFocusArea.linkedUpskillIds || []),
    ]);

    const allDefs = [...deepWorkDefinitions, ...upskillDefinitions];
    const defIdToNameMap = new Map(allDefs.map(def => [def.id, def.name]));

    const entries: { date: string; taskName: string; duration: number }[] = [];

    allDeepWorkLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if (allDefIds.has(ex.definitionId)) {
                ex.loggedSets.forEach(set => {
                    if (set.weight > 0) { // weight is duration for deepwork
                        entries.push({
                            date: log.date,
                            taskName: defIdToNameMap.get(ex.definitionId) || ex.name,
                            duration: set.weight
                        });
                    }
                });
            }
        });
    });

    allUpskillLogs.forEach(log => {
        log.exercises.forEach(ex => {
            if (allDefIds.has(ex.definitionId)) {
                ex.loggedSets.forEach(set => {
                    if (set.reps > 0) { // reps is duration for upskill
                        entries.push({
                            date: log.date,
                            taskName: defIdToNameMap.get(ex.definitionId) || ex.name,
                            duration: set.reps
                        });
                    }
                });
            }
        });
    });

    // Group by date
    const groupedByDate: Record<string, { taskName: string; duration: number }[]> = {};
    entries.forEach(entry => {
        if (!groupedByDate[entry.date]) {
            groupedByDate[entry.date] = [];
        }
        groupedByDate[entry.date].push({ taskName: entry.taskName, duration: entry.duration });
    });

    return Object.entries(groupedByDate)
        .map(([date, tasks]) => ({ date, tasks, totalDuration: tasks.reduce((sum, task) => sum + task.duration, 0) }))
        .sort((a, b) => b.date.localeCompare(a.date)); // Sort by most recent date first
}, [selectedFocusArea, allDeepWorkLogs, allUpskillLogs, deepWorkDefinitions, upskillDefinitions]);


  useEffect(() => {
    setIsLoadingPage(false); // Data is loaded from context
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
    const hasBeenPrompted = localStorage.getItem(backupPromptKey);
    if (isMonday(today) && !hasBeenPrompted) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_deepwork_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => {
    exportData(); 
    markBackupPromptAsHandled();
  };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allDeepWorkLogs.find(log => log.id === dateKey);
  }, [selectedDate, allDeepWorkLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllDeepWorkLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) {
        toast({ title: "Error", description: "Topic name cannot be empty.", variant: "destructive" });
        return;
    }
    const topic = newTopicName.trim();
    if (allKnownTopics.some(t => t.toLowerCase() === topic.toLowerCase())) {
        toast({ title: "Error", description: "This topic already exists.", variant: "destructive" });
        return;
    }
    setDeepWorkTopicMetadata(prev => ({
        ...prev,
        [topic]: { classification: 'product' }
    }));
    setNewTopicName('');
    toast({ title: "Topic Created", description: `"${topic}" has been added to your library.` });
  }

  const handleAddFocusArea = (topic: string) => {
    if (!newFocusAreaName.trim()) {
        setAddingFocusToTopic(null); // Cancel if empty
        return;
    }

    if (deepWorkDefinitions.some(def => def.name.toLowerCase() === newFocusAreaName.trim().toLowerCase() && def.category.toLowerCase() === topic.toLowerCase())) {
        toast({ title: "Error", description: "This focus area already exists for this topic.", variant: "destructive" });
        return;
    }

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newFocusAreaName.trim(),
        category: topic as ExerciseCategory,
        isReadyForBranding: false,
        sharingStatus: { twitter: false, linkedin: false, devto: false },
        estimatedHours: parseInt(newFocusAreaHours, 10) || undefined,
    };
    setDeepWorkDefinitions(prev => [...prev, newDef]);
    setNewFocusAreaName('');
    setNewFocusAreaHours('');
    setAddingFocusToTopic(null);
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to ${topic}.` });
  };


  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = deepWorkDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setDeepWorkDefinitions(prev => prev.filter(def => def.id !== id));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedFocusArea?.id === id) {
        setSelectedFocusArea(null);
        setViewMode('session');
    }
    toast({ title: "Success", description: `Focus Area "${defToDelete.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionHours(def.estimatedHours?.toString() || '');
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '') {
      toast({ title: "Error", description: "Focus Area name cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), estimatedHours: parseInt(editingDefinitionHours, 10) || undefined };
    setDeepWorkDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllDeepWorkLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name } : ex)})));
    if(selectedFocusArea?.id === editingDefinition.id) {
        setSelectedFocusArea(updatedDef);
    }
    toast({ title: "Success", description: `Focus Area updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleToggleReadyForBranding = (definitionId: string) => {
    const def = deepWorkDefinitions.find(d => d.id === definitionId);
    if (!def) return;

    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(d => 
        d.id === definitionId 
          ? { ...d, isReadyForBranding: !d.isReadyForBranding } 
          : d
      )
    );
    
    toast({
      title: "Status Updated",
      description: `"${def.name}" is now ${!def.isReadyForBranding ? 'marked as ready' : 'no longer ready'} for branding.`
    });
  };

  const handleSaveTopicEdit = () => {
    if (!editingTopic || !newTopicNameForEdit.trim()) return;
    updateTopic(editingTopic, newTopicNameForEdit, newTopicClassificationForEdit);
    setEditingTopic(null);
  }

  const handleDeleteTopic = () => {
    if (!topicToDelete) return;
    deleteTopic(topicToDelete);
    if (selectedFocusArea && selectedFocusArea.category === topicToDelete) {
        setSelectedFocusArea(null);
        setViewMode('session');
    }
    setTopicToDelete(null);
  }

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `dwex_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) {
        toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return;
      }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllDeepWorkLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be 1, weight is duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Session Logged!", description: `Logged ${weight} minutes.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=1, weight=duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allDeepWorkLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex => {
        if (ex.id === exerciseId) {
          return { ...ex, loggedSets: ex.loggedSets.map(set => 
              set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set
            )};
        }
        return ex;
      });
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleViewProgress = (definition: ExerciseDefinition, pageType: 'deepwork' | 'upskill') => {
    setProgressModalConfig({
      isOpen: true,
      exercise: definition,
      pageType: pageType,
    });
  };

  const handleDeleteUpskillDefinition = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
  
    setUpskillDefinitions(prev => prev.filter(def => def.id !== id));
    
    // Also remove it from any deep work definitions that link to it
    setDeepWorkDefinitions(prevDefs => 
      prevDefs.map(def => ({
        ...def,
        linkedUpskillIds: (def.linkedUpskillIds || []).filter(linkedId => linkedId !== id)
      }))
    );
  
    setAllUpskillLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Task "${defToDelete.name}" permanently deleted.` });
  };
  
  const handleOpenManageLinksModal = (type: 'upskill' | 'deepwork' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    if (type === 'upskill') {
        setTempLinkedIds(parent.linkedUpskillIds || []);
    } else if (type === 'deepwork') {
        setTempLinkedIds(parent.linkedDeepWorkIds || []);
    } else { // resource
        setTempLinkedIds(parent.linkedResourceIds || []);
    }
    // Reset form for "Create New" tab
    setNewLinkedItemTopic('');
    setNewLinkedItemName('');
    setNewLinkedItemDescription('');
    setNewLinkedItemLink('');
    setNewLinkedItemHours('');
    setNewLinkedItemFolderId('');
    setLinkSearchTerm('');
    setLinkResourceFolderId('');
    setIsManageLinksModalOpen(true);
  };
  
  const handleCreateAndLinkItem = async () => {
    if (!manageLinksConfig) return;

    const { type, parent } = manageLinksConfig;
    let updatedParent;

    if (type === 'resource') {
        if (!newLinkedItemFolderId) {
            toast({ title: "Error", description: "A folder must be selected.", variant: "destructive" });
            return;
        }
        if (!newLinkedItemLink.trim()) {
            toast({ title: "Error", description: "A link is required.", variant: "destructive" });
            return;
        }
        
        setIsCreatingLink(true);
        try {
            let fullLink = newLinkedItemLink.trim();
            if (!fullLink.startsWith('http://') && !fullLink.startsWith('https://')) {
                fullLink = 'https://' + fullLink;
            }

            const response = await fetch('/api/get-link-metadata', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: fullLink }),
            });

            const result = await response.json();
            if (!response.ok) {
              throw new Error(result.error || 'Failed to fetch metadata.');
            }

            const newResource: Resource = {
                id: `res_${Date.now()}_${Math.random()}`,
                name: result.title || 'Untitled Resource',
                link: fullLink,
                description: result.description || '',
                folderId: newLinkedItemFolderId,
                iconUrl: getFaviconUrl(fullLink),
            };

            setResources(prev => [...prev, newResource]);
            updatedParent = { ...parent, linkedResourceIds: [...(parent.linkedResourceIds || []), newResource.id] };
            
            setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
            setSelectedFocusArea(updatedParent);
            toast({ title: "Resource Added", description: `"${newResource.name}" has been saved and linked.`});
            setIsManageLinksModalOpen(false);

        } catch (error) {
            toast({
                title: "Error adding resource",
                description: error instanceof Error ? error.message : "Could not fetch metadata from URL.",
                variant: "destructive",
            });
        } finally {
            setIsCreatingLink(false);
        }
        return;
    }

    // Logic for non-resource types
    if (!newLinkedItemName.trim()) {
        toast({ title: "Error", description: "Name is required.", variant: "destructive" });
        return;
    }

    if (type === 'upskill') {
        if (!newLinkedItemTopic.trim()) {
            toast({ title: "Error", description: "Topic is required.", variant: "destructive" });
            return;
        }
        const link = newLinkedItemLink.trim();
        const newUpskillDef: ExerciseDefinition = {
            id: `def_${Date.now()}_upskill_${Math.random()}`,
            name: newLinkedItemName.trim(),
            category: newLinkedItemTopic.trim() as ExerciseCategory,
            description: newLinkedItemDescription.trim(),
            link: link,
            iconUrl: getFaviconUrl(link),
            estimatedHours: parseInt(newLinkedItemHours, 10) || undefined,
        };
        setUpskillDefinitions(prev => [...prev, newUpskillDef]);
        updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newUpskillDef.id] };
    } else if (type === 'deepwork') {
        if (!newLinkedItemTopic.trim()) {
            toast({ title: "Error", description: "Topic is required.", variant: "destructive" });
            return;
        }
        const newDeepWorkDef: ExerciseDefinition = {
            id: `def_${Date.now()}_deepwork_${Math.random()}`,
            name: newLinkedItemName.trim(),
            category: newLinkedItemTopic.trim() as ExerciseCategory,
            estimatedHours: parseInt(newLinkedItemHours, 10) || undefined,
        };
        setDeepWorkDefinitions(prev => [...prev, newDeepWorkDef]);
        updatedParent = { ...parent, linkedDeepWorkIds: [...(parent.linkedDeepWorkIds || []), newDeepWorkDef.id] };
    }

    if (updatedParent) {
      setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
      setSelectedFocusArea(updatedParent);
      toast({ title: "Success", description: "New item created and linked." });
      setIsManageLinksModalOpen(false);
    }
  };

  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;

    const key = type === 'upskill' ? 'linkedUpskillIds' :
                type === 'deepwork' ? 'linkedDeepWorkIds' :
                'linkedResourceIds';

    const updatedParent = {
        ...parent,
        [key]: tempLinkedIds
    };

    setDeepWorkDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setSelectedFocusArea(updatedParent);
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  }

  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;
    
    let definitionsSource: any[]; // Use any[] to accommodate different types
    if (type === 'upskill') {
        definitionsSource = upskillDefinitions;
    } else if (type === 'deepwork') {
        definitionsSource = deepWorkDefinitions;
    } else { // 'resource'
        if (!linkResourceFolderId) return [];
        definitionsSource = resources.filter(res => res.folderId === linkResourceFolderId);
    }

    return definitionsSource.filter(def => 
        def.name &&
        def.name !== 'placeholder' &&
        def.id !== parent.id && 
        def.name.toLowerCase().includes(linkSearchTerm.toLowerCase())
    );
  }, [manageLinksConfig, upskillDefinitions, deepWorkDefinitions, resources, linkSearchTerm, linkResourceFolderId]);

  const handleStartEditUpskill = (def: ExerciseDefinition) => {
    setEditingUpskill(def);
  };
  
  const handleSaveUpskillEdit = () => {
    if (!editedUpskillData || !editingUpskill) return;
    const finalUpskillData: Partial<ExerciseDefinition> = { 
        ...editedUpskillData,
        estimatedHours: editedUpskillData.estimatedHours ? parseInt(String(editedUpskillData.estimatedHours)) : undefined
    };
    if (isNaN(finalUpskillData.estimatedHours!)) {
        finalUpskillData.estimatedHours = undefined;
    }

    if (finalUpskillData.link !== editingUpskill.link) {
        finalUpskillData.iconUrl = getFaviconUrl(finalUpskillData.link || '');
    }
    setUpskillDefinitions(prev => prev.map(def => def.id === editingUpskill.id ? { ...def, ...finalUpskillData } : def));
    setEditingUpskill(null);
    toast({ title: 'Success', description: 'Upskill task updated.' });
  };
  
  const handleStartEditResource = (res: Resource) => {
    setEditingResource(res);
  };
  
  const handleSaveResourceEdit = () => {
    if (!editedResourceData || !editingResource) return;
    const finalResourceData = { ...editedResourceData };
    if (finalResourceData.link !== editingResource.link) {
        finalResourceData.iconUrl = getFaviconUrl(finalResourceData.link || '');
    }
    setResources(prev => prev.map(res => res.id === editingResource.id ? { ...res, ...finalResourceData } as Resource : res));
    setEditingResource(null);
    toast({ title: 'Success', description: 'Resource updated.' });
  };

  const handleUnlinkItem = (type: 'upskill' | 'deepwork' | 'resource', idToUnlink: string) => {
    if (!selectedFocusArea) return;
    let updatedParent: ExerciseDefinition;
    let key: 'linkedUpskillIds' | 'linkedDeepWorkIds' | 'linkedResourceIds' = 'linkedUpskillIds';
    if (type === 'deepwork') key = 'linkedDeepWorkIds';
    if (type === 'resource') key = 'linkedResourceIds';
    
    updatedParent = {
      ...selectedFocusArea,
      [key]: (selectedFocusArea[key] || []).filter((id: string) => id !== idToUnlink)
    };
    
    setDeepWorkDefinitions(prev => prev.map(def => def.id === selectedFocusArea.id ? updatedParent : def));
    setSelectedFocusArea(updatedParent);
    toast({ title: "Unlinked", description: "The item has been unlinked from this focus area." });
  };
  
  const renderFolderOptions = useCallback((parentId: string | null, level: number): JSX.Element[] => {
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    let options: JSX.Element[] = [];

    folders.forEach(folder => {
        options.push(
            <SelectItem key={folder.id} value={folder.id}>
                <span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span>
            </SelectItem>
        );
        options = options.concat(renderFolderOptions(folder.id, level + 1));
    });

    return options;
  }, [resourceFolders]);
  
  const productivityStats = useMemo(() => {
    const calculateAverageDuration = (logs: DatedWorkout[], durationField: 'reps' | 'weight') => {
        if (!logs) return 0;
        const dailyDurations: Record<string, number> = {};
        logs.forEach(log => {
            const duration = log.exercises.reduce((total, ex) => total + ex.loggedSets.reduce((sum, set) => sum + (set[durationField] || 0), 0), 0);
            if (duration > 0) { dailyDurations[log.date] = (dailyDurations[log.date] || 0) + duration; }
        });
        const daysWithActivity = Object.keys(dailyDurations).length;
        if (daysWithActivity === 0) return 0;
        const totalDuration = Object.values(dailyDurations).reduce((sum, d) => sum + d, 0);
        return totalDuration / daysWithActivity;
    };

    const totalProductiveMinutes = calculateAverageDuration(allUpskillLogs, 'reps') + calculateAverageDuration(allDeepWorkLogs, 'weight');
    const avgProductiveHours = totalProductiveMinutes / 60;
    
    return { avgProductiveHours };
  }, [allUpskillLogs, allDeepWorkLogs]);

  const openMindMapFor = (focusAreaId: string) => {
    setMindMapRootId(focusAreaId);
    setIsMindMapModalOpen(true);
  };


  if (isLoadingPage) {
    return (
      <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]">
        <Loader2 className="h-16 w-16 text-primary animate-spin mb-4" />
        <p className="text-muted-foreground">Loading your deep work data...</p>
      </div>
    );
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => { if (contextMenu) setContextMenu(null); if (focusAreaContextMenu) setFocusAreaContextMenu(null); }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          <aside className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                      <Folder /> Topic Library
                    </CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                                <FilterIcon className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuCheckboxItem
                                checked={visibilityFilters.has('intention')}
                                onCheckedChange={() => handleVisibilityFilterChange('intention')}
                            >
                                <Lightbulb className="mr-2 h-4 w-4 text-amber-500" />
                                <span>Intentions</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibilityFilters.has('objective')}
                                onCheckedChange={() => handleVisibilityFilterChange('objective')}
                            >
                                <Flag className="mr-2 h-4 w-4 text-green-500" />
                                <span>Objectives</span>
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={visibilityFilters.has('action')}
                                onCheckedChange={() => handleVisibilityFilterChange('action')}
                            >
                                <Bolt className="mr-2 h-4 w-4 text-blue-500" />
                                <span>Actions</span>
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                <CardDescription>Organize your focus areas by topic.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTopic} className="flex gap-2 mb-4">
                  <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="New Topic" />
                  <Button size="icon" type="submit"><PlusCircle className="h-4 w-4" /></Button>
                </form>
                <div className="space-y-2">
                  {topicsWithFocusAreas.map(([topic, focusAreas]) => {
                    const isCollapsed = !expandedTopics.has(topic);
                    // Hide topics that become empty after filtering, unless they are in the metadata
                    if (focusAreas.length === 0 && !deepWorkTopicMetadata[topic]) {
                      return null;
                    }
                    return (
                    <div key={topic}>
                      <div 
                        className="group flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" 
                        onClick={() => toggleTopicExpansion(topic)}
                        onContextMenu={(e) => handleContextMenu(e, topic)}
                      >
                        <div className="flex items-center gap-2 min-w-0 flex-grow">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                          <Folder className="h-4 w-4 flex-shrink-0 text-primary/80" />
                          <h4 className="font-semibold text-sm truncate">{topic}</h4>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <ul className="space-y-1 pl-4 border-l-2 border-muted ml-4">
                            {focusAreas.sort((a,b) => a.name.localeCompare(b.name)).map(def => {
                              const isParent = (def.linkedDeepWorkIds?.length ?? 0) > 0 || (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
                              const isLinkedAsChild = linkedDeepWorkChildIds.has(def.id);
                              const isIntention = isParent && !isLinkedAsChild;
                              const isObjective = isParent && isLinkedAsChild;
                              return (
                                <li key={def.id} className="group flex items-center justify-between p-1.5 rounded-md hover:bg-muted" onContextMenu={(e) => handleFocusAreaContextMenu(e, def)}>
                                  {editingDefinition?.id === def.id ? (
                                    <div className='flex-grow flex flex-col gap-2'>
                                      <Input 
                                        value={editingDefinitionName}
                                        onChange={(e) => setEditingDefinitionName(e.target.value)}
                                        className="h-8"
                                        autoFocus
                                      />
                                      <Input
                                          type="number"
                                          placeholder="Est. Hours"
                                          value={editingDefinitionHours}
                                          onChange={(e) => setEditingDefinitionHours(e.target.value)}
                                          className="h-8"
                                      />
                                      <div className="flex gap-2 self-end">
                                          <Button size="icon" className="h-8 w-8" onClick={handleSaveEditDefinition}><Save className="h-4 w-4"/></Button>
                                          <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setEditingDefinition(null)}><X className="h-4 w-4"/></Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <>
                                      <div className="flex items-center gap-2 flex-grow min-w-0">
                                        {isIntention ? (
                                          <Lightbulb className="h-4 w-4 flex-shrink-0 text-amber-500" />
                                        ) : isObjective ? (
                                          <Flag className="h-4 w-4 flex-shrink-0 text-green-500" />
                                        ) : (
                                          <Bolt className="h-4 w-4 flex-shrink-0 text-blue-500" />
                                        )}
                                        <span className="truncate cursor-pointer" onClick={() => { setSelectedFocusArea(def); setViewMode('library'); }} title={`View details for ${def.name}`}>{def.name}</span>
                                        {def.isReadyForBranding && <Share2 className="h-3 w-3 text-primary flex-shrink-0" title="Ready for Branding" />}
                                        {def.estimatedHours && <Badge variant="secondary" className="text-xs ml-auto">{def.estimatedHours}h</Badge>}
                                      </div>
                                      <div className='hidden items-center flex-shrink-0 group-hover:flex'>
                                        <TooltipProvider>
                                          <Tooltip>
                                              <TooltipTrigger asChild>
                                                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openMindMapFor(def.id)}>
                                                      <GitMerge className="h-4 w-4" />
                                                  </Button>
                                              </TooltipTrigger>
                                              <TooltipContent>View Mind Map</TooltipContent>
                                          </Tooltip>
                                          <Tooltip>
                                            <TooltipTrigger asChild>
                                              <span tabIndex={isParent ? 0 : -1}>
                                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => !isParent && handleAddTaskToSession(def)} disabled={isParent}>
                                                  <PlusCircle className="h-4 w-4" />
                                                </Button>
                                              </span>
                                            </TooltipTrigger>
                                            <TooltipContent>{isParent ? 'Add sub-tasks instead' : 'Add to Session'}</TooltipContent>
                                          </Tooltip>
                                        </TooltipProvider>
                                      </div>
                                    </>
                                  )}
                                </li>
                              )})}
                             {addingFocusToTopic === topic && (
                                <li className="p-1.5">
                                  <form onSubmit={(e) => { e.preventDefault(); handleAddFocusArea(topic); }} className="space-y-2">
                                      <Input 
                                          value={newFocusAreaName}
                                          onChange={(e) => setNewFocusAreaName(e.target.value)}
                                          className="h-8"
                                          autoFocus
                                          placeholder="New Focus Area Name"
                                          onKeyDown={e => e.key === 'Escape' && setAddingFocusToTopic(null)}
                                      />
                                      <Input 
                                          value={newFocusAreaHours}
                                          onChange={(e) => setNewFocusAreaHours(e.target.value)}
                                          type="number"
                                          className="h-8"
                                          placeholder="Est. Hours (optional)"
                                      />
                                      <div className="flex justify-end gap-2">
                                        <Button size="icon" className="h-8 w-8" type="submit"><Save className="h-4 w-4"/></Button>
                                        <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setAddingFocusToTopic(null)}><X className="h-4 w-4"/></Button>
                                      </div>
                                  </form>
                                </li>
                            )}
                          </ul>
                      )}
                    </div>
                  )})}
                </div>
              </CardContent>
            </Card>
            {selectedFocusArea && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <TrendingUp className="h-5 w-5 text-primary" />
                                Focus Area Stats
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Aggregated progress for "{selectedFocusArea.name}"
                            </CardDescription>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsFocusAreaProgressModalOpen(true)}>
                            <LineChartIcon className="h-4 w-4"/>
                        </Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Total Logged Time</span>
                                <span className="font-medium">{formatMinutes(totalLoggedTime)}</span>
                            </div>
                            {selectedFocusArea.estimatedHours && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">This Focus Area's Est.</span>
                                    <span className="font-medium">{selectedFocusArea.estimatedHours}h</span>
                                </div>
                            )}
                            {totalEstimatedHours > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-muted-foreground">Total Linked Est.</span>
                                    <span className="font-medium">{totalEstimatedHours.toFixed(1)}h</span>
                                </div>
                            )}
                        </div>
                        
                        {totalScopeHours > 0 && (
                            <div>
                                <Progress 
                                    value={Math.min(100, (totalLoggedTime / (totalScopeHours * 60)) * 100)} 
                                    className="h-2" 
                                />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                                    <span>0%</span>
                                    <span>{((totalLoggedTime / (totalScopeHours * 60)) * 100).toFixed(0)}%</span>
                                </div>
                            </div>
                        )}
                        
                        {totalScopeHours > 0 && totalLoggedTime > totalScopeHours * 60 && (
                            <Badge variant="destructive" className="w-full justify-center">
                                Overspent by {formatMinutes(totalLoggedTime - totalScopeHours * 60)}
                            </Badge>
                        )}
                    </CardContent>
                </Card>
            )}
          </aside>

          <section aria-labelledby="main-panel-heading" className="lg:col-span-3 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">
                              {viewMode === 'session' ? <ListChecks /> : <Library />}
                              {viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : `Library: ${selectedFocusArea?.name || 'Select an item'}`}
                          </CardTitle>
                          {viewMode === 'library' && selectedFocusArea && (
                            <CardDescription className="text-xs mt-1">{selectedFocusArea.category}</CardDescription>
                          )}
                      </div>

                      <div className='flex items-center gap-2 flex-shrink-0'>
                        <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                        <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')} disabled={!selectedFocusArea}>Library</Button>
                        {viewMode === 'library' && selectedFocusArea && (
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => setIsFocusAreaTimesheetModalOpen(true)}>
                                            <Clock className="h-4 w-4"/>
                                            <span className="sr-only">View Timesheet</span>
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                        <p>View Timesheet</p>
                                    </TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        )}
                        <Popover>
                            <PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "MMM dd") : <span>Pick a date</span>}</Button></PopoverTrigger>
                            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent>
                        </Popover>
                      </div>
                  </CardHeader>
                  <CardContent className="p-4">
                      {viewMode === 'session' ? (
                          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                              {currentWorkoutExercises.length === 0 ? (
                                <div className="text-center py-10"><Briefcase className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No focus areas for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add focus areas from the library to get started!</p></div>
                              ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                  {currentWorkoutExercises.map((exercise) => {
                                      const definition = deepWorkDefinitions.find(def => def.id === exercise.definitionId);
                                      return (
                                        <WorkoutExerciseCard 
                                          key={exercise.id} 
                                          exercise={exercise}
                                          definition={definition}
                                          selectedDate={selectedDate}
                                          allDeepWorkLogs={allDeepWorkLogs}
                                          allUpskillLogs={allUpskillLogs}
                                          onLogSet={handleLogSet} 
                                          onDeleteSet={handleDeleteSet} 
                                          onUpdateSet={handleUpdateSet} 
                                          onRemoveExercise={handleRemoveExerciseFromWorkout}
                                          onViewProgress={definition ? () => handleViewProgress(definition, 'deepwork') : undefined}
                                          pageType="deepwork"
                                        />
                                      );
                                  })}
                                </div>
                              )}
                          </div>
                      ) : selectedFocusArea ? (
                          <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {(selectedFocusArea.linkedUpskillIds || []).map(id => {
                                    const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                                    if (!upskillDef) return null;
                                    
                                    const youtubeEmbedUrl = upskillDef.link ? getYouTubeEmbedUrl(upskillDef.link) : null;
                                    const isNotionObsidianEmbed = upskillDef.link ? (isNotionUrl(upskillDef.link) || isObsidianUrl(upskillDef.link)) : false;
                                    const embedLinkForModal = youtubeEmbedUrl || (isNotionObsidianEmbed ? upskillDef.link : null);

                                    const loggedMinutes = getUpskillLoggedMinutes(upskillDef.id);
                                    const loggedHours = loggedMinutes / 60;

                                    return (
                                      <Card key={id} className="relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[230px]">
                                        {youtubeEmbedUrl ? (
                                            <>
                                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}>
                                                        <Expand className="h-4 w-4" />
                                                    </Button>
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef, 'upskill')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleStartEditUpskill(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleDeleteUpskillDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <div className="aspect-video w-full bg-black overflow-hidden rounded-t-2xl">
                                                    <iframe src={youtubeEmbedUrl} title={upskillDef.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                                                </div>
                                                <div className="p-4 flex-grow flex flex-col">
                                                  <div className="flex items-start justify-between gap-2 flex-grow">
                                                    <div className="flex-grow min-w-0">
                                                        <div className="flex items-center gap-2">
                                                            <Youtube className="h-5 w-5 flex-shrink-0 text-red-500" />
                                                            <p className="text-base font-bold truncate" title={upskillDef.name}>{upskillDef.name}</p>
                                                        </div>
                                                        <CardDescription className="text-xs">{upskillDef.category}</CardDescription>
                                                    </div>
                                                  </div>
                                                  <div className="mt-auto pt-2 flex items-center justify-end">
                                                    <div className="flex items-center gap-1 flex-shrink-0">
                                                        {upskillDef.estimatedHours && <Badge variant="outline">{upskillDef.estimatedHours}h est.</Badge>}
                                                        {loggedHours > 0 && <Badge variant="secondary">{loggedHours.toFixed(1)}h logged</Badge>}
                                                    </div>
                                                  </div>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {isNotionObsidianEmbed ? (
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}>
                                                            <Expand className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                                            <a href={upskillDef.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                                <ExternalLink className="h-4 w-4" />
                                                            </a>
                                                        </Button>
                                                    )}
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger asChild>
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                                                <MoreVertical className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                            <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef, 'upskill')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                                            <DropdownMenuSeparator />
                                                            <DropdownMenuItem onSelect={() => handleStartEditUpskill(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                            <DropdownMenuItem onSelect={() => handleDeleteUpskillDefinition(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </div>
                                                <CardHeader className="pb-3">
                                                  <CardTitle className="text-base flex items-center gap-2">
                                                    {upskillDef.iconUrl ? (
                                                        <Image src={upskillDef.iconUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-sm flex-shrink-0" unoptimized />
                                                    ) : (
                                                        <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                    )}
                                                    <span className="truncate" title={upskillDef.name}>{upskillDef.name}</span>
                                                  </CardTitle>
                                                  <CardDescription>{upskillDef.category}</CardDescription>
                                                </CardHeader>
                                                <CardContent className="flex-grow">
                                                  <p className="text-sm text-muted-foreground line-clamp-2">{upskillDef.description || "No description provided."}</p>
                                                </CardContent>
                                                <CardFooter className="pt-3 flex items-center justify-end">
                                                  <div className="flex items-center gap-1 flex-shrink-0">
                                                    {upskillDef.estimatedHours && <Badge variant="outline" className="flex-shrink-0">{upskillDef.estimatedHours}h est.</Badge>}
                                                    {loggedHours > 0 && <Badge variant="secondary">{loggedHours.toFixed(1)}h logged</Badge>}
                                                  </div>
                                                </CardFooter>
                                            </>
                                        )}
                                      </Card>
                                    )
                                  })}
                                  <Card 
                                    onClick={() => handleOpenManageLinksModal('upskill', selectedFocusArea)}
                                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                  >
                                    <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Task</p>
                                  </Card>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><LinkIcon className="h-5 w-5 text-primary" /> Linked Work</h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {(selectedFocusArea.linkedDeepWorkIds || []).map(id => {
                                    const deepworkDef = deepWorkDefinitions.find(dd => dd.id === id);
                                    if (!deepworkDef) return null;

                                    const isObjective = (deepworkDef.linkedDeepWorkIds?.length ?? 0) > 0 || (deepworkDef.linkedUpskillIds?.length ?? 0) > 0 || (deepworkDef.linkedResourceIds?.length ?? 0) > 0;
                                    const nodeType = isObjective ? 'Objective' : 'Action';
                                    const loggedMinutes = getDeepWorkLoggedMinutes(deepworkDef);
                                    const loggedHours = loggedMinutes / 60;
                                    
                                    return (
                                       <Card key={id} className="relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[230px]">
                                          <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <TooltipProvider>
                                                <Tooltip>
                                                  <TooltipTrigger asChild>
                                                    <span tabIndex={isObjective ? -1 : 0}>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); handleAddTaskToSession(deepworkDef); }} disabled={isObjective}>
                                                        <PlusCircle className="h-4 w-4" />
                                                      </Button>
                                                    </span>
                                                  </TooltipTrigger>
                                                  <TooltipContent>{isObjective ? 'Add sub-tasks instead' : 'Add to Session'}</TooltipContent>
                                                </Tooltip>
                                              </TooltipProvider>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedFocusArea(deepworkDef); setViewMode('library'); }}>
                                                  <ArrowRight className="h-4 w-4" />
                                              </Button>
                                              <DropdownMenu>
                                                  <DropdownMenuTrigger asChild>
                                                      <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                                          <MoreVertical className="h-4 w-4" />
                                                      </Button>
                                                  </DropdownMenuTrigger>
                                                  <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                      <DropdownMenuItem onSelect={() => handleViewProgress(deepworkDef, 'deepwork')}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuCheckboxItem checked={!!deepworkDef.isReadyForBranding} onSelect={(e) => { e.preventDefault(); handleToggleReadyForBranding(deepworkDef.id); }}>
                                                          <Share2 className="mr-2 h-4 w-4" />
                                                          <span>Ready for Branding</span>
                                                      </DropdownMenuCheckboxItem>
                                                      <DropdownMenuSeparator />
                                                      <DropdownMenuItem onSelect={() => handleStartEditDefinition(deepworkDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                      <DropdownMenuItem onSelect={() => handleUnlinkItem('deepwork', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                      <DropdownMenuItem onSelect={() => handleDeleteExerciseDefinition(deepworkDef.id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                                  </DropdownMenuContent>
                                              </DropdownMenu>
                                          </div>
                                         <CardHeader className="pb-3">
                                            <CardTitle className="text-base flex items-center gap-2">
                                              {isObjective ? (
                                                  <Flag className="h-5 w-5 text-green-500 flex-shrink-0" />
                                                ) : (
                                                  <Bolt className="h-5 w-5 text-blue-500 flex-shrink-0" />
                                                )}
                                              <span className="truncate" title={deepworkDef.name}>{deepworkDef.name}</span>
                                              <Badge variant="outline" className="text-xs">{nodeType}</Badge>
                                            </CardTitle>
                                            <CardDescription>{deepworkDef.category}</CardDescription>
                                         </CardHeader>
                                         <CardContent className="flex-grow">
                                            <p className="text-sm text-muted-foreground line-clamp-2">{deepworkDef.description || "This focus area can be expanded by linking learning tasks and resources to it."}</p>
                                         </CardContent>
                                         <CardFooter className="pt-3 flex items-center justify-end">
                                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                                {deepworkDef.estimatedHours && <Badge variant="outline">{deepworkDef.estimatedHours}h est.</Badge>}
                                                {loggedHours > 0 && <Badge variant="secondary">{loggedHours.toFixed(1)}h logged</Badge>}
                                            </div>
                                          </CardFooter>
                                       </Card>
                                    );
                                  })}
                                  <Card 
                                    onClick={() => handleOpenManageLinksModal('deepwork', selectedFocusArea)}
                                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                  >
                                    <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Focus Area</p>
                                  </Card>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> Linked Resources</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {(selectedFocusArea.linkedResourceIds || []).map(id => {
                                    const resource = resources.find(r => r.id === id);
                                    if (!resource) return null;

                                    const youtubeEmbedUrl = resource.link ? getYouTubeEmbedUrl(resource.link) : null;
                                    const isNotionObsidianEmbed = resource.link ? (isNotionUrl(resource.link) || isObsidianUrl(resource.link)) : false;
                                    const embedLinkForModal = youtubeEmbedUrl || (isNotionObsidianEmbed ? resource.link : null);

                                    return (
                                        <Card key={id} className="relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[230px]">
                                            {youtubeEmbedUrl ? (
                                                <>
                                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}>
                                                            <Expand className="h-4 w-4" />
                                                        </Button>
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-black/40 text-white hover:bg-black/70 hover:text-white">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <div className="aspect-video w-full bg-black overflow-hidden rounded-t-2xl">
                                                        <iframe src={youtubeEmbedUrl} title={resource.name} frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen className="w-full h-full"></iframe>
                                                    </div>
                                                    <div className="p-4 flex-grow">
                                                      <div className="flex items-start justify-between gap-2">
                                                        <div className="flex-grow min-w-0">
                                                            <div className="flex items-center gap-2">
                                                                <Youtube className="h-5 w-5 flex-shrink-0 text-red-500" />
                                                                <p className="text-base font-bold truncate" title={resource.name}>{resource.name}</p>
                                                            </div>
                                                            <CardDescription className="text-xs">{resourceFolders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'}</CardDescription>
                                                        </div>
                                                      </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {isNotionObsidianEmbed ? (
                                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}>
                                                            <Expand className="h-4 w-4" />
                                                        </Button>
                                                        ) : (
                                                            <Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                                                <a href={resource.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                                                                    <ExternalLink className="h-4 w-4" />
                                                                </a>
                                                            </Button>
                                                        )}
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm">
                                                                    <MoreVertical className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                                <DropdownMenuItem onSelect={() => handleStartEditResource(resource)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                                <DropdownMenuItem onSelect={() => handleUnlinkItem('resource', id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </div>
                                                    <CardHeader className="pb-3">
                                                      <CardTitle className="text-base flex items-center gap-2">
                                                        {resource.iconUrl ? (
                                                            <Image src={resource.iconUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-sm flex-shrink-0" unoptimized />
                                                        ) : (
                                                            <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                                        )}
                                                        <span className="truncate" title={resource.name}>{resource.name}</span>
                                                      </CardTitle>
                                                      <CardDescription>{resourceFolders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'}</CardDescription>
                                                    </CardHeader>
                                                    <CardContent className="flex-grow">
                                                      <p className="text-sm text-muted-foreground line-clamp-2">{resource.description || "No description provided."}</p>
                                                    </CardContent>
                                                </>
                                            )}
                                        </Card>
                                    )
                                  })}
                                  <Card 
                                    onClick={() => handleOpenManageLinksModal('resource', selectedFocusArea)}
                                    className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[230px] hover:shadow-xl hover:-translate-y-1"
                                  >
                                    <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                    <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Resource</p>
                                  </Card>
                                </div>
                              </div>
                            </div>
                        </ScrollArea>
                      ) : (
                          <div className="text-center py-10"><p className="text-muted-foreground">Select a Focus Area from the library to view its details.</p></div>
                      )}
                  </CardContent>
              </Card>
          </section>
        </div>
        
        {progressModalConfig.isOpen && progressModalConfig.exercise && (
          <ExerciseProgressModal 
            isOpen={progressModalConfig.isOpen} 
            onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))}
            exercise={progressModalConfig.exercise} 
            allWorkoutLogs={progressModalConfig.pageType === 'upskill' ? allUpskillLogs : allDeepWorkLogs}
            pageType={progressModalConfig.pageType}
            topicGoals={progressModalConfig.pageType === 'upskill' ? topicGoals : undefined}
          />
        )}
        
        {selectedFocusArea && (
            <FocusAreaProgressModal 
                isOpen={isFocusAreaProgressModalOpen}
                onOpenChange={setIsFocusAreaProgressModalOpen}
                focusArea={selectedFocusArea}
                deepWorkDefinitions={deepWorkDefinitions}
                upskillDefinitions={upskillDefinitions}
                allDeepWorkLogs={allDeepWorkLogs}
                allUpskillLogs={allUpskillLogs}
                avgDailyProductiveHours={productivityStats.avgProductiveHours}
            />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>It's Monday! Would you like to back up your deep work data?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {contextMenu && (
        <div
            ref={contextMenuRef}
            style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }}
            className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            onClick={(e) => {
              e.stopPropagation();
              setContextMenu(null);
            }}
        >
          <Button variant="ghost" className="w-full justify-start h-9 px-2" onClick={(e) => {
              e.stopPropagation();
              toggleTopicExpansion(contextMenu.item);
              setAddingFocusToTopic(contextMenu.item);
              setContextMenu(null);
          }}>
            <PlusCircle className="mr-2 h-4 w-4" /> New Focus Area
          </Button>
          <Button variant="ghost" className="w-full justify-start h-9 px-2" onClick={() => {
              setEditingTopic(contextMenu.item);
              setContextMenu(null);
          }}>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Topic
          </Button>
          <div className="-mx-1 my-1 h-px bg-muted" />
          <Button variant="ghost" className="w-full justify-start text-destructive hover:text-destructive h-9 px-2" onClick={() => {
              setTopicToDelete(contextMenu.item);
              setContextMenu(null);
          }}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Topic
          </Button>
        </div>
      )}

      {focusAreaContextMenu && (
        <div
            ref={focusAreaContextMenuRef}
            style={{ top: focusAreaContextMenu.mouseY, left: focusAreaContextMenu.mouseX }}
            className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            onClick={(e) => {
                e.stopPropagation();
                setFocusAreaContextMenu(null);
            }}
        >
            <div
                role="menuitem"
                className="relative flex cursor-pointer select-none items-center rounded-sm h-9 px-2 gap-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                onMouseDown={() => { handleViewProgress(focusAreaContextMenu.item, 'deepwork'); setFocusAreaContextMenu(null); }}>
                <TrendingUp /> View Progress
            </div>
            <div className="-mx-1 my-1 h-px bg-muted" />
            <div
                role="menuitem"
                className="relative flex cursor-pointer select-none items-center rounded-sm h-9 px-2 gap-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                onMouseDown={(e) => {
                    e.preventDefault();
                    handleToggleReadyForBranding(focusAreaContextMenu.item.id);
                    setFocusAreaContextMenu(null);
                }}
            >
                <Checkbox checked={!!focusAreaContextMenu.item.isReadyForBranding} className="h-4 w-4 pointer-events-none mr-2" />
                <span className="pointer-events-none">Ready for Branding</span>
            </div>
            <div className="-mx-1 my-1 h-px bg-muted" />
            <div role="menuitem" className="relative flex cursor-pointer select-none items-center rounded-sm h-9 px-2 gap-2 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground" onMouseDown={() => { handleStartEditDefinition(focusAreaContextMenu.item); setFocusAreaContextMenu(null); }}>
                <Edit3 /> Edit
            </div>
            <div role="menuitem" className="relative flex cursor-pointer select-none items-center rounded-sm h-9 px-2 gap-2 text-sm outline-none transition-colors text-destructive hover:bg-accent hover:text-destructive" onMouseDown={() => { handleDeleteExerciseDefinition(focusAreaContextMenu.item.id); setFocusAreaContextMenu(null); }}>
                <Trash2 /> Delete
            </div>
        </div>
      )}

      <Dialog open={isManageLinksModalOpen} onOpenChange={setIsManageLinksModalOpen}>
        <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Manage Links for "{manageLinksConfig?.parent.name}"</DialogTitle>
              <DialogDescription>
                Create a new item and link it, or link existing items from your library.
              </DialogDescription>
            </DialogHeader>
            <Tabs defaultValue="create-new" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="create-new">Create New</TabsTrigger>
                    <TabsTrigger value="link-existing">Link from Library</TabsTrigger>
                </TabsList>
                <TabsContent value="create-new">
                    <div className="space-y-4 py-4">
                        {manageLinksConfig?.type === 'resource' ? (
                            <>
                                <div className="space-y-1">
                                    <Label htmlFor="new-linked-folder">Folder</Label>
                                    <Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}>
                                        <SelectTrigger id="new-linked-folder"><SelectValue placeholder="Select a folder..." /></SelectTrigger>
                                        <SelectContent>
                                            {renderFolderOptions(null, 0)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="new-linked-link">Link</Label>
                                    <Input id="new-linked-link" value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} placeholder="https://..." />
                                </div>
                            </>
                        ) : (
                            <>
                                <div className="space-y-1">
                                <Label htmlFor="new-linked-topic">Topic</Label>
                                <Input id="new-linked-topic" value={newLinkedItemTopic} onChange={e => setNewLinkedItemTopic(e.target.value)} placeholder="e.g., GPU Programming" />
                                </div>
                                <div className="space-y-1">
                                <Label htmlFor="new-linked-name">Name</Label>
                                <Input id="new-linked-name" value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} placeholder={manageLinksConfig?.type === 'upskill' ? 'e.g., CUDA Fundamentals Course' : 'e.g., Implement Ray Tracing'} />
                                </div>
                                <div className="space-y-1">
                                    <Label htmlFor="new-linked-hours">Estimated Hours</Label>
                                    <Input id="new-linked-hours" type="number" value={newLinkedItemHours} onChange={e => setNewLinkedItemHours(e.target.value)} placeholder="e.g., 20" />
                                </div>
                                {manageLinksConfig?.type === 'upskill' && (
                                <>
                                    <div className="space-y-1">
                                    <Label htmlFor="new-linked-desc">Description</Label>
                                    <Textarea id="new-linked-desc" value={newLinkedItemDescription} onChange={e => setNewLinkedItemDescription(e.target.value)} placeholder="Key points, summary..." />
                                    </div>
                                    <div className="space-y-1">
                                    <Label htmlFor="new-linked-link">Link</Label>
                                    <Input id="new-linked-link" value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} placeholder="https://..." />
                                    </div>
                                </>
                                )}
                            </>
                        )}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageLinksModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleCreateAndLinkItem} disabled={isCreatingLink}>
                          {isCreatingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                          {isCreatingLink ? 'Fetching...' : 'Create & Link'}
                        </Button>
                    </DialogFooter>
                </TabsContent>
                <TabsContent value="link-existing">
                    <div className="py-4">
                      {manageLinksConfig?.type === 'resource' && (
                        <div className="mb-4 space-y-1">
                            <Label htmlFor="link-resource-folder">Select Folder</Label>
                            <Select value={linkResourceFolderId} onValueChange={setLinkResourceFolderId}>
                                <SelectTrigger id="link-resource-folder">
                                    <SelectValue placeholder="Select a folder to view resources..." />
                                </SelectTrigger>
                                <SelectContent>{renderFolderOptions(null, 0)}</SelectContent>
                            </Select>
                        </div>
                      )}
                      <Input 
                          placeholder="Search library..."
                          value={linkSearchTerm}
                          onChange={e => setLinkSearchTerm(e.target.value)}
                          className="mb-4"
                      />
                      <ScrollArea className="h-64">
                          <div className="space-y-2 pr-4">
                              {filteredItemsForLinking.length > 0 ? filteredItemsForLinking.map(item => (
                                  <div key={item.id} className="flex items-center space-x-2">
                                      <Checkbox
                                          id={`link-${item.id}`}
                                          checked={tempLinkedIds.includes(item.id)}
                                          onCheckedChange={checked => {
                                              setTempLinkedIds(prev =>
                                                  checked
                                                      ? [...prev, item.id]
                                                      : prev.filter(id => id !== item.id)
                                              );
                                          }}
                                      />
                                      <Label htmlFor={`link-${item.id}`} className="font-normal w-full cursor-pointer">
                                          {item.name}
                                          {item.category && <span className="text-muted-foreground text-xs ml-2">({item.category})</span>}
                                          {item.folderId && <span className="text-muted-foreground text-xs ml-2">({resourceFolders.find(f => f.id === item.folderId)?.name})</span>}
                                      </Label>
                                  </div>
                              )) : (
                                <p className="text-sm text-center text-muted-foreground py-4">
                                  {manageLinksConfig?.type === 'resource' && !linkResourceFolderId 
                                      ? "Please select a folder." 
                                      : "No matching items found."}
                                </p>
                              )}
                          </div>
                      </ScrollArea>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsManageLinksModalOpen(false)}>Cancel</Button>
                        <Button onClick={handleSaveExistingLinks}>Save Links</Button>
                    </DialogFooter>
                </TabsContent>
            </Tabs>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!editingTopic} onOpenChange={(isOpen) => !isOpen && setEditingTopic(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Topic</DialogTitle>
                <DialogDescription>
                    Rename the topic or change its classification. This will move it between the Productization and Offerization pages.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                  <Label htmlFor="edit-topic-name">Topic Name</Label>
                  <Input id="edit-topic-name" value={newTopicNameForEdit} onChange={(e) => setNewTopicNameForEdit(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Classification</Label>
                  <RadioGroup value={newTopicClassificationForEdit} onValueChange={(v) => setNewTopicClassificationForEdit(v as 'product' | 'service')} className="flex gap-4 pt-1">
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="product" id="class-product" />
                          <Label htmlFor="class-product" className="font-normal">Product</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                          <RadioGroupItem value="service" id="class-service" />
                          <Label htmlFor="class-service" className="font-normal">Service</Label>
                      </div>
                  </RadioGroup>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingTopic(null)}>Cancel</Button>
                <Button onClick={handleSaveTopicEdit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <AlertDialog open={!!topicToDelete} onOpenChange={(isOpen) => !isOpen && setTopicToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
                This will permanently delete the topic "{topicToDelete}" and ALL of its focus areas and logged sessions. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic} className="bg-destructive hover:bg-destructive/90">
                Delete Topic
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}>
        <DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2">
            <DialogHeader className="sr-only">
              <DialogTitle>Embedded Resource</DialogTitle>
            </DialogHeader>
            <div className="flex-grow min-h-0">
                {embedUrl && (
                    <iframe
                        src={embedUrl}
                        className="w-full h-full border-0 rounded-md"
                        title="Embedded Resource"
                        sandbox="allow-scripts allow-same-origin allow-forms"
                    ></iframe>
                )}
            </div>
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingUpskill} onOpenChange={() => setEditingUpskill(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Learning Task</DialogTitle>
                <DialogDescription>Update the details of this learning task.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1"><Label htmlFor="upskill-name">Name</Label><Input id="upskill-name" value={editedUpskillData.name || ''} onChange={e => setEditedUpskillData(d => ({ ...d, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label htmlFor="upskill-desc">Description</Label><Textarea id="upskill-desc" value={editedUpskillData.description || ''} onChange={e => setEditedUpskillData(d => ({ ...d, description: e.target.value }))} /></div>
                <div className="space-y-1"><Label htmlFor="upskill-link">Link</Label><Input id="upskill-link" value={editedUpskillData.link || ''} onChange={e => setEditedUpskillData(d => ({ ...d, link: e.target.value }))} /></div>
                <div className="space-y-1"><Label htmlFor="upskill-hours">Est. Hours</Label><Input id="upskill-hours" type="number" value={editedUpskillData.estimatedHours || ''} onChange={e => setEditedUpskillData(d => ({ ...d, estimatedHours: e.target.value ? parseInt(e.target.value, 10) : undefined }))} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingUpskill(null)}>Cancel</Button>
                <Button onClick={handleSaveUpskillEdit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={!!editingResource} onOpenChange={() => setEditingResource(null)}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Edit Resource</DialogTitle>
                <DialogDescription>Update the details of this resource.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1"><Label htmlFor="resource-name">Name</Label><Input id="resource-name" value={editedResourceData.name || ''} onChange={e => setEditedResourceData(d => ({ ...d, name: e.target.value }))} /></div>
                <div className="space-y-1"><Label htmlFor="resource-folder">Folder</Label>
                    <Select value={editedResourceData.folderId || ''} onValueChange={v => setEditedResourceData(d => ({ ...d, folderId: v }))}>
                        <SelectTrigger id="resource-folder"><SelectValue placeholder="Select a folder..." /></SelectTrigger>
                        <SelectContent>{renderFolderOptions(null, 0)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1"><Label htmlFor="resource-desc">Description</Label><Textarea id="resource-desc" value={editedResourceData.description || ''} onChange={e => setEditedResourceData(d => ({ ...d, description: e.target.value }))} /></div>
                <div className="space-y-1"><Label htmlFor="resource-link">Link</Label><Input id="resource-link" value={editedResourceData.link || ''} onChange={e => setEditedResourceData(d => ({ ...d, link: e.target.value }))} /></div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setEditingResource(null)}>Cancel</Button>
                <Button onClick={handleSaveResourceEdit}>Save Changes</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>

    <Dialog open={isMindMapModalOpen} onOpenChange={setIsMindMapModalOpen}>
        <DialogContent className="max-w-7xl h-[90vh] p-0 flex flex-col">
            <DialogHeader className="sr-only">
              <DialogTitle>Focus Area Mind Map</DialogTitle>
            </DialogHeader>
            <MindMapViewer rootFocusAreaId={mindMapRootId} showControls={false} />
        </DialogContent>
    </Dialog>

    <Dialog open={isFocusAreaTimesheetModalOpen} onOpenChange={setIsFocusAreaTimesheetModalOpen}>
        <DialogContent className="max-w-3xl">
            <DialogHeader>
                <DialogTitle>Timesheet for "{selectedFocusArea?.name}"</DialogTitle>
                <DialogDescription>
                    A detailed log of all time spent on this focus area and its linked tasks.
                </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] mt-4 pr-6">
                <div className="space-y-4">
                    {timesheetData.length > 0 ? timesheetData.map(day => (
                        <Card key={day.date}>
                            <CardHeader className="p-3 flex flex-row justify-between items-center">
                                <div>
                                    <CardTitle className="text-base">{format(parseISO(day.date), 'PPP')}</CardTitle>
                                    <CardDescription className="text-xs">Total: {formatMinutes(day.totalDuration)}</CardDescription>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 pt-0">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Task</TableHead>
                                            <TableHead className="text-right w-24">Duration</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {day.tasks.map((task, index) => (
                                            <TableRow key={index}>
                                                <TableCell className="font-medium">{task.taskName}</TableCell>
                                                <TableCell className="text-right">{formatMinutes(task.duration)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>
                    )) : (
                        <p className="text-center text-muted-foreground py-8">No time logged for this focus area yet.</p>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
