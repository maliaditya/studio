"use client";

import { useEffect, useRef } from 'react';

export function BackgroundAudioPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    // Set the volume to a lower level (e.g., 20%)
    audio.volume = 0.2;

    // We need to handle browsers' autoplay policies.
    // Most browsers require a user interaction to play audio with sound.
    const playAudio = async () => {
      try {
        await audio.play();
        // If audio starts playing, we don't need the interaction listener anymore.
        document.removeEventListener('click', playAudio);
      } catch (error) {
        // This is expected if the user hasn't interacted with the page yet.
        console.log('Autoplay was prevented. Audio will start after the first click.');
      }
    };

    // Attempt to play immediately. This might work or might be blocked.
    playAudio();

    // Add a one-time event listener for any click on the document as a fallback.
    // This ensures the music will start once the user interacts with the page.
    document.addEventListener('click', playAudio, { once: true });

    // Cleanup the event listener when the component unmounts.
    return () => {
      document.removeEventListener('click', playAudio);
    };
  }, []);

  // The audio element itself. `controls` is omitted for background play.
  return (
    <audio ref={audioRef} src="/40 Hz Study Music.mp3" loop />
  );
}
