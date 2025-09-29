
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
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<Tool>('brush');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [startPoint, setStartPoint] = useState<{ x: number; y: number } | null>(null);
  const [isTextInput, setIsTextInput] = useState(false);
  const [textInput, setTextInput] = useState({ x: 0, y: 0, value: '' });

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
  }, [history, historyIndex, getContext]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = getContext();
      if (ctx) {
        if (initialDrawing) {
          const img = new Image();
          img.onload = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0);
            saveToHistory();
          };
          img.src = initialDrawing;
        } else {
          saveToHistory();
        }
      }
    }
  }, [initialDrawing, getContext, saveToHistory]);

  const undo = () => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const ctx = getContext();
      if (ctx) ctx.putImageData(history[newIndex], 0, 0);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const ctx = getContext();
      if (ctx) ctx.putImageData(history[newIndex], 0, 0);
    }
  };

  const startInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const { offsetX, offsetY } = e.nativeEvent;
    if (tool === 'text') {
      if (textInput.value) { // Finalize previous text if any
        drawText(textInput.value, textInput.x, textInput.y);
      }
      setTextInput({ x: offsetX, y: offsetY, value: '' });
      setIsTextInput(true);
      return;
    }

    setIsDrawing(true);
    setStartPoint({ x: offsetX, y: offsetY });
    if (tool === 'brush' || tool === 'eraser') {
      const ctx = getContext();
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(offsetX, offsetY);
    }
  };

  const drawInteraction = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !startPoint) return;
    const ctx = getContext();
    if (!ctx) return;
    const { offsetX, offsetY } = e.nativeEvent;

    if (tool === 'brush' || tool === 'eraser') {
      ctx.lineTo(offsetX, offsetY);
      ctx.strokeStyle = tool === 'brush' ? color : '#111827';
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
      ctx.stroke();
    } else if (tool === 'rectangle' || tool === 'circle') {
      // Preview logic
      ctx.putImageData(history[historyIndex], 0, 0); // Restore previous state
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
    const ctx = getContext();
    if (!ctx || !startPoint) return;
    setIsDrawing(false);
    const { offsetX, offsetY } = e.nativeEvent;
    
    ctx.globalCompositeOperation = 'source-over';
    
    if (tool === 'rectangle' || tool === 'circle') {
      ctx.putImageData(history[historyIndex], 0, 0); // Clear preview
      ctx.beginPath();
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      if (tool === 'rectangle') {
        ctx.strokeRect(startPoint.x, startPoint.y, offsetX - startPoint.x, offsetY - startPoint.y);
      } else {
        const radius = Math.sqrt(Math.pow(offsetX - startPoint.x, 2) + Math.pow(offsetY - startPoint.y, 2));
        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
        ctx.stroke();
      }
    }
    
    ctx.closePath();
    saveToHistory();
    setStartPoint(null);
  };

  const drawText = (text: string, x: number, y: number) => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.font = `${lineWidth * 4}px sans-serif`;
    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    saveToHistory();
  };

  const handleTextInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      drawText(textInput.value, textInput.x, textInput.y);
      setIsTextInput(false);
      setTextInput({ x: 0, y: 0, value: '' });
    }
  };

  const handleSave = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };

  const clearCanvas = () => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
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
        {isTextInput && (
          <input
            type="text"
            value={textInput.value}
            onChange={(e) => setTextInput(prev => ({...prev, value: e.target.value}))}
            onKeyDown={handleTextInputKeyDown}
            onBlur={() => {
              if (textInput.value) drawText(textInput.value, textInput.x, textInput.y);
              setIsTextInput(false);
            }}
            autoFocus
            style={{
              position: 'absolute',
              left: textInput.x,
              top: textInput.y,
              background: 'rgba(0,0,0,0.5)',
              border: '1px solid white',
              color: 'white',
              fontSize: `${lineWidth * 4}px`,
            }}
            className="p-1"
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
    </div>
  );
}
