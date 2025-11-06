
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

type Label = {
    id: string;
    text: string;
    position: THREE.Vector3;
    screenPosition: { x: number; y: number };
};

type CodeConcept = {
    id: string;
    name: string;
    children?: CodeConcept[];
    type: 'renderer' | 'scene' | 'camera' | 'mesh';
};

// Hardcoded structure based on the user's three.js example
const codeStructure: CodeConcept = {
    id: 'renderer',
    name: 'Renderer',
    type: 'renderer',
    children: [
        {
            id: 'scene',
            name: 'Scene',
            type: 'scene',
            children: [
                { id: 'mesh', name: 'Mesh', type: 'mesh', children: [] },
                // Note: Camera is also added to scene, but for viz clarity, we show it alongside scene.
            ],
        },
        { id: 'camera', name: 'Camera', type: 'camera', children: [] },
    ],
};


const CodeVizPageContent = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [labels, setLabels] = useState<Label[]>([]);
    const innerObjectsRef = useRef<THREE.Mesh[]>([]);
    
    const [viewStack, setViewStack] = useState<CodeConcept[]>([codeStructure]);
    const currentView = viewStack[viewStack.length - 1];

    const handleObjectClick = (clickedId: string) => {
        const clickedConcept = findConceptById(currentView, clickedId);
        if (clickedConcept && clickedConcept.children && clickedConcept.children.length > 0) {
            setViewStack(prev => [...prev, clickedConcept]);
        }
    };
    
    const findConceptById = (root: CodeConcept, id: string): CodeConcept | null => {
        if (root.id === id) return root;
        if (root.children) {
            for (const child of root.children) {
                const found = findConceptById(child, id);
                if (found) return found;
            }
        }
        return null;
    }

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        }
    };
    
    useEffect(() => {
        const currentMount = mountRef.current;
        const currentCanvas = canvasRef.current;
        if (!currentMount || !currentCanvas) return;

        // --- Scene Setup ---
        innerObjectsRef.current = [];
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 10;
        const renderer = new THREE.WebGLRenderer({ canvas: currentCanvas, antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        // --- Lighting ---
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        // --- Controls ---
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        // --- Main Wireframe Cube ---
        const mainGeometry = new THREE.BoxGeometry(6, 6, 6);
        const mainEdges = new THREE.EdgesGeometry(mainGeometry);
        const mainLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const wireframeCube = new THREE.LineSegments(mainEdges, mainLineMaterial);
        scene.add(wireframeCube);
        
        // --- Inner Content Cubes ---
        const initialLabels: Omit<Label, 'screenPosition'>[] = [];
        const itemsToDisplay = currentView.children || [];
        
        itemsToDisplay.forEach((item, index) => {
            const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${index * 100}, 70%, 60%)`) });
            const mesh = new THREE.Mesh(geometry, material);

            const angle = (index / itemsToDisplay.length) * Math.PI * 2;
            const radius = 2.5;
            mesh.position.set(Math.cos(angle) * radius, Math.sin(angle) * radius, 0);
            mesh.userData = { id: item.id };
            
            scene.add(mesh);
            innerObjectsRef.current.push(mesh);

            initialLabels.push({
                id: item.id,
                text: item.name,
                position: mesh.position.clone(),
            });
        });

        setLabels(initialLabels.map(l => ({ ...l, screenPosition: { x: -1000, y: -1000 } })));

        // --- Click Handler ---
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        const onCanvasClick = (event: MouseEvent) => {
            if (!currentMount) return;
            const rect = currentMount.getBoundingClientRect();
            mouse.x = ((event.clientX - rect.left) / currentMount.clientWidth) * 2 - 1;
            mouse.y = -((event.clientY - rect.top) / currentMount.clientHeight) * 2 + 1;

            raycaster.setFromCamera(mouse, camera);
            const intersects = raycaster.intersectObjects(innerObjectsRef.current);

            if (intersects.length > 0) {
                const clickedId = intersects[0].object.userData.id;
                handleObjectClick(clickedId);
            }
        };
        currentCanvas.addEventListener('click', onCanvasClick);

        // --- Animation Loop ---
        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            
            setLabels(prevLabels => prevLabels.map((label) => {
                const obj = innerObjectsRef.current.find(o => o.userData.id === label.id);
                if (!obj || !currentMount) return label;
                
                const vector = obj.position.clone().project(camera);
                const x = (vector.x + 1) / 2 * currentMount.clientWidth;
                const y = -(vector.y - 1) / 2 * currentMount.clientHeight;
                return { ...label, screenPosition: { x, y } };
            }));

            renderer.render(scene, camera);
        };
        animate();
        
        // --- Resize Handler ---
        const handleResize = () => {
            if (currentMount) {
                camera.aspect = currentMount.clientWidth / currentMount.clientHeight;
                camera.updateProjectionMatrix();
                renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
            }
        };
        window.addEventListener('resize', handleResize);

        // --- Cleanup ---
        return () => {
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
            currentCanvas.removeEventListener('click', onCanvasClick);
            controls.dispose();
            
            scene.traverse(object => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (Array.isArray(object.material)) {
                        object.material.forEach(material => material.dispose());
                    } else {
                        object.material.dispose();
                    }
                }
            });
            renderer.dispose();
        };
    }, [viewStack]);

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white p-4 gap-4">
            <div className="w-full max-w-4xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                    {viewStack.length > 1 && (
                        <Button onClick={handleBack} variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    )}
                    <h1 className="text-2xl font-bold">
                        {currentView.name}
                    </h1>
                </div>
            </div>
            <div ref={mountRef} className="w-full max-w-4xl h-[600px] rounded-lg border border-gray-700 relative">
                <canvas ref={canvasRef} className="w-full h-full" />
                {labels.map(label => (
                    <div
                        key={label.id}
                        className="absolute text-xs bg-black/50 p-1 rounded-md pointer-events-none"
                        style={{
                            left: `${label.screenPosition.x}px`,
                            top: `${label.screenPosition.y}px`,
                            transform: 'translate(10px, -50%)',
                            zIndex: 1,
                        }}
                    >
                        {label.text}
                    </div>
                ))}
            </div>
             <div className="w-full max-w-4xl text-center text-muted-foreground text-sm mt-2">
                <p>Click on an inner cube to drill down into its contents.</p>
             </div>
        </div>
    );
};


export default function CodeVizPage() {
  return (
    <AuthGuard>
      <CodeVizPageContent />
    </AuthGuard>
  );
}
