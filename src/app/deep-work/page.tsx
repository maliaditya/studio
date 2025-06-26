
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, ListChecks, Edit3, Save, X, ChevronRight, CalendarIcon, GripVertical, TrendingUp, Filter as FilterIcon, Loader2, Info, Youtube, ChevronDown, ChevronUp, Target, LineChart as LineChartIcon, Briefcase, Puzzle, Share2, Globe, Code, Linkedin, CheckCircle2 } from 'lucide-react';
import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { format, parse, getISOWeek, isMonday, getYear, subYears, addDays, parseISO } from 'date-fns';
import { ExerciseDefinition, WorkoutExercise, LoggedSet, DatedWorkout, ExerciseCategory, WeightLog, Gender, DecompositionRow, SharingStatus } from '@/types/workout';
import { WorkoutExerciseCard } from '@/components/WorkoutExerciseCard';
import { ExerciseProgressModal } from '@/components/ExerciseProgressModal';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { WorkoutHeatmap } from '@/components/WorkoutHeatmap';
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
  DialogFooter,
} from "@/components/ui/dialog";
import { WeightChartModal } from '@/components/WeightChartModal';
import { ChartContainer, type ChartConfig } from '@/components/ui/chart';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';


const DEFAULT_TARGET_SESSIONS = 1;
const DEFAULT_TARGET_DURATION = "25";

const durationChartConfig = {
  totalDuration: { label: "Duration (min)", color: "hsl(var(--primary))" },
} satisfies ChartConfig;

const TwitterIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>X</title>
        <path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/>
    </svg>
);

const DevToIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" {...props}>
        <title>DEV Community</title>
        <path d="M11.472 24a1.5 1.5 0 0 1-1.06-.44L.439 13.587a1.5 1.5 0 0 1 0-2.12l9.97-9.97a1.5 1.5 0 0 1 2.12 0L22.503 11.47a1.5 1.5 0 0 1 0 2.121l-9.972 9.971a1.5 1.5 0 0 1-1.06.44Zm-8.485-11.25 8.485 8.485 8.485-8.485-8.485-8.485-8.485 8.485ZM19.5 18h-3V9h3v9Z"/>
    </svg>
);


function DeepWorkPageContent() {
  const { toast } = useToast();
  const { currentUser, exportData } = useAuth();

  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [newSubtopicName, setNewSubtopicName] = useState('');
  const [newTopicName, setNewTopicName] = useState('');

  const [editingDefinition, setEditingDefinition] = useState<ExerciseDefinition | null>(null);
  const [editingDefinitionName, setEditingDefinitionName] = useState('');
  const [editingDefinitionCategory, setEditingDefinitionCategory] = useState<string>('');

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [allWorkoutLogs, setAllWorkoutLogs] = useState<DatedWorkout[]>([]);
  const [weightLogs, setWeightLogs] = useState<WeightLog[]>([]);

  const [viewingProgressExercise, setViewingProgressExercise] = useState<ExerciseDefinition | null>(null);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  
  const [isLoadingPage, setIsLoadingPage] = useState(true);
  
  const [showBackupPrompt, setShowBackupPrompt] = useState(false);
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(true);

  const [goalWeight, setGoalWeight] = useState<number | null>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [dateOfBirth, setDateOfBirth] = useState<string | null>(null);
  const [gender, setGender] = useState<Gender | null>(null);
  const [isWeightChartModalOpen, setIsWeightChartModalOpen] = useState(false);

  const [oneYearAgo, setOneYearAgo] = useState<Date | null>(null);
  const [today, setToday] = useState<Date | null>(null);

  // State for decomposition modal
  const [isDecompositionModalOpen, setIsDecompositionModalOpen] = useState(false);
  const [selectedFocusArea, setSelectedFocusArea] = useState<ExerciseDefinition | null>(null);
  const [isDecompositionEditing, setIsDecompositionEditing] = useState(false);
  const [editableDecompositionData, setEditableDecompositionData] = useState<DecompositionRow[]>([]);

  // State for branding modal
  const [isBrandingModalOpen, setIsBrandingModalOpen] = useState(false);
  const [selectedBrandingCandidate, setSelectedBrandingCandidate] = useState<ExerciseDefinition | null>(null);
  const [brandingModalType, setBrandingModalType] = useState<'blog' | 'blog_demo' | null>(null);
  const [blogUrl, setBlogUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');


  const decompositionTechniques: DecompositionRow[] = [
    {
      technique: "📏 Unit Consistency",
      description: "Define `1 unit = 1 meter` for realism and coherence",
      useCases: "Accurately sizing doors, walls, furniture; physics-based movement",
    },
    {
      technique: "🧵 Texture Optimization",
      description: "Use `.jpg` for color, `.png` for normals; tile and wrap correctly",
      useCases: "Optimizing texture memory; preventing seams; enhancing visual fidelity",
    },
    {
      technique: "📐 Geometry Reuse",
      description: "Reuse geometries like `SphereGeometry` or `BoxGeometry`",
      useCases: "Multiple bushes or graves; instancing; reducing GPU load",
    },
    {
      technique: "🎲 Randomization Techniques",
      description: "Use `Math.random()` for variation in placement, rotation, scale",
      useCases: "Scattering graves, rocks, vegetation; procedural generation",
    },
    {
      technique: "👻 Ghosts",
      description: "Orbiting point lights with sine/cosine and oscillating Y position",
      useCases: "Spooky floating effects; animated magical particles",
    },
    {
      technique: "🧱 Z-Fighting Avoidance",
      description: "Slightly offset objects to prevent flickering surface artifacts",
      useCases: "Overlapping meshes like door-on-wall or decals-on-geometry",
    },
    {
      technique: "🔦 Shadow Optimization",
      description: "Use low-res shadow maps and tight shadow camera bounds",
      useCases: "Improve FPS while maintaining soft shadows",
    },
    {
      technique: "🌫️ Fog Integration",
      description: "Match fog color to sky for seamless blending",
      useCases: "Distant hills, mystery atmosphere, depth cueing in large outdoor scenes",
    },
    {
      technique: "🔁 Circular Motion (Orbits)",
      description: "Animate objects using `Math.sin()` and `Math.cos()`",
      useCases: "Ghosts orbiting a house, rotating planets, flying creatures around targets",
    },
  ];

  const allTopics = useMemo(() => {
    const topics = new Set(exerciseDefinitions.map(def => def.category));
    return Array.from(topics).sort();
  }, [exerciseDefinitions]);

  const subtopicCountsPerTopic = useMemo(() => {
    const counts = new Map<string, number>();
    exerciseDefinitions.forEach(def => {
      counts.set(def.category, (counts.get(def.category) || 0) + 1);
    });
    return counts;
  }, [exerciseDefinitions]);

  useEffect(() => {
    const now = new Date();
    setToday(now);
    setOneYearAgo(subYears(new Date(now.getFullYear(), now.getMonth(), now.getDate()), 1));
  }, []);

  useEffect(() => {
    if (currentUser?.username) {
        const username = currentUser.username;
        const defsKey = `deepwork_definitions_${username}`;
        const logsKey = `deepwork_logs_${username}`;
        const weightLogsKey = `weightLogs_${username}`;
        const goalWeightKey = `goalWeight_${username}`;
        const heightKey = `height_${username}`;
        const dobKey = `dateOfBirth_${username}`;
        const genderKey = `gender_${username}`;

        try {
            const storedDefinitions = localStorage.getItem(defsKey);
            setExerciseDefinitions(storedDefinitions ? JSON.parse(storedDefinitions) : []);
        } catch (e) { setExerciseDefinitions([]); }
        
        try {
            const storedLogs = localStorage.getItem(logsKey);
            setAllWorkoutLogs(storedLogs ? JSON.parse(storedLogs) : []);
        } catch (e) { setAllWorkoutLogs([]); }
        
        // Weight/Health data can be shared
        const storedGoal = localStorage.getItem(goalWeightKey);
        if (storedGoal) setGoalWeight(parseFloat(storedGoal));
        
        const storedHeight = localStorage.getItem(heightKey);
        if (storedHeight) setHeight(parseFloat(storedHeight));
        
        const storedDob = localStorage.getItem(dobKey);
        if (storedDob) setDateOfBirth(storedDob);
        
        const storedGender = localStorage.getItem(genderKey);
        if (storedGender === 'male' || storedGender === 'female') setGender(storedGender as Gender);

        try {
            const storedWeightLogs = localStorage.getItem(weightLogsKey);
            setWeightLogs(storedWeightLogs ? JSON.parse(storedWeightLogs) : []);
        } catch (e) { setWeightLogs([]); }
    } else {
      // Clear all state for logged-out user
      setExerciseDefinitions([]);
      setAllWorkoutLogs([]);
      setWeightLogs([]);
      setGoalWeight(null);
      setHeight(null);
      setDateOfBirth(null);
      setGender(null);
    }
    const timer = setTimeout(() => setIsLoadingPage(false), 300);
    return () => clearTimeout(timer);
}, [currentUser]);

  useEffect(() => {
    if (currentUser?.username && !isLoadingPage) {
      try {
        const username = currentUser.username;
        const defsKey = `deepwork_definitions_${username}`;
        const logsKey = `deepwork_logs_${username}`;
        const weightLogsKey = `weightLogs_${username}`;
        const goalWeightKey = `goalWeight_${username}`;
        const heightKey = `height_${username}`;
        const dobKey = `dateOfBirth_${username}`;
        const genderKey = `gender_${username}`;
        
        localStorage.setItem(defsKey, JSON.stringify(exerciseDefinitions));
        localStorage.setItem(logsKey, JSON.stringify(allWorkoutLogs));
        localStorage.setItem(weightLogsKey, JSON.stringify(weightLogs));

        if (goalWeight !== null) localStorage.setItem(goalWeightKey, goalWeight.toString()); else localStorage.removeItem(goalWeightKey);
        if (height !== null) localStorage.setItem(heightKey, height.toString()); else localStorage.removeItem(heightKey);
        if (dateOfBirth) localStorage.setItem(dobKey, dateOfBirth); else localStorage.removeItem(dobKey);
        if (gender) localStorage.setItem(genderKey, gender); else localStorage.removeItem(genderKey);
      } catch (e) {
        console.error("Error saving deep work data to localStorage", e);
        toast({ title: "Save Error", description: "Could not save data locally.", variant: "destructive"});
      }
    }
  }, [exerciseDefinitions, allWorkoutLogs, currentUser, isLoadingPage, toast, weightLogs, goalWeight, height, dateOfBirth, gender]);

  // Check for backup prompt on Mondays
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
    return allWorkoutLogs.find(log => log.id === dateKey);
  }, [selectedDate, allWorkoutLogs]);

  const currentWorkoutExercises = useMemo(() => {
    return currentDatedWorkout?.exercises || [];
  }, [currentDatedWorkout]);

  const filteredExerciseDefinitions = useMemo(() => {
    if (selectedCategories.length === 0) return exerciseDefinitions;
    return exerciseDefinitions.filter(def => selectedCategories.includes(def.category));
  }, [exerciseDefinitions, selectedCategories]);

  const brandingCandidates = useMemo(() => {
    const sessionCounts = new Map<string, number>();
    allWorkoutLogs.forEach(log => {
      log.exercises.forEach(ex => {
        if (ex.loggedSets.length > 0) {
          const currentCount = sessionCounts.get(ex.definitionId) || 0;
          sessionCounts.set(ex.definitionId, currentCount + ex.loggedSets.length);
        }
      });
    });

    return exerciseDefinitions
      .map(def => ({
        ...def,
        sessionCount: sessionCounts.get(def.id) || 0,
      }))
      .filter(def => {
        const topicSubtopicCount = subtopicCountsPerTopic.get(def.category) || 0;
        const hasEnoughSessions = def.sessionCount >= 4;
        const hasEnoughSubtopics = topicSubtopicCount >= 4;
        // A focus area is a candidate if it has branding info already,
        // OR if it meets the new criteria of 4+ sessions AND 4+ subtopics in its category.
        return def.brandingStatus || (hasEnoughSessions && hasEnoughSubtopics);
      })
      .sort((a, b) => (b.sessionCount) - (a.sessionCount));
  }, [allWorkoutLogs, exerciseDefinitions, subtopicCountsPerTopic]);

  const handleCategoryFilterChange = (category: string) => {
    setSelectedCategories(prev => 
      prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
    );
  };

  const updateOrAddWorkoutLog = (updatedWorkout: DatedWorkout) => {
    setAllWorkoutLogs(prevLogs => {
      const existingLogIndex = prevLogs.findIndex(log => log.id === updatedWorkout.id);
      if (existingLogIndex > -1) {
        const newLogs = [...prevLogs];
        newLogs[existingLogIndex] = updatedWorkout;
        return newLogs;
      }
      return [...prevLogs, updatedWorkout];
    });
  };

  const handleAddTaskDefinition = (e: FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (newSubtopicName.trim() === '' || newTopicName.trim() === '') {
      toast({ title: "Error", description: "Topic and Focus Area cannot be empty.", variant: "destructive" });
      return;
    }
    if (exerciseDefinitions.some(def => def.name.toLowerCase() === newSubtopicName.trim().toLowerCase() && def.category.toLowerCase() === newTopicName.trim().toLowerCase())) {
      toast({ title: "Error", description: "This focus area already exists for this topic.", variant: "destructive" });
      return;
    }
    const newDef: ExerciseDefinition = { 
      id: `def_${Date.now().toString()}`, 
      name: newSubtopicName.trim(),
      category: newTopicName.trim() as ExerciseCategory, // Casting, as we allow dynamic strings
    };
    setExerciseDefinitions(prev => [...prev, newDef]);
    setNewSubtopicName('');
    setNewTopicName('');
    toast({ title: "Success", description: `Focus Area "${newDef.name}" added to library.` });
  };

  const handleDeleteExerciseDefinition = (id: string) => {
    const defToDelete = exerciseDefinitions.find(def => def.id === id);
    setExerciseDefinitions(prev => prev.filter(def => def.id !== id));
    setAllWorkoutLogs(prevLogs => 
      prevLogs.map(log => ({ ...log, exercises: log.exercises.filter(ex => ex.definitionId !== id) }))
    );
    toast({ title: "Success", description: `Focus Area "${defToDelete?.name}" removed.` });
  };

  const handleStartEditDefinition = (def: ExerciseDefinition) => {
    setEditingDefinition(def);
    setEditingDefinitionName(def.name);
    setEditingDefinitionCategory(def.category);
  };

  const handleSaveEditDefinition = () => {
    if (!editingDefinition || editingDefinitionName.trim() === '' || editingDefinitionCategory.trim() === '') {
      toast({ title: "Error", description: "Topic and Focus Area cannot be empty.", variant: "destructive" });
      return;
    }
    const updatedDef = { ...editingDefinition, name: editingDefinitionName.trim(), category: editingDefinitionCategory.trim() as ExerciseCategory };
    setExerciseDefinitions(prev => prev.map(def => def.id === editingDefinition.id ? updatedDef : def));
    setAllWorkoutLogs(prevLogs => 
      prevLogs.map(log => ({
        ...log,
        exercises: log.exercises.map(ex => 
          ex.definitionId === editingDefinition.id ? { ...ex, name: updatedDef.name, category: updatedDef.category } : ex
        )
      }))
    );
    toast({ title: "Success", description: `Focus Area updated to "${updatedDef.name}".` });
    setEditingDefinition(null);
  };

  const handleAddTaskToSession = (definition: ExerciseDefinition) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const newWorkoutExercise: WorkoutExercise = {
      id: `${definition.id}-${Date.now()}`, definitionId: definition.id, name: definition.name, category: definition.category,
      loggedSets: [], targetSets: parseInt(DEFAULT_TARGET_SESSIONS.toString(), 10), targetReps: DEFAULT_TARGET_DURATION,
    };
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
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
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.filter(ex => ex.id !== exerciseId);
      if (updatedExercises.length === 0) setAllWorkoutLogs(prevLogs => prevLogs.filter(log => log.id !== dateKey));
      else updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };
  
  const handleLogSet = (exerciseId: string, reps: number, weight: number) => { // Reps will be 1, weight is duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const newSet: LoggedSet = { id: Date.now().toString(), reps, weight, timestamp: Date.now() };
      const updatedExercises = existingWorkout.exercises.map(ex => 
        ex.id === exerciseId ? { ...ex, loggedSets: [...ex.loggedSets, newSet] } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
      toast({ title: "Session Logged!", description: `Logged ${weight} minutes.`});
    }
  };

  const handleDeleteSet = (exerciseId: string, setId: string) => {
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
    if (existingWorkout) {
      const updatedExercises = existingWorkout.exercises.map(ex =>
        ex.id === exerciseId ? { ...ex, loggedSets: ex.loggedSets.filter(s => s.id !== setId) } : ex
      );
      updateOrAddWorkoutLog({ ...existingWorkout, exercises: updatedExercises });
    }
  };

  const handleUpdateSet = (exerciseId: string, setId: string, reps: number, weight: number) => { // Reps=1, weight=duration
    const dateKey = format(selectedDate, 'yyyy-MM-dd');
    const existingWorkout = allWorkoutLogs.find(log => log.id === dateKey);
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

  const handleViewProgress = (definition: ExerciseDefinition) => {
    setViewingProgressExercise(definition);
    setIsProgressModalOpen(true);
  };
  
  const handleOpenDecompositionModal = (def: ExerciseDefinition) => {
    setSelectedFocusArea(def);
    setEditableDecompositionData(Array.isArray(def.decompositionData) ? def.decompositionData : decompositionTechniques);
    setIsDecompositionModalOpen(true);
    setIsDecompositionEditing(false);
  };

  const handleDecompositionChange = (index: number, field: keyof DecompositionRow, value: string) => {
    setEditableDecompositionData(currentData => {
        const newData = [...currentData];
        newData[index] = { ...newData[index], [field]: value };
        return newData;
    });
  };
  
  const handleSaveDecomposition = () => {
    if (!selectedFocusArea) return;
    setExerciseDefinitions(prevDefs => prevDefs.map(def =>
        def.id === selectedFocusArea.id
            ? { ...def, decompositionData: editableDecompositionData }
            : def
    ));
    setIsDecompositionEditing(false);
    toast({ title: "Saved", description: "Decomposition techniques have been updated." });
  };

  const handleLogWeight = (weight: number, date: Date) => {
    if (!currentUser) return;
    const year = getYear(date);
    const week = getISOWeek(date).toString().padStart(2, '0');
    const weekKey = `${year}-W${week}`;
    setWeightLogs(prevLogs => {
        const logIndex = prevLogs.findIndex(log => log.date === weekKey);
        const newLog: WeightLog = { date: weekKey, weight: weight };
        if (logIndex > -1) {
            const updatedLogs = [...prevLogs];
            updatedLogs[logIndex] = newLog;
            return updatedLogs;
        } else {
            return [...prevLogs, newLog].sort((a,b) => a.date.localeCompare(b.date));
        }
    });
    toast({ title: "Weight Logged", description: `Weight for the week of ${format(date, 'PPP')} has been saved.` });
  };

  const handleOpenBrandingModal = (def: ExerciseDefinition, type: 'blog' | 'blog_demo') => {
    setSelectedBrandingCandidate(def);
    setBrandingModalType(type);
    setBlogUrl(def.contentUrls?.blog || '');
    setYoutubeUrl(def.contentUrls?.youtube || '');
    setDemoUrl(def.contentUrls?.demo || '');
    setIsBrandingModalOpen(true);
  };

  const handleSaveBranding = () => {
    if (!selectedBrandingCandidate) return;

    setExerciseDefinitions(prevDefs => prevDefs.map(def => {
      if (def.id === selectedBrandingCandidate.id) {
        return {
          ...def,
          brandingStatus: 'converted',
          contentUrls: {
            blog: blogUrl,
            youtube: brandingModalType === 'blog_demo' ? youtubeUrl : undefined,
            demo: brandingModalType === 'blog_demo' ? demoUrl : undefined,
          }
        };
      }
      return def;
    }));

    setIsBrandingModalOpen(false);
    toast({ title: "Content URLs Saved!", description: `Your links for "${selectedBrandingCandidate.name}" have been saved.` });
  };
  
  const handleToggleSharing = (defId: string, platform: keyof SharingStatus) => {
    setExerciseDefinitions(prevDefs => prevDefs.map(def => {
      if (def.id === defId) {
        const newSharingStatus = { ...def.sharingStatus, [platform]: !def.sharingStatus?.[platform] };
        
        const newBrandingStatus = Object.values(newSharingStatus).some(Boolean) ? 'published' : 'converted';

        return {
          ...def,
          sharingStatus: newSharingStatus,
          brandingStatus: newBrandingStatus,
        };
      }
      return def;
    }));
  };

  const consistencyData = useMemo(() => {
    if (!allWorkoutLogs || !oneYearAgo || !today) return [];
    const workoutDates = new Set(allWorkoutLogs.filter(log => log.exercises.some(ex => ex.loggedSets.length > 0)).map(log => log.date));
    const data = [];
    let score = 0.5;
    for (let d = new Date(oneYearAgo); d <= today; d = addDays(d, 1)) {
        const dateKey = format(d, 'yyyy-MM-dd');
        if (workoutDates.has(dateKey)) score += (1 - score) * 0.1;
        else score *= 0.95;
        data.push({ date: format(d, 'MMM dd'), fullDate: format(d, 'PPP'), score: Math.round(score * 100) });
    }
    return data;
  }, [allWorkoutLogs, oneYearAgo, today]);

  const dailyDurationData = useMemo(() => {
    const dailyData: Record<string, { totalDuration: number, topics: Set<string> }> = {};

    allWorkoutLogs.forEach(log => {
        log.exercises.forEach(exercise => {
            const duration = exercise.loggedSets.reduce((sum, set) => sum + set.weight, 0);
            if (duration > 0) {
                if (!dailyData[log.date]) {
                    dailyData[log.date] = { totalDuration: 0, topics: new Set() };
                }
                dailyData[log.date].totalDuration += duration;
                dailyData[log.date].topics.add(exercise.name);
            }
        });
    });

    return Object.entries(dailyData)
        .map(([dateString, data]) => ({
            dateObj: parseISO(dateString),
            totalDuration: data.totalDuration,
            topics: Array.from(data.topics).join(', '),
            date: format(parseISO(dateString), 'MMM dd'),
        }))
        .sort((a, b) => a.dateObj.getTime() - b.dateObj.getTime());
  }, [allWorkoutLogs]);
  
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
      <div className="container mx-auto p-4 sm:p-6 lg:p-8">
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
          <section aria-labelledby="task-library-heading" className="md:col-span-1 space-y-6">
            <Card>
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <CardTitle id="task-library-heading" className="flex items-center gap-2 text-lg text-primary">
                    <Briefcase /> Focus Area Library
                  </CardTitle>
                  <div className="flex items-center gap-2 flex-wrap">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="outline" size="sm" className="h-8">
                          <FilterIcon className="h-4 w-4 mr-2" />
                          Filter ({selectedCategories.length > 0 ? selectedCategories.length : "All"})
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56">
                        <DropdownMenuLabel>Filter by Topic</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {allTopics.map((category) => (
                          <DropdownMenuCheckboxItem
                            key={category} checked={selectedCategories.includes(category)}
                            onCheckedChange={() => handleCategoryFilterChange(category)}
                            onSelect={(e) => e.preventDefault()} 
                          > {category} </DropdownMenuCheckboxItem>
                        ))}
                        {selectedCategories.length > 0 && (
                          <> <DropdownMenuSeparator />
                            <Button variant="ghost" size="sm" className="w-full justify-start text-sm" onClick={() => setSelectedCategories([])}> Clear Filters </Button>
                          </>)}
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button variant="ghost" size="icon" onClick={() => setIsLibraryExpanded(!isLibraryExpanded)} className="h-8 w-8" aria-label={isLibraryExpanded ? "Collapse library" : "Expand library"}>
                      {isLibraryExpanded ? <ChevronUp className="h-5 w-5 text-primary" /> : <ChevronDown className="h-5 w-5 text-primary" />}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-4">
                <AnimatePresence>
                  {isLibraryExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      style={{ overflow: 'hidden' }}
                      className="space-y-4"
                    >
                      <form onSubmit={handleAddTaskDefinition} className="space-y-3">
                        <Input type="text" placeholder="New Topic" value={newTopicName} onChange={(e) => setNewTopicName(e.target.value)} list="topics-datalist" aria-label="New topic name" className="h-10 text-sm" />
                        <datalist id="topics-datalist">
                          {allTopics.map(topic => <option key={topic} value={topic} />)}
                        </datalist>

                        <Input type="text" placeholder="New Focus Area" value={newSubtopicName} onChange={(e) => setNewSubtopicName(e.target.value)} aria-label="New focus area" className="h-10 text-sm" />
                        
                        <Button type="submit" size="sm" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs xl:text-sm xl:h-10 xl:px-4"> <PlusCircle className="mr-2 h-5 w-5" /> Add Focus Area </Button>
                      </form>
                      <div className="max-h-[calc(100vh-38rem)] overflow-y-auto pr-1">
                        {filteredExerciseDefinitions.length === 0 && exerciseDefinitions.length > 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">No focus areas match filter.</p>
                        ) : filteredExerciseDefinitions.length === 0 ? (
                          <p className="text-muted-foreground text-sm text-center py-4">Library empty. Add a new topic and focus area to get started!</p>
                        ) : (
                          <ul className="space-y-2">
                            <AnimatePresence>
                              {filteredExerciseDefinitions.sort((a,b) => a.name.localeCompare(b.name)).map(def => (
                                <motion.li key={def.id} layout initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }} className="p-3 bg-card border rounded-lg shadow-sm">
                                  {editingDefinition?.id === def.id ? (
                                    <div className="space-y-2">
                                      <Input value={editingDefinitionCategory} onChange={(e) => setEditingDefinitionCategory(e.target.value)} className="h-9" aria-label="Edit topic name"/>
                                      <Input value={editingDefinitionName} onChange={(e) => setEditingDefinitionName(e.target.value)} className="h-9" aria-label="Edit focus area name"/>
                                      <div className="flex gap-2">
                                        <Button size="sm" onClick={handleSaveEditDefinition} className="flex-grow bg-green-600 hover:bg-green-500 text-white"><Save className="h-4 w-4 mr-1"/>Save</Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingDefinition(null)} className="flex-grow"><X className="h-4 w-4 mr-1"/>Cancel</Button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex-grow min-w-0">
                                          <span className="font-medium text-foreground block" title={def.name}>{def.name}</span>
                                          <Badge variant="secondary" className="text-xs ml-0 my-0.5">{def.category}</Badge>
                                      </div>
                                      <div className="flex-shrink-0 flex items-center">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenDecompositionModal(def)} className="h-8 w-8 text-muted-foreground hover:text-yellow-500" aria-label={`View decomposition techniques for ${def.name}`}> <Puzzle className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleViewProgress(def)} className="h-8 w-8 text-muted-foreground hover:text-blue-500" aria-label={`View progress for ${def.name}`}> <TrendingUp className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleStartEditDefinition(def)} className="h-8 w-8 text-muted-foreground hover:text-primary" aria-label={`Edit ${def.name}`}> <Edit3 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteExerciseDefinition(def.id)} className="h-8 w-8 text-muted-foreground hover:text-destructive" aria-label={`Delete ${def.name}`}> <Trash2 className="h-4 w-4" /> </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleAddTaskToSession(def)} className="h-8 w-8 text-muted-foreground hover:text-accent" aria-label={`Add ${def.name} to session`}> <ChevronRight className="h-5 w-5" /> </Button>
                                      </div>
                                    </div>
                                  )}
                                </motion.li>
                              ))}
                            </AnimatePresence>
                          </ul>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </CardContent>
            </Card>

             <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-lg text-primary">
                        <Share2 /> Personal Branding Pipeline
                    </CardTitle>
                    <CardDescription>
                       Convert deep work into content. A focus area appears here once it has 4+ sessions and its topic has at least 4 focus areas.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {brandingCandidates.length === 0 ? (
                        <div className="text-center py-6 text-sm text-muted-foreground">
                            Log 4+ sessions on a focus area within a topic that has 4+ focus areas to get started.
                        </div>
                    ) : (
                        <ul className="space-y-4">
                            {brandingCandidates.map(def => (
                                <li key={def.id} className="p-3 bg-muted/30 rounded-lg space-y-3 text-sm">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h4 className="font-semibold text-foreground">{def.name}</h4>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                <Badge variant="outline">{def.category}</Badge>
                                                <Badge variant="secondary">{def.sessionCount} sessions</Badge>
                                            </div>
                                        </div>
                                        {def.brandingStatus === 'published' && (
                                            <div className="flex items-center gap-1.5 text-green-600">
                                                <CheckCircle2 className="h-4 w-4" />
                                                <span className="font-medium">Published</span>
                                            </div>
                                        )}
                                    </div>

                                    {def.brandingStatus === 'converted' || def.brandingStatus === 'published' ? (
                                        <div className="space-y-4">
                                            {def.contentUrls && (
                                                <div className="space-y-2">
                                                    <h5 className="font-medium text-muted-foreground">Content Links</h5>
                                                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                                        {def.contentUrls.blog && <a href={def.contentUrls.blog} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Globe className="h-4 w-4" /> Blog Post</a>}
                                                        {def.contentUrls.youtube && <a href={def.contentUrls.youtube} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Youtube className="h-4 w-4" /> YouTube</a>}
                                                        {def.contentUrls.demo && <a href={def.contentUrls.demo} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 text-primary hover:underline"><Code className="h-4 w-4" /> Demo</a>}
                                                         <Button variant="ghost" size="icon" onClick={() => handleOpenBrandingModal(def, def.contentUrls.youtube ? 'blog_demo' : 'blog')} className="h-7 w-7"><Edit3 className="h-4 w-4 text-muted-foreground" /></Button>
                                                    </div>
                                                </div>
                                            )}
                                            <div className="space-y-2">
                                                 <h5 className="font-medium text-muted-foreground">Sharing Checklist</h5>
                                                 <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id={`share-twitter-${def.id}`} checked={def.sharingStatus?.twitter} onCheckedChange={() => handleToggleSharing(def.id, 'twitter')} />
                                                        <label htmlFor={`share-twitter-${def.id}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            <TwitterIcon className="h-4 w-4" /> X / Twitter
                                                        </label>
                                                    </div>
                                                     <div className="flex items-center space-x-2">
                                                        <Checkbox id={`share-linkedin-${def.id}`} checked={def.sharingStatus?.linkedin} onCheckedChange={() => handleToggleSharing(def.id, 'linkedin')} />
                                                        <label htmlFor={`share-linkedin-${def.id}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            <Linkedin className="h-4 w-4" /> LinkedIn
                                                        </label>
                                                    </div>
                                                    <div className="flex items-center space-x-2">
                                                        <Checkbox id={`share-devto-${def.id}`} checked={def.sharingStatus?.devto} onCheckedChange={() => handleToggleSharing(def.id, 'devto')} />
                                                        <label htmlFor={`share-devto-${def.id}`} className="flex items-center gap-1.5 font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                                            <DevToIcon className="h-4 w-4" /> DEV.to
                                                        </label>
                                                    </div>
                                                 </div>
                                            </div>
                                        </div>
                                    ) : (
                                         <div className="flex items-center gap-2 pt-2 border-t">
                                            <Button size="sm" onClick={() => handleOpenBrandingModal(def, 'blog')} className="flex-1">Create Blog</Button>
                                            <Button size="sm" onClick={() => handleOpenBrandingModal(def, 'blog_demo')} className="flex-1">Blog + Demo</Button>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    )}
                </CardContent>
            </Card>
          </section>

          <section aria-labelledby="current-learning-heading" className="md:col-span-2 space-y-6">
              <Card>
                  <CardHeader className="flex flex-row items-center justify-between p-4">
                      <div className="flex-grow">
                          <CardTitle id="current-learning-heading" className="flex items-center gap-2 text-lg text-accent">
                              <ListChecks /> Deep Work Session for: {format(selectedDate, 'PPP')}
                          </CardTitle>
                      </div>
                      <Popover>
                          <PopoverTrigger asChild>
                          <Button variant={"outline"} className={cn("w-[200px] justify-start text-left font-normal h-10",!selectedDate && "text-muted-foreground")}>
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                          </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                          <Calendar mode="single" selected={selectedDate} onSelect={(date) => date && setSelectedDate(date)} initialFocus />
                          </PopoverContent>
                      </Popover>
                  </CardHeader>
                  <CardContent className="p-4">
                    <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-2">
                      {currentWorkoutExercises.length === 0 ? (
                        <div className="text-center py-10">
                            <GripVertical className="mx-auto h-16 w-16 text-muted-foreground/50 mb-4" />
                            <p className="text-muted-foreground">No focus areas for {format(selectedDate, 'PPP')}.</p>
                            <p className="text-sm text-muted-foreground/80">Add focus areas from the library to get started!</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
                          <AnimatePresence>
                          {currentWorkoutExercises.map(exercise => {
                              const definition = exerciseDefinitions.find(def => def.id === exercise.definitionId);
                              return (
                                <WorkoutExerciseCard 
                                  key={exercise.id} 
                                  exercise={exercise}
                                  onLogSet={handleLogSet} 
                                  onDeleteSet={handleDeleteSet} 
                                  onUpdateSet={handleUpdateSet} 
                                  onRemoveExercise={handleRemoveExerciseFromWorkout}
                                  onViewProgress={definition ? () => handleViewProgress(definition) : undefined}
                                  pageType="deepwork"
                                />
                              );
                          })}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </CardContent>
              </Card>

              <div>
                <WorkoutHeatmap
                  allWorkoutLogs={allWorkoutLogs}
                  onDateSelect={(date) => setSelectedDate(parse(date, 'yyyy-MM-dd', new Date()))}
                  consistencyData={consistencyData}
                  oneYearAgo={oneYearAgo}
                  today={today}
                />
              </div>
          </section>
        </div>
        {viewingProgressExercise && (
          <ExerciseProgressModal 
            isOpen={isProgressModalOpen} 
            onOpenChange={setIsProgressModalOpen}
            exercise={viewingProgressExercise} 
            allWorkoutLogs={allWorkoutLogs}
            pageType="deepwork"
          />
        )}
      </div>

      <AlertDialog open={showBackupPrompt} onOpenChange={setShowBackupPrompt}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Weekly Backup Reminder</AlertDialogTitle>
            <AlertDialogDescription>
              It's Monday! Would you like to back up your deep work data? This will download a file to your computer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={markBackupPromptAsHandled}>Maybe Later</AlertDialogCancel>
            <AlertDialogAction onClick={handleBackupConfirm}>Yes, Back Up Now</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <WeightChartModal
        isOpen={isWeightChartModalOpen}
        onOpenChange={setIsWeightChartModalOpen}
        weightLogs={weightLogs}
        goalWeight={goalWeight}
        height={height}
        dateOfBirth={dateOfBirth}
        gender={gender}
        onLogWeight={handleLogWeight}
        onUpdateWeightLog={(dateKey, weight) => { /* Implement if needed */ }}
        onDeleteWeightLog={(dateKey) => { /* Implement if needed */ }}
        onSetGoalWeight={(goal) => setGoalWeight(goal)}
        onSetHeight={(h) => setHeight(h)}
        onSetDateOfBirth={(dob) => setDateOfBirth(dob)}
        onSetGender={(g) => setGender(g)}
      />

      <Dialog open={isDecompositionModalOpen} onOpenChange={setIsDecompositionModalOpen}>
        <DialogContent className="sm:max-w-4xl">
          <DialogHeader className="flex flex-row justify-between items-center">
            <DialogTitle>Decomposition Techniques for: {selectedFocusArea?.name}</DialogTitle>
            <div className="flex-shrink-0">
              {isDecompositionEditing ? (
                  <Button variant="ghost" size="icon" onClick={handleSaveDecomposition} aria-label="Save Changes">
                      <Save className="h-5 w-5 text-green-500" />
                  </Button>
              ) : (
                  <Button variant="ghost" size="icon" onClick={() => setIsDecompositionEditing(true)} aria-label="Edit Techniques">
                      <Edit3 className="h-5 w-5" />
                  </Button>
              )}
            </div>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Technique</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Use Cases</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.isArray(editableDecompositionData) && editableDecompositionData.map((item, index) => (
                  <TableRow key={index}>
                    {isDecompositionEditing ? (
                      <>
                        <TableCell className="align-top">
                          <Textarea value={item.technique} onChange={(e) => handleDecompositionChange(index, 'technique', e.target.value)} className="min-h-[60px]" />
                        </TableCell>
                        <TableCell className="align-top">
                          <Textarea value={item.description} onChange={(e) => handleDecompositionChange(index, 'description', e.target.value)} className="min-h-[60px]" />
                        </TableCell>
                        <TableCell className="align-top">
                           <Textarea value={item.useCases} onChange={(e) => handleDecompositionChange(index, 'useCases', e.target.value)} className="min-h-[60px]" />
                        </TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="font-medium align-top">{item.technique}</TableCell>
                        <TableCell className="align-top">{item.description}</TableCell>
                        <TableCell className="align-top">{item.useCases}</TableCell>
                      </>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>
      
       <Dialog open={isBrandingModalOpen} onOpenChange={setIsBrandingModalOpen}>
        <DialogContent>
            <DialogHeader>
            <DialogTitle>Convert to Content: {selectedBrandingCandidate?.name}</DialogTitle>
            <DialogDescription>
                Add the URLs for your created content. Click save when you're done.
            </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="space-y-2">
                    <Label htmlFor="blog-url">Blog Post URL</Label>
                    <Input id="blog-url" value={blogUrl} onChange={e => setBlogUrl(e.target.value)} placeholder="https://my.blog/post-title" />
                </div>
                {brandingModalType === 'blog_demo' && (
                    <>
                        <div className="space-y-2">
                            <Label htmlFor="youtube-url">YouTube Video URL</Label>
                            <Input id="youtube-url" value={youtubeUrl} onChange={e => setYoutubeUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="demo-url">Live Demo URL</Label>
                            <Input id="demo-url" value={demoUrl} onChange={e => setDemoUrl(e.target.value)} placeholder="https://my-demo.vercel.app" />
                        </div>
                    </>
                )}
            </div>
            <DialogFooter>
                <Button onClick={handleSaveBranding}>Save URLs</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

    </>
  );
}

export default function DeepWorkPage() {
  return ( <AuthGuard> <DeepWorkPageContent /> </AuthGuard> );
}
