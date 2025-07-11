
"use client";

import { useEffect, useRef, useState } from 'react';
import { Button } from './ui/button';
import { Play, Pause, Volume1, Volume2, VolumeX } from 'lucide-react';
import { Slider } from './ui/slider';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { useAuth } from '@/contexts/AuthContext';

export function BackgroundAudioPlayer() {
  const { isAudioPlaying, setIsAudioPlaying } = useAuth();
  const audioRef = useRef<HTMLAudioElement>(null);
  const [volume, setVolume] = useState(0.05); // Start at 5% volume

  // Effect to sync audio element's playing state with component state
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isAudioPlaying) {
      // Attempt to play the audio. This returns a promise.
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise.catch(error => {
          // Autoplay was prevented. This is expected on first load in most browsers.
          // We'll set isPlaying to false so the UI reflects the actual state.
          // The user can then click the play button to start it manually.
          console.log("Audio playback failed. User interaction is required.", error);
          setIsAudioPlaying(false);
        });
      }
    } else {
      audio.pause();
    }
  }, [isAudioPlaying, setIsAudioPlaying]);

  // Effect to sync audio element's volume with component state
  useEffect(() => {
    const audio = audioRef.current;
    if (audio) {
      audio.volume = volume;
    }
  }, [volume]);
  
  // Effect for component cleanup
  useEffect(() => {
    const audio = audioRef.current;
    // The return function of useEffect serves as a cleanup function.
    return () => {
        if (audio) {
            // Pause and clean up the audio source when the component unmounts
            // to prevent memory leaks.
            audio.pause();
            audio.src = '';
        }
    };
  }, []);

  const togglePlayPause = () => {
    setIsAudioPlaying(prev => !prev);
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
      <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border bg-background/80 p-2 shadow-lg backdrop-blur-sm">
        <Button onClick={togglePlayPause} variant="ghost" size="icon" className="h-10 w-10 rounded-full">
          {isAudioPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        {isAudioPlaying && (
          <div className="flex h-5 w-5 items-end justify-between gap-0.5">
            <div className="h-full w-1 origin-bottom animate-audio-wave-1 rounded-full bg-primary"></div>
            <div className="h-full w-1 origin-bottom animate-audio-wave-2 rounded-full bg-primary"></div>
            <div className="h-full w-1 origin-bottom animate-audio-wave-3 rounded-full bg-primary"></div>
          </div>
        )}
        <Popover>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full">
                    {getVolumeIcon()}
                </Button>
            </PopoverTrigger>
            <PopoverContent side="top" align="end" className="w-auto p-2">
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
