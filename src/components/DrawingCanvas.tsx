
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Brush, Eraser, Trash2, Save, Undo, Redo, Palette, Circle, RectangleHorizontal, Type as TypeIcon } from 'lucide-react';
import { Slider } from './ui/slider';

interface DrawingCanvasProps {
  initialDrawing?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

type Tool = 'brush' | 'eraser' | 'rectangle' | 'circle' | 'text';

export function DrawingCanvas({ initialDrawing, onSave, onClose }: DrawingCanvasProps) {
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

  const getContext = useCallback(() => canvasRef.current?.getContext('2d'), []);

  const saveToHistory = useCallback(() => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      setHistory(prev => {
        const newHistory = prev.slice(0, historyIndex + 1);
        newHistory.push(imageData);
        return newHistory;
      });
      setHistoryIndex(prev => prev + 1);
    }
  }, [getContext, historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // Set a default background
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
        // Save the initial blank state
        saveToHistory();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDrawing]); 
  
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

  const startInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = e.nativeEvent;
    
    if (isTextInput && textInputRef.current) {
        if (textInputRef.current.value) {
            drawText(textInputRef.current.value, textInput.x, textInput.y);
        }
        setIsTextInput(false);
    }

    if (tool === 'text') {
      setIsTextInput(true);
      setTextInput({ x: offsetX, y: offsetY, value: '' });
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    const ctx = getContext();
    if (!ctx) return;
    
    if (tool === 'brush' || tool === 'eraser') {
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    } else if (tool === 'rectangle' || tool === 'circle') {
        // Save the current canvas state before starting to draw the shape
        if(canvasRef.current){
            const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
            // This is a temporary store, not part of the main history yet.
            (ctx as any).__tempState = imageData;
        }
    }
  };

  const drawInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const ctx = getContext();
    if (!ctx) return;
    const { offsetX, offsetY } = e.nativeEvent;

    ctx.globalCompositeOperation = tool === 'eraser' ? 'destination-out' : 'source-over';

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(offsetX, offsetY);
      ctx.strokeStyle = tool === 'brush' ? color : '#000000';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    } else if (tool === 'rectangle' || tool === 'circle') {
      const tempState = (ctx as any).__tempState;
      if (tempState) {
        ctx.putImageData(tempState, 0, 0);
      }
      
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (tool === 'rectangle') {
        ctx.strokeRect(startPoint.x, startPoint.y, offsetX - startPoint.x, offsetY - startPoint.y);
      } else { // circle
        const radius = Math.sqrt(Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2));
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
  };
  
  const stopInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    setIsDrawing(false);
    
    const ctx = getContext();
    if (!ctx) return;

    if (tool === 'brush' || tool === 'eraser') {
        ctx.closePath();
    }
    
    saveToHistory();
    setStartPoint(null);
    delete (ctx as any).__tempState;
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
      if (e.currentTarget.value) {
        drawText(e.currentTarget.value, textInput.x, textInput.y);
      }
      setIsTextInput(false);
    } else if (e.key === 'Escape') {
      setIsTextInput(false);
    }
  };

  useEffect(() => {
    const inputEl = textInputRef.current;
    if (inputEl) {
        if (isTextInput) {
            inputEl.style.left = `${textInput.x}px`;
            inputEl.style.top = `${textInput.y}px`;
            inputEl.style.fontSize = `${lineWidth * 4}px`;
            inputEl.style.display = 'block';
            inputEl.value = textInput.value;
            requestAnimationFrame(() => {
                inputEl.focus();
            });
        } else {
            inputEl.style.display = 'none';
        }
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

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <div className="relative">
        <canvas
          ref={canvasRef}
          width={800}
          height={600}
          className="border border-gray-700 rounded-md cursor-crosshair"
          onMouseDown={startInteraction}
          onMouseMove={drawInteraction}
          onMouseUp={stopInteraction}
          onMouseLeave={stopInteraction}
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
              zIndex: 10,
            }}
            className="p-1"
        />
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
    </div>
  );
}
