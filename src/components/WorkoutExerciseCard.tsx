
"use client";

import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, CheckSquare, Edit2, Save, X, Youtube, TrendingUp, Check, Linkedin, RefreshCw, Link as LinkIcon, Unlink } from 'lucide-react';
import { WorkoutExercise, LoggedSet, TopicGoal, SharingStatus, ExerciseDefinition, DatedWorkout, Resource } from '@/types/workout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { Checkbox } from './ui/checkbox';
import { Badge } from './ui/badge';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from './ui/scroll-area';
import { useAuth } from '@/contexts/AuthContext';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';


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

const EditableStep = React.memo(({ point, onUpdate, onDelete }: { point: { id: string; text: string }, onUpdate: (id: string, newText: string) => void, onDelete: (id: string) => void }) => {
  const [text, setText] = useState(point.text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setText(point.text);
  }, [point.text]);
  
  useEffect(() => {
    if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [text]);

  const handleBlur = () => {
    const newText = text.trim();
    if (newText === '') {
      onDelete(point.id);
    } else if (newText !== point.text) {
      onUpdate(point.id, newText);
    }
  };

  return (
    <div className="text-sm flex items-start gap-2 group w-full">
      <Textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        className="editable-placeholder w-full min-h-[1.5rem] resize-none overflow-hidden bg-transparent border-none focus-visible:ring-1"
        rows={1}
      />
      <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={(e) => {e.stopPropagation(); onDelete(point.id);}}>
        <Trash2 className="h-3 w-3"/>
      </Button>
    </div>
  );
});
EditableStep.displayName = 'EditableStep';


interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  definition?: ExerciseDefinition;
  definitionGoal?: TopicGoal;
  selectedDate?: Date;
  allDeepWorkLogs?: DatedWorkout[];
  allUpskillLogs?: DatedWorkout[];
  onLogSet: (exerciseId: string, reps: number, weight: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, reps: number, weight: number) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onViewProgress?: () => void;
  onOpenPopup?: (resourceId: string, event: React.MouseEvent) => void;
  onUpdateSharingStatus?: (definitionId: string, newStatus: SharingStatus) => void;
  onSwapExercise?: (newExerciseDefinition: ExerciseDefinition) => void;
  swappableExercises?: ExerciseDefinition[];
  pageType?: 'workout' | 'upskill' | 'deepwork' | 'branding' | 'lead-generation' | 'offer-system' | 'mind-programming';
  deepWorkDefinitions?: ExerciseDefinition[];
  onCreateAndLinkResource?: (definition: ExerciseDefinition) => void;
  onUnlinkResource?: (definitionId: string, resourceId: string) => void;
}

export function WorkoutExerciseCard({
  exercise,
  definition,
  definitionGoal,
  selectedDate,
  allDeepWorkLogs,
  allUpskillLogs,
  onLogSet,
  onDeleteSet,
  onUpdateSet,
  onRemoveExercise,
  onViewProgress,
  onOpenPopup,
  onUpdateSharingStatus,
  onSwapExercise,
  swappableExercises,
  pageType = 'workout',
  deepWorkDefinitions,
  onCreateAndLinkResource,
  onUnlinkResource,
}: WorkoutExerciseCardProps) {
  const { resources, mindProgrammingDefinitions, setMindProgrammingDefinitions } = useAuth();
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [progress, setProgress] = useState('');
  const [editingSet, setEditingSet] = useState<LoggedSet | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProgress, setEditProgress] = useState('');
  const isParent = definition && ((definition.linkedDeepWorkIds?.length ?? 0) > 0 || (definition.linkedUpskillIds?.length ?? 0) > 0 || (definition.linkedResourceIds?.length ?? 0) > 0);
  
  const handleSharingChange = (platform: keyof SharingStatus) => {
    if (!onUpdateSharingStatus || !exercise.sharingStatus) return;
    const newStatus = { ...exercise.sharingStatus, [platform]: !exercise.sharingStatus[platform] };
    onUpdateSharingStatus(exercise.definitionId, newStatus);
  }

  const focusAreaNames = useMemo(() => {
    if (!exercise.focusAreaIds || !deepWorkDefinitions) return [];
    const nameMap = new Map(deepWorkDefinitions.map(d => [d.id, d.name]));
    return exercise.focusAreaIds.map(id => nameMap.get(id) || 'Unknown Focus Area');
  }, [exercise.focusAreaIds, deepWorkDefinitions]);

  const placeholder = useMemo(() => {
    if (pageType === 'upskill') {
      return definitionGoal?.goalType ? `Log ${definitionGoal.goalType}` : 'Log Progress';
    }
    if (pageType === 'deepwork' || pageType === 'branding') {
      return 'Duration (min)';
    }
    return '';
  }, [pageType, definitionGoal]);

  const handleLogSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (pageType === 'workout') {
      const numReps = parseInt(reps);
      const numWeight = parseFloat(weight);
      if (!isNaN(numReps) && !isNaN(numWeight) && numReps > 0) {
        onLogSet(exercise.id, numReps, numWeight);
        setReps('');
        setWeight('');
      }
    } else if (pageType === 'upskill') {
      const numProgress = parseInt(progress);
      const numDuration = parseInt(duration);
      if (!isNaN(numProgress) && numProgress > 0 && !isNaN(numDuration) && numDuration > 0) {
        onLogSet(exercise.id, numDuration, numProgress);
        setProgress('');
        setDuration('');
      }
    } else { 
      const numDuration = parseInt(duration);
      if (!isNaN(numDuration) && numDuration > 0) {
        onLogSet(exercise.id, 1, numDuration);
        setDuration('');
      }
    }
  };

  const handleEditSet = (set: LoggedSet) => {
    setEditingSet(set);
    if (pageType === 'workout') {
      setEditReps(set.reps.toString());
      setEditWeight(set.weight.toString());
    } else if (pageType === 'upskill') {
        setEditProgress(set.weight.toString());
        setEditDuration(set.reps.toString());
    } else {
      setEditDuration(set.weight.toString());
    }
  };

  const handleSaveEditSet = () => {
    if (editingSet) {
      if (pageType === 'workout') {
        const numReps = parseInt(editReps);
        const numWeight = parseFloat(editWeight);
        if (!isNaN(numReps) && !isNaN(numWeight) && numReps > 0) {
          onUpdateSet(exercise.id, editingSet.id, numReps, numWeight);
          setEditingSet(null);
        }
      } else if (pageType === 'upskill') {
        const numProgress = parseInt(editProgress);
        const numDuration = parseInt(editDuration);
        if (!isNaN(numProgress) && numProgress > 0 && !isNaN(numDuration) && numDuration > 0) {
            onUpdateSet(exercise.id, editingSet.id, numDuration, numProgress);
            setEditingSet(null);
        }
      } else {
        const numDuration = parseInt(editDuration);
        if (!isNaN(numDuration) && numDuration > 0) {
          onUpdateSet(exercise.id, editingSet.id, 1, numDuration);
          setEditingSet(null);
        }
      }
    }
  };

  const handleSearchOnYouTube = () => {
    const query = encodeURIComponent(exercise.name);
    const url = `https://www.youtube.com/results?search_query=${query}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };
  
  const isCompleted = useMemo(() => {
    if (pageType === 'branding') return exercise.loggedSets.length >= 4;
    return exercise.loggedSets.length >= exercise.targetSets;
  }, [exercise, pageType]);
  

  const dailyTotalMinutes = useMemo(() => {
      if (!isParent || !selectedDate || !definition) return 0;
      
      const dateKey = format(selectedDate, 'yyyy-MM-dd');
      let totalMinutes = 0;

      const allDeepWorkDefIds = new Set(definition.linkedDeepWorkIds || []);
      const allUpskillDefIds = new Set(definition.linkedUpskillIds || []);
      
      const deepWorkLogForDay = allDeepWorkLogs?.find(log => log.date === dateKey);
      if (deepWorkLogForDay) {
          deepWorkLogForDay.exercises.forEach(ex => {
              if (allDeepWorkDefIds.has(ex.definitionId)) {
                  totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.weight, 0);
              }
          });
      }

      const upskillLogForDay = allUpskillLogs?.find(log => log.date === dateKey);
      if (upskillLogForDay) {
          upskillLogForDay.exercises.forEach(ex => {
              if (allUpskillDefIds.has(ex.definitionId)) {
                  totalMinutes += ex.loggedSets.reduce((sum, set) => sum + set.reps, 0);
              }
          });
      }
      
      return totalMinutes;
  }, [isParent, selectedDate, definition, allDeepWorkLogs, allUpskillLogs]);

  const getLoggedSetText = (set: LoggedSet, index: number) => {
    if (pageType === 'workout') {
      return `Set ${exercise.loggedSets.length - index}: <strong>${set.reps}</strong>r @ <strong>${set.weight}</strong>kg/lb`;
    }
    if (pageType === 'upskill' && definitionGoal?.goalType) {
      return `Progress: <strong>${set.weight}</strong> ${definitionGoal.goalType} in <strong>${set.reps}</strong> min`;
    }
    if (pageType === 'branding') {
        const stages = ['Create', 'Optimize', 'Review', 'Final Review'];
        return `Stage complete: <strong>${stages[set.reps - 1]}</strong>`;
    }
    if (pageType === 'lead-generation' || pageType === 'offer-system') {
      return `Action logged at ${format(set.timestamp, 'p')}`;
    }
    return `Session ${exercise.loggedSets.length - index}: <strong>${set.weight}</strong> min`;
  }

  const updateDecompositionData = (pointId: string, newText: string) => {
    setMindProgrammingDefinitions(prevDefs => prevDefs.map(def => {
        if (def.id === exercise.definitionId) {
            const newDecompData = (def.decompositionData || []).map(point =>
                point.id === pointId ? { ...point, text: newText } : point
            );
            return { ...def, decompositionData: newDecompData };
        }
        return def;
    }));
  };
  
  const deleteDecompositionData = (pointId: string) => {
    setMindProgrammingDefinitions(prevDefs => prevDefs.map(def => {
        if (def.id === exercise.definitionId) {
            const newDecompData = (def.decompositionData || []).filter(point => point.id !== pointId);
            return { ...def, decompositionData: newDecompData };
        }
        return def;
    }));
  };
  
  const handleLinkResource = (resourceId: string) => {
    if (!resourceId || !definition) return;
    setMindProgrammingDefinitions(prevDefs => prevDefs.map(def => {
      if (def.id === definition.id) {
        const updatedLinkedIds = [...(def.linkedResourceIds || []), resourceId];
        return { ...def, linkedResourceIds: updatedLinkedIds };
      }
      return def;
    }));
  };
  
  
  const renderBrandingContent = () => {
      const STAGES = ['Create', 'Optimize', 'Review', 'Final Review'];
      const loggedStageIndices = new Set(exercise.loggedSets.map(s => s.reps));
      const isReadyToPublish = loggedStageIndices.size === 4;

      return (
        <div className='space-y-4'>
            {focusAreaNames && focusAreaNames.length > 0 && (
              <div className='mb-3'>
                <h4 className="text-sm font-medium mb-2 text-foreground">Included Focus Areas:</h4>
                <div className="flex flex-wrap gap-1.5">
                  {focusAreaNames.map(fa => (
                    <Badge key={fa} variant="outline">{fa}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
                {STAGES.map((stage, index) => (
                <Button
                    key={stage}
                    variant={loggedStageIndices.has(index + 1) ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => onLogSet(exercise.id, index + 1, 1)}
                    disabled={loggedStageIndices.has(index + 1)}
                    className={cn("flex-1", loggedStageIndices.has(index + 1) ? 'bg-green-600 hover:bg-green-700' : '')}
                >
                    {loggedStageIndices.has(index + 1) && <Check className="mr-2 h-4 w-4" />}
                    {stage}
                </Button>
                ))}
            </div>
            {isReadyToPublish && onUpdateSharingStatus && exercise.sharingStatus && (
                <div className='pt-4 border-t'>
                    <h4 className="text-sm font-medium mb-2 text-foreground">Sharing Checklist:</h4>
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`share-twitter-${exercise.id}`} checked={exercise.sharingStatus.twitter} onCheckedChange={() => handleSharingChange('twitter')} />
                            <label htmlFor={`share-twitter-${exercise.id}`} className="flex items-center gap-1.5 font-medium leading-none">
                                <TwitterIcon className="h-4 w-4" /> X / Twitter
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`share-linkedin-${exercise.id}`} checked={exercise.sharingStatus.linkedin} onCheckedChange={() => handleSharingChange('linkedin')} />
                            <label htmlFor={`share-linkedin-${exercise.id}`} className="flex items-center gap-1.5 font-medium leading-none">
                                <Linkedin className="h-4 w-4" /> LinkedIn
                            </label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <Checkbox id={`share-devto-${exercise.id}`} checked={exercise.sharingStatus.devto} onCheckedChange={() => handleSharingChange('devto')} />
                            <label htmlFor={`share-devto-${exercise.id}`} className="flex items-center gap-1.5 font-medium leading-none">
                                <DevToIcon className="h-4 w-4" /> DEV.to
                            </label>
                        </div>
                    </div>
                </div>
            )}
        </div>
      )
  }

  const renderSimpleLogContent = () => (
    <div className='space-y-3'>
        {exercise.description && (
            <p className="text-sm text-muted-foreground">{exercise.description}</p>
        )}
        <Button onClick={() => onLogSet(exercise.id, 1, 1)} disabled={isCompleted} className="w-full">
            <PlusCircle className="mr-2 h-4 w-4" />
            Log 1 Action
        </Button>
        {exercise.loggedSets.length > 0 && (
        <div>
            <h4 className="text-sm font-medium mb-1 text-foreground">Logged Actions:</h4>
            <ul className="space-y-1.5">
            <AnimatePresence>
                {exercise.loggedSets.slice().sort((a,b) => b.timestamp - a.timestamp).map((set, index) => (
                <motion.li
                    key={set.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-xs"
                >
                    <span
                        className="truncate"
                        dangerouslySetInnerHTML={{ __html: getLoggedSetText(set, index) }}
                    />
                    <Button variant="ghost" size="icon" onClick={() => onDeleteSet(exercise.id, set.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label="Delete log">
                        <Trash2 className="h-3 w-3" />
                    </Button>
                </motion.li>
                ))}
            </AnimatePresence>
            </ul>
        </div>
        )}
    </div>
  );

  const renderMindProgrammingContent = () => (
    <div className="space-y-2">
        {(definition?.decompositionData || []).map(point => (
            <EditableStep key={point.id} point={point} onUpdate={updateDecompositionData} onDelete={deleteDecompositionData}/>
        ))}
        {(definition?.linkedResourceIds || []).map(resourceId => {
          const resource = resources.find(r => r.id === resourceId);
          return resource ? (
            <div key={resourceId} className="flex items-center justify-between group p-1 rounded-md hover:bg-muted/50">
              <Button
                variant="outline"
                className="text-sm justify-start w-full h-auto flex-grow min-w-0"
                onClick={(e) => onOpenPopup?.(resource.id, e)}
              >
                <LinkIcon className="h-4 w-4 mr-2 text-primary flex-shrink-0" />
                <span className="font-semibold text-left truncate" title={resource.name}>{resource.name}</span>
              </Button>
              {onUnlinkResource && (
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive opacity-0 group-hover:opacity-100 flex-shrink-0" onClick={() => onUnlinkResource(definition!.id, resourceId)}>
                  <Unlink className="h-4 w-4"/>
                </Button>
              )}
            </div>
          ) : null;
        })}
        <div className="flex gap-2 pt-2">
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">Link Resource</Button>
                </PopoverTrigger>
                <PopoverContent>
                    <Select onValueChange={handleLinkResource}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select a resource..." />
                        </SelectTrigger>
                        <SelectContent>
                            {resources.map(res => (
                                <SelectItem key={res.id} value={res.id}>{res.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </PopoverContent>
            </Popover>
            {onCreateAndLinkResource && definition && (
              <Button variant="outline" size="sm" onClick={() => onCreateAndLinkResource(definition)}>Create Resource</Button>
            )}
        </div>
    </div>
  );

  const renderDefaultContent = () => (
      <>
        {isParent && pageType === 'deepwork' ? (
             <div className="space-y-2 text-center py-4">
                <p className="text-sm text-muted-foreground">Time is automatically aggregated from linked tasks.</p>
                <p className="text-2xl font-bold">{dailyTotalMinutes > 0 ? `${dailyTotalMinutes} min` : "No time logged today"}</p>
            </div>
        ) : (
            <form onSubmit={handleLogSetSubmit} className="flex gap-2 mb-3 items-end">
                {pageType === 'workout' ? (
                <>
                    <div className="flex-1">
                    <label htmlFor={`reps-${exercise.id}`} className="sr-only">Reps</label>
                    <Input id={`reps-${exercise.id}`} type="number" placeholder="Reps" value={reps} onChange={(e) => setReps(e.target.value)} className="h-9" min="1" required />
                    </div>
                    <div className="flex-1">
                    <label htmlFor={`weight-${exercise.id}`} className="sr-only">Weight (kg/lb)</label>
                    <Input id={`weight-${exercise.id}`} type="number" placeholder="Weight" value={weight} onChange={(e) => setWeight(e.target.value)} className="h-9" min="0" step="0.1" required />
                    </div>
                </>
                ) : pageType === 'upskill' ? (
                    <>
                        <div className="flex-1">
                            <label htmlFor={`progress-${exercise.id}`} className="sr-only">{placeholder}</label>
                            <Input id={`progress-${exercise.id}`} type="number" placeholder={placeholder.replace('Log ', '')} value={progress} onChange={(e) => setProgress(e.target.value)} className="h-9" min="1" required />
                        </div>
                        <div className="flex-1">
                            <label htmlFor={`duration-${exercise.id}`} className="sr-only">Duration (min)</label>
                            <Input id={`duration-${exercise.id}`} type="number" placeholder="Duration (min)" value={duration} onChange={(e) => setDuration(e.target.value)} className="h-9" min="1" required />
                        </div>
                    </>
                ) : (
                <div className="flex-1">
                    <label htmlFor={`duration-${exercise.id}`} className="sr-only">{placeholder}</label>
                    <Input id={`duration-${exercise.id}`} type="number" placeholder={placeholder} value={duration} onChange={(e) => setDuration(e.target.value)} className="h-9" min="1" required />
                </div>
                )}
                <Button type="submit" size="icon" className="h-9 w-9 shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Log set">
                <PlusCircle className="h-5 w-5" />
                </Button>
            </form>
        )}

        {exercise.loggedSets.length > 0 && (
        <div>
            <h4 className="text-sm font-medium mb-1 text-foreground">Logged Progress:</h4>
            <ul className="space-y-1.5">
            <AnimatePresence>
                {exercise.loggedSets.slice().sort((a,b) => b.timestamp - a.timestamp).map((set, index) => (
                <motion.li
                    key={set.id}
                    layout
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className="flex items-center justify-between p-2 bg-muted/50 rounded-md text-xs"
                >
                    {editingSet?.id === set.id ? (
                    <>
                        {pageType === 'workout' ? (
                        <>
                            <Input type="number" value={editReps} onChange={(e) => setEditReps(e.target.value)} className="w-14 h-7 mr-1 text-xs" /> reps
                            <Input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-16 h-7 mx-1 text-xs" /> kg/lb
                        </>
                        ) : pageType === 'upskill' ? (
                        <>
                            <Input type="number" value={editProgress} onChange={(e) => setEditProgress(e.target.value)} className="w-16 h-7 text-xs" />
                            <span className="mx-1">{definitionGoal?.goalType} in</span>
                            <Input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="w-16 h-7 text-xs" />
                            <span className="ml-1">min</span>
                        </>
                        ) : (
                        <Input type="number" value={editDuration} onChange={(e) => setEditDuration(e.target.value)} className="w-20 h-7 mr-1 text-xs" /> 
                        )}
                        <Button size="icon" variant="ghost" onClick={handleSaveEditSet} className="h-7 w-7 text-green-600"><Save className="h-4 w-4" /></Button>
                        <Button size="icon" variant="ghost" onClick={() => setEditingSet(null)} className="h-7 w-7 text-gray-600"><X className="h-4 w-4" /></Button>
                    </>
                    ) : (
                    <>
                        <span
                        className="truncate"
                        dangerouslySetInnerHTML={{ __html: getLoggedSetText(set, index) }}
                        />
                        <div className="flex items-center">
                            <Button variant="ghost" size="icon" onClick={() => handleEditSet(set)} className="h-6 w-6 text-muted-foreground hover:text-primary" aria-label="Edit set">
                            <Edit2 className="h-3 w-3" />
                            </Button>
                        <Button variant="ghost" size="icon" onClick={() => onDeleteSet(exercise.id, set.id)} className="h-6 w-6 text-muted-foreground hover:text-destructive" aria-label="Delete set">
                            <Trash2 className="h-3 w-3" />
                        </Button>
                        </div>
                    </>
                    )}
                </motion.li>
                ))}
            </AnimatePresence>
            </ul>
        </div>
        )}
    </>
  )

  const renderContent = () => {
    switch (pageType) {
      case 'branding':
        return renderBrandingContent();
      case 'lead-generation':
      case 'offer-system':
        return renderSimpleLogContent();
      case 'mind-programming':
        return renderMindProgrammingContent();
      default:
        return renderDefaultContent();
    }
  }

  const progressText = pageType === 'mind-programming' ? null : `Progress: ${exercise.loggedSets.length} / ${exercise.targetSets} sets`;
  
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn("rounded-lg shadow-md", isCompleted ? "bg-green-100 dark:bg-green-900/30 border-green-500" : "bg-card")}
    >
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2 min-w-0">
            {isCompleted && <CheckSquare className="h-5 w-5 text-green-500 flex-shrink-0" />}
            <CardTitle className="text-base xl:text-lg truncate" title={exercise.name}>{exercise.name}</CardTitle>
          </div>
          <div className="flex items-center flex-shrink-0">
            {onViewProgress && (
                <Button variant="ghost" size="icon" onClick={onViewProgress} className="h-7 w-7" aria-label={`View progress for ${exercise.name}`}>
                    <TrendingUp className="h-4 w-4 text-muted-foreground hover:text-blue-500" />
                </Button>
            )}
            {pageType === 'workout' && (
                <Button variant="ghost" size="icon" onClick={handleSearchOnYouTube} className="h-7 w-7" aria-label={`Search ${exercise.name} on YouTube`}>
                    <Youtube className="h-4 w-4 text-muted-foreground hover:text-red-500" />
                </Button>
             )}
            {pageType === 'workout' && onSwapExercise && swappableExercises && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Swap ${exercise.name}`}>
                      <RefreshCw className="h-4 w-4 text-muted-foreground hover:text-primary" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64 p-0">
                    {swappableExercises.length > 0 ? (
                      <ScrollArea className="h-[200px]">
                        <div className="p-2">
                          {swappableExercises.map(def => (
                            <Button
                              key={def.id}
                              variant="ghost"
                              className="w-full justify-start h-9"
                              onClick={() => onSwapExercise(def)}
                            >
                              {def.name}
                            </Button>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <p className="p-4 text-sm text-center text-muted-foreground">
                        No other exercises in this category.
                      </p>
                    )}
                  </PopoverContent>
                </Popover>
            )}
            <Button variant="ghost" size="icon" onClick={() => onRemoveExercise(exercise.id)} className="h-7 w-7" aria-label={`Remove ${exercise.name} from workout`}>
              <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          {progressText && (
            <p className="text-xs text-muted-foreground mb-2">
              {progressText}
            </p>
          )}
          {renderContent()}
        </CardContent>
      </Card>
    </motion.div>
  );
}
