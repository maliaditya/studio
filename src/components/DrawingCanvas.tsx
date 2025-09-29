
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Button } from './ui/button';
import { Brush, Eraser, Trash2, Save, Undo, Redo, Palette, Circle, RectangleHorizontal } from 'lucide-react';
import { Slider } from './ui/slider';

interface DrawingCanvasProps {
  initialDrawing?: string;
  onSave: (dataUrl: string) => void;
  onClose: () => void;
}

export function DrawingCanvas({ initialDrawing, onSave, onClose }: DrawingCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#ffffff');
  const [lineWidth, setLineWidth] = useState(5);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [history, setHistory] = useState<ImageData[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const getContext = () => canvasRef.current?.getContext('2d');

  const saveToHistory = useCallback(() => {
    const ctx = getContext();
    if (ctx && canvasRef.current) {
      const imageData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(imageData);
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  }, [history, historyIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = getContext();
      if (ctx && initialDrawing) {
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
  }, [initialDrawing]);

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const ctx = getContext();
    if (!ctx) return;
    setIsDrawing(true);
    ctx.beginPath();
    ctx.moveTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const ctx = getContext();
    if (!ctx) return;
    ctx.lineTo(e.nativeEvent.offsetX, e.nativeEvent.offsetY);
    ctx.strokeStyle = tool === 'brush' ? color : '#111827'; // Use background color for eraser
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = tool === 'brush' ? 'source-over' : 'destination-out';
    ctx.stroke();
  };

  const stopDrawing = () => {
    const ctx = getContext();
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
    saveToHistory();
    ctx.globalCompositeOperation = 'source-over';
  };
  
  const handleSave = () => {
    const dataUrl = canvasRef.current?.toDataURL('image/png');
    if (dataUrl) {
      onSave(dataUrl);
    }
  };
  
  const clearCanvas = () => {
    const ctx = getContext();
    if(ctx && canvasRef.current) {
        ctx.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
        saveToHistory();
    }
  }

  return (
    <div className="flex flex-col h-full bg-gray-900 text-white p-4">
      <canvas
        ref={canvasRef}
        width={800}
        height={600}
        className="border border-gray-700 rounded-md cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
      />
      <div className="flex items-center justify-between mt-4">
        <div className="flex items-center gap-2">
            <Button variant={tool === 'brush' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('brush')}><Brush/></Button>
            <Button variant={tool === 'eraser' ? 'secondary' : 'outline'} size="icon" onClick={() => setTool('eraser')}><Eraser/></Button>
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
