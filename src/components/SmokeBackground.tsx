
"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import Stats from 'stats.js';

export function SmokeBackground() {
  const mountRef = useRef<HTMLDivElement>(null);
  const animationFrameId = useRef<number>();

  useEffect(() => {
    const mountNode = mountRef.current;
    if (!mountNode) return;

    let camera: THREE.PerspectiveCamera, 
        scene: THREE.Scene, 
        renderer: THREE.WebGLRenderer,
        stats: Stats,
        clock: THREE.Clock,
        smokeParticles: THREE.Mesh[] = [];
    
    let isAnimating = true;

    function init() {
        stats = new Stats();
        stats.setMode(0);
        mountNode.appendChild(stats.domElement);

        clock = new THREE.Clock();

        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        mountNode.appendChild(renderer.domElement);
        
        scene = new THREE.Scene();
    
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 10000);
        camera.position.z = 1000;
        scene.add(camera);
        
        const light = new THREE.DirectionalLight(0xffffff, 1.5);
        light.position.set(-1, 0, 1);
        scene.add(light);
      
        const textureLoader = new THREE.TextureLoader();
        const smokeTexture = textureLoader.load('https://s3-us-west-2.amazonaws.com/s.cdpn.io/95637/Smoke-Element.png');
        const smokeMaterial = new THREE.MeshLambertMaterial({
            map: smokeTexture, 
            transparent: true, 
            opacity: 0.3,
            blending: THREE.AdditiveBlending
        });
        const smokeGeo = new THREE.PlaneGeometry(300, 300);

        for (let p = 0; p < 150; p++) {
            const particle = new THREE.Mesh(smokeGeo, smokeMaterial);
            particle.position.set(
                Math.random() * 500 - 250,
                Math.random() * 500 - 250,
                Math.random() * 1000 - 100
            );
            particle.rotation.z = Math.random() * 360;
            scene.add(particle);
            smokeParticles.push(particle);
        }
    }

    function animate() {
        if (!isAnimating) return;
        
        stats.begin();
        const delta = clock.getDelta();
        
        evolveSmoke(delta);
        renderer.render(scene, camera);
        stats.end();

        animationFrameId.current = requestAnimationFrame(animate);
    }
    
    function evolveSmoke(delta: number) {
        for(let i = 0; i < smokeParticles.length; i++) {
            smokeParticles[i].rotation.z += (delta * 0.1);
        }
    }

    function onWindowResize() {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    init();
    animate();

    window.addEventListener('resize', onWindowResize, false);

    return () => {
        isAnimating = false;
        if (animationFrameId.current) {
            cancelAnimationFrame(animationFrameId.current);
        }
        window.removeEventListener('resize', onWindowResize);
        
        // Dispose Three.js objects
        smokeParticles.forEach(particle => {
            scene.remove(particle);
            particle.geometry.dispose();
            // Assuming they all share the same material
        });
        if (smokeParticles.length > 0) {
            (smokeParticles[0].material as THREE.Material).dispose();
        }

        // Remove DOM elements
        if (renderer && renderer.domElement) {
            mountNode.removeChild(renderer.domElement);
        }
        if (stats && stats.domElement) {
            mountNode.removeChild(stats.domElement);
        }
        renderer?.dispose();
    };
  }, []);

  return <div id="smoke-canvas" ref={mountRef} />;
}
