
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, Download, Upload } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from '@/hooks/use-toast';

export function UserProfile() {
  const { currentUser, signOut: localSignOut, loading, exportData } = useAuth();
  const { toast } = useToast();

  const handleExport = () => {
    if (!currentUser?.username) return;
    exportData();
  };

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!currentUser?.username) return;

    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result;
        if (typeof text !== 'string') {
          throw new Error("File could not be read.");
        }
        const data = JSON.parse(text);

        if (!data.exerciseDefinitions || !data.allWorkoutLogs || !data.workoutMode || !data.workoutPlans) {
          throw new Error("Invalid backup file format.");
        }
        
        const username = currentUser.username;

        localStorage.setItem(`exerciseDefinitions_${username}`, JSON.stringify(data.exerciseDefinitions));
        localStorage.setItem(`allWorkoutLogs_${username}`, JSON.stringify(data.allWorkoutLogs));
        localStorage.setItem(`workoutMode_${username}`, data.workoutMode);
        localStorage.setItem(`workoutPlans_${username}`, JSON.stringify(data.workoutPlans));

        toast({
          title: "Import Successful",
          description: "Your data has been restored. The app will now reload.",
        });

        setTimeout(() => {
            window.location.reload();
        }, 1500);

      } catch (error) {
        console.error("Import failed:", error);
        toast({
          title: "Import Failed",
          description: error instanceof Error ? error.message : "An unknown error occurred.",
          variant: "destructive",
        });
      }
    };
    reader.readAsText(file);
    event.target.value = '';
  };
  
  const triggerImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => handleImport(e as unknown as React.ChangeEvent<HTMLInputElement>);
    input.click();
  };

  if (loading) {
    return <div className="h-8 w-20 animate-pulse bg-muted rounded-md"></div>;
  }

  if (!currentUser) {
    return null; 
  }

  const getInitials = (name: string | null | undefined) => {
    if (!name) return <UserIcon className="h-5 w-5"/>;
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {getInitials(currentUser.username)}
            </AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">Logged in as</p>
            <p className="text-xs leading-none text-muted-foreground">
              {currentUser.username}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleExport} className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          <span>Export Data</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={triggerImport} className="cursor-pointer">
          <Upload className="mr-2 h-4 w-4" />
          <span>Import Data</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={localSignOut} className="cursor-pointer">
          <LogOut className="mr-2 h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
