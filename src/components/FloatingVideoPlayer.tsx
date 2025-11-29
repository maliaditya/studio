
"use client";

import React, { useState, useEffect, useRef } from 'react';
import ReactPlayer from 'react-player/youtube';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { X, GripVertical, ExternalLink } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const getYouTubeEmbedUrl = (url: string | null): string | null => {
    if (!url) return null;
    try {
        const urlObj = new URL(url);
        let videoId: string | null = null;

        if (urlObj.hostname.includes('youtube.com')) {
            if (urlObj.pathname.startsWith('/shorts/')) {
                videoId = urlObj.pathname.split('/shorts/')[1];
            } else {
                videoId = urlObj.searchParams.get('v');
            }
        } else if (urlObj.hostname.includes('youtu.be')) {
            videoId = urlObj.pathname.slice(1);
        }

        if (videoId) {
            return `https://www.youtube.com/embed/${videoId}`;
        }
    } catch (e) {
        // Silently fail for invalid URLs
    }
    return null;
};


export function FloatingVideoPlayer() {
  const { 
    floatingVideoUrl, 
    setFloatingVideoUrl, 
    floatingVideoPlaylist, 
    setFloatingVideoPlaylist,
    pipState,
    setPipState,
  } = useAuth();
  
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  
  const [dragStartOffset, setDragStartOffset] = useState({ x: 0, y: 0 });
  const [resizeStart, setResizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 });

  const isYoutubeUrl = (url: string | null): boolean => {
    if (!url) return false;
    return getYouTubeEmbedUrl(url) !== null;
  };
  
  const currentUrl = floatingVideoPlaylist.length > 0 ? floatingVideoPlaylist[0] : floatingVideoUrl;

  useEffect(() => {
    if (currentUrl && !pipState.isOpen) {
      const isVideo = isYoutubeUrl(currentUrl);
      const initialWidth = Math.min(window.innerWidth - 40, isVideo ? 448 : 600);
      const initialHeight = initialWidth * (isVideo ? 9/16 : 4/3);
      
      const initialX = window.innerWidth - initialWidth - 20;
      const initialY = window.innerHeight - initialHeight - 80;
      
      setPipState({
        isOpen: true,
        size: { width: initialWidth, height: initialHeight },
        position: { x: initialX, y: initialY },
      });
    } else if (currentUrl) {
      setPipState(prev => ({...prev, isOpen: true}));
    }
  }, [currentUrl, pipState.isOpen, setPipState]);

  const handleDragMouseDown = (e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('button, a')) return;
    setIsDragging(true);
    setDragStartOffset({
      x: e.clientX - pipState.position.x,
      y: e.clientY - pipState.position.y,
    });
  };
  
  const handleResizeMouseDown = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(true);
    setResizeStart({
        x: e.clientX,
        y: e.clientY,
        width: pipState.size.width,
        height: pipState.size.height,
    });
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (isDragging) {
        setPipState(prev => ({
            ...prev,
            position: {
                x: e.clientX - dragStartOffset.x,
                y: e.clientY - dragStartOffset.y,
            }
        }));
    }
    if (isResizing) {
      const dx = e.clientX - resizeStart.x;
      
      const newWidth = Math.max(320, resizeStart.width + dx);
      const newHeight = isYoutubeUrl(currentUrl) 
        ? newWidth * (9 / 16) 
        : Math.max(200, resizeStart.height);
      
      setPipState(prev => ({
          ...prev,
          size: {
            width: newWidth,
            height: newHeight,
          }
      }));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    setIsResizing(false);
  };
  
  const handleVideoEnded = () => {
    if (floatingVideoPlaylist.length > 1) {
      setFloatingVideoPlaylist(prev => prev.slice(1));
    } else {
      setFloatingVideoUrl(null);
      setFloatingVideoPlaylist([]);
      setPipState(prev => ({...prev, isOpen: false}));
    }
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
  }, [isDragging, isResizing, dragStartOffset, resizeStart, currentUrl, setPipState]);

  const renderContent = () => {
    if (!currentUrl) return null;

    if (isYoutubeUrl(currentUrl)) {
      return (
        <ReactPlayer
          url={getYouTubeEmbedUrl(currentUrl)!}
          width="100%"
          height="100%"
          playing={true}
          controls={true}
          onEnded={handleVideoEnded}
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

    return (
        <iframe
            src={currentUrl}
            className="w-full h-full border-0 bg-background"
            title="Floating Content"
            sandbox="allow-scripts allow-same-origin allow-forms"
            allow="autoplay; encrypted-media; fullscreen"
        ></iframe>
    );
  };

  return (
    <AnimatePresence>
      {pipState.isOpen && currentUrl && (
        <motion.div
          className="fixed z-[99]"
          style={{
            left: `${pipState.position.x}px`,
            top: `${pipState.position.y}px`,
            width: `${pipState.size.width}px`,
            height: `${pipState.size.height}px`,
            userSelect: isDragging || isResizing ? 'none' : 'auto',
          }}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
        >
          <Card className={cn(
              "shadow-2xl overflow-hidden rounded-xl w-full h-full relative",
              isYoutubeUrl(currentUrl) ? "bg-black/80" : "bg-card border"
            )}>
            <div
              className={cn(
                  "absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent p-1.5 flex items-start justify-between z-10",
                   !isYoutubeUrl(currentUrl) && "cursor-grab active:cursor-grabbing"
                )}
              onMouseDown={handleDragMouseDown}
            >
              <GripVertical className="h-5 w-5 text-white/50" />
              <div className="flex items-center gap-1">
                 <Button
                    asChild
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7",
                        isYoutubeUrl(currentUrl) ? "text-white/80 hover:bg-white/20 hover:text-white" : "hover:bg-accent"
                    )}
                >
                    <a href={currentUrl} target="_blank" rel="noopener noreferrer" title="Open in new tab">
                        <ExternalLink className="h-4 w-4" />
                        <span className="sr-only">Open in new tab</span>
                    </a>
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                        "h-7 w-7",
                        isYoutubeUrl(currentUrl) ? "text-white/80 hover:bg-white/20 hover:text-white" : "hover:bg-accent"
                    )}
                    onClick={() => { setFloatingVideoUrl(null); setFloatingVideoPlaylist([]); setPipState(prev => ({...prev, isOpen: false})); }}
                >
                    <X className="h-4 w-4" />
                    <span className="sr-only">Close Player</span>
                </Button>
              </div>
            </div>
            <CardContent className={cn("p-0 w-full h-full", isYoutubeUrl(currentUrl) ? "bg-black" : "bg-background")}>
              {renderContent()}
            </CardContent>
             <div
                onMouseDown={handleResizeMouseDown}
                className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize z-10"
                style={{
                    borderBottom: `8px solid hsl(var(${isYoutubeUrl(currentUrl) ? "--border" : "--accent"}) / 0.5)`,
                    borderLeft: '8px solid transparent',
                }}
            />
          </Card>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
