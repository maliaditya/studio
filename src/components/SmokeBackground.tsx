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

    // Starfield setup
    const starVertices: number[] = [];
    for (let i = 0; i < 10000; i++) {
        const x = THREE.MathUtils.randFloatSpread(2000);
        const y = THREE.MathUtils.randFloatSpread(2000);
        const z = THREE.MathUtils.randFloatSpread(2000);
        starVertices.push(x, y, z);
    }

    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starVertices, 3));
    
    const starMaterial = new THREE.PointsMaterial({
        color: 0xffffff,
        size: 0.7,
        transparent: true,
        opacity: 0.8
    });

    const stars = new THREE.Points(starGeometry, starMaterial);
    scene.add(stars);

    // Smoke particles setup
    const loader = new THREE.TextureLoader();
    const smokeTexture = loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png');
    
    const smokeParticles: THREE.Group = new THREE.Group();

    const smokeMaterial = new THREE.MeshLambertMaterial({
      map: smokeTexture,
      transparent: true,
      opacity: 0.15,
      blending: THREE.NormalBlending, // Using NormalBlending for a more realistic smoke look
      color: 0xffffff, // White smoke
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

    // Moon Setup
    const moonTexture = loader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/17271/lroc_color_poles_1k.jpg');
    const moonGeometry = new THREE.SphereGeometry(50, 32, 32);
    const moonMaterial = new THREE.MeshPhongMaterial({
        map: moonTexture,
        shininess: 5
    });
    const moon = new THREE.Mesh(moonGeometry, moonMaterial);
    scene.add(moon);
    
    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 2); // Softer ambient for overall scene
    scene.add(ambientLight);
    
    const pointLight = new THREE.PointLight(0xffffff, 3, 2000); // A brighter light to illuminate the moon
    scene.add(pointLight);


    let animationFrameId: number;
    const clock = new THREE.Clock();

    const positionElements = () => {
        // Position moon in top right corner
        const vFOV = THREE.MathUtils.degToRad(camera.fov);
        const height = 2 * Math.tan(vFOV / 2) * (camera.position.z);
        const width = height * camera.aspect;
        moon.position.set(width / 2 - 100, height / 2 - 100, 0);

        // Position light source relative to camera
        pointLight.position.set(camera.position.x + 100, camera.position.y + 100, camera.position.z);
    };
    positionElements();

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
      
      // Make stars slowly rotate
      stars.rotation.x += delta * 0.01;
      stars.rotation.y += delta * 0.01;

      // Make moon slowly rotate
      moon.rotation.y += delta * 0.05;

      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      positionElements();
    };
    
    window.addEventListener('resize', handleResize);
    
    animate();
    
    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      
      // Dispose smoke resources
      smokeMaterial.dispose();
      smokeTexture.dispose();
      smokeGeo.dispose();
      smokeParticles.children.forEach(child => {
          const mesh = child as THREE.Mesh;
          if(mesh.material && typeof (mesh.material as any).dispose === 'function') {
            (mesh.material as any).dispose();
          }
      });

      // Dispose star resources
      starGeometry.dispose();
      starMaterial.dispose();

      // Dispose moon resources
      moonGeometry.dispose();
      moonMaterial.dispose();
      moonTexture.dispose();
    };
  }, [theme]);

  return <canvas ref={canvasRef} id="smoke-canvas" />;
}
