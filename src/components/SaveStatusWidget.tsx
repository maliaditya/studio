
"use client";

import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from './ui/button';
import { UploadCloud, CheckCircle2 } from 'lucide-react';
import { Badge } from './ui/badge';

export function SaveStatusWidget() {
  const { localChangeCount, pushDataToCloud } = useAuth();
  const showPrompt = localChangeCount > 50;

  if (showPrompt) {
    return (
      <Button onClick={pushDataToCloud} size="sm">
        <UploadCloud className="mr-2 h-4 w-4" />
        Push {localChangeCount} Changes
      </Button>
    );
  }

  if (localChangeCount > 0) {
    return (
      <Badge variant="outline" className="flex items-center gap-2">
        <div className="h-2 w-2 rounded-full bg-yellow-400 animate-pulse" />
        {localChangeCount} unsaved changes
      </Badge>
    );
  }

  return (
    <Badge variant="secondary" className="flex items-center gap-2">
      <CheckCircle2 className="h-4 w-4 text-green-500" />
      All changes saved
    </Badge>
  );
}
