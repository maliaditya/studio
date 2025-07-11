
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, GripVertical } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function FloatingVideoPlayer() {
  const { floatingVideoUrl, setFloatingVideoUrl } = useAuth();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [size, setSize] = useState({ width: 448, height: 252 });
  
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isYoutubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    return /youtube\.com|youtu\.be/.test(url);
  };

  useEffect(() => {
    if (floatingVideoUrl) {
      const isVideo = isYoutubeUrl(floatingVideoUrl);
      const initialWidth = Math.min(window.innerWidth - 40, isVideo ? 448 : 600);
      const initialHeight = initialWidth * (isVideo ? 9/16 : 4/3);
      
      const initialX = window.innerWidth - initialWidth - 20;
      const initialY = window.innerHeight - initialHeight - 80;
      
      setSize({ width: initialWidth, height: initialHeight });
      setPosition({ x: initialX, y: initialY });
    }
  }, [floatingVideoUrl]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;
    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
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
      
      const newWidth = Math.max(320, resizeStart.width + dx);
      // For videos, maintain aspect ratio. For other content, allow free resize.
      const newHeight = isYoutubeUrl(floatingVideoUrl) 
        ? newWidth * (9 / 16) 
        : Math.max(200, resizeStart.height + dy);
      
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
  }, [isDragging, isResizing, dragStartOffset, resizeStart, floatingVideoUrl]);

  const renderContent = () => {
    if (!floatingVideoUrl) return null;

    if (isYoutubeUrl(floatingVideoUrl)) {
      return (
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
      );
    }

    // Fallback for any other URL (like Obsidian notes)
    return (
        <iframe
            src={floatingVideoUrl}
            className="w-full h-full border-0 bg-background"
            title="Floating Content"
            sandbox="allow-scripts allow-same-origin allow-forms"
        ></iframe>
    );
  };

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
          <Card className={cn(
              "shadow-2xl overflow-hidden rounded-xl w-full h-full relative",
              isYoutubeUrl(floatingVideoUrl) ? "bg-black/80" : "bg-card border"
            )}>
            <div
              className={cn(
                  "absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent p-1.5 flex items-start justify-between cursor-grab active:cursor-grabbing",
                  isYoutubeUrl(floatingVideoUrl) ? "text-white/50" : "text-muted-foreground"
                )}
              onMouseDown={handleDragMouseDown}
            >
              <GripVertical className="h-5 w-5" />
              <Button
                variant="ghost"
                size="icon"
                className={cn(
                    "h-7 w-7",
                    isYoutubeUrl(floatingVideoUrl) ? "text-white/80 hover:bg-white/20 hover:text-white" : "hover:bg-accent"
                )}
                onClick={() => setFloatingVideoUrl(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close Player</span>
              </Button>
            </div>
            <CardContent className={cn("p-0 w-full h-full", isYoutubeUrl(floatingVideoUrl) ? "bg-black" : "bg-background pt-8")}>
              {renderContent()}
            </CardContent>
             <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize"
                style={{
                    borderBottom: `8px solid hsl(var(${isYoutubeUrl(floatingVideoUrl) ? "--border" : "--accent"}) / 0.5)`,
                    borderLeft: '8px solid transparent',
                }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
