"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Play, Pause, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';

export function BackgroundAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.2); // Start at 20% volume

  // Effect to sync audio element's playing state with component state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.play().catch(error => {
        console.log("Autoplay was prevented. User interaction needed.");
        // If play fails (e.g. before user interaction), revert state.
        // The user can then click the play button to start.
        setIsPlaying(false);
      });
    } else {
      audio.pause();
    }
  }, [isPlaying]);

  // Effect to sync audio element's volume with component state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);
  
  // Effect for initial setup and handling first play interaction
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    
    // This allows the user to start playback with the play button
    // even if autoplay is blocked initially.
    const handleFirstPlay = () => {
      if (!isPlaying) {
        setIsPlaying(true);
      }
    };

    document.addEventListener('click', handleFirstPlay, { once: true });
    
    return () => {
        document.removeEventListener('click', handleFirstPlay);
        if (audio) {
            audio.pause();
            audio.src = '';
        }
    };
  }, [isPlaying]);

  const togglePlayPause = () => {
    setIsPlaying(prev => !prev);
  };

  const handleVolumeChange = (newVolume: number[]) => {
    setVolume(newVolume[0]);
  };
  
  const getVolumeIcon = () => {
    if (volume === 0) return <VolumeX className="h-5 w-5" />;
    if (volume < 0.5) return <Volume1 className="h-5 w-5" />;
    return <Volume2 className="h-5 w-5" />;
  };

  return (
    <>
      <audio ref={audioRef} src="/40 Hz Study Music.mp3" loop />
      <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur-sm">
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    {getVolumeIcon()}
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="center" className="w-auto p-2">
                <Slider
                    defaultValue={[volume]}
                    max={1}
                    step={0.05}
                    onValueChange={handleVolumeChange}
                    className="w-32"
                />
            </PopoverContent>
        </Popover>
      </div>
    </>
  );
}
