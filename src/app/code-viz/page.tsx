
"use client";

import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';

type Label = {
    id: string;
    text: string;
    position: THREE.Vector3;
    screenPosition: { x: number; y: number };
};

const CodeVizPageContent = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [labels, setLabels] = useState<Label[]>([]);
    const innerObjectsRef = useRef<THREE.Mesh[]>([]);

    const concepts = [
        { id: 'function', name: 'Function', shape: 'box', dimensions: [1, 1.5, 0.5] as [number, number, number] },
        { id: 'class', name: 'Class', shape: 'cube', dimensions: [1, 1, 1] as [number, number, number] },
        { id: 'object', name: 'Object', shape: 'sphere', dimensions: [0.7] as [number] },
        { id: 'variable', name: 'Variable', shape: 'sphere', dimensions: [0.3] as [number] },
    ];

    useEffect(() => {
        const currentMount = mountRef.current;
        const currentCanvas = canvasRef.current;
        if (!currentMount || !currentCanvas) return;

        innerObjectsRef.current = [];

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 5;

        const renderer = new THREE.WebGLRenderer({ canvas: currentCanvas, antialias: true, alpha: true });
        renderer.setSize(currentMount.clientWidth, currentMount.clientHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
        
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(5, 5, 5);
        scene.add(directionalLight);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        const initialLabels: Omit<Label, 'screenPosition'>[] = [];
        
        concepts.forEach((item, index) => {
            let geometry;
            switch(item.shape) {
                case 'box':
                case 'cube':
                    geometry = new THREE.BoxGeometry(...item.dimensions);
                    break;
                case 'sphere':
                    geometry = new THREE.SphereGeometry(item.dimensions[0], 32, 32);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            
            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(Math.random(), Math.random(), Math.random()) });
            const mesh = new THREE.Mesh(geometry, material);

            // Simple positioning logic
            mesh.position.set((index - (concepts.length - 1) / 2) * 2.5, 0, 0);
            
            scene.add(mesh);
            innerObjectsRef.current.push(mesh);

            initialLabels.push({
                id: item.id,
                text: item.name,
                position: mesh.position.clone(),
            });
        });

        setLabels(initialLabels.map(l => ({ ...l, screenPosition: { x: -1000, y: -1000 } })));

        let animationFrameId: number;
        const animate = () => {
            animationFrameId = requestAnimationFrame(animate);
            controls.update();
            
            setLabels(prevLabels => prevLabels.map((label) => {
                const obj = innerObjectsRef.current.find(o => o.userData.id === label.id);
                if (!obj || !currentMount) return label; // Assign userData.id when creating objects if needed
                
                const vector = obj.position.clone().project(camera);
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
            cancelAnimationFrame(animationFrameId);
            window.removeEventListener('resize', handleResize);
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
    }, []); // Empty dependency array ensures this runs only once

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
            <h1 className="text-3xl font-bold mb-4">
                Code Visualization
            </h1>
            <div ref={mountRef} className="w-[800px] h-[600px] max-w-full max-h-full rounded-lg border border-gray-700 relative">
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
