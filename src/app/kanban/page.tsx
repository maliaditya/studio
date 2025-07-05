
"use client";

import React from 'react';
import { AuthGuard } from '@/components/AuthGuard';
import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Briefcase, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KanbanPageContentProps {
  isModal?: boolean;
}

// Static data for the design mockup as requested
const staticTasks = {
  pending: [],
  scheduled: [
    { id: '1', name: 'CUDA Optimization Research', category: 'CUDA', color: 'blue' },
    { id: '2', name: 'GPU Memory Management', category: 'GPU', color: 'green' },
    { id: '3', name: 'OpenGL Render Pipeline', category: 'OpenGL', color: 'amber' },
    { id: '4', name: 'Integrate CUDA with OpenGL', category: 'OpenGL+CUDA', color: 'blue' },
  ],
  logged: [],
  completed: [],
};

// Color mapping for tags to achieve the "subtle color accents"
const tagColors: { [key: string]: string } = {
  blue: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300',
  green: 'bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300',
};

const KanbanColumn = ({ title, tasks, isModal }: { title: string, tasks: any[], isModal?: boolean }) => (
    <div className={cn("flex flex-col flex-shrink-0 bg-muted/50 rounded-xl", isModal ? "w-64" : "w-80")}>
        <h2 className="font-semibold px-3 pt-3 text-foreground">{title} <Badge variant="secondary" className="ml-1">{tasks.length}</Badge></h2>
        <ScrollArea className="h-full mt-2">
            <div className="p-3 space-y-3">
                {tasks.length > 0 ? tasks.map(task => (
                <Card key={task.id} className="p-3 rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-muted rounded-md mt-0.5">
                        <Briefcase className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-grow min-w-0">
                        <p className="font-medium text-sm leading-tight text-foreground">{task.name}</p>
                        <Badge className={cn("mt-1.5 text-xs", tagColors[task.color])}>{task.category}</Badge>
                    </div>
                    </div>
                    <div className="mt-3 pt-2 border-t flex items-center justify-end text-xs text-orange-500 font-semibold">
                    <Calendar className="h-3 w-3 mr-1"/>
                    Today
                    </div>
                </Card>
                )) : (
                <div className="flex items-center justify-center border-2 border-dashed rounded-md h-24">
                    <p className="text-sm text-muted-foreground">No tasks</p>
                </div>
                )}
            </div>
        </ScrollArea>
    </div>
);

export function KanbanPageContent({ isModal = false }: KanbanPageContentProps) {
    // We are no longer using the useAuth hook here as we are building a static design mockup
    return (
        <div className={cn(
            "flex flex-col",
            isModal ? "p-4 bg-background h-full" : "container mx-auto p-4 sm:p-6 lg:p-8 h-[calc(100vh-4rem)]"
        )}>
            {!isModal && (
              <div className="flex justify-between items-center mb-4 flex-shrink-0">
                <h1 className="text-2xl font-bold">Task Board</h1>
                <p className="text-muted-foreground">A Kanban-style view of all your tasks.</p>
              </div>
            )}
            <div className="flex-grow flex gap-4 overflow-x-auto pb-4">
                <KanbanColumn title="Pending from Past" tasks={staticTasks.pending} isModal={isModal} />
                <KanbanColumn title="Scheduled for Today" tasks={staticTasks.scheduled} isModal={isModal} />
                <KanbanColumn title="Logged Today" tasks={staticTasks.logged} isModal={isModal} />
                <KanbanColumn title="Completed" tasks={staticTasks.completed} isModal={isModal} />
            </div>
        </div>
    );
}

export default function KanbanPage() {
    // The AuthGuard remains to ensure the page is only accessible when logged in.
    return (
        <AuthGuard>
            <KanbanPageContent />
        </AuthGuard>
    );
}
