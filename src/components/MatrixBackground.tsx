"use client";

import React, { useRef, useEffect } from 'react';

export function MatrixBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let w = canvas.width = window.innerWidth;
    let h = canvas.height = window.innerHeight;
    
    // Create an array of y-positions for each column of characters
    let yPositions = Array(Math.floor(w / 10)).fill(0);

    const draw = () => {
      // Draw a semi-transparent black rectangle to create the fading trail effect
      ctx.fillStyle = 'rgba(0, 0, 0, .05)';
      ctx.fillRect(0, 0, w, h);
      
      // Set the color and font for the falling characters
      ctx.fillStyle = '#0f0'; // Matrix green
      ctx.font = '10px Georgia';

      // Draw the characters for each column
      yPositions.forEach((y, index) => {
        const text = String.fromCharCode(1e2 + Math.random() * 33);
        const x = index * 10;
        ctx.fillText(text, x, y);

        // Reset the character to the top if it goes off-screen
        if (y > 100 + Math.random() * 1e4) {
          yPositions[index] = 0;
        } else {
          yPositions[index] = y + 10;
        }
      });
    };

    const interval = setInterval(draw, 33);
    
    // Update canvas dimensions on window resize
    const handleResize = () => {
      w = canvas.width = window.innerWidth;
      h = canvas.height = window.innerHeight;
      yPositions = Array(Math.floor(w / 10)).fill(0);
    }

    window.addEventListener('resize', handleResize);

    // Cleanup function to clear the interval and remove event listener
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    }
  }, []);

  return <canvas ref={canvasRef} id="matrix-canvas" style={{ position: 'fixed', top: 0, left: 0, zIndex: -1, background: '#000' }} />;
}
