
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
  const [position, setPosition] = useState({ x: 20, y: 80 });
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Reset position when a new video is loaded or the player is closed
    if (floatingVideoUrl) {
      const initialX = window.innerWidth - Math.min(window.innerWidth - 20, 420);
      const initialY = window.innerHeight - Math.min(window.innerHeight - 20, 300);
      setPosition({ x: initialX, y: initialY });
    }
  }, [floatingVideoUrl]);


  const handleMouseDown = (e: React.MouseEvent) => {
    // Prevent dragging from buttons
    if ((e.target as HTMLElement).closest('button')) return;

    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStartOffset.x,
        y: e.clientY - dragStartOffset.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
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
  }, [isDragging, dragStartOffset]);

  return (
    <AnimatePresence>
      {floatingVideoUrl && (
        <motion.div
          className="fixed z-[99] w-full max-w-md"
          style={{
            left: `${position.x}px`,
            top: `${position.y}px`,
            userSelect: isDragging ? 'none' : 'auto',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card className="shadow-2xl overflow-hidden bg-black">
            <div
              className="flex items-center p-1.5 bg-background/80 backdrop-blur-sm cursor-grab active:cursor-grabbing"
              onMouseDown={handleMouseDown}
            >
              <GripVertical className="h-5 w-5 text-muted-foreground" />
              <div className="flex-grow"></div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setFloatingVideoUrl(null)}
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close Player</span>
              </Button>
            </div>
            <CardContent className="p-0 aspect-video">
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
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
