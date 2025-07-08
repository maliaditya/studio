
"use client";

import React, { useState, useEffect, FormEvent, useMemo, useRef, useCallback } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription, CardFooter } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronDown, CalendarIcon, TrendingUp, Loader2, BookCopy, MoreVertical, Link as LinkIcon, Folder, Library, Globe, ExternalLink, Youtube, Share2, ArrowRight, Expand, Filter as FilterIcon, GitMerge, Clock, Unlink, Flashlight, Focus, Frame } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, getISOWeek, isMonday, getYear, parseISO, differenceInDays } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, Resource, ResourceFolder, TopicGoal } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
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
import { motion, AnimatePresence } from 'framer-motion';

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
        if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    } catch (e) {}
    return null;
};

const isNotionUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname.endsWith('notion.so');
    } catch (e) { return false; }
};

const isObsidianUrl = (url: string): boolean => {
    try {
        const urlObj = new URL(url);
        return urlObj.hostname === 'share.note.sx';
    } catch (e) { return false; }
};

function UpskillPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, exportData,
    allUpskillLogs, setAllUpskillLogs,
    upskillDefinitions, setUpskillDefinitions,
    topicGoals, setTopicGoals,
    resources, setResources, resourceFolders,
  } = useAuth();

  const [newTopicName, setNewTopicName] = useState('');
  const [newTopicGoalType, setNewTopicGoalType] = useState<'pages' | 'hours'>('pages');
  const [newTopicGoalValue, setNewTopicGoalValue] = useState('');
  
  const [editingSubtopic, setEditingSubtopic] = useState<ExerciseDefinition | null>(null);
  const [editedSubtopicData, setEditedSubtopicData] = useState<Partial<ExerciseDefinition>>({});
  
  const [editingTopicGoal, setEditingTopicGoal] = useState<string | null>(null);
  const [topicToDelete, setTopicToDelete] = useState<string | null>(null);
  const [currentGoal, setCurrentGoal] = useState<TopicGoal>({ goalType: 'pages', goalValue: 0 });

  const [expandedTopics, setExpandedTopics] = useState<Set<string>>(new Set());
  
  const [contextMenu, setContextMenu] = useState<{ mouseX: number; mouseY: number; item: string; } | null>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);
  const [subtopicContextMenu, setSubtopicContextMenu] = useState<{ mouseX: number; mouseY: number; item: ExerciseDefinition; } | null>(null);
  const subtopicContextMenuRef = useRef<HTMLDivElement>(null);

  const [visibilityFilters, setVisibilityFilters] = useState<Set<'curiosity' | 'objective' | 'visualization'>>(new Set(['curiosity', 'objective', 'visualization']));

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  
  const [progressModalConfig, setProgressModalConfig] = useState<{ isOpen: boolean; exercise: ExerciseDefinition | null; }>({ isOpen: false, exercise: null });
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);

  const [viewMode, setViewMode] = useState<'session' | 'library'>('session');
  const [selectedSubtopic, setSelectedSubtopic] = useState<ExerciseDefinition | null>(null);

  const [isManageLinksModalOpen, setIsManageLinksModalOpen] = useState(false);
  const [manageLinksConfig, setManageLinksConfig] = useState<{type: 'upskill' | 'resource', parent: ExerciseDefinition} | null>(null);
  const [newLinkedItemName, setNewLinkedItemName] = useState('');
  const [newLinkedItemTopic, setNewLinkedItemTopic] = useState('');
  const [newLinkedItemDescription, setNewLinkedItemDescription] = useState('');
  const [newLinkedItemLink, setNewLinkedItemLink] = useState('');
  const [newLinkedItemHours, setNewLinkedItemHours] = useState('');
  const [newLinkedItemFolderId, setNewLinkedItemFolderId] = useState('');
  const [linkSearchTerm, setLinkSearchTerm] = useState('');
  const [tempLinkedIds, setTempLinkedIds] = useState<string[]>([]);
  const [linkResourceFolderId, setLinkResourceFolderId] = useState<string>('');
  const [linkUpskillTopic, setLinkUpskillTopic] = useState<string>('');
  const [isCreatingLink, setIsCreatingLink] = useState(false);

  // State for the new subtopic modal
  const [isNewSubtopicModalOpen, setIsNewSubtopicModalOpen] = useState(false);
  const [newSubtopicParentTopic, setNewSubtopicParentTopic] = useState<string | null>(null);
  const [newSubtopicData, setNewSubtopicData] = useState({ name: '', description: '', link: '', hours: '' });

  const [embedUrl, setEmbedUrl] = useState<string | null>(null);

  const permanentlyLoggedVisualizationIds = useMemo(() => {
    const loggedIds = new Set<string>();
    if (!allUpskillLogs) return loggedIds;

    allUpskillLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          loggedIds.add(ex.definitionId);
        }
      });
    });

    return loggedIds;
  }, [allUpskillLogs]);
  
  const allKnownTopics = useMemo(() => {
    const topicsFromDefs = new Set(upskillDefinitions.map(def => def.category));
    const topicsFromMeta = new Set(Object.keys(topicGoals));
    return Array.from(new Set([...topicsFromDefs, ...topicsFromMeta])).sort();
  }, [upskillDefinitions, topicGoals]);

  const linkedUpskillChildIds = useMemo(() => 
    new Set<string>((upskillDefinitions || []).flatMap(def => def.linkedUpskillIds || []))
  , [upskillDefinitions]);

  const handleVisibilityFilterChange = (filter: 'curiosity' | 'objective' | 'visualization') => {
    setVisibilityFilters(prev => {
        const newSet = new Set(prev);
        if (newSet.has(filter)) {
            newSet.delete(filter);
        } else {
            newSet.add(filter);
        }
        if(newSet.size === 0) return new Set(['curiosity', 'objective', 'visualization']);
        return newSet;
    });
  };

  const topicsWithSubtopics = useMemo(() => {
    const effectiveFilters = visibilityFilters.size === 0 ? new Set<never>() : visibilityFilters;
    const visibleDefinitions = upskillDefinitions.filter(def => {
        if(def.name === 'placeholder') return false;
        
        const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isLinkedAsChild = linkedUpskillChildIds.has(def.id);

        const isCuriosity = isParent && !isLinkedAsChild;
        const isObjective = isParent && isLinkedAsChild;
        const isVisualization = !isParent;

        if (effectiveFilters.has('curiosity') && isCuriosity) return true;
        if (effectiveFilters.has('objective') && isObjective) return true;
        if (effectiveFilters.has('visualization') && isVisualization) return true;
        
        return false;
    });
    
    const grouped: { [key: string]: ExerciseDefinition[] } = {};
    visibleDefinitions.forEach(def => {
        if (!grouped[def.category]) grouped[def.category] = [];
        grouped[def.category].push(def);
    });

    return allKnownTopics.map(topic => [topic, grouped[topic] || []] as [string, ExerciseDefinition[]]);
  }, [allKnownTopics, upskillDefinitions, linkedUpskillChildIds, visibilityFilters]);

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
  
  const getUpskillLoggedMinutesRecursive = useCallback((definition: ExerciseDefinition) => {
    if (!definition) return 0;
    const visited = new Set<string>();
    const visualizationIds = new Set<string>();

    function recurse(nodeId: string) {
        if (visited.has(nodeId)) return;
        visited.add(nodeId);
        const node = upskillDefinitions.find(d => d.id === nodeId);
        if (!node) return;
        if (!node.linkedUpskillIds || node.linkedUpskillIds.length === 0) {
            visualizationIds.add(node.id);
        } else {
            node.linkedUpskillIds.forEach(childId => recurse(childId));
        }
    }
    recurse(definition.id);

    let totalMinutes = 0;
    if (allUpskillLogs) {
        allUpskillLogs.forEach(log => {
            log.exercises.forEach(ex => {
                if (visualizationIds.has(ex.definitionId)) {
                    totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);
                }
            });
        });
    }
    return totalMinutes;
  }, [allUpskillLogs, upskillDefinitions]);

  const totalLoggedTime = useMemo(() => {
    if (!selectedSubtopic) return 0;
    return getUpskillLoggedMinutesRecursive(selectedSubtopic);
  }, [selectedSubtopic, getUpskillLoggedMinutesRecursive]);

  const formatMinutes = (minutes: number) => {
    if (minutes === 0) return "0m";
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return `${h > 0 ? `${h}h` : ''} ${m > 0 ? `${m}m` : ''}`.trim();
  }

  useEffect(() => {
    if (editingSubtopic) setEditedSubtopicData(editingSubtopic);
  }, [editingSubtopic]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
        if (contextMenuRef.current && !contextMenuRef.current.contains(event.target as Node)) setContextMenu(null);
        if (subtopicContextMenuRef.current && !subtopicContextMenuRef.current.contains(event.target as Node)) setSubtopicContextMenu(null);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => { document.removeEventListener('mousedown', handleClickOutside); };
  }, []);

  const handleContextMenu = (e: React.MouseEvent, topic: string) => {
    e.preventDefault(); e.stopPropagation(); setSubtopicContextMenu(null);
    setContextMenu({ mouseX: e.clientX, mouseY: e.clientY, item: topic, });
  };

  const handleSubtopicContextMenu = (e: React.MouseEvent, item: ExerciseDefinition) => {
    e.preventDefault(); e.stopPropagation(); setContextMenu(null);
    setSubtopicContextMenu({ mouseX: e.clientX, mouseY: e.clientY, item: item, });
  };

  const toggleTopicExpansion = useCallback((topic: string) => {
    setExpandedTopics(prev => {
        const newSet = new Set(prev);
        if (newSet.has(topic)) newSet.delete(topic); else newSet.add(topic);
        return newSet;
    });
  }, []);

  useEffect(() => {
    setIsLoadingPage(false);
  }, []);

  useEffect(() => {
    if (!currentUser) return;
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
    if (isMonday(today) && !localStorage.getItem(backupPromptKey)) setShowBackupPrompt(true);
  }, [currentUser]);

  const markBackupPromptAsHandled = () => {
    const today = new Date();
    const year = getYear(today);
    const week = getISOWeek(today);
    const backupPromptKey = `backupPrompt_upskill_${year}-${week}`;
    localStorage.setItem(backupPromptKey, 'true');
    setShowBackupPrompt(false);
  };

  const handleBackupConfirm = () => { exportData(); markBackupPromptAsHandled(); };

  const currentDatedWorkout = useMemo(() => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    return allUpskillLogs.find(log => log.id === dateKey);
  }, [selectedDate, allUpskillLogs]);

  const currentWorkoutExercises = useMemo(() => currentDatedWorkout?.exercises || [], [currentDatedWorkout]);

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllUpskillLogs(prevLogs => {
      const index = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (index > -1) {
        const newLogs = [...prevLogs]; newLogs[index] = updatedWorkout; return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTopic = (e: FormEvent) => {
    e.preventDefault();
    if (!newTopicName.trim()) { toast({ title: "Error", description: "Topic name cannot be empty.", variant: "destructive" }); return; }
    const topic = newTopicName.trim();
    if (topicsWithSubtopics.some(([t]) => t.toLowerCase() === topic.toLowerCase())) { toast({ title: "Error", description: "This topic already exists.", variant: "destructive" }); return; }
    const goalVal = parseInt(newTopicGoalValue, 10);
    if (isNaN(goalVal) || goalVal <= 0) { toast({ title: "Invalid Goal", description: "Goal value must be a positive number.", variant: "destructive" }); return; }
    setTopicGoals(prev => ({ ...prev, [topic]: { goalType: newTopicGoalType, goalValue: goalVal } }));
    const dummyDef: ExerciseDefinition = { id: `topic_placeholder_${Date.now()}`, name: 'placeholder', category: topic as ExerciseCategory };
    setUpskillDefinitions(prev => prev.filter(d => d.name !== 'placeholder').concat(dummyDef));
    setNewTopicName(''); setNewTopicGoalValue('');
    toast({ title: "Topic Created", description: `"${topic}" has been added.` });
  };

  const handleCreateSubtopic = () => {
    if (!newSubtopicParentTopic || !newSubtopicData.name.trim()) {
        toast({ title: "Error", description: "Name is required.", variant: "destructive" });
        return;
    }

    const newDef: ExerciseDefinition = { 
        id: `def_${Date.now()}_${Math.random()}`, 
        name: newSubtopicData.name.trim(), 
        category: newSubtopicParentTopic as ExerciseCategory,
        description: newSubtopicData.description.trim(),
        link: newSubtopicData.link.trim(),
        iconUrl: getFaviconUrl(newSubtopicData.link.trim()),
        estimatedHours: parseInt(newSubtopicData.hours, 10) || undefined,
    };
    
    setUpskillDefinitions(prev => [...prev.filter(d => d.name !== 'placeholder'), newDef]);
    
    setIsNewSubtopicModalOpen(false);
    setNewSubtopicData({ name: '', description: '', link: '', hours: '' });
    
    toast({ title: "Success", description: `Subtopic "${newDef.name}" created.` });

    setExpandedTopics(prev => {
        const newSet = new Set(prev);
        if (newSubtopicParentTopic) {
            newSet.add(newSubtopicParentTopic);
        }
        return newSet;
    });

    setSelectedSubtopic(newDef);
    setViewMode('library');
  };

  const handleDeleteSubtopic = (id: string) => {
    const defToDelete = upskillDefinitions.find(def => def.id === id);
    if (!defToDelete) return;
    setUpskillDefinitions(prev => {
        const withoutDef = prev.filter(def => def.id !== id);
        return withoutDef.map(d => ({
            ...d,
            linkedUpskillIds: (d.linkedUpskillIds || []).filter(linkedId => linkedId !== id)
        }));
    });
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) })));
    if (selectedSubtopic?.id === id) { setSelectedSubtopic(null); setViewMode('session'); }
    toast({ title: "Success", description: `Task "${defToDelete.name}" removed.` });
  };

  const handleStartEditSubtopic = (def: ExerciseDefinition) => {
    setEditingSubtopic(def);
    setEditedSubtopicData(def);
  };

  const handleSaveSubtopicEdit = () => {
    if (!editingSubtopic || !editedSubtopicData.name?.trim()) { toast({ title: "Error", description: "Subtopic name cannot be empty.", variant: "destructive" }); return; }
    
    let finalData = { ...editedSubtopicData };
    if (finalData.link !== editingSubtopic.link) finalData.iconUrl = getFaviconUrl(finalData.link || '');
    
    setUpskillDefinitions(prev => prev.map(def => def.id === editingSubtopic.id ? { ...def, ...finalData } as ExerciseDefinition : def));
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({...log, exercises: log.exercises.map(ex => ex.definitionId === editingSubtopic.id ? { ...ex, name: finalData.name! } : ex)})));
    if(selectedSubtopic?.id === editingSubtopic.id) setSelectedSubtopic({ ...selectedSubtopic, ...finalData } as ExerciseDefinition);
    toast({ title: "Success", description: `Task updated to "${finalData.name}".` });
    setEditingSubtopic(null);
  };

  const handleDeleteTopic = () => {
    if (!topicToDelete) return;
    setUpskillDefinitions(prev => prev.filter(def => def.category !== topicToDelete));
    setTopicGoals(prev => { const newGoals = {...prev}; delete newGoals[topicToDelete]; return newGoals; });
    setAllUpskillLogs(prevLogs => prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.category !== topicToDelete) })));
    if (selectedSubtopic && selectedSubtopic.category === topicToDelete) { setSelectedSubtopic(null); setViewMode('session'); }
    toast({ title: "Topic Deleted", description: `Topic "${topicToDelete}" and all its subtopics have been removed.`});
    setTopicToDelete(null);
  };
  
  const handleStartEditingGoal = (topic: string) => {
    setEditingTopicGoal(topic);
    setCurrentGoal(topicGoals[topic] || { goalType: 'pages', goalValue: 0 });
  };

  const handleSaveGoal = () => {
    if (!editingTopicGoal) return;
    setTopicGoals(prev => ({...prev, [editingTopicGoal]: currentGoal }));
    toast({ title: "Goal Updated", description: `Goal for "${editingTopicGoal}" has been saved.`});
    setEditingTopicGoal(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}-${Math.random()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      if (existingWorkout.exercises.some(ex => ex.definitionId === definition.id)) { toast({ title: "Info", description: `"${definition.name}" is already in this session.` }); return; }
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: [...existingWorkout.exercises, newWorkoutExercise] });
    } else {
      updateOrAddWorkoutLog({ id: dateKey, date: dateKey, exercises: [newWorkoutExercise] });
    }
    toast({ title: "Added to Session", description: `"${definition.name}" added for ${format(selectedDate, 'PPP')}.` });
  };

  const handleRemoveExerciseFromWorkout = (exerciseId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllUpskillLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be duration, weight is progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: `${Date.now()}-${Math.random()}`, reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Progress Logged!", description: `Your learning session has been saved.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=duration, weight=progress
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allUpskillLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.map(set => set.id === setId ? { ...set, reps, weight, timestamp: Date.now() } : set )} : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleViewProgress = (definition: ExerciseDefinition) => { setProgressModalConfig({ isOpen: true, exercise: definition }); };
  
  const handleOpenManageLinksModal = (type: 'upskill' | 'resource', parent: ExerciseDefinition) => {
    setManageLinksConfig({ type, parent });
    setTempLinkedIds(type === 'upskill' ? (parent.linkedUpskillIds || []) : (parent.linkedResourceIds || []));
    setNewLinkedItemTopic(parent.category);
    setNewLinkedItemName(''); setNewLinkedItemDescription(''); setNewLinkedItemLink(''); setNewLinkedItemHours(''); setNewLinkedItemFolderId('');
    setLinkSearchTerm(''); setLinkResourceFolderId(''); setLinkUpskillTopic('');
    setIsManageLinksModalOpen(true);
  };
  
  const handleCreateAndLinkItem = async () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    let updatedParent: ExerciseDefinition | undefined;

    if (type === 'resource') {
        if (!newLinkedItemFolderId || !newLinkedItemLink.trim()) {
            toast({ title: "Error", description: "A folder and link are required.", variant: "destructive" }); return;
        }
        setIsCreatingLink(true);
        try {
            let fullLink = newLinkedItemLink.trim();
            if (!fullLink.startsWith('http')) fullLink = 'https://' + fullLink;
            const response = await fetch('/api/get-link-metadata', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: fullLink }), });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to fetch metadata.');
            const newResource: Resource = {
                id: `res_${Date.now()}_${Math.random()}`, name: result.title || 'Untitled Resource', link: fullLink,
                description: result.description || '', folderId: newLinkedItemFolderId, iconUrl: getFaviconUrl(fullLink),
            };
            setResources(prev => [...prev, newResource]);
            updatedParent = { ...parent, linkedResourceIds: [...(parent.linkedResourceIds || []), newResource.id] };
            setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent! : def));
            setSelectedSubtopic(updatedParent);
            toast({ title: "Resource Added", description: `"${newResource.name}" has been saved and linked.`});
            setIsManageLinksModalOpen(false);
        } catch (error) {
            toast({ title: "Error adding resource", description: error instanceof Error ? error.message : "Could not fetch metadata.", variant: "destructive" });
        } finally { setIsCreatingLink(false); }
        return;
    }

    if (!newLinkedItemName.trim() || !newLinkedItemTopic.trim()) {
        toast({ title: "Error", description: "Name and topic are required.", variant: "destructive" }); return;
    }
    const link = newLinkedItemLink.trim();
    const newUpskillDef: ExerciseDefinition = {
        id: `def_${Date.now()}_upskill_${Math.random()}`, name: newLinkedItemName.trim(), category: newLinkedItemTopic.trim() as ExerciseCategory,
        description: newLinkedItemDescription.trim(), link: link, iconUrl: getFaviconUrl(link),
        estimatedHours: parseInt(newLinkedItemHours, 10) || undefined,
    };
    setUpskillDefinitions(prev => [...prev, newUpskillDef]);
    updatedParent = { ...parent, linkedUpskillIds: [...(parent.linkedUpskillIds || []), newUpskillDef.id] };
    if (updatedParent) {
      setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent! : def));
      setSelectedSubtopic(updatedParent);
      toast({ title: "Success", description: "New item created and linked." });
      setIsManageLinksModalOpen(false);
    }
  };

  const handleSaveExistingLinks = () => {
    if (!manageLinksConfig) return;
    const { type, parent } = manageLinksConfig;
    const key = type === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';
    const updatedParent = { ...parent, [key]: tempLinkedIds };
    setUpskillDefinitions(prev => prev.map(def => def.id === parent.id ? updatedParent : def));
    setSelectedSubtopic(updatedParent);
    toast({ title: "Success", description: "Links have been updated." });
    setIsManageLinksModalOpen(false);
  };
  
  const filteredItemsForLinking = useMemo(() => {
    if (!manageLinksConfig) return [];
    const { type, parent } = manageLinksConfig;

    if (type === 'resource') {
        if (!linkResourceFolderId) return [];
        return resources.filter(res => res.folderId === linkResourceFolderId && res.name.toLowerCase().includes(linkSearchTerm.toLowerCase()));
    }
    
    let definitionsSource = linkUpskillTopic ? upskillDefinitions.filter(d => d.category === linkUpskillTopic) : upskillDefinitions;

    const isParentParent = (parent.linkedUpskillIds?.length ?? 0) > 0 || (parent.linkedResourceIds?.length ?? 0) > 0;
    const isParentChild = linkedUpskillChildIds.has(parent.id);
    const isParentACuriosity = isParentParent && !isParentChild;
    const isParentAnObjective = isParentParent && isParentChild;

    return definitionsSource.filter(def => {
        if (!def.name || def.name === 'placeholder' || def.id === parent.id || !def.name.toLowerCase().includes(linkSearchTerm.toLowerCase())) {
            return false;
        }
        
        const isDefParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
        const isDefChild = linkedUpskillChildIds.has(def.id);
        const isDefACuriosity = isDefParent && !isDefChild;
        const isDefAnObjective = isDefParent && isDefChild;
        const isDefAVisualization = !isDefParent;

        if (isParentACuriosity) return isDefAnObjective;
        if (isParentAnObjective) return isDefAnObjective || isDefAVisualization;
        
        return false;
    });
}, [manageLinksConfig, upskillDefinitions, resources, linkSearchTerm, linkResourceFolderId, linkUpskillTopic, linkedUpskillChildIds]);

  const handleUnlinkItem = (type: 'upskill' | 'resource', idToUnlink: string) => {
    if (!selectedSubtopic) return;
    let updatedParent: ExerciseDefinition;
    let key: 'linkedUpskillIds' | 'linkedResourceIds' = type === 'upskill' ? 'linkedUpskillIds' : 'linkedResourceIds';
    updatedParent = { ...selectedSubtopic, [key]: (selectedSubtopic[key] || []).filter((id: string) => id !== idToUnlink) };
    setUpskillDefinitions(prev => prev.map(def => def.id === selectedSubtopic.id ? updatedParent : def));
    setSelectedSubtopic(updatedParent);
    toast({ title: "Unlinked", description: "The item has been unlinked." });
  };
  
  const renderFolderOptions = useCallback((parentId: string | null, level: number): JSX.Element[] => {
    const folders = resourceFolders.filter(f => f.parentId === parentId).sort((a,b) => a.name.localeCompare(b.name));
    let options: JSX.Element[] = [];
    folders.forEach(folder => {
        options.push(<SelectItem key={folder.id} value={folder.id}><span style={{ paddingLeft: `${level * 1.5}rem` }}>{folder.name}</span></SelectItem>);
        options = options.concat(renderFolderOptions(folder.id, level + 1));
    });
    return options;
  }, [resourceFolders]);

  const totalEstimatedHours = useMemo(() => {
    if (!selectedSubtopic) return 0;
    let totalHours = 0;
    (selectedSubtopic.linkedUpskillIds || []).forEach(id => {
      const def = upskillDefinitions.find(d => d.id === id);
      if (def?.estimatedHours) totalHours += def.estimatedHours;
    });
    return totalHours;
  }, [selectedSubtopic, upskillDefinitions]);

  const totalScopeHours = (selectedSubtopic?.estimatedHours || 0) + totalEstimatedHours;
  
  const isSelectedSubtopicAVisualization = useMemo(() => {
    if (!selectedSubtopic) return false;
    const isParent = (selectedSubtopic.linkedUpskillIds?.length ?? 0) > 0 || (selectedSubtopic.linkedResourceIds?.length ?? 0) > 0;
    return !isParent;
  }, [selectedSubtopic]);

  if (isLoadingPage) {
    return <div className="flex flex-col justify-center items-center min-h-[calc(100vh-8rem)]"><Loader2 className="h-16 w-16 text-primary animate-spin mb-4" /><p className="text-muted-foreground">Loading your upskill data...</p></div>;
  }

  return (
    <>
      <div className="container mx-auto p-4 sm:p-6 lg:p-8" onClick={() => { if (contextMenu) setContextMenu(null); if (subtopicContextMenu) setSubtopicContextMenu(null); }}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          
          <aside className="lg:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg text-primary"><Folder /> Topic Library</CardTitle>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8"><FilterIcon className="h-4 w-4" /></Button></DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                            <DropdownMenuCheckboxItem checked={visibilityFilters.has('curiosity')} onCheckedChange={() => handleVisibilityFilterChange('curiosity')}><Flashlight className="mr-2 h-4 w-4 text-amber-500" /><span>Curiosities</span></DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibilityFilters.has('objective')} onCheckedChange={() => handleVisibilityFilterChange('objective')}><Focus className="mr-2 h-4 w-4 text-green-500" /><span>Objectives</span></DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem checked={visibilityFilters.has('visualization')} onCheckedChange={() => handleVisibilityFilterChange('visualization')}><Frame className="mr-2 h-4 w-4 text-blue-500" /><span>Visualizations</span></DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                <CardDescription>Organize your learning tasks by topic.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleAddTopic} className="space-y-3 p-3 border rounded-md mb-4">
                    <Input type="text" placeholder="New Topic" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                    <datalist id="topics-datalist">{topicsWithSubtopics.map(([topic]) => <option key={topic} value={topic} />)}</datalist>
                    <AnimatePresence>
                      {newTopicName.trim() && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-3 overflow-hidden"
                        >
                          <div>
                              <Label className="text-xs text-muted-foreground">Set a Goal for this New Topic</Label>
                              <div className="flex gap-2 items-center mt-1">
                                  <RadioGroup value={newTopicGoalType} onValueChange={(v) => setNewTopicGoalType(v as 'pages' | 'hours')} className="flex gap-4">
                                      <div className="flex items-center space-x-2"><RadioGroupItem value="pages" id="type-pages-new" /><Label htmlFor="type-pages-new" className="font-normal">Pages</Label></div>
                                      <div className="flex items-center space-x-2"><RadioGroupItem value="hours" id="type-hours-new" /><Label htmlFor="type-hours-new" className="font-normal">Hours</Label></div>
                                  </RadioGroup>
                                  <Input type="number" placeholder="Total" value={newTopicGoalValue} onChange={(e) => setNewTopicGoalValue(e.target.value)} aria-label="Goal value" className="h-9" />
                              </div>
                          </div>
                          <Button type="submit" size="sm" className="w-full"><PlusCircle className="mr-2 h-4 w-4" /> Add Topic</Button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                </form>
                <div className="space-y-2 max-h-[calc(100vh-30rem)] overflow-y-auto pr-2">
                  {topicsWithSubtopics.map(([topic, subtopics]) => {
                    const isCollapsed = !expandedTopics.has(topic);
                    if (subtopics.length === 0 && !topicGoals[topic]) return null;
                    return (
                    <div key={topic}>
                      <div className="group flex items-center justify-between p-2 rounded-md hover:bg-muted cursor-pointer" onClick={() => toggleTopicExpansion(topic)} onContextMenu={(e) => handleContextMenu(e, topic)}>
                        <div className="flex items-center gap-2 min-w-0 flex-grow">
                          <ChevronDown className={cn("h-4 w-4 transition-transform", isCollapsed && "-rotate-90")} />
                          <Folder className="h-4 w-4 flex-shrink-0 text-primary/80" />
                          <div className='truncate'>
                            <h4 className="font-semibold text-sm truncate">{topic}</h4>
                            {topicGoals[topic] && <p className="text-xs text-muted-foreground">Goal: {topicGoals[topic].goalValue} {topicGoals[topic].goalType}</p>}
                          </div>
                        </div>
                      </div>
                      {!isCollapsed && (
                        <ul className="space-y-1 pl-4 border-l-2 border-muted ml-4">
                            {subtopics.sort((a,b) => a.name.localeCompare(b.name)).map(def => {
                              const isParent = (def.linkedUpskillIds?.length ?? 0) > 0 || (def.linkedResourceIds?.length ?? 0) > 0;
                              const isLinkedAsChild = linkedUpskillChildIds.has(def.id);
                              const isCuriosity = isParent && !isLinkedAsChild;
                              const isObjective = isParent && isLinkedAsChild;
                              const isVisualization = !isParent;

                              return (
                                <li key={def.id} className="group flex items-center justify-between p-1.5 rounded-md hover:bg-muted" onContextMenu={(e) => handleSubtopicContextMenu(e, def)}>
                                    <div className="flex items-center gap-2 flex-grow min-w-0">
                                      {isCuriosity ? <Flashlight className="h-4 w-4 flex-shrink-0 text-amber-500" />
                                       : isObjective ? <Focus className="h-4 w-4 flex-shrink-0 text-green-500" />
                                       : <Frame className="h-4 w-4 flex-shrink-0 text-blue-500" />}
                                      <span className="truncate cursor-pointer" onClick={() => { setSelectedSubtopic(def); setViewMode('library'); }}>{def.name}</span>
                                      {def.estimatedHours && <Badge variant="secondary" className="text-xs ml-auto">{def.estimatedHours}h</Badge>}
                                    </div>
                                    <div className='hidden items-center flex-shrink-0 group-hover:flex'>
                                        <TooltipProvider>
                                          <Tooltip><TooltipTrigger asChild><span tabIndex={isVisualization ? 0 : -1}><Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => isVisualization && handleAddTaskToSession(def)} disabled={!isVisualization}><PlusCircle className="h-4 w-4" /></Button></span></TooltipTrigger><TooltipContent>{isVisualization ? 'Add to Session' : 'Add sub-tasks instead'}</TooltipContent></Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </li>
                              )})}
                        </ul>
                      )}
                    </div>
                  )})}
                </div>
              </CardContent>
            </Card>
            {selectedSubtopic && (
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                        <div><CardTitle className="text-lg flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" /> Subtopic Stats</CardTitle><CardDescription className="text-xs">Aggregated progress for "{selectedSubtopic.name}"</CardDescription></div>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleViewProgress(selectedSubtopic)}><TrendingUp className="h-4 w-4"/></Button>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Logged Time</span><span className="font-medium">{formatMinutes(totalLoggedTime)}</span></div>
                            {selectedSubtopic.estimatedHours && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">This Task's Est.</span><span className="font-medium">{selectedSubtopic.estimatedHours}h</span></div>)}
                            {totalEstimatedHours > 0 && (<div className="flex justify-between text-sm"><span className="text-muted-foreground">Total Linked Est.</span><span className="font-medium">{totalEstimatedHours.toFixed(1)}h</span></div>)}
                        </div>
                        {totalScopeHours > 0 && (
                            <div>
                                <Progress value={Math.min(100, (totalLoggedTime / (totalScopeHours * 60)) * 100)} className="h-2" />
                                <div className="flex justify-between text-xs text-muted-foreground mt-1"><span>0%</span><span>{((totalLoggedTime / (totalScopeHours * 60)) * 100).toFixed(0)}%</span></div>
                            </div>
                        )}
                        {totalScopeHours > 0 && totalLoggedTime > totalScopeHours * 60 && (<Badge variant="destructive" className="w-full justify-center">Overspent by {formatMinutes(totalLoggedTime - totalScopeHours * 60)}</Badge>)}
                    </CardContent>
                </Card>
            )}
          </aside>

          <section aria-labelledby="main-panel-heading" className="lg:col-span-3 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow"><CardTitle id="main-panel-heading" className="flex items-center gap-2 text-lg">{viewMode === 'session' ? <ListChecks /> : <Library />}{viewMode === 'session' ? `Session for: ${format(selectedDate, 'PPP')}` : `Library: ${selectedSubtopic?.name || 'Select an item'}`}</CardTitle>{viewMode === 'library' && selectedSubtopic && (<CardDescription className="text-xs mt-1">{selectedSubtopic.category}</CardDescription>)}</div>
                      <div className='flex items-center gap-2 flex-shrink-0'>
                        <Button variant={viewMode === 'session' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('session')}>Session</Button>
                        <Button variant={viewMode === 'library' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('library')} disabled={!selectedSubtopic}>Library</Button>
                        <Popover><PopoverTrigger asChild><Button variant={"outline"} className={cn("w-[150px] justify-start text-left font-normal h-9",!selectedDate && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{selectedDate ? format(selectedDate, "MMM dd") : <span>Pick a date</span>}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus /></PopoverContent></Popover>
                      </div>
                  </CardHeader>
                  <CardContent className="p-4">
                      {viewMode === 'session' ? (
                          <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                              {currentWorkoutExercises.length === 0 ? (
                                <div className="text-center py-10"><BookCopy className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" /><p className="text-muted-foreground">No tasks for {format(selectedDate, 'PPP')}.</p><p className="text-sm text-muted-foreground/80">Add tasks from the library to get started!</p></div>
                              ) : (
                                <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                                  {currentWorkoutExercises.map((exercise) => {
                                      const definition = upskillDefinitions.find(def => def.id === exercise.definitionId);
                                      return (
                                        <WorkoutExerciseCard 
                                          key={exercise.id} exercise={exercise} definition={definition} definitionGoal={topicGoals[exercise.category]}
                                          onLogSet={handleLogSet} onDeleteSet={handleDeleteSet} onUpdateSet={handleUpdateSet} 
                                          onRemoveExercise={handleRemoveExerciseFromWorkout} onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                          pageType="upskill"
                                        />
                                      );
                                  })}
                                </div>
                              )}
                          </div>
                      ) : selectedSubtopic ? (
                          <ScrollArea className="h-[calc(100vh-16rem)] pr-2">
                            <div className="space-y-6">
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><BookCopy className="h-5 w-5 text-primary" /> Linked Learning</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {(selectedSubtopic.linkedUpskillIds || []).map(id => {
                                    const upskillDef = upskillDefinitions.find(ud => ud.id === id);
                                    if (!upskillDef) return null;

                                    const isParent = (upskillDef.linkedUpskillIds?.length ?? 0) > 0 || (upskillDef.linkedResourceIds?.length ?? 0) > 0;
                                    const isLinkedAsChild = linkedUpskillChildIds.has(upskillDef.id);
                                    const isCuriosity = isParent && !isLinkedAsChild;
                                    const isObjective = isParent && isLinkedAsChild;
                                    const isVisualization = !isParent;

                                    const loggedMinutes = getUpskillLoggedMinutes(upskillDef.id);
                                    const loggedHours = loggedMinutes / 60;
                                    
                                    return (
                                      <Card key={id} className="relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[150px]">
                                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                    <span tabIndex={isVisualization ? 0 : -1}>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); isVisualization && handleAddTaskToSession(upskillDef); }} disabled={!isVisualization}>
                                                            <PlusCircle className="h-4 w-4" />
                                                        </Button>
                                                    </span>
                                                    </TooltipTrigger>
                                                    <TooltipContent>{isVisualization ? 'Add to Session' : 'Add sub-tasks instead'}</TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setSelectedSubtopic(upskillDef); setViewMode('library'); }}><ArrowRight className="h-4 w-4" /></Button>
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                                                    <DropdownMenuItem onSelect={() => handleViewProgress(upskillDef)}><TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span></DropdownMenuItem><DropdownMenuSeparator />
                                                    <DropdownMenuItem onSelect={() => handleStartEditSubtopic(upskillDef)}><Edit3 className="mr-2 h-4 w-4"/>Edit</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleUnlinkItem('upskill', id)} className="text-yellow-600"><Unlink className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem>
                                                    <DropdownMenuItem onSelect={() => handleDeleteSubtopic(id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Delete Permanently</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </div>
                                        <CardHeader className="pb-3">
                                          <CardTitle className="text-base flex items-center gap-2">
                                            {isCuriosity ? <Flashlight className="h-5 w-5 text-amber-500 flex-shrink-0" />
                                              : isObjective ? <Focus className="h-5 w-5 text-green-500 flex-shrink-0" />
                                              : <Frame className="h-5 w-5 text-blue-500 flex-shrink-0" />}
                                            <span className="truncate" title={upskillDef.name}>{upskillDef.name}</span>
                                          </CardTitle>
                                          <CardDescription>{upskillDef.category}</CardDescription>
                                        </CardHeader>
                                        <CardContent className="flex-grow">
                                            {isObjective ? (
                                                (upskillDef.linkedUpskillIds?.length ?? 0) > 0 ? (
                                                    <>
                                                        <h4 className="text-xs font-semibold text-foreground mb-1">Visualizations:</h4>
                                                        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                                                            {(upskillDef.linkedUpskillIds || []).map(childId => {
                                                                const childDef = upskillDefinitions.find(d => d.id === childId);
                                                                const isChildAViz = childDef && (childDef.linkedUpskillIds?.length ?? 0) === 0 && (childDef.linkedResourceIds?.length ?? 0) === 0;
                                                                if (!childDef || !isChildAViz) return null;

                                                                const isChildPermanentlyLogged = permanentlyLoggedVisualizationIds.has(childDef.id);
                                                                return (
                                                                    <li
                                                                        key={childId}
                                                                        className={cn("truncate", isChildPermanentlyLogged && "line-through text-muted-foreground/70")}
                                                                        title={childDef.name}
                                                                    >
                                                                        {childDef.name}
                                                                    </li>
                                                                );
                                                            })}
                                                        </ul>
                                                    </>
                                                ) : (
                                                    <p className="text-sm text-muted-foreground line-clamp-2">{upskillDef.description || "This objective has no visualizations yet."}</p>
                                                )
                                            ) : (
                                                <p className="text-sm text-muted-foreground line-clamp-2">{upskillDef.description || "No description provided."}</p>
                                            )}
                                        </CardContent>
                                        <CardFooter className="pt-3 flex items-center justify-end"><div className="flex items-center gap-1 flex-shrink-0">{upskillDef.estimatedHours && <Badge variant="outline" className="flex-shrink-0">{upskillDef.estimatedHours}h est.</Badge>}{loggedHours > 0 && <Badge variant="secondary">{loggedHours.toFixed(1)}h logged</Badge>}</div></CardFooter>
                                      </Card>
                                    )
                                  })}
                                  <Card 
                                      onClick={() => handleOpenManageLinksModal('upskill', selectedSubtopic)}
                                      className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[150px] hover:shadow-xl hover:-translate-y-1"
                                  >
                                      <PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" />
                                      <p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Task</p>
                                  </Card>
                                </div>
                              </div>
                              <div className="space-y-3">
                                <h3 className="font-semibold flex items-center gap-2"><Library className="h-5 w-5 text-primary" /> Linked Resources</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                                  {(selectedSubtopic.linkedResourceIds || []).map(id => {
                                    const resource = resources.find(r => r.id === id);
                                    if (!resource) return null;
                                    const embedLinkForModal = getYouTubeEmbedUrl(resource.link) || ((isNotionUrl(resource.link) || isObsidianUrl(resource.link)) ? resource.link : null);
                                    return (
                                      <Card key={id} className="relative rounded-2xl flex flex-col group overflow-hidden transition-all duration-300 hover:shadow-xl hover:-translate-y-1 min-h-[150px]">
                                        <div className="absolute top-2 right-2 z-10 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            {embedLinkForModal ? (<Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm" onClick={(e) => { e.stopPropagation(); setEmbedUrl(embedLinkForModal); }}><Expand className="h-4 w-4" /></Button>) : (<Button asChild variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><a href={resource.link} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}><ExternalLink className="h-4 w-4" /></a></Button>)}
                                            <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="h-8 w-8 rounded-full bg-background/50 backdrop-blur-sm"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}><DropdownMenuItem onSelect={() => handleUnlinkItem('resource', id)} className="text-destructive"><Trash2 className="mr-2 h-4 w-4"/>Unlink</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                                        </div>
                                        <CardHeader className="pb-3"><CardTitle className="text-base flex items-center gap-2">{resource.iconUrl ? <Image src={resource.iconUrl} alt="" width={20} height={20} className="h-5 w-5 rounded-sm flex-shrink-0" unoptimized /> : <Globe className="h-5 w-5 text-muted-foreground flex-shrink-0" />}<span className="truncate" title={resource.name}>{resource.name}</span></CardTitle><CardDescription>{resourceFolders.find(f => f.id === resource.folderId)?.name || 'Uncategorized'}</CardDescription></CardHeader>
                                        <CardContent className="flex-grow"><p className="text-sm text-muted-foreground line-clamp-2">{resource.description || "No description provided."}</p></CardContent>
                                      </Card>
                                    )
                                  })}
                                  {!isSelectedSubtopicAVisualization &&
                                    <Card onClick={() => handleOpenManageLinksModal('resource', selectedSubtopic)} className="rounded-2xl group flex flex-col items-center justify-center p-6 border-2 border-dashed hover:border-primary hover:bg-muted/50 transition-all duration-300 cursor-pointer min-h-[150px] hover:shadow-xl hover:-translate-y-1"><PlusCircle className="h-10 w-10 text-muted-foreground group-hover:text-primary transition-colors" /><p className="mt-4 text-md font-semibold text-muted-foreground group-hover:text-primary transition-colors">Add / Link Resource</p></Card>
                                  }
                                </div>
                              </div>
                            </div>
                        </ScrollArea>
                      ) : (
                          <div className="text-center py-10"><p className="text-muted-foreground">Select a subtopic from the library to view its details.</p></div>
                      )}
                  </CardContent>
              </Card>
          </section>
        </div>
        {progressModalConfig.isOpen && progressModalConfig.exercise && (
          <ExerciseProgressModal isOpen={progressModalConfig.isOpen} onOpenChange={(isOpen) => setProgressModalConfig(prev => ({...prev, isOpen}))} exercise={progressModalConfig.exercise} allWorkoutLogs={allUpskillLogs} pageType="upskill" topicGoals={topicGoals} />
        )}
      </div>
      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle><AlertDialogDescription>It's Monday! Would you like to back up your upskilling data?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel><AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
      {contextMenu && (
        <div ref={contextMenuRef} style={{ top: contextMenu.mouseY, left: contextMenu.mouseX }} className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95" onClick={(e) => e.stopPropagation()}>
          <Button
              variant="ghost" className="w-full h-9 justify-start px-2"
              onMouseDown={(e) => { 
                e.stopPropagation(); 
                setNewSubtopicParentTopic(contextMenu.item);
                setNewSubtopicData({ name: '', description: '', link: '', hours: '' });
                setIsNewSubtopicModalOpen(true);
                setContextMenu(null);
              }}>
              <PlusCircle className="mr-2 h-4 w-4" /> New Sub Topic
          </Button>
          <Button
              variant="ghost" className="w-full h-9 justify-start px-2"
              onMouseDown={() => { handleStartEditingGoal(contextMenu.item); setContextMenu(null); }}>
              <Edit3 className="mr-2 h-4 w-4" /> Edit Goal
          </Button>
          <div className="-mx-1 my-1 h-px bg-muted" />
          <Button
              variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive"
              onMouseDown={() => { setTopicToDelete(contextMenu.item); setContextMenu(null); }}>
              <Trash2 className="mr-2 h-4 w-4" /> Delete Topic
          </Button>
        </div>
      )}
      {subtopicContextMenu && (
        <div
            ref={subtopicContextMenuRef}
            style={{ top: subtopicContextMenu.mouseY, left: subtopicContextMenu.mouseX }}
            className="fixed z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95"
            onClick={(e) => {
                e.stopPropagation();
                setSubtopicContextMenu(null);
            }}
        >
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onMouseDown={() => { handleViewProgress(subtopicContextMenu.item); setSubtopicContextMenu(null); }}>
                <TrendingUp className="mr-2 h-4 w-4" /><span>View Progress</span>
            </Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2" onMouseDown={() => { handleStartEditSubtopic(subtopicContextMenu.item); setSubtopicContextMenu(null); }}>
                <Edit3 className="mr-2 h-4 w-4"/>Edit
            </Button>
            <Button variant="ghost" className="w-full h-9 justify-start px-2 text-destructive hover:text-destructive" onMouseDown={() => { handleDeleteSubtopic(subtopicContextMenu.item.id); setSubtopicContextMenu(null); }}>
                <Trash2 className="mr-2 h-4 w-4"/>Delete
            </Button>
        </div>
      )}
      <Dialog open={isManageLinksModalOpen} onOpenChange={setIsManageLinksModalOpen}>
        <DialogContent className="sm:max-w-lg"><DialogHeader><DialogTitle>Manage Links for "{manageLinksConfig?.parent.name}"</DialogTitle><DialogDescription>Create a new item and link it, or link existing items from your library.</DialogDescription></DialogHeader>
            <Tabs defaultValue="create-new" className="w-full"><TabsList className="grid w-full grid-cols-2"><TabsTrigger value="create-new">Create New</TabsTrigger><TabsTrigger value="link-existing">Link from Library</TabsTrigger></TabsList>
                <TabsContent value="create-new">
                    <div className="space-y-4 py-4">{manageLinksConfig?.type === 'resource' ? (<><div className="space-y-1"><Label htmlFor="new-linked-folder">Folder</Label><Select value={newLinkedItemFolderId} onValueChange={setNewLinkedItemFolderId}><SelectTrigger id="new-linked-folder"><SelectValue placeholder="Select a folder..." /></SelectTrigger><SelectContent>{renderFolderOptions(null, 0)}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="new-linked-link">Link</Label><Input id="new-linked-link" value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} placeholder="https://..." /></div></>) : (<><div className="space-y-1"><Label htmlFor="new-linked-topic">Topic</Label><Select value={newLinkedItemTopic} onValueChange={setNewLinkedItemTopic}><SelectTrigger id="new-linked-topic"><SelectValue placeholder="Select a topic..." /></SelectTrigger><SelectContent>{allKnownTopics.map(topic => (<SelectItem key={topic} value={topic}>{topic}</SelectItem>))}</SelectContent></Select></div><div className="space-y-1"><Label htmlFor="new-linked-name">Name</Label><Input id="new-linked-name" value={newLinkedItemName} onChange={e => setNewLinkedItemName(e.target.value)} placeholder={'e.g., CUDA Fundamentals Course'} /></div><div className="space-y-1"><Label htmlFor="new-linked-hours">Estimated Hours</Label><Input id="new-linked-hours" type="number" value={newLinkedItemHours} onChange={e => setNewLinkedItemHours(e.target.value)} placeholder="e.g., 20" /></div><> <div className="space-y-1"><Label htmlFor="new-linked-desc">Description</Label><Textarea id="new-linked-desc" value={newLinkedItemDescription} onChange={e => setNewLinkedItemDescription(e.target.value)} placeholder="Key points, summary..." /></div><div className="space-y-1"><Label htmlFor="new-linked-link">Link</Label><Input id="new-linked-link" value={newLinkedItemLink} onChange={e => setNewLinkedItemLink(e.target.value)} placeholder="https://..." /></div></></>)}</div>
                    <DialogFooter><Button variant="outline" onClick={() => setIsManageLinksModalOpen(false)}>Cancel</Button><Button onClick={handleCreateAndLinkItem} disabled={isCreatingLink}>{isCreatingLink ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{isCreatingLink ? 'Fetching...' : 'Create & Link'}</Button></DialogFooter>
                </TabsContent>
                <TabsContent value="link-existing">
                    <div className="py-4">
                      {manageLinksConfig?.type === 'upskill' && (<div className="mb-4 space-y-1"><Label htmlFor="link-upskill-topic">Select Topic</Label><Select value={linkUpskillTopic} onValueChange={(value) => setLinkUpskillTopic(value === 'all-topics-placeholder' ? '' : value)}><SelectTrigger id="link-upskill-topic"><SelectValue placeholder="All Topics" /></SelectTrigger><SelectContent><SelectItem value="all-topics-placeholder">All Topics</SelectItem>{allKnownTopics.map(topic => (<SelectItem key={topic} value={topic}>{topic}</SelectItem>))}</SelectContent></Select></div>)}
                      {manageLinksConfig?.type === 'resource' && (<div className="mb-4 space-y-1"><Label htmlFor="link-resource-folder">Select Folder</Label><Select value={linkResourceFolderId} onValueChange={setLinkResourceFolderId}><SelectTrigger id="link-resource-folder"><SelectValue placeholder="Select a folder to view resources..." /></SelectTrigger><SelectContent>{renderFolderOptions(null, 0)}</SelectContent></Select></div>)}
                      <Input placeholder="Search library..." value={linkSearchTerm} onChange={e => setLinkSearchTerm(e.target.value)} className="mb-4"/>
                      <ScrollArea className="h-64"><div className="space-y-2 pr-4">{filteredItemsForLinking.length > 0 ? filteredItemsForLinking.map(item => (<div key={item.id} className="flex items-center space-x-2"><Checkbox id={`link-${item.id}`} checked={tempLinkedIds.includes(item.id)} onCheckedChange={checked => {setTempLinkedIds(prev => checked ? [...prev, item.id] : prev.filter(id => id !== item.id) );}}/><Label htmlFor={`link-${item.id}`} className="font-normal w-full cursor-pointer">{item.name}{item.category && <span className="text-muted-foreground text-xs ml-2">({item.category})</span>}{item.folderId && <span className="text-muted-foreground text-xs ml-2">({resourceFolders.find(f => f.id === item.folderId)?.name})</span>}</Label></div>)) : (<p className="text-sm text-center text-muted-foreground py-4">{manageLinksConfig?.type === 'resource' && !linkResourceFolderId ? "Please select a folder." : "No matching items found."}</p>)}</div></ScrollArea>
                    </div><DialogFooter><Button variant="outline" onClick={() => setIsManageLinksModalOpen(false)}>Cancel</Button><Button onClick={handleSaveExistingLinks}>Save Links</Button></DialogFooter>
                </TabsContent>
            </Tabs>
        </DialogContent>
      </Dialog>
      <Dialog open={!!editingTopicGoal} onOpenChange={() => setEditingTopicGoal(null)}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Goal for "{editingTopicGoal}"</DialogTitle><DialogDescription>Update the target goal for this topic.</DialogDescription></DialogHeader><div className="grid gap-4 py-4"><RadioGroup value={currentGoal.goalType} onValueChange={(v) => setCurrentGoal(prev => ({...prev, goalType: v as 'pages' | 'hours'}))} className="flex gap-4"><div className="flex items-center space-x-2"><RadioGroupItem value="pages" id="type-pages" /><Label htmlFor="type-pages" className="font-normal">Pages</Label></div><div className="flex items-center space-x-2"><RadioGroupItem value="hours" id="type-hours" /><Label htmlFor="type-hours" className="font-normal">Hours</Label></div></RadioGroup><Input type="number" placeholder="Total" value={currentGoal.goalValue} onChange={(e) => setCurrentGoal(prev => ({...prev, goalValue: parseInt(e.target.value, 10) || 0}))} aria-label="Goal value" /></div><DialogFooter><Button variant="outline" onClick={() => setEditingTopicGoal(null)}>Cancel</Button><Button onClick={handleSaveGoal}>Save Goal</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!editingSubtopic} onOpenChange={() => setEditingSubtopic(null)}><DialogContent><DialogHeader><DialogTitle>Edit Learning Task</DialogTitle><DialogDescription>Update the details of this learning task.</DialogDescription></DialogHeader><div className="space-y-4 py-4"><div className="space-y-1"><Label htmlFor="subtopic-name">Name</Label><Input id="subtopic-name" value={editedSubtopicData.name || ''} onChange={e => setEditedSubtopicData(d => ({ ...d, name: e.target.value }))} /></div><div className="space-y-1"><Label htmlFor="subtopic-desc">Description</Label><Textarea id="subtopic-desc" value={editedSubtopicData.description || ''} onChange={e => setEditedSubtopicData(d => ({ ...d, description: e.target.value }))} /></div><div className="space-y-1"><Label htmlFor="subtopic-link">Link</Label><Input id="subtopic-link" value={editedSubtopicData.link || ''} onChange={e => setEditedSubtopicData(d => ({ ...d, link: e.target.value }))} /></div><div className="space-y-1"><Label htmlFor="subtopic-hours">Est. Hours</Label><Input id="subtopic-hours" type="number" value={editedSubtopicData.estimatedHours || ''} onChange={e => setEditedSubtopicData(d => ({ ...d, estimatedHours: e.target.value ? parseInt(e.target.value, 10) : undefined }))} /></div></div><DialogFooter><Button variant="outline" onClick={() => setEditingSubtopic(null)}>Cancel</Button><Button onClick={handleSaveSubtopicEdit}>Save Changes</Button></DialogFooter></DialogContent></Dialog>
      <Dialog open={!!embedUrl} onOpenChange={(isOpen) => !isOpen && setEmbedUrl(null)}><DialogContent className="max-w-4xl h-[90vh] flex flex-col p-2"><div className="flex-grow min-h-0">{embedUrl && (<iframe src={embedUrl} className="w-full h-full border-0 rounded-md" title="Embedded Resource" sandbox="allow-scripts allow-same-origin allow-forms"></iframe>)}</div></DialogContent></Dialog>
      <Dialog open={isNewSubtopicModalOpen} onOpenChange={setIsNewSubtopicModalOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Sub Topic for "{newSubtopicParentTopic}"</DialogTitle>
                <DialogDescription>
                    This will create a new learning task. You can link it to others later to build a hierarchy.
                </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-1">
                    <Label htmlFor="new-subtopic-name">Name</Label>
                    <Input id="new-subtopic-name" value={newSubtopicData.name} onChange={e => setNewSubtopicData(d => ({ ...d, name: e.target.value }))} placeholder="e.g., Learn about React Hooks" />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="new-subtopic-desc">Description (Optional)</Label>
                    <Textarea id="new-subtopic-desc" value={newSubtopicData.description} onChange={e => setNewSubtopicData(d => ({ ...d, description: e.target.value }))} placeholder="Key points, summary..." />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="new-subtopic-link">Link (Optional)</Label>
                    <Input id="new-subtopic-link" value={newSubtopicData.link} onChange={e => setNewSubtopicData(d => ({ ...d, link: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-1">
                    <Label htmlFor="new-subtopic-hours">Estimated Hours (Optional)</Label>
                    <Input id="new-subtopic-hours" type="number" value={newSubtopicData.hours} onChange={e => setNewSubtopicData(d => ({ ...d, hours: e.target.value }))} placeholder="e.g., 10" />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsNewSubtopicModalOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateSubtopic}>Create & Select</Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}

export default function UpskillPage() {
  return ( <AuthGuard> <UpskillPageContent /> </AuthGuard> );
}
