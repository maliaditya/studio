
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { useAuth } from '@/contexts/AuthContext';

export function SmokeBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { theme } = useAuth();

  useEffect(() => {
    if (theme !== 'smoke') return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    // Scene setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 1000);
    camera.position.z = 500;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      alpha: true, // transparent background
    });
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Smoke particles setup
    const loader = new THREE.TextureLoader();
    const smokeTexture = loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png');
    
    const smokeParticles: THREE.Group = new THREE.Group();

    const smokeMaterial = new THREE.MeshLambertMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.1,
      blending: THREE.NormalBlending, // Using NormalBlending for a more realistic smoke look
      color: 0x555555,
    });
    const smokeGeo = new THREE.PlaneGeometry(300, 300);

    for (let i = 0; i < 60; i++) {
      const particle = new THREE.Mesh(smokeGeo, smokeMaterial.clone());
      // Start at bottom left with some randomness
      particle.position.set(
        (Math.random() - 1) * (window.innerWidth / 2),
        (Math.random() - 1) * (window.innerHeight / 2),
        Math.random() * 400
      );
      particle.rotation.z = Math.random() * 2 * Math.PI;
      smokeParticles.add(particle);
    }
    scene.add(smokeParticles);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      const delta = clock.getDelta();
      
      smokeParticles.children.forEach(child => {
        const particle = child as THREE.Mesh;
        // Move diagonally - up and right
        particle.position.x += delta * 40; 
        particle.position.y += delta * 40; 
        particle.rotation.z += delta * 0.1;

        // Reset particle when it goes off screen to the top-right
        if (particle.position.x > window.innerWidth / 1.5 || particle.position.y > window.innerHeight / 1.5) {
           particle.position.x = (Math.random() - 1) * (window.innerWidth / 2);
           particle.position.y = (Math.random() - 1) * (window.innerHeight / 2);
        }
      });
      
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      smokeMaterial.dispose();
      smokeTexture.dispose();
      smokeGeo.dispose();
      smokeParticles.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if(mesh.material && typeof (mesh.material as any).dispose === 'function') {
            (mesh.material as any).dispose();
          }
      });
    };
  }, [theme]);

  return <canvas ref={canvasRef} id="smoke-canvas" />;
}
