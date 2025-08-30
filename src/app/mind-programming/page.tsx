
"use client";

import React, { useState, useEffect, FormEvent, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { PlusCircle, Trash2, Edit3, Save, X, ChevronRight, TrendingUp, BrainCircuit, BookCopy } from 'lucide-react';
import { ExerciseDefinition, WorkoutExercise, ExerciseCategory } from '@/types/workout';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';

function MindProgrammingPageContent() {
  const { toast } = useToast();
  const { 
    currentUser, 
    mindsetCards, setMindsetCards,
  } = useAuth();

  const [newCardTitle, setNewCardTitle] = useState('');
  const [editingCard, setEditingCard] = useState<MindsetCard | null>(null);

  const handleAddCard = (e: FormEvent) => {
    e.preventDefault();
    if (newCardTitle.trim() === '') {
      toast({ title: "Error", description: "Title cannot be empty.", variant: "destructive" });
      return;
    }
    const newCard: MindsetCard = { 
      id: `mcard_${Date.now()}`, 
      title: newCardTitle.trim(),
      icon: 'BrainCircuit',
      points: [{ id: `point_${Date.now()}`, text: 'New step' }]
    };
    setMindsetCards(prev => [...prev, newCard]);
    setNewCardTitle('');
    toast({ title: "Success", description: `Card "${newCard.title}" added.` });
  };

  const handleDeleteCard = (id: string) => {
    const cardToDelete = mindsetCards.find(c => c.id === id);
    setMindsetCards(prev => prev.filter(c => c.id !== id));
    toast({ title: "Success", description: `Card "${cardToDelete?.title}" removed.` });
  };

  const handleStartEdit = (card: MindsetCard) => {
    setEditingCard(card);
  };

  const handleSaveEdit = () => {
    if (!editingCard || !editingCard.title.trim()) {
      toast({ title: "Error", description: "Title cannot be empty.", variant: "destructive" });
      return;
    }
    setMindsetCards(prev => prev.map(c => c.id === editingCard.id ? editingCard : c));
    setEditingCard(null);
  };

  const handlePointChange = (cardId: string, pointId: string, newText: string) => {
    setMindsetCards(prev => prev.map(c => {
        if (c.id === cardId) {
            return { ...c, points: c.points.map(p => p.id === pointId ? { ...p, text: newText } : p) };
        }
        return c;
    }));
  };

  const handleAddPoint = (cardId: string) => {
      const newPoint = { id: `point_${Date.now()}`, text: 'New step' };
      setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: [...c.points, newPoint] } : c));
  };
  
  const handleDeletePoint = (cardId: string, pointId: string) => {
      setMindsetCards(prev => prev.map(c => c.id === cardId ? { ...c, points: c.points.filter(p => p.id !== pointId) } : c));
  };


  return (
    <div className="container mx-auto p-4 sm:p-6 lg:p-8">
      <div className="text-center mb-8">
        <h1 className="text-4xl font-bold tracking-tight text-primary">Mind Programming</h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Define and practice the mindsets required for success.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        <div className="md:col-span-1 space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <BrainCircuit /> Mindset Card Library
                    </CardTitle>
                    <CardDescription>Create your core mindset cards here.</CardDescription>
                </CardHeader>
                <CardContent>
                     <form onSubmit={handleAddCard} className="space-y-3">
                        <Input 
                            type="text" 
                            placeholder="New mindset card title..." 
                            value={newCardTitle} 
                            onChange={(e) => setNewCardTitle(e.target.value)} 
                        />
                        <Button type="submit" size="sm" className="w-full">
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Card
                        </Button>
                      </form>
                </CardContent>
            </Card>
        </div>

        <div className="md:col-span-2">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                 {mindsetCards.map(card => (
                    <Card key={card.id}>
                        <CardHeader>
                            {editingCard?.id === card.id ? (
                                <Input value={editingCard.title} onChange={e => setEditingCard({...editingCard, title: e.target.value})} />
                            ) : (
                                <CardTitle className="text-lg">{card.title}</CardTitle>
                            )}
                        </CardHeader>
                        <CardContent>
                           <ul className="space-y-2">
                                {card.points.map(point => (
                                    <li key={point.id} className="flex items-center gap-2">
                                        <Input 
                                            value={point.text}
                                            onChange={(e) => handlePointChange(card.id, point.id, e.target.value)}
                                            className="text-sm"
                                        />
                                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDeletePoint(card.id, point.id)}>
                                            <Trash2 className="h-4 w-4 text-destructive"/>
                                        </Button>
                                    </li>
                                ))}
                           </ul>
                           <Button variant="outline" size="sm" className="mt-2" onClick={() => handleAddPoint(card.id)}>
                               <PlusCircle className="h-4 w-4 mr-2"/> Add Step
                           </Button>
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2">
                            {editingCard?.id === card.id ? (
                                <>
                                    <Button size="sm" variant="ghost" onClick={() => setEditingCard(null)}>Cancel</Button>
                                    <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                                </>
                            ) : (
                                <>
                                  <Button size="sm" variant="ghost" onClick={() => handleDeleteCard(card.id)}>Delete</Button>
                                  <Button size="sm" onClick={() => handleStartEdit(card)}>Edit</Button>
                                </>
                            )}
                        </CardFooter>
                    </Card>
                 ))}
             </div>
        </div>
      </div>
    </div>
  );
}

export default function MindProgrammingPage() {
    return <AuthGuard><MindProgrammingPageContent /></AuthGuard>
}
