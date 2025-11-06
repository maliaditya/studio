
"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { AuthGuard } from '@/components/AuthGuard';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

type Label = {
    id: string;
    text: string;
    position: THREE.Vector3;
    screenPosition: { x: number; y: number };
};

type CodeConcept = {
    id: string;
    name: string;
    type: 'renderer' | 'scene' | 'camera' | 'mesh' | 'geometry' | 'material' | 'variable' | 'unknown';
    children: CodeConcept[];
};

type CodeVisualization = {
    imports: string[];
    sceneGraph: CodeConcept | null;
}

const defaultCode = `
import * as THREE from 'three'

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

/**
 * Objects
 */
const geometry = new THREE.BoxGeometry(1, 1, 1)
const material = new THREE.MeshBasicMaterial({ color: 0xff0000 })
const mesh = new THREE.Mesh(geometry, material)
scene.add(mesh)

/**
 * Sizes
 */
const sizes = {
    width: 800,
    height: 600
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
camera.position.z = 3
scene.add(camera)

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({
    canvas: canvas
})
renderer.setSize(sizes.width, sizes.height)
renderer.render(scene, camera)
`;

const parseCodeToStructure = (code: string): CodeVisualization => {
    const definitions: Record<string, Partial<CodeConcept> & { variableName: string }> = {};
    const relationships: Record<string, string[]> = {};
    const imports: string[] = [];

    // Parse imports
    const importRegex = /import\s+.*\s+from\s+['"](.+)['"]/g;
    let match;
    while ((match = importRegex.exec(code)) !== null) {
        imports.push(match[1]);
    }

    // Parse variable declarations
    const variableRegex = /(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*=\s*new\s+THREE\.([a-zA-Z0-9_]+)/g;
    while ((match = variableRegex.exec(code)) !== null) {
        const [, variableName, type] = match;
        definitions[variableName] = { 
            variableName,
            id: variableName,
            name: `${variableName} (${type})`,
            type: type.toLowerCase() as CodeConcept['type'] || 'unknown'
        };
    }
    
    // Parse scene graph relationships (.add)
    const addRegex = /(\w+)\.add\(\s*(\w+)\s*\)/g;
    while ((match = addRegex.exec(code)) !== null) {
        const [, parent, child] = match;
        if (!relationships[parent]) {
            relationships[parent] = [];
        }
        relationships[parent].push(child);
    }
    
    const rootNodes: CodeConcept[] = [];
    const allNodes: Record<string, CodeConcept> = {};

    Object.keys(definitions).forEach(name => {
        allNodes[name] = {
            ...definitions[name],
            children: [],
        } as CodeConcept;
    });

    Object.keys(relationships).forEach(parentName => {
        if (allNodes[parentName]) {
            const childrenNames = relationships[parentName];
            childrenNames.forEach(childName => {
                if (allNodes[childName]) {
                    allNodes[parentName].children.push(allNodes[childName]);
                }
            });
        }
    });

    const childNames = new Set(Object.values(relationships).flat());
    Object.keys(allNodes).forEach(name => {
        // A root node is one that is defined but never added to another node.
        if (!childNames.has(name)) {
            rootNodes.push(allNodes[name]);
        }
    });
    
    let sceneGraphRoot: CodeConcept | null = null;
    if (rootNodes.length > 0) {
        // If there's a renderer, it's a good root. Otherwise, create a synthetic root.
        const rendererNode = rootNodes.find(n => n.type === 'renderer');
        if (rendererNode) {
            sceneGraphRoot = rendererNode;
        } else {
             sceneGraphRoot = {
                id: 'root',
                name: 'Visualization Root',
                type: 'scene',
                children: rootNodes
            };
        }
    }


    return {
        imports,
        sceneGraph: sceneGraphRoot
    };
};

const CodeVizPageContent = () => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [labels, setLabels] = useState<Label[]>([]);
    const innerObjectsRef = useRef<THREE.Mesh[]>([]);

    const [code, setCode] = useState(defaultCode);
    const [codeStructure, setCodeStructure] = useState<CodeVisualization>(() => parseCodeToStructure(defaultCode));
    
    const [viewStack, setViewStack] = useState<(CodeConcept | null)[]>([codeStructure.sceneGraph]);
    const currentView = viewStack[viewStack.length - 1];

    const handleVisualize = () => {
        const structure = parseCodeToStructure(code);
        setCodeStructure(structure);
        setViewStack([structure.sceneGraph]);
    };

    const handleObjectClick = (clickedId: string) => {
        if (!codeStructure.sceneGraph) return;

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
        const clickedConcept = findConceptById(codeStructure.sceneGraph, clickedId);
        if (clickedConcept && clickedConcept.children && clickedConcept.children.length > 0) {
            setViewStack(prev => [...prev, clickedConcept]);
        }
    };

    const handleBack = () => {
        if (viewStack.length > 1) {
            setViewStack(prev => prev.slice(0, -1));
        }
    };
    
    useEffect(() => {
        setViewStack([codeStructure.sceneGraph]);
    }, [codeStructure]);
    
    useEffect(() => {
        const currentMount = mountRef.current;
        const currentCanvas = canvasRef.current;
        if (!currentMount || !currentCanvas) return;

        innerObjectsRef.current = [];
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, currentMount.clientWidth / currentMount.clientHeight, 0.1, 1000);
        camera.position.z = 15;
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

        // Main scene graph wireframe
        const mainGeometry = new THREE.BoxGeometry(6, 6, 6);
        const mainEdges = new THREE.EdgesGeometry(mainGeometry);
        const mainLineMaterial = new THREE.LineBasicMaterial({ color: 0xffffff });
        const mainWireframe = new THREE.LineSegments(mainEdges, mainLineMaterial);
        mainWireframe.position.x = 5;
        scene.add(mainWireframe);

        // Imports wireframe
        const importGeometry = new THREE.BoxGeometry(4, 4, 4);
        const importEdges = new THREE.EdgesGeometry(importGeometry);
        const importWireframe = new THREE.LineSegments(importEdges, mainLineMaterial);
        importWireframe.position.x = -7;
        scene.add(importWireframe);
        
        // Line connecting the two main cubes
        const connectorPoints = [mainWireframe.position.clone().setX(mainWireframe.position.x - 3), importWireframe.position.clone().setX(importWireframe.position.x + 2)];
        const connectorGeometry = new THREE.BufferGeometry().setFromPoints(connectorPoints);
        const connectorLine = new THREE.Line(connectorGeometry, new THREE.LineDashedMaterial({ color: 0xaaaaaa, dashSize: 0.5, gapSize: 0.2 }));
        connectorLine.computeLineDistances();
        scene.add(connectorLine);
        
        const initialLabels: Omit<Label, 'screenPosition'>[] = [];
        
        // Render scene graph cubes
        if(currentView) {
            const itemsToDisplay = currentView.children || [];
            itemsToDisplay.forEach((item, index) => {
                const geometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
                const material = new THREE.MeshStandardMaterial({ color: new THREE.Color(`hsl(${index * 60}, 70%, 60%)`) });
                const mesh = new THREE.Mesh(geometry, material);

                const angle = (index / itemsToDisplay.length) * Math.PI * 2;
                const radius = 2.5;
                mesh.position.set(mainWireframe.position.x + Math.cos(angle) * radius, mainWireframe.position.y + Math.sin(angle) * radius, 0);
                mesh.userData = { id: item.id };
                
                scene.add(mesh);
                innerObjectsRef.current.push(mesh);

                initialLabels.push({ id: item.id, text: item.name, position: mesh.position.clone() });
            });
        }
        
        // Render import cubes
        codeStructure.imports.forEach((imp, index) => {
            const geometry = new THREE.BoxGeometry(1, 1, 1);
            const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });
            const mesh = new THREE.Mesh(geometry, material);
            
            mesh.position.set(importWireframe.position.x, importWireframe.position.y + (index * 1.5) - ((codeStructure.imports.length - 1) * 0.75), 0);
            mesh.userData = { id: `import-${imp}` };
            
            scene.add(mesh);
            innerObjectsRef.current.push(mesh);

            initialLabels.push({ id: `import-${imp}`, text: `import '${imp}'`, position: mesh.position.clone() });
        });

        setLabels(initialLabels.map(l => ({ ...l, screenPosition: { x: -1000, y: -1000 } })));

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
                if (!clickedId.startsWith('import-')) {
                    handleObjectClick(clickedId);
                }
            }
        };
        currentCanvas.addEventListener('click', onCanvasClick);

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
            currentCanvas.removeEventListener('click', onCanvasClick);
            controls.dispose();
            renderer.dispose();
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
        };
    }, [viewStack, codeStructure]);

    const getBreadcrumbTitle = () => {
        if (!currentView) return 'Imports';
        if (viewStack.length === 1) return 'Top Level';
        return viewStack.map(v => v?.name || '...').join(' > ');
    }

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 h-screen bg-gray-900 text-white p-4 gap-4">
            <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center gap-2">
                    {viewStack.length > 1 && (
                        <Button onClick={handleBack} variant="outline" size="sm">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                    )}
                    <h2 className="text-lg font-bold truncate">
                        Current View: <span className="text-primary">{getBreadcrumbTitle()}</span>
                    </h2>
                </div>
                <div ref={mountRef} className="w-full flex-grow rounded-lg border border-gray-700 relative">
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
                <div className="flex-shrink-0 text-center text-muted-foreground text-sm">
                    <p>Click on an inner cube to drill down. Use your mouse to rotate and zoom.</p>
                </div>
            </div>
            <div className="flex flex-col gap-4 h-full">
                <h1 className="text-2xl font-bold">Code Editor</h1>
                <Textarea 
                    value={code}
                    onChange={e => setCode(e.target.value)}
                    className="bg-gray-800 border-gray-700 text-gray-200 font-mono flex-grow"
                    placeholder="Paste your three.js code here..."
                />
                <Button onClick={handleVisualize} className="mt-2">Visualize</Button>
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
