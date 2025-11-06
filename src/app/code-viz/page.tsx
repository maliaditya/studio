
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
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
    type: 'function' | 'class' | 'object' | 'variable';
};

const CodeVizPageContent = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [labels, setLabels] = useState<Label[]>([]);
    const innerObjectsRef = useRef<THREE.Mesh[]>([]);
    const [code, setCode] = useState(
`class MyClass {
  constructor() {
    this.value = 42;
  }
}

function myFunction(param) {
  return param * 2;
}

const myObject = { key: 'value' };
let myVariable = "hello world";
const anotherObject = new MyClass();
`
    );
    const [concepts, setConcepts] = useState<CodeConcept[]>([]);

    const parseCode = useCallback((codeToParse: string): CodeConcept[] => {
        const foundConcepts: CodeConcept[] = [];
        const lines = codeToParse.split('\n');
        
        const functionRegex = /function\s+([a-zA-Z0-9_]+)\s*\(/;
        const classRegex = /class\s+([a-zA-Z0-9_]+)/;
        const objectRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*(?:\{|new\s+[a-zA-Z0-9_]+)/;
        const variableRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=/;

        lines.forEach((line, index) => {
            const classMatch = line.match(classRegex);
            if (classMatch) {
                foundConcepts.push({ id: `c_${index}`, name: classMatch[1], type: 'class' });
                return;
            }

            const functionMatch = line.match(functionRegex);
            if (functionMatch) {
                foundConcepts.push({ id: `f_${index}`, name: functionMatch[1], type: 'function' });
                return;
            }

            const objectMatch = line.match(objectRegex);
            if (objectMatch) {
                // Avoid re-matching already found classes
                if (!foundConcepts.some(c => c.name === objectMatch[1] && c.type === 'class')) {
                    foundConcepts.push({ id: `o_${index}`, name: objectMatch[1], type: 'object' });
                    return;
                }
            }

            const variableMatch = line.match(variableRegex);
            if (variableMatch) {
                // Ensure it's not one of the other types we already found
                if (!foundConcepts.some(c => c.name === variableMatch[1])) {
                    foundConcepts.push({ id: `v_${index}`, name: variableMatch[1], type: 'variable' });
                }
            }
        });

        return foundConcepts;
    }, []);

    const handleVisualize = () => {
        const parsed = parseCode(code);
        setConcepts(parsed);
    };
    
    useEffect(() => {
        // Initial parse on load
        handleVisualize();
    }, []);

    useEffect(() => {
        const currentMount = mountRef.current;
        const currentCanvas = canvasRef.current;
        if (!currentMount || !currentCanvas) return;

        innerObjectsRef.current = [];

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 10;

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
            let geometry, dimensions;
            switch(item.type) {
                case 'function':
                    geometry = new THREE.BoxGeometry(2, 1, 0.5);
                    break;
                case 'class':
                    geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                    break;
                case 'object':
                    geometry = new THREE.SphereGeometry(0.7, 32, 32);
                    break;
                case 'variable':
                    geometry = new THREE.SphereGeometry(0.3, 32, 32);
                    break;
                default:
                    geometry = new THREE.BoxGeometry(1, 1, 1);
            }
            
            const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${index * 60}, 70%, 60%)`) });
            const mesh = new THREE.Mesh(geometry, material);

            const angle = (index / concepts.length) * Math.PI * 2;
            const radius = 4;
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
    }, [concepts]);

    return (
        <div className="flex flex-col xl:flex-row h-screen bg-gray-900 text-white p-4 gap-4">
            <Card className="xl:w-1/3 bg-gray-800/50 border-gray-700">
                <CardHeader>
                    <CardTitle>Code Input</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-col gap-4 h-[calc(100%-80px)]">
                    <Textarea 
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Paste your JavaScript code here..."
                        className="bg-gray-900/80 border-gray-600 text-gray-200 font-mono h-full flex-grow text-xs"
                    />
                    <Button onClick={handleVisualize}>Visualize Code</Button>
                </CardContent>
            </Card>
            <div ref={mountRef} className="flex-grow min-h-0 rounded-lg border border-gray-700 relative">
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
