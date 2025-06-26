"use client";

import React, { useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export function ClothBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useAuth();

  useEffect(() => {
    if (theme !== 'cloth') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Polyfill for requestAnimationFrame
    (window as any).requestAnimFrame =
      window.requestAnimationFrame ||
      (window as any).webkitRequestAnimationFrame ||
      function (callback: any) {
        window.setTimeout(callback, 1e3 / 60);
      };

    // Simulation settings
    const accuracy = 5;
    const gravity = 400;
    const spacing = 5;
    const tearDist = 60;
    const friction = 0.99;
    const bounce = 0.5;
    let cloth: Cloth;
    let animationFrameId: number;

    ctx.strokeStyle = '#555';

    const mouse = {
      cut: 8,
      influence: 36,
      down: false,
      button: 1,
      x: 0,
      y: 0,
      px: 0,
      py: 0
    };

    class Point {
        x: number;
        y: number;
        px: number;
        py: number;
        vx: number;
        vy: number;
        pinX: number | null;
        pinY: number | null;
        constraints: Constraint[];

        constructor(x: number, y: number) {
            this.x = x;
            this.y = y;
            this.px = x;
            this.py = y;
            this.vx = 0;
            this.vy = 0;
            this.pinX = null;
            this.pinY = null;
            this.constraints = [];
        }

        update(delta: number) {
            if (this.pinX && this.pinY) return this;

            if (mouse.down) {
                let dx = this.x - mouse.x;
                let dy = this.y - mouse.y;
                let dist = Math.sqrt(dx * dx + dy * dy);

                if (mouse.button === 1 && dist < mouse.influence) {
                    this.px = this.x - (mouse.x - mouse.px);
                    this.py = this.y - (mouse.y - mouse.py);
                } else if (dist < mouse.cut) {
                    this.constraints = [];
                }
            }

            this.addForce(0, gravity);

            let nx = this.x + (this.x - this.px) * friction + this.vx * delta;
            let ny = this.y + (this.y - this.py) * friction + this.vy * delta;

            this.px = this.x;
            this.py = this.y;

            this.x = nx;
            this.y = ny;

            this.vy = this.vx = 0;

            if (this.x >= canvas.width) {
                this.px = canvas.width + (canvas.width - this.px) * bounce;
                this.x = canvas.width;
            } else if (this.x <= 0) {
                this.px *= -1 * bounce;
                this.x = 0;
            }

            if (this.y >= canvas.height) {
                this.py = canvas.height + (canvas.height - this.py) * bounce;
                this.y = canvas.height;
            } else if (this.y <= 0) {
                this.py *= -1 * bounce;
                this.y = 0;
            }

            return this;
        }

        draw() {
            let i = this.constraints.length;
            while (i--) this.constraints[i].draw();
        }

        resolve() {
            if (this.pinX && this.pinY) {
                this.x = this.pinX;
                this.y = this.pinY;
                return;
            }

            this.constraints.forEach((constraint) => constraint.resolve());
        }

        attach(point: Point) {
            this.constraints.push(new Constraint(this, point));
        }

        free(constraint: Constraint) {
            this.constraints.splice(this.constraints.indexOf(constraint), 1);
        }

        addForce(x: number, y: number) {
            this.vx += x;
            this.vy += y;
        }

        pin(pinx: number, piny: number) {
            this.pinX = pinx;
            this.pinY = piny;
        }
    }

    class Constraint {
        p1: Point;
        p2: Point;
        length: number;

        constructor(p1: Point, p2: Point) {
            this.p1 = p1;
            this.p2 = p2;
            this.length = spacing;
        }

        resolve() {
            let dx = this.p1.x - this.p2.x;
            let dy = this.p1.y - this.p2.y;
            let dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.length) return;

            let diff = (this.length - dist) / dist;

            if (dist > tearDist) this.p1.free(this);

            let mul = diff * 0.5 * (1 - this.length / dist);

            let px = dx * mul;
            let py = dy * mul;

            if (!this.p1.pinX) this.p1.x += px;
            if (!this.p1.pinY) this.p1.y += py;
            if (!this.p2.pinX) this.p2.x -= px;
            if (!this.p2.pinY) this.p2.y -= py;

            return this;
        }

        draw() {
            if (!ctx) return;
            ctx.moveTo(this.p1.x, this.p1.y);
            ctx.lineTo(this.p2.x, this.p2.y);
        }
    }

    class Cloth {
        points: Point[];

        constructor(free?: boolean) {
            this.points = [];
            if (!canvas) return;
            
            const clothXCount = Math.floor(canvas.width / spacing);
            const clothYCount = Math.floor(canvas.height / spacing) - 5; // Start a bit higher

            let startX = canvas.width / 2 - clothXCount * spacing / 2;

            for (let y = 0; y <= clothYCount; y++) {
                for (let x = 0; x <= clothXCount; x++) {
                    let point = new Point(startX + x * spacing, 20 + y * spacing);
                    if (!free && y === 0) point.pin(point.x, point.y);
                    if (x !== 0) point.attach(this.points[this.points.length - 1]);
                    if (y !== 0) point.attach(this.points[x + (y - 1) * (clothXCount + 1)]);

                    this.points.push(point);
                }
            }
        }

        update(delta: number) {
            if (!ctx) return;
            let i = accuracy;

            while (i--) {
                this.points.forEach((point) => {
                    point.resolve();
                });
            }

            ctx.beginPath();
            this.points.forEach((point) => {
                point.update(delta * delta).draw();
            });
            ctx.stroke();
        }
    }

    const setMouse = (e: MouseEvent) => {
        if (!canvas) return;
        let rect = canvas.getBoundingClientRect();
        mouse.px = mouse.x;
        mouse.py = mouse.y;
        mouse.x = e.clientX - rect.left;
        mouse.y = e.clientY - rect.top;
    };

    const mouseDown = (e: MouseEvent) => {
        mouse.button = e.which;
        mouse.down = true;
        setMouse(e);
    };

    const mouseUp = () => (mouse.down = false);
    const contextMenu = (e: MouseEvent) => e.preventDefault();

    const start = () => {
        if (!canvas) return;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        cloth = new Cloth();
    }
    
    const update = () => {
      if (!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      cloth.update(0.016);
      animationFrameId = (window as any).requestAnimFrame(update);
    };
    
    const handleResize = () => {
        window.cancelAnimationFrame(animationFrameId);
        start();
        update();
    };

    // Attach listeners to the window to capture events anywhere on the page
    window.addEventListener('mousedown', mouseDown);
    window.addEventListener('mousemove', setMouse);
    window.addEventListener('mouseup', mouseUp);
    window.addEventListener('contextmenu', contextMenu);
    window.addEventListener('resize', handleResize);
    
    start();
    update();
    
    // Cleanup
    return () => {
      window.cancelAnimationFrame(animationFrameId);
      window.removeEventListener('mousedown', mouseDown);
      window.removeEventListener('mousemove', setMouse);
      window.removeEventListener('mouseup', mouseUp);
      window.removeEventListener('contextmenu', contextMenu);
      window.removeEventListener('resize', handleResize);
    };
  }, [theme]); // Rerun effect if theme changes

  return <canvas ref={canvasRef} id="cloth-canvas" />;
}
