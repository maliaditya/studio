
"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, CheckSquare, Edit2, Save, X, Youtube, TrendingUp } from 'lucide-react';
import { WorkoutExercise, LoggedSet, TopicGoal } from '@/types/workout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  definitionGoal?: TopicGoal;
  onLogSet: (exerciseId: string, reps: number, weight: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, reps: number, weight: number) => void;
  onRemoveExercise: (exerciseId: string) => void;
  onViewProgress?: () => void;
  pageType?: 'workout' | 'upskill' | 'deepwork';
}

export function WorkoutExerciseCard({
  exercise,
  definitionGoal,
  onLogSet,
  onDeleteSet,
  onUpdateSet,
  onRemoveExercise,
  onViewProgress,
  pageType = 'workout'
}: WorkoutExerciseCardProps) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [duration, setDuration] = useState('');
  const [progress, setProgress] = useState('');

  const [editingSet, setEditingSet] = useState<LoggedSet | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');
  const [editDuration, setEditDuration] = useState('');
  const [editProgress, setEditProgress] = useState('');

  const placeholder = useMemo(() => {
    if (pageType === 'upskill') {
      return definitionGoal?.goalType ? `Log ${definitionGoal.goalType}` : 'Log Progress';
    }
    if (pageType === 'deepwork') {
      return 'Duration (min)';
    }
    return ''; // for workout, there are two inputs
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
        onLogSet(exercise.id, numDuration, numProgress); // reps = duration, weight = progress
        setProgress('');
        setDuration('');
      }
    } else { // deepwork
      const numDuration = parseInt(duration);
      if (!isNaN(numDuration) && numDuration > 0) {
        onLogSet(exercise.id, 1, numDuration); // reps=1, weight=duration
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
      } else { // deepwork
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
    // Card-level completion is only for workout sets for now.
    // Topic-level completion for upskill is handled in the progress modal.
    if (pageType === 'workout') {
        return exercise.loggedSets.length >= exercise.targetSets;
    }
    return false;
  }, [exercise, pageType]);
  

  const getProgressText = () => {
    if (pageType === 'upskill' && definitionGoal) {
      const totalProgress = exercise.loggedSets.reduce((sum, set) => sum + set.weight, 0);
      return `Topic Goal: ${definitionGoal.goalValue} ${definitionGoal.goalType}. This subtopic: ${totalProgress} logged.`;
    }
    if (pageType === 'workout') {
      return `Target: ${exercise.targetSets} sets of ${exercise.targetReps} reps. Progress: ${exercise.loggedSets.length}/${exercise.targetSets} sets.`;
    }
    return `Target: ${exercise.targetSets} sessions of ${exercise.targetReps} min. Progress: ${exercise.loggedSets.length}/${exercise.targetSets} sessions.`;
  }

  const getLoggedSetText = (set: LoggedSet, index: number) => {
    if (pageType === 'workout') {
      return `Set ${exercise.loggedSets.length - index}: <strong>${set.reps}</strong>r @ <strong>${set.weight}</strong>kg/lb`;
    }
    if (pageType === 'upskill' && definitionGoal?.goalType) {
      return `Progress: <strong>${set.weight}</strong> ${definitionGoal.goalType} in <strong>${set.reps}</strong> min`;
    }
    return `Session ${exercise.loggedSets.length - index}: <strong>${set.weight}</strong> min`;
  }

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
             <Button variant="ghost" size="icon" onClick={handleSearchOnYouTube} className="h-7 w-7" aria-label={`Search ${exercise.name} on YouTube`}>
                <Youtube className="h-4 w-4 text-muted-foreground hover:text-red-500" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onRemoveExercise(exercise.id)} className="h-7 w-7" aria-label={`Remove ${exercise.name} from workout`}>
              <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-3">
          <p className="text-xs text-muted-foreground mb-2">
            {getProgressText()}
          </p>

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
        </CardContent>
      </Card>
    </motion.div>
  );
}
