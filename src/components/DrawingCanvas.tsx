
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

const ExcalidrawWrapper = ({ initialDrawing, onSave, theme }: { 
    initialDrawing?: string; 
    onSave: (drawingData: string) => void;
    theme: string;
}) => {
    const [excalidrawAPI, setExcalidrawAPI] = useState<ExcalidrawAPIRefValue | null>(null);
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

    const handleSaveClick = () => {
        if (!excalidrawAPI) return;
        const elements = excalidrawAPI.getSceneElements();
        const appState = excalidrawAPI.getAppState();
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
    };

    if (initialData === null) {
        return <div className="flex h-full w-full items-center justify-center">Preparing Canvas...</div>;
    }

    return (
        <div style={{ height: "100%", width: "100%" }}>
            <Excalidraw
                excalidrawAPI={(api) => setExcalidrawAPI(api)}
                initialData={initialData}
                theme={theme}
                UIOptions={{
                    canvasActions: {
                        toggleTheme: true,
                        clearCanvas: true,
                        export: true,
                        loadScene: true,
                        saveAsImage: true,
                        saveToActiveFile: true,
                    },
                }}
            >
                <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
                     <Button onClick={handleSaveClick} size="sm"><Save className="mr-2 h-4 w-4"/> Save & Close</Button>
                </div>
            </Excalidraw>
        </div>
    );
}

export function DrawingCanvas({ isOpen, initialDrawing, position, onSave, onClose }: DrawingCanvasProps) {
  const [theme, setTheme] = useState('dark');
  const [isMounted, setIsMounted] = useState(false); // New state to track mounting

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
    setIsMounted(true); // Component has mounted on the client
    const handleThemeChange = (e: MediaQueryListEvent) => {
        setTheme(e.matches ? 'dark' : 'light');
    };
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setTheme(mediaQuery.matches ? 'dark' : 'light');
    mediaQuery.addEventListener('change', handleThemeChange);
    return () => mediaQuery.removeEventListener('change', handleThemeChange);
  }, []);
  
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
                <Button variant="ghost" size="icon" onClick={onClose}><X className="h-4 w-4"/></Button>
            </CardHeader>
            <CardContent className="p-0 flex-grow relative">
               {isMounted ? (
                 <ExcalidrawWrapper 
                    initialDrawing={initialDrawing} 
                    onSave={(data) => {
                        onSave(data);
                        onClose();
                    }}
                    theme={theme}
                 />
               ) : (
                <div className="flex h-full w-full items-center justify-center">Loading Canvas...</div>
               )}
            </CardContent>
        </Card>
    </div>
  );
}
