
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { LogOut, User as UserIcon, UploadCloud, DownloadCloud, Upload, Download, Settings } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface UserProfileProps {
  onSettingsClick: () => void;
}

export function UserProfile({ onSettingsClick }: UserProfileProps) {
  const { currentUser, signOut: localSignOut, loading, pushDataToCloud, pullDataFromCloud, exportData, importData } = useAuth();

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
        <DropdownMenuItem onClick={onSettingsClick} className="cursor-pointer">
          <Settings className="mr-2 h-4 w-4" />
          <span>Settings</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={pushDataToCloud} className="cursor-pointer">
          <UploadCloud className="mr-2 h-4 w-4" />
          <span>Push to Cloud</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={pullDataFromCloud} className="cursor-pointer">
          <DownloadCloud className="mr-2 h-4 w-4" />
          <span>Pull from Cloud</span>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={exportData} className="cursor-pointer">
          <Download className="mr-2 h-4 w-4" />
          <span>Export Data</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={importData} className="cursor-pointer">
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
