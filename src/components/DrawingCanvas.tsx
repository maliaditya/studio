
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { Button } from './ui/button';
import { Save, X, GripVertical, Eraser, Download, Upload } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';
import type { ExcalidrawElement, NonDeleted, AppState } from "@excalidraw/excalidraw/types/types";
import type { ExcalidrawAPIRefValue } from '@excalidraw/excalidraw';

// Dynamically import Excalidraw to avoid SSR issues
const Excalidraw = dynamic(
  async () => (await import("@excalidraw/excalidraw")).Excalidraw,
  {
    ssr: false,
    loading: () => <div className="flex h-full w-full items-center justify-center">Loading Canvas...</div>
  }
);

interface DrawingCanvasProps {
  isOpen: boolean;
  initialDrawing?: string; // This will now be a JSON string of elements
  position: { x: number; y: number };
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export function DrawingCanvas({ isOpen, initialDrawing, position, onSave, onClose }: DrawingCanvasProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPIRefValue | null>(null);
  const [initialData, setInitialData] = useState<readonly NonDeleted<ExcalidrawElement>[] | null>(null);
  const [theme, setTheme] = useState('dark');

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'drawing-canvas-popup',
  });
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    width: 'min(1232px, 90vw)',
    height: 'min(832px, 85vh)',
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: 110,
  };

  useEffect(() => {
    // Detect system theme for Excalidraw
    const handleThemeChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  useEffect(() => {
    if (initialDrawing) {
        try {
            const parsedData = JSON.parse(initialDrawing);
            setInitialData(parsedData.elements || []);
        } catch (e) {
            console.error("Failed to parse initial drawing data:", e);
            setInitialData([]);
        }
    } else {
        setInitialData([]);
    }
  }, [initialDrawing]);

  const handleSave = async () => {
    if (!excalidrawAPI) return;
    const elements = excalidrawAPI.getSceneElements();
    const appState = excalidrawAPI.getAppState();
    
    const { exportToBlob } = await import("@excalidraw/excalidraw");
    
    const blob = await exportToBlob({
        elements,
        appState: {
            ...appState,
            // Ensure background is transparent for saving, but not in view
            viewBackgroundColor: 'transparent', 
        },
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
    });

    const reader = new FileReader();
    reader.onloadend = () => {
        const dataUrl = reader.result as string;
        onSave(dataUrl); // This is now a data URL of the PNG
    };
    reader.readAsDataURL(blob);
  };
  
  if (!isOpen) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
        <Card className="w-full h-full bg-background text-foreground p-0 flex flex-col shadow-2xl border-2 border-primary/50">
            <CardHeader 
                className="p-2 cursor-grab active:cursor-grabbing flex flex-row items-center justify-between border-b"
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                    <CardTitle className="text-base">Drawing Canvas</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                     <Button variant="ghost" size="icon" onClick={handleSave}><Save className="h-4 w-4"/></Button>
                    <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow relative">
               {initialData !== null && (
                 <Excalidraw
                    excalidrawAPI={(api) => setExcalidrawAPI(api)}
                    initialData={{
                      elements: initialData,
                      appState: { viewBackgroundColor: "transparent", currentItemFontFamily: 1 }
                    }}
                    theme={theme}
                    UIOptions={{
                      canvasActions: {
                        loadScene: false, // We'll handle loading via initialData
                        saveToActiveFile: false,
                        saveAsImage: false,
                      }
                    }}
                  />
               )}
            </CardContent>
        </Card>
    </div>
  );
}
