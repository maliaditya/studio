"use client";

import React, { useRef, useEffect } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';

const CubePageContent = () => {
    const mountRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!mountRef.current) return;

        const currentMount = mountRef.current;

        // Scene
        const scene = new THREE.Scene();

        // Camera
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        // Renderer
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // Cube Geometry
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        
        // Edges Geometry to create the wireframe
        const edges = new THREE.EdgesGeometry(geometry);
        const lineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframeCube = new THREE.LineSegments(edges, lineMaterial);
        scene.add(wireframeCube);

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            wireframeCube.rotation.x += 0.005;
            wireframeCube.rotation.y += 0.005;

            controls.update();
            renderer.render(scene, camera);
        };
        animate();

        // Handle resize
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // Cleanup
        return () => {
            window.removeEventListener('resize', handleResize);
            if (currentMount) {
                currentMount.removeChild(renderer.domElement);
            }
            cancelAnimationFrame(animationFrameId);
            geometry.dispose();
            lineMaterial.dispose();
        };
    }, []);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900">
            <h1 className="text-3xl font-bold text-white mb-8">3D Wireframe Cube</h1>
            <div ref={mountRef} className="w-[600px] h-[600px] max-w-full max-h-full rounded-lg border border-gray-700" />
        </div>
    );
};


export default function CubePage() {
  return (
    <AuthGuard>
      <CubePageContent />
    </AuthGuard>
  );
}