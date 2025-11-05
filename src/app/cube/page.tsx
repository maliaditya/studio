
"use client";

import React, { useRef, useEffect, useMemo, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { useAuth } from '@/contexts/AuthContext';
import type { CoreSkill } from '@/types/workout';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    const [selectedSpec, setSelectedSpec] = useState<CoreSkill | null>(null);
    const innerCubesRef = useRef<THREE.Mesh[]>([]);

    const plannedSpecializations = useMemo(() => {
        if (!coreSkills || !offerizationPlans) return [];
        return coreSkills.filter(skill => 
            skill.type === 'Specialization' && offerizationPlans && offerizationPlans[skill.id]
        );
    }, [coreSkills, offerizationPlans]);

    useEffect(() => {
        if (!mountRef.current || selectedSpec) return;

        const currentMount = mountRef.current;
        innerCubesRef.current = []; // Clear previous cubes

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        currentMount.appendChild(renderer.domElement);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const mainGeometry = new THREE.BoxGeometry(2, 2, 2);
        const mainEdges = new THREE.EdgesGeometry(mainGeometry);
        const mainLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframeCube = new THREE.LineSegments(mainEdges, mainLineMaterial);
        scene.add(wireframeCube);
        
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
            cube.userData = { id: spec.id }; // Attach specialization ID
            
            scene.add(cube);
            innerCubesRef.current.push(cube);

            initialLabels.push({
                id: spec.id,
                text: spec.name,
                position: cube.position.clone(),
            });
        });

        setLabels(initialLabels.map(l => ({ ...l, screenPosition: { x: -1000, y: -1000 } })));

        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onClick = (event: MouseEvent) => {
            if (!currentMount) return;
            const rect = currentMount.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(innerCubesRef.current);

            if (intersects.length > 0) {
                const clickedId = intersects[0].object.userData.id;
                const spec = plannedSpecializations.find(s => s.id === clickedId);
                if (spec) {
                    setSelectedSpec(spec);
                }
            }
        };
        currentMount.addEventListener('click', onClick);

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            setLabels(prevLabels => prevLabels.map((label, index) => {
                const cubePosition = innerCubesRef.current[index]?.position;
                if (!cubePosition) return label;
                const vector = cubePosition.clone().project(camera);
                const x = (vector.x + 1) / 2 * currentMount.clientWidth;
                const y = -(vector.y - 1) / 2 * currentMount.clientHeight;
                return { ...label, screenPosition: { x, y } };
            }));
            renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            currentMount.removeEventListener('click', onClick);
            if (currentMount && renderer.domElement) {
                currentMount.innerHTML = ''; // Clear the mount point
            }
            cancelAnimationFrame(animationFrameId);
            mainGeometry.dispose();
            mainLineMaterial.dispose();
            mainEdges.dispose();
            innerCubesRef.current.forEach(cube => {
                cube.geometry.dispose();
                (cube.material as THREE.Material).dispose();
            });
            renderer.dispose();
        };
    }, [plannedSpecializations, selectedSpec]);

    if (selectedSpec) {
        return (
            <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-8">
                <Button onClick={() => setSelectedSpec(null)} className="absolute top-8 left-8">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Back to Cubes
                </Button>
                <Card className="w-full max-w-2xl bg-gray-800/50 border-gray-700">
                    <CardHeader>
                        <CardTitle className="text-2xl text-primary">{selectedSpec.name}</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {selectedSpec.skillAreas.map(area => (
                                <div key={area.id}>
                                    <h4 className="font-semibold text-lg text-gray-300">{area.name}</h4>
                                    <ul className="list-disc list-inside ml-4 mt-2 text-gray-400">
                                        {area.microSkills.map(ms => <li key={ms.id}>{ms.name}</li>)}
                                    </ul>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
            <h1 className="text-3xl font-bold mb-4">Strategic Specializations</h1>
            <div ref={mountRef} className="w-[600px] h-[600px] max-w-full max-h-full rounded-lg border border-gray-700 relative">
                {labels.map(label => (
                    <div
                        key={label.id}
                        className="absolute text-xs bg-black/50 p-1 rounded-md pointer-events-none"
                        style={{
                            left: `${label.screenPosition.x}px`,
                            top: `${label.screenPosition.y}px`,
                            transform: 'translate(10px, -50%)',
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
