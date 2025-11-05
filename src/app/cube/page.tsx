
"use client";

import React, { useRef, useEffect, useMemo } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { CoreSkill } from '@/types/workout';

const CubePageContent = () => {
    const { coreSkills, offerizationPlans } = useAuth();
    const mountRef = useRef<HTMLDivElement>(null);

    const plannedSpecializations = useMemo(() => {
        if (!coreSkills || !offerizationPlans) return [];
        return coreSkills.filter(skill => 
            skill.type === 'Specialization' && offerizationPlans[skill.id]
        );
    }, [coreSkills, offerizationPlans]);

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

        // --- Main Cube ---
        const mainGeometry = new THREE.BoxGeometry(2, 2, 2);
        const mainEdges = new THREE.EdgesGeometry(mainGeometry);
        const mainLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframeCube = new THREE.LineSegments(mainEdges, mainLineMaterial);
        scene.add(wireframeCube);
        
        // --- Inner Cubes for Specializations ---
        const innerCubes: THREE.LineSegments[] = [];
        const spacing = 0.75; // Total grid size will be 2 * spacing = 1.5, which fits within the 2x2x2 cube
        
        plannedSpecializations.forEach((spec, index) => {
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const edges = new THREE.EdgesGeometry(geometry);
            const material = new THREE.LineBasicMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
            const cube = new THREE.LineSegments(edges, material);

            // Position inner cubes in a 3x3x3 grid
            const x = (index % 3) - 1; // -> -1, 0, 1
            const y = Math.floor((index / 3) % 3) - 1; // -> -1, 0, 1
            const z = Math.floor(index / 9) - 1; // -> -1, 0, 1
            
            cube.position.set(x * spacing, y * spacing, z * spacing);
            
            scene.add(cube);
            innerCubes.push(cube);
        });

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

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
            mainGeometry.dispose();
            mainLineMaterial.dispose();
            mainEdges.dispose();
            innerCubes.forEach(cube => {
                (cube.geometry as THREE.BufferGeometry).dispose();
                ((cube.material) as THREE.Material).dispose();
            });
        };
    }, [plannedSpecializations]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white">
            <h1 className="text-3xl font-bold mb-4">Strategic Specializations</h1>
             {plannedSpecializations.length > 0 ? (
                <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4 text-sm">
                    {plannedSpecializations.map(spec => (
                        <li key={spec.id}>{spec.name}</li>
                    ))}
                </ul>
            ) : (
                <p className="mb-4 text-muted-foreground">No specializations with strategic plans found.</p>
            )}
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
