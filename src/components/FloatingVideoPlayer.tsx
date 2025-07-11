
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, GripVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export function FloatingVideoPlayer() {
  const { floatingVideoUrl, setFloatingVideoUrl } = useAuth();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 448, height: 252 }); // Default size md: 28rem -> 448px, aspect-video
  
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });


  useEffect(() => {
    // Reset position when a new video is loaded or the player is closed
    if (floatingVideoUrl) {
      const initialWidth = Math.min(window.innerWidth - 40, 448);
      const initialHeight = initialWidth * (9 / 16);
      const initialX = window.innerWidth - initialWidth - 20;
      const initialY = window.innerHeight - initialHeight - 20;
      
      setSize({ width: initialWidth, height: initialHeight });
      setPosition({ x: initialX, y: initialY });
    }
  }, [floatingVideoUrl]);


  // Dragging Logic
  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };
  
  // Resizing Logic
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent drag from starting
    setIsResizing(true);
    setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: size.width,
        height: size.height,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartOffset.x,
        y: e.clientY - dragStartOffset.y,
      });
    }
    if (isResizing) {
      const dx = e.clientX - resizeStart.x;
      const dy = e.clientY - resizeStart.y;
      
      const newWidth = Math.max(320, resizeStart.width + dx); // min width 320px
      const newHeight = newWidth * (9 / 16); // Maintain aspect ratio
      
      setSize({
        width: newWidth,
        height: newHeight,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };

  useEffect(() => {
    if (isDragging || isResizing) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    } else {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, isResizing, dragStartOffset, resizeStart]);

  return (
    <AnimatePresence>
      {floatingVideoUrl && (
        <motion.div
          className="fixed z-[99]"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            width: `${size.width}px`,
            height: `${size.height}px`,
            userSelect: isDragging || isResizing ? 'none' : 'auto',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card className="shadow-2xl overflow-hidden bg-black/80 rounded-xl w-full h-full relative">
            <div
              className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent p-1.5 flex items-start justify-between cursor-grab active:cursor-grabbing"
              onMouseDown={handleDragMouseDown}
            >
              <GripVertical className="h-5 w-5 text-white/50" />
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 text-white/80 hover:bg-white/20 hover:text-white"
                onClick={() => setFloatingVideoUrl(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close Player</span>
              </Button>
            </div>
            <CardContent className="p-0 bg-black w-full h-full">
              <ReactPlayer
                url={floatingVideoUrl}
                width="100%"
                height="100%"
                playing={true}
                controls={true}
                config={{
                  youtube: {
                    playerVars: {
                      autoplay: 1,
                      showinfo: 0,
                      modestbranding: 1,
                    },
                  },
                }}
              />
            </CardContent>
            <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                style={{
                    borderBottom: '8px solid hsl(var(--border) / 0.5)',
                    borderLeft: '8px solid transparent',
                }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
