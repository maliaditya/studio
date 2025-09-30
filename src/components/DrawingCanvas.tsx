
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Brush, Eraser, Trash2, Save, Undo, Redo, Palette, Circle, RectangleHorizontal, Type as TypeIcon, GripVertical, X } from 'lucide-react';
import { Slider } from './ui/slider';
import { useDraggable } from '@dnd-kit/core';
import { Card, CardHeader, CardTitle, CardContent } from './ui/card';

interface DrawingCanvasProps {
  isOpen: boolean;
  initialDrawing?: string;
  position: { x: number; y: number };
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'text';

const ToolsContextMenu = ({ x, y, onSelectTool, onClose }: { x: number, y: number, onSelectTool: (tool: Tool) => void, onClose: () => void }) => {
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                onClose();
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [onClose]);

    return (
        <div
            ref={menuRef}
            className="fixed z-[120] bg-popover border rounded-md shadow-lg p-1 flex flex-col gap-1"
            style={{ top: y, left: x }}
        >
            <Button variant='ghost' size='sm' className="justify-start" onClick={() => onSelectTool('brush')}><Brush className="mr-2 h-4 w-4"/> Brush</Button>
            <Button variant='ghost' size='sm' className="justify-start" onClick={() => onSelectTool('eraser')}><Eraser className="mr-2 h-4 w-4"/> Eraser</Button>
            <Button variant='ghost' size='sm' className="justify-start" onClick={() => onSelectTool('rectangle')}><RectangleHorizontal className="mr-2 h-4 w-4"/> Rectangle</Button>
            <Button variant='ghost' size='sm' className="justify-start" onClick={() => onSelectTool('circle')}><Circle className="mr-2 h-4 w-4"/> Circle</Button>
            <Button variant='ghost' size='sm' className="justify-start" onClick={() => onSelectTool('text')}><TypeIcon className="mr-2 h-4 w-4"/> Text</Button>
        </div>
    );
};

export function DrawingCanvas({ isOpen, initialDrawing, position, onSave, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  
  const [isDrawing, setIsDrawing] = useState(false);
  const [isTextInput, setIsTextInput] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<Tool>('brush');
  
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [textInput, setTextInput] = useState({ x: 0, y: 0, value: '' });

  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: 'drawing-canvas-popup',
  });
  
  const style: React.CSSProperties = {
    position: 'fixed',
    top: position.y,
    left: position.x,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    willChange: 'transform',
    zIndex: 110,
  };


  const getContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

  const saveToHistory = useCallback(() => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [getContext, history, historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !isOpen) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Clear and set background
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (initialDrawing) {
        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
            saveToHistory();
        };
        img.src = initialDrawing;
    } else {
        saveToHistory();
    }
  }, [isOpen, initialDrawing]); // `saveToHistory` removed to prevent loop

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const ctx = getContext();
      if (ctx && history[newIndex]) {
         ctx.putImageData(history[newIndex], 0, 0);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const ctx = getContext();
      if (ctx && history[newIndex]) {
        ctx.putImageData(history[newIndex], 0, 0);
      }
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { x, y } = getCanvasCoordinates(e);
    
    if (isTextInput && textInputRef.current) {
        if (textInputRef.current.value) {
            drawText(textInputRef.current.value, textInput.x, textInput.y);
        }
        setIsTextInput(false);
    }

    if (tool === 'text') {
      setIsTextInput(true);
      setTextInput({ x: x, y: y, value: '' });
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x, y });
    const ctx = getContext();
    if (!ctx) return;
    
    if (tool === 'brush' || tool === 'eraser') {
      saveToHistory();
    }
    
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const drawInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const ctx = getContext();
    if (!ctx) return;
    const { x, y } = getCanvasCoordinates(e);

    if (tool === 'rectangle' || tool === 'circle') {
      const lastState = history[historyIndex];
      if (lastState) {
        ctx.putImageData(lastState, 0, 0);
      }
    }

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';
    ctx.strokeStyle = tool === 'brush' ? color : '#000000'; // eraser uses destination-out
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(x, y);
      ctx.stroke();
    } else if (tool === 'rectangle') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.strokeRect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
    } else if (tool === 'circle') {
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      const radius = Math.sqrt(Math.pow(x - startPoint.x, 2) + Math.pow(y - startPoint.y, 2));
      ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
      ctx.stroke();
    }
  };
  
  const stopInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const ctx = getContext();
    if (!ctx || !startPoint) return;

    if (tool === 'rectangle' || tool === 'circle') {
      drawInteraction(e);
    } else {
        ctx.closePath();
    }
    
    saveToHistory();
    setStartPoint(null);
  };

  const drawText = (text: string, x: number, y: number) => {
    const ctx = getContext();
    if (!ctx || !text) return;
    ctx.font = `${lineWidth * 4}px sans-serif`;
    ctx.fillStyle = color;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(text, x, y);
    saveToHistory();
  };

  const handleTextInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    if (isTextInput) {
      if (e.target.value) {
          drawText(e.target.value, textInput.x, textInput.y);
      }
      setIsTextInput(false);
    }
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.currentTarget.value) {
        drawText(e.currentTarget.value, textInput.x, textInput.y);
      }
      setIsTextInput(false);
    } else if (e.key === 'Escape') {
        e.preventDefault();
      setIsTextInput(false);
    }
  };

  useEffect(() => {
    if (isTextInput && textInputRef.current) {
      textInputRef.current.style.left = `${textInput.x}px`;
      textInputRef.current.style.top = `${textInput.y}px`;
      textInputRef.current.style.fontSize = `${lineWidth * 4}px`;
      textInputRef.current.style.display = 'block';
      textInputRef.current.value = textInput.value;
      requestAnimationFrame(() => {
        textInputRef.current?.focus();
      });
    } else if (textInputRef.current) {
      textInputRef.current.style.display = 'none';
    }
  }, [isTextInput, textInput, lineWidth]);


  const handleSave = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  const clearCanvas = () => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      ctx.fillStyle = '#111827';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      saveToHistory();
    }
  };

  const handleContextMenu = (e: React.MouseEvent<HTMLCanvasElement>) => {
      e.preventDefault();
      setContextMenu({ x: e.clientX, y: e.clientY });
  };
  
  if (!isOpen) return null;

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
        <Card className="w-[1232px] bg-gray-900 text-white p-4 flex flex-col shadow-2xl border-2 border-primary/50">
            <CardHeader 
                className="p-2 cursor-grab active:cursor-grabbing flex flex-row items-center justify-between"
                {...listeners}
            >
                <div className="flex items-center gap-2">
                    <GripVertical className="h-5 w-5 text-muted-foreground/50"/>
                    <CardTitle className="text-base">Drawing Canvas</CardTitle>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}><X className="h-4 w-4"/></Button>
            </CardHeader>
            <CardContent className="p-0">
                <div className="relative overflow-hidden w-[1200px] h-[800px] bg-gray-800 border border-gray-700 rounded-md">
                    <canvas
                        ref={canvasRef}
                        width={1200}
                        height={800}
                        className="cursor-crosshair"
                        onMouseDown={startInteraction}
                        onMouseMove={drawInteraction}
                        onMouseUp={stopInteraction}
                        onMouseLeave={stopInteraction}
                        onContextMenu={handleContextMenu}
                    />
                    <input
                        ref={textInputRef}
                        type="text"
                        onBlur={handleTextInputBlur}
                        onKeyDown={handleTextInputKeyDown}
                        style={{
                        position: 'absolute',
                        display: 'none',
                        background: 'rgba(0,0,0,0.5)',
                        border: '1px solid white',
                        color: 'white',
                        width: 'auto',
                        minWidth: '50px',
                        zIndex: 10
                        }}
                        className="p-1"
                    />
                     {contextMenu && (
                        <ToolsContextMenu
                            x={contextMenu.x}
                            y={contextMenu.y}
                            onSelectTool={(newTool) => {
                                setTool(newTool);
                                setContextMenu(null);
                            }}
                            onClose={() => setContextMenu(null)}
                        />
                    )}
                </div>
                <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center gap-2">
                        <Button variant={tool === 'brush' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('brush')}><Brush/></Button>
                        <Button variant={tool === 'eraser' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('eraser')}><Eraser/></Button>
                        <Button variant={tool === 'rectangle' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('rectangle')}><RectangleHorizontal/></Button>
                        <Button variant={tool === 'circle' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('circle')}><Circle/></Button>
                        <Button variant={tool === 'text' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('text')}><TypeIcon/></Button>
                        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 p-0 border-none bg-transparent" />
                        <Slider value={[lineWidth]} onValueChange={(val) => setLineWidth(val[0])} min={1} max={50} step={1} className="w-32" />
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" size="icon" onClick={undo} disabled={historyIndex <= 0}><Undo/></Button>
                        <Button variant="outline" size="icon" onClick={redo} disabled={historyIndex >= history.length - 1}><Redo/></Button>
                        <Button variant="outline" size="icon" onClick={clearCanvas}><Trash2/></Button>
                    </div>
                    <div className="flex items-center gap-2">
                        <Button variant="outline" onClick={onClose}>Cancel</Button>
                        <Button onClick={handleSave}><Save className="mr-2 h-4 w-4" /> Save</Button>
                    </div>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
