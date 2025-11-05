
"use client";

import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { CoreSkill } from '@/types/workout';

type Label = {
    id: string;
    text: string;
    position: THREE.Vector3;
    screenPosition: { x: number; y: number };
};

const CubePageContent = () => {
    const { coreSkills, offerizationPlans } = useAuth();
    const mountRef = useRef<HTMLDivElement>(null);
    const [labels, setLabels] = useState<Label[]>([]);

    const plannedSpecializations = useMemo(() => {
        if (!coreSkills || !offerizationPlans) return [];
        return coreSkills.filter(skill => 
            skill.type === 'Specialization' && offerizationPlans && offerizationPlans[skill.id]
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
        
        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // --- Main Cube ---
        const mainGeometry = new THREE.BoxGeometry(2, 2, 2);
        const mainEdges = new THREE.EdgesGeometry(mainGeometry);
        const mainLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframeCube = new THREE.LineSegments(mainEdges, mainLineMaterial);
        scene.add(wireframeCube);
        
        // --- Inner Cubes and Labels ---
        const innerCubes: THREE.Mesh[] = [];
        const initialLabels: Omit<Label, 'screenPosition'>[] = [];
        const spacing = 0.75;
        
        plannedSpecializations.forEach((spec, index) => {
            const geometry = new THREE.BoxGeometry(0.5, 0.5, 0.5);
            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
            const cube = new THREE.Mesh(geometry, material);

            const x = (index % 3) - 1;
            const y = Math.floor((index / 3) % 3) - 1;
            const z = Math.floor(index / 9) - 1;
            
            cube.position.set(x * spacing, y * spacing, z * spacing);
            
            scene.add(cube);
            innerCubes.push(cube);

            initialLabels.push({
                id: spec.id,
                text: spec.name,
                position: cube.position.clone(),
            });
        });

        // Initialize labels state
        setLabels(initialLabels.map(l => ({ ...l, screenPosition: { x: -1000, y: -1000 } })));

        // Animation loop
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);

            controls.update();

            // Update label positions
            setLabels(prevLabels => prevLabels.map((label, index) => {
                const cubePosition = innerCubes[index].position;
                const vector = cubePosition.clone().project(camera);
                const x = (vector.x + 1) / 2 * currentMount.clientWidth;
                const y = -(vector.y - 1) / 2 * currentMount.clientHeight;
                return { ...label, screenPosition: { x, y } };
            }));

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
            if (currentMount && renderer.domElement) {
                currentMount.removeChild(renderer.domElement);
            }
            cancelAnimationFrame(animationFrameId);
            mainGeometry.dispose();
            mainLineMaterial.dispose();
            mainEdges.dispose();
            innerCubes.forEach(cube => {
                cube.geometry.dispose();
                (cube.material as THREE.Material).dispose();
            });
            renderer.dispose();
        };
    }, [plannedSpecializations]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
            <h1 className="text-3xl font-bold mb-4">Strategic Specializations</h1>
            <div ref={mountRef} className="w-[600px] h-[600px] max-w-full max-h-full rounded-lg border border-gray-700 relative">
                {/* Labels will be rendered here */}
                {labels.map(label => (
                    <div
                        key={label.id}
                        className="absolute text-xs bg-black/50 p-1 rounded-md"
                        style={{
                            left: `${label.screenPosition.x}px`,
                            top: `${label.screenPosition.y}px`,
                            transform: 'translate(10px, -50%)', // Offset from the cube's center
                        }}
                    >
                        {label.text}
                    </div>
                ))}
            </div>
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
