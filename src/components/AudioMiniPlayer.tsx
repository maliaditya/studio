"use client";

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Music } from 'lucide-react';
import type { Resource } from '@/types/workout';
import { getAudioForResource } from '@/lib/audioDB';

export default function AudioMiniPlayer({ resource }: { resource: Resource }) {
  const [audioSrc, setAudioSrc] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [matchedKey, setMatchedKey] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    let objectUrl: string | null = null;
    const load = async () => {
      if (!resource?.hasLocalAudio) return setAudioSrc(null);
      const res = await getAudioForResource(resource.id, resource.audioFileName);
      const blob = res.blob;
      if (blob) {
        objectUrl = URL.createObjectURL(blob);
        setAudioSrc(objectUrl);
        setMatchedKey(res.key || null);
        console.debug('AudioMiniPlayer: matched key', res.key || '(unknown)');
      } else {
        setAudioSrc(null);
        setMatchedKey(null);
      }
    };
    load();
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setPlaying(false);
    };
  }, [resource?.id, resource?.hasLocalAudio, resource?.audioFileName]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
    }
  }, [playing]);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!audioSrc) return;
    setPlaying(prev => !prev);
  };

  return (
    <div className="mr-2 flex items-center gap-2">
      <audio ref={audioRef} src={audioSrc || undefined} className="hidden" />
      {audioSrc ? (
        <>
          <Button variant="ghost" size="icon" className="h-7 w-7" onPointerDown={toggle}>
            {playing ? <Pause className="h-4 w-4 text-green-500" /> : <Play className="h-4 w-4 text-green-500" />}
          </Button>
          <div className="max-w-[8rem] text-xs truncate" title={resource.audioFileName || ''}>
            {resource.audioFileName || 'Local audio'}
          </div>
        </>
      ) : (
        <div title="Local audio available"><Music className="h-4 w-4 text-green-400" /></div>
      )}
    </div>
  );
}
