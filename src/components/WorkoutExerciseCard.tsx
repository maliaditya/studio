"use client";

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { PlusCircle, Trash2, CheckSquare, Edit2, Save, X } from 'lucide-react';
import { WorkoutExercise, LoggedSet } from '@/types/workout';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

interface WorkoutExerciseCardProps {
  exercise: WorkoutExercise;
  onLogSet: (exerciseId: string, reps: number, weight: number) => void;
  onDeleteSet: (exerciseId: string, setId: string) => void;
  onUpdateSet: (exerciseId: string, setId: string, reps: number, weight: number) => void;
  onRemoveExercise: (exerciseId: string) => void;
}

export function WorkoutExerciseCard({
  exercise,
  onLogSet,
  onDeleteSet,
  onUpdateSet,
  onRemoveExercise,
}: WorkoutExerciseCardProps) {
  const [reps, setReps] = useState('');
  const [weight, setWeight] = useState('');
  const [editingSet, setEditingSet] = useState<LoggedSet | null>(null);
  const [editReps, setEditReps] = useState('');
  const [editWeight, setEditWeight] = useState('');

  const handleLogSetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const numReps = parseInt(reps);
    const numWeight = parseFloat(weight);
    if (!isNaN(numReps) && !isNaN(numWeight) && numReps > 0) {
      onLogSet(exercise.id, numReps, numWeight);
      setReps('');
      setWeight('');
    }
  };

  const handleEditSet = (set: LoggedSet) => {
    setEditingSet(set);
    setEditReps(set.reps.toString());
    setEditWeight(set.weight.toString());
  };

  const handleSaveEditSet = () => {
    if (editingSet) {
      const numReps = parseInt(editReps);
      const numWeight = parseFloat(editWeight);
      if (!isNaN(numReps) && !isNaN(numWeight) && numReps > 0) {
        onUpdateSet(exercise.id, editingSet.id, numReps, numWeight);
        setEditingSet(null);
      }
    }
  };
  
  const isCompleted = exercise.loggedSets.length >= exercise.targetSets;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={cn("mb-6 rounded-lg shadow-md", isCompleted ? "bg-green-100 dark:bg-green-900/30 border-green-500" : "bg-card")}
    >
      <Card className="overflow-hidden">
        <CardHeader className="flex flex-row items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            {isCompleted && <CheckSquare className="h-6 w-6 text-green-500" />}
            <CardTitle className="text-xl">{exercise.name}</CardTitle>
          </div>
          <Button variant="ghost" size="icon" onClick={() => onRemoveExercise(exercise.id)} aria-label={`Remove ${exercise.name} from workout`}>
            <Trash2 className="h-5 w-5 text-destructive hover:text-destructive/80" />
          </Button>
        </CardHeader>
        <CardContent className="p-4">
          <p className="text-sm text-muted-foreground mb-3">
            Target: {exercise.targetSets} sets of {exercise.targetReps} reps. Progress: {exercise.loggedSets.length}/{exercise.targetSets} sets.
          </p>

          <form onSubmit={handleLogSetSubmit} className="flex gap-2 mb-4 items-end">
            <div className="flex-1">
              <label htmlFor={`reps-${exercise.id}`} className="text-xs font-medium text-muted-foreground">Reps</label>
              <Input
                id={`reps-${exercise.id}`}
                type="number"
                placeholder="Reps"
                value={reps}
                onChange={(e) => setReps(e.target.value)}
                className="h-10"
                min="1"
                required
              />
            </div>
            <div className="flex-1">
              <label htmlFor={`weight-${exercise.id}`} className="text-xs font-medium text-muted-foreground">Weight (kg/lb)</label>
              <Input
                id={`weight-${exercise.id}`}
                type="number"
                placeholder="Weight"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="h-10"
                min="0"
                step="0.1"
                required
              />
            </div>
            <Button type="submit" className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground" aria-label="Log set">
              <PlusCircle className="h-5 w-5" />
            </Button>
          </form>

          {exercise.loggedSets.length > 0 && (
            <div>
              <h4 className="text-sm font-medium mb-2 text-foreground">Logged Sets:</h4>
              <ul className="space-y-2">
                <AnimatePresence>
                  {exercise.loggedSets.slice().sort((a,b) => b.timestamp - a.timestamp).map((set, index) => (
                    <motion.li
                      key={set.id}
                      layout
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                      className="flex items-center justify-between p-2.5 bg-muted/50 rounded-md text-sm"
                    >
                      {editingSet?.id === set.id ? (
                        <>
                          <Input type="number" value={editReps} onChange={(e) => setEditReps(e.target.value)} className="w-16 h-8 mr-1" /> reps
                          <Input type="number" value={editWeight} onChange={(e) => setEditWeight(e.target.value)} className="w-20 h-8 mx-1" /> kg/lb
                          <Button size="icon" variant="ghost" onClick={handleSaveEditSet} className="h-8 w-8 text-green-600"><Save className="h-4 w-4" /></Button>
                          <Button size="icon" variant="ghost" onClick={() => setEditingSet(null)} className="h-8 w-8 text-gray-600"><X className="h-4 w-4" /></Button>
                        </>
                      ) : (
                        <>
                          <span>Set {exercise.loggedSets.length - index}: <strong>{set.reps}</strong> reps at <strong>{set.weight}</strong> kg/lb</span>
                          <div className="flex items-center">
                             <Button variant="ghost" size="icon" onClick={() => handleEditSet(set)} className="h-7 w-7 text-muted-foreground hover:text-primary" aria-label="Edit set">
                               <Edit2 className="h-4 w-4" />
                             </Button>
                            <Button variant="ghost" size="icon" onClick={() => onDeleteSet(exercise.id, set.id)} className="h-7 w-7 text-muted-foreground hover:text-destructive" aria-label="Delete set">
                              <Trash2 className="h-4 w-4" />
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
