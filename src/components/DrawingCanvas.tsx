
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
  onSave: (drawingData: string) => void;
  onClose: () => void;
}

const ExcalidrawWrapper = ({ initialDrawing, onSave, theme, apiRef }: {
    initialDrawing?: string;
    onSave: (drawingData: string) => void;
    theme: string;
    apiRef: React.MutableRefObject<ExcalidrawAPIRefValue | null>;
}) => {
    const [initialData, setInitialData] = useState<{
        elements: readonly NonDeleted<ExcalidrawElement>[];
    } | null>(null);

    useEffect(() => {
        if (initialDrawing) {
            try {
                const parsedData = JSON.parse(initialDrawing);
                setInitialData({ elements: parsedData.elements || [] });
            } catch (e) {
                console.error("Failed to parse initial drawing data:", e);
                setInitialData({ elements: [] });
            }
        } else {
            setInitialData({ elements: [] });
        }
    }, [initialDrawing]);


    if (initialData === null) {
        return <div className="flex h-full w-full items-center justify-center">Preparing Canvas...</div>;
    }

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => apiRef.current = api}
                initialData={initialData}
                theme={theme}
            />
        </div>
    );
}

export function DrawingCanvas({ isOpen, initialDrawing, position, onSave, onClose }: DrawingCanvasProps) {
  const [theme, setTheme] = useState('dark');
  const [isMounted, setIsMounted] = useState(false);
  const excalidrawAPIRef = useRef<ExcalidrawAPIRefValue | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'drawing-canvas-popup',
  });
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: '50%',
    width: '95vw',
    height: '95vh',
    transform: transform ? `translate(calc(-50% + ${transform.x}px), calc(-50% + ${transform.y}px))` : 'translate(-50%, -50%)',
    willChange: 'transform',
    zIndex: 110,
  };

  useEffect(() => {
    setIsMounted(true);
    const handleThemeChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);

  const handleSaveClick = () => {
    if (excalidrawAPIRef.current) {
      const elements = excalidrawAPIRef.current.getSceneElements();
      const appState = excalidrawAPIRef.current.getAppState();
      const drawingData = JSON.stringify({
        type: "excalidraw",
        version: 2,
        source: "dock-app",
        elements: elements,
        appState: {
          viewBackgroundColor: appState.viewBackgroundColor,
          gridSize: appState.gridSize,
        }
      });
      onSave(drawingData);
      onClose();
    }
  };
  
  if (!isOpen) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
        <Card className="w-full h-full bg-background text-foreground p-0 flex flex-col shadow-2xl border-2 border-primary/50">
            <CardHeader 
                className="p-2 flex flex-row items-center justify-between border-b"
            >
                <div 
                  className="flex items-center gap-2 cursor-grab active:cursor-grabbing flex-grow"
                  {...listeners}
                >
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                    <CardTitle className="text-base">Drawing Canvas</CardTitle>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={handleSaveClick}><Save className="h-4 w-4"/></Button>
                  <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
                </div>
            </CardHeader>
            <CardContent className="p-0 flex-grow relative">
               {isMounted ? (
                 <ExcalidrawWrapper 
                    initialDrawing={initialDrawing} 
                    onSave={onSave}
                    theme={theme}
                    apiRef={excalidrawAPIRef}
                 />
               ) : (
                <div className="flex h-full w-full items-center justify-center">Loading Canvas...</div>
               )}
            </CardContent>
        </Card>
    </div>
  );
}
